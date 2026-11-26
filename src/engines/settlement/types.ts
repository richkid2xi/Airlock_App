import type { Approval, Decision, PaymentRequest } from '../../domain/types'

export type { Approval }

export interface SettlementParams {
  requestId: string
  invoiceNumber: string
  supplierName: string
  destinationWallet: string // Solana base58 public key
  amountUnits: string // Minor units (e.g. 6 decimals for USDC)
  reviewerPublicKey?: string
}

export interface SettlementReceipt {
  signature: string
  cluster: 'devnet'
  slot: number
  amountUnits: string
  destinationWallet: string
  mint: string // Devnet USDC
  timestamp: string
}

export interface SettlementEnginePort {
  getCluster(): 'devnet'
  getUsdcMint(): string
  executeSettlement(params: SettlementParams): Promise<SettlementReceipt>
  approveHoldRequest(requestId: string, reviewerWallet: string): Promise<Approval>
  rejectHoldRequest(requestId: string, reviewerWallet: string, reason?: string): Promise<Approval>
}
