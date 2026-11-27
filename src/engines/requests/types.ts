export interface CreatePaymentRequestParams {
  agentId: string
  invoiceId: string
  source: 'attack_lab' | 'agent_api' | 'agent_console' | 'manual'
  claimedPayee?: string | null
  claimedAmountMinor?: string | null
  claimedMint?: string | null
}

export interface PaymentRequest {
  id: string
  agentId: string
  invoiceId: string
  source: 'attack_lab' | 'agent_api' | 'agent_console' | 'manual'
  createdBy: string
  createdAt: string
  claimedPayee?: string | null
  claimedAmountMinor?: string | null
  claimedMint?: string | null
}

export interface RequestsEnginePort {
  createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequest>
  listPaymentRequests(): Promise<PaymentRequest[]>
}