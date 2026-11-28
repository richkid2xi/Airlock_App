import type { ReceiptsEnginePort, Receipt } from './types'
import { supabase } from '../../lib/supabase'

const SUPABASE_ANY = supabase as any

export class LiveReceiptsEngine implements ReceiptsEnginePort {
  async listReceipts(): Promise<Receipt[]> {
    const result = await SUPABASE_ANY.from('receipts').select('id, evaluation_id, invoice_id, supplier_id, agent_id, payee_wallet, amount_minor, currency, status, issued_at, issued_by, content_hash, anchor_signature, anchor_cluster, anchored_at').order('issued_at', { ascending: false })

    if (result.error) {
      throw new Error(`list receipts failed: ${result.error.message ?? String(result.error)}`)
    }

    return (result.data as any[]).map((row) => ({
      id: row.id,
      evaluationId: row.evaluation_id,
      invoiceId: row.invoice_id,
      supplierId: row.supplier_id,
      agentId: row.agent_id,
      payeeWallet: row.payee_wallet,
      amountMinor: String(row.amount_minor ?? '0'),
      currency: row.currency,
      status: row.status,
      issuedAt: row.issued_at,
      issuedBy: row.issued_by,
      contentHash: row.content_hash ?? null,
      anchorSignature: row.anchor_signature ?? null,
      anchorCluster: row.anchor_cluster ?? null,
      anchoredAt: row.anchored_at ?? null,
    }))
  }

  async issueReceipt(evaluationId: string): Promise<boolean> {
    const result = await SUPABASE_ANY.rpc('issue_receipt', {
      evaluation_id: evaluationId,
    })

    if (result.error) {
      throw new Error(`issue_receipt RPC failed: ${result.error.message ?? String(result.error)}`)
    }

    return true
  }

  async verifyReceipt(receiptId: string): Promise<boolean> {
    const result = await SUPABASE_ANY.rpc('verify_receipt', {
      receipt_id: receiptId,
    })

    if (result.error) {
      throw new Error(`verify_receipt RPC failed: ${result.error.message ?? String(result.error)}`)
    }

    if (result.data === null || result.data === undefined) {
      throw new Error('verify_receipt RPC returned no data')
    }

    return result.data as boolean
  }
}

export const liveReceiptsEngine = new LiveReceiptsEngine()