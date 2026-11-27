import type { RequestsEnginePort, PaymentRequest, CreatePaymentRequestParams } from './types'
import { supabase } from '../../lib/supabase'

const SUPABASE_ANY = supabase as any

export class LiveRequestsEngine implements RequestsEnginePort {
  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequest> {
    const result = await SUPABASE_ANY.from('payment_requests').insert({
      agent_id: params.agentId,
      invoice_id: params.invoiceId,
      source: params.source,
      claimed_payee: params.claimedPayee,
      claimed_amount_minor: params.claimedAmountMinor ? parseInt(params.claimedAmountMinor, 10) : null,
      claimed_mint: params.claimedMint,
    }).select('id, agent_id, invoice_id, source, created_by, created_at, claimed_payee, claimed_amount_minor, claimed_mint').single()

    if (result.error) {
      throw new Error(`create payment request failed: ${result.error.message ?? String(result.error)}`)
    }

    return {
      id: result.data.id,
      agentId: result.data.agent_id,
      invoiceId: result.data.invoice_id,
      source: result.data.source,
      createdBy: result.data.created_by,
      createdAt: result.data.created_at,
      claimedPayee: result.data.claimed_payee,
      claimedAmountMinor: result.data.claimed_amount_minor ? String(result.data.claimed_amount_minor) : null,
      claimedMint: result.data.claimed_mint,
    }
  }

  async listPaymentRequests(): Promise<PaymentRequest[]> {
    const result = await SUPABASE_ANY.from('payment_requests').select('id, agent_id, invoice_id, source, created_by, created_at, claimed_payee, claimed_amount_minor, claimed_mint').order('created_at', { ascending: false })

    if (result.error) {
      throw new Error(`list payment requests failed: ${result.error.message ?? String(result.error)}`)
    }

    return (result.data as any[]).map((row: any) => ({
      id: row.id,
      agentId: row.agent_id,
      invoiceId: row.invoice_id,
      source: row.source,
      createdBy: row.created_by,
      createdAt: row.created_at,
      claimedPayee: row.claimed_payee,
      claimedAmountMinor: row.claimed_amount_minor ? String(row.claimed_amount_minor) : null,
      claimedMint: row.claimed_mint,
    }))
  }
}

export const liveRequestsEngine = new LiveRequestsEngine()