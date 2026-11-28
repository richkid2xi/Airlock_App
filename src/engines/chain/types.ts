import type { PublicKey, Transaction } from '@solana/web3.js'

/** Typed error codes for on-chain anchoring. */
export type AnchorErrorCode =
  | 'wallet_not_connected'
  | 'wallet_rejected'
  | 'insufficient_sol'
  | 'rpc_failure'
  | 'receipt_not_found'
  | 'already_anchored'
  | 'validation'
  | 'unknown'

export class AnchorError extends Error {
  readonly code: AnchorErrorCode
  constructor(code: AnchorErrorCode, message: string) {
    super(message)
    this.name = 'AnchorError'
    this.code = code
  }
}

/** Wallet surface required to sign and send the anchoring memo transaction. */
export interface AnchorWallet {
  publicKey: PublicKey | null
  signTransaction(tx: Transaction): Promise<Transaction>
}

export interface AnchorReceiptInput {
  receiptId: string
  contentHash: string
}

export interface AnchorResult {
  signature: string
  cluster: 'devnet'
}

export interface ChainEnginePort {
  /** Anchor a receipt's integrity hash on Solana devnet via SPL Memo. */
  anchorReceipt(input: AnchorReceiptInput, wallet: AnchorWallet | null): Promise<AnchorResult>
  /** Verify the on-chain memo equals the expected string and the tx succeeded. */
  verifyAnchor(receiptId: string, signature: string, contentHash: string): Promise<boolean>
  /** Build a Solana Explorer URL for a signature on the configured cluster. */
  explorerUrl(signature: string): string
}

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
export const MEMO_PREFIX = 'airlock:v1'

/** Build the canonical memo string: airlock:v1:<receiptId>:<contentHash>. */
export function buildMemo(receiptId: string, contentHash: string): string {
  return `${MEMO_PREFIX}:${receiptId}:${contentHash}`
}

/** The expected memo string for a receipt + hash. */
export function expectedMemo(receiptId: string, contentHash: string): string {
  return buildMemo(receiptId, contentHash)
}
