export interface Receipt {
  id: string
  evaluationId: string
  invoiceId: string
  supplierId: string
  agentId: string
  payeeWallet: string
  amountMinor: string
  currency: string
  status: 'authorized' | 'settled'
  issuedAt: string
  issuedBy: string
  contentHash: string | null
  anchorSignature: string | null
  anchorCluster: string | null
  anchoredAt: string | null
}

export interface ReceiptsEnginePort {
  listReceipts(): Promise<Receipt[]>
  issueReceipt(evaluationId: string): Promise<boolean>
  verifyReceipt(receiptId: string): Promise<boolean>
}