/**
 * Domain types for Airlock
 * Rule 4: Typed domain (Invoice, Supplier, Agent, Policy, PaymentRequest, Evaluation, Approval). Stable IDs.
 * Rule 5: Integer minor units as bigint/string. Never floats. USDC has 6 decimals. Format only at display edge.
 * Rule 6: Solana addresses as base58 strings. Devnet USDC: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
 */

export const SOLANA_DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
export const USDC_DECIMALS = 6

export type Decision = 'ALLOW' | 'BLOCK' | 'HOLD'

export type InvoiceStatus = 'Open' | 'Attested' | 'Paid' | 'Disputed'

export interface Invoice {
  id: string // e.g. "INV-2057" or UUID
  number: string
  supplierId: string // Reference to Supplier id or stable key
  supplierName: string
  amountUnits: string // minor units as integer string (e.g., "14680000000" for 14,680 USDC)
  currency: string // 'USDC' (or legacy display currency 'EUR' / 'USD')
  issueDate: string // YYYY-MM-DD or display date
  dueDate: string // YYYY-MM-DD or display date
  status: InvoiceStatus
  documentRef?: string
  notes?: string
}

export type SupplierVerificationStatus = 'Verified' | 'Unverified' | 'Review required'
export type SupplierOperationalStatus = 'Active' | 'Pending' | 'Restricted'

export interface Supplier {
  id: string // Stable ID
  name: string
  payoutWallet: string // Solana base58 or legacy 0x wallet
  verificationStatus: SupplierVerificationStatus
  operationalStatus: SupplierOperationalStatus
  invoiceCount: number
  lastPaymentDate?: string
  email?: string
  address?: string
  category?: string
  verificationRef?: string
  notes?: string
}

export type AgentStatus = 'Active' | 'Disabled'

export interface Agent {
  id: string // Stable ID
  name: string
  identifier: string // e.g. "agt_9x2p...b71"
  status: AgentStatus
  perRequestLimitUnits: string // integer minor units
  dailyLimitUnits: string // integer minor units
  requestCount: number
  description?: string
  assignedPolicyIds: string[]
}

export type PolicyStatus = 'Active' | 'Draft'

export interface PolicyControls {
  verifiedSupplierRequired: boolean
  deliveryAttestationRequired: boolean
  agentIntentRequired: boolean
  supportingEvidenceRequired: boolean
  twoPersonApproval: boolean
}

export interface Policy {
  id: string
  name: string
  description: string
  maxAmountUnits: string // integer minor units
  dailyCapUnits: string // integer minor units
  controls: PolicyControls
  assignedAgentNames: string[]
  status: PolicyStatus
}

export type PolicyRecord = {
  id: string
  name: string
  description: string
  max: number
  daily: number
  controls: boolean[]
  assigned: string[]
  status: 'Active' | 'Draft'
}

export interface PaymentRequest {
  id: string // Request reference e.g. "REQ-101" or invoice reference
  invoiceId: string
  invoiceNumber: string
  supplierId: string
  supplierName: string
  agentId: string
  agentName: string
  amountUnits: string // integer minor units
  destinationWallet: string // Payout wallet
  intent: string
  evidenceRef?: string
  timestamp: string // ISO string or display string
  decision: Decision
}

export interface RuleEvaluationItem {
  id: string
  name: string
  passed: boolean
  status: 'Passed' | 'Failed' | 'Review'
  reason?: string
}

export interface Evaluation {
  id: string
  requestId: string
  decision: Decision
  reason: string
  triggeredRule?: string
  ruleItems: RuleEvaluationItem[]
  evaluatedAt: string
}

export interface Approval {
  id: string
  requestId: string
  invoiceNumber: string
  agentName: string
  supplierName: string
  amountUnits: string
  decision: Decision // Current decision (starts as 'HOLD')
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
}
