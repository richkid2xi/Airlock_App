import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { supabase } from '../../lib/supabase'
import {
  MEMO_PROGRAM_ID,
  buildMemo,
  AnchorError,
  type ChainEnginePort,
  type AnchorReceiptInput,
  type AnchorResult,
  type AnchorWallet,
} from './types'

const SUPABASE_ANY = supabase as any

function clusterFromEnv(): string {
  const c = (import.meta as any).env?.VITE_SOLANA_CLUSTER
  return typeof c === 'string' && c.length > 0 ? c : 'devnet'
}

function rpcUrlFromEnv(): string {
  const url = (import.meta as any).env?.VITE_SOLANA_RPC_URL
  if (typeof url === 'string' && url.length > 0) return url
  return 'https://api.devnet.solana.com'
}

/**
 * Live Chain Engine — anchors a receipt integrity hash on Solana devnet via the
 * SPL Memo program. Anchoring does NOT move funds; receipt status is unaffected.
 */
export class LiveChainEngine implements ChainEnginePort {
  private connection: Connection

  constructor(connection?: Connection) {
    this.connection = connection ?? new Connection(rpcUrlFromEnv(), 'confirmed')
  }

  async anchorReceipt(input: AnchorReceiptInput, wallet: AnchorWallet | null): Promise<AnchorResult> {
    if (!wallet || !wallet.publicKey) {
      throw new AnchorError('wallet_not_connected', 'Connect a wallet to anchor this receipt on Solana.')
    }

    const memo = buildMemo(input.receiptId, input.contentHash)
    if (Buffer.from(memo, 'utf-8').length > 150) {
      throw new AnchorError('validation', 'Memo data exceeds 150 bytes.')
    }

    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
      programId: new PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(memo, 'utf-8'),
    })

    const transaction = new Transaction()
    transaction.add(memoInstruction)

    let blockhash: string
    try {
      const latest = await this.connection.getLatestBlockhash('confirmed')
      blockhash = latest.blockhash
    } catch (err) {
      throw new AnchorError('rpc_failure', `Could not reach Solana RPC: ${errText(err)}`)
    }
    transaction.recentBlockhash = blockhash
    transaction.feePayer = wallet.publicKey

    let signed: Transaction
    try {
      signed = await wallet.signTransaction(transaction)
    } catch (err) {
      throw new AnchorError('wallet_rejected', 'The wallet rejected the transaction.')
    }

    let signature: string
    try {
      signature = await this.connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
    } catch (err) {
      throw new AnchorError('rpc_failure', `Failed to send anchoring transaction: ${errText(err)}`)
    }

    try {
      await this.connection.confirmTransaction(signature, 'confirmed')
    } catch (err) {
      throw new AnchorError('rpc_failure', `Anchoring transaction was not confirmed: ${errText(err)}`)
    }

    // Persist the anchor server-side (org-checked, cluster fixed to devnet).
    const { error } = await SUPABASE_ANY.rpc('record_receipt_anchor', {
      p_receipt_id: input.receiptId,
      p_signature: signature,
    })
    if (error) {
      throw mapAnchorRpcError(error)
    }

    return { signature, cluster: 'devnet' }
  }

  async verifyAnchor(receiptId: string, signature: string, contentHash: string): Promise<boolean> {
    let tx: any
    try {
      tx = await this.connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
    } catch (err) {
      throw new AnchorError('rpc_failure', `Could not fetch transaction: ${errText(err)}`)
    }
    if (!tx) return false
    if (tx.meta && tx.meta.err) return false

    const expected = buildMemo(receiptId, contentHash)
    const instructions = tx.transaction?.message?.instructions ?? []
    for (const ix of instructions) {
      if (ix.program !== 'spl-memo' && ix.programId?.toString?.() !== MEMO_PROGRAM_ID) continue
      const data = typeof ix.parsed === 'string' ? ix.parsed : null
      if (data === expected) return true
    }
    return false
  }

  explorerUrl(signature: string): string {
    const cluster = clusterFromEnv()
    const query = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`
    return `https://explorer.solana.com/tx/${signature}${query}`
  }
}

function errText(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as any).message)
  return String(err)
}

function mapAnchorRpcError(err: { code?: string; message?: string }): AnchorError {
  const msg = err.message ?? 'Anchoring failed'
  if (msg.includes('already anchored')) {
    return new AnchorError('already_anchored', msg)
  }
  if (msg.includes('not found') || msg.includes('not in your organization')) {
    return new AnchorError('receipt_not_found', msg)
  }
  if (err.code === '42501' || msg.includes('permission denied')) {
    return new AnchorError('validation', msg)
  }
  return new AnchorError('unknown', msg)
}

export const liveChainEngine = new LiveChainEngine()
