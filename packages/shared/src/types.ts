import { z } from 'zod'

export const DecisionSchema = z.enum(['ALLOW', 'BLOCK', 'HOLD'])
export type Decision = z.infer<typeof DecisionSchema>

export const InvoiceStatusSchema = z.enum(['Open', 'Attested', 'Paid', 'Disputed'])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const SupplierVerificationStatusSchema = z.enum(['Verified', 'Unverified', 'Review required'])
export type SupplierVerificationStatus = z.infer<typeof SupplierVerificationStatusSchema>

export const SupplierOperationalStatusSchema = z.enum(['Active', 'Pending', 'Restricted'])
export type SupplierOperationalStatus = z.infer<typeof SupplierOperationalStatusSchema>

export const AgentStatusSchema = z.enum(['Active', 'Disabled'])
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const PolicyStatusSchema = z.enum(['Active', 'Draft'])
export type PolicyStatus = z.infer<typeof PolicyStatusSchema>

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  amountUnits: z.string(), // integer minor units
  currency: z.string().default('USDC'),
  issueDate: z.string(),
  dueDate: z.string(),
  status: InvoiceStatusSchema,
  documentRef: z.string().optional(),
  notes: z.string().optional(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  payoutWallet: z.string(),
  verificationStatus: SupplierVerificationStatusSchema,
  operationalStatus: SupplierOperationalStatusSchema,
  invoiceCount: z.number().int().nonnegative(),
  lastPaymentDate: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  verificationRef: z.string().optional(),
  notes: z.string().optional(),
})
export type Supplier = z.infer<typeof SupplierSchema>

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: z.string(),
  status: AgentStatusSchema,
  perRequestLimitUnits: z.string(),
  dailyLimitUnits: z.string(),
  requestCount: z.number().int().nonnegative(),
  description: z.string().optional(),
  assignedPolicyIds: z.array(z.string()).default([]),
})
export type Agent = z.infer<typeof AgentSchema>

export const PolicyControlsSchema = z.object({
  verifiedSupplierRequired: z.boolean(),
  deliveryAttestationRequired: z.boolean(),
  agentIntentRequired: z.boolean(),
  supportingEvidenceRequired: z.boolean(),
  twoPersonApproval: z.boolean(),
})
export type PolicyControls = z.infer<typeof PolicyControlsSchema>

export const PolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  maxAmountUnits: z.string(),
  dailyCapUnits: z.string(),
  controls: PolicyControlsSchema,
  assignedAgentNames: z.array(z.string()),
  status: PolicyStatusSchema,
})
export type Policy = z.infer<typeof PolicySchema>

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

export const PaymentRequestSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  amountUnits: z.string(),
  destinationWallet: z.string(),
  intent: z.string(),
  evidenceRef: z.string().optional(),
  timestamp: z.string(),
  decision: DecisionSchema,
})
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>

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
  decision: Decision
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
}

export const SOLANA_DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
export const USDC_DECIMALS = 6
