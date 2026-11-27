import { z } from 'zod'
import { minorUnitsSchema, parseMinorUnits, formatMinorUnits } from './minorUnits'

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function decodeBase58(input: string): Uint8Array {
  if (input.length === 0) return new Uint8Array(0)
  // Count leading '1' (zero) characters
  let leadZeros = 0
  while (leadZeros < input.length && input[leadZeros] === '1') leadZeros++
  // Convert base58 to big integer
  let value = BigInt(0)
  for (let i = 0; i < input.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(input[i])
    if (charIndex < 0) throw new Error('Invalid base58 character')
    value = value * BigInt(58) + BigInt(charIndex)
  }
  // Convert big integer to byte array
  let bytes = new Uint8Array(0)
  while (value > 0n) {
    const byte = Number(value & 0xffn)
    bytes = new Uint8Array([byte, ...bytes])
    value = value / BigInt(256n)
  }
  // Prepend leading zero bytes
  return new Uint8Array([...new Array(leadZeros).fill(0), ...bytes])
}

export function validatePayoutWallet(value: string): boolean {
  try {
    const decoded = decodeBase58(value)
    return decoded.length === 32
  } catch {
    return false
  }
}

export const uuidSchema = z.string().uuid()
export const base58WalletSchema = z.string().min(32).max(44)

export const CurrencySchema = z.enum(['EUR', 'USD', 'GBP', 'USDC'])
export type Currency = z.infer<typeof CurrencySchema>

export const SupplierVerificationStatusSchema = z.enum(['unverified', 'review_required', 'verified'])
export type SupplierVerificationStatus = z.infer<typeof SupplierVerificationStatusSchema>

export const SupplierOperationalStatusSchema = z.enum(['active', 'pending', 'restricted'])
export type SupplierOperationalStatus = z.infer<typeof SupplierOperationalStatusSchema>

export const AgentStatusSchema = z.enum(['active', 'disabled'])
export type AgentStatus = z.infer<typeof AgentStatusSchema>

export const PolicyStatusSchema = z.enum(['active', 'draft'])
export type PolicyStatus = z.infer<typeof PolicyStatusSchema>

export const InvoiceStatusSchema = z.enum(['open', 'attested', 'paid', 'disputed'])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const SupplierSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  name: z.string().min(1).max(255),
  businessEmail: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  verificationReference: z.string().max(255).optional().nullable(),
  payoutWallet: base58WalletSchema,
  verificationStatus: SupplierVerificationStatusSchema.default('unverified'),
  verifiedAt: z.string().datetime().optional().nullable(),
  verifiedBy: uuidSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Supplier = z.infer<typeof SupplierSchema>

export const CreateSupplierInputSchema = z.object({
  name: z.string().min(1).max(255),
  payoutWallet: base58WalletSchema,
  businessEmail: z.string().email().optional(),
  address: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  verificationReference: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
})
export type CreateSupplierInput = z.infer<typeof CreateSupplierInputSchema>

export const UpdateSupplierInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  businessEmail: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  verificationReference: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  payoutWallet: base58WalletSchema.optional(),
  verificationStatus: SupplierVerificationStatusSchema.optional(),
})
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierInputSchema>

export const AgentSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  name: z.string().min(1).max(255),
  identifier: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  status: AgentStatusSchema.default('active'),
  perRequestLimitMinor: minorUnitsSchema,
  dailyLimitMinor: minorUnitsSchema,
  currency: CurrencySchema.default('USDC'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Agent = z.infer<typeof AgentSchema>

export const CreateAgentInputSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  status: AgentStatusSchema.optional(),
  perRequestLimitMinor: z.string(),
  dailyLimitMinor: z.string(),
  currency: CurrencySchema.optional(),
  policyIds: z.array(uuidSchema).default([]),
}).refine((data) => {
  const perReq = BigInt(data.perRequestLimitMinor)
  const daily = BigInt(data.dailyLimitMinor)
  return perReq > 0 && daily >= perReq
}, { message: 'perRequestLimitMinor must be > 0 and dailyLimitMinor >= perRequestLimitMinor', path: ['dailyLimitMinor'] })
export type CreateAgentInput = z.input<typeof CreateAgentInputSchema>

export const UpdateAgentInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: AgentStatusSchema.optional(),
  perRequestLimitMinor: z.string().optional(),
  dailyLimitMinor: z.string().optional(),
  currency: CurrencySchema.optional(),
}).refine((data) => {
  if (data.perRequestLimitMinor !== undefined && data.dailyLimitMinor !== undefined) {
    const perReq = BigInt(data.perRequestLimitMinor)
    const daily = BigInt(data.dailyLimitMinor)
    return perReq > 0 && daily >= perReq
  }
  if (data.perRequestLimitMinor !== undefined) {
    return BigInt(data.perRequestLimitMinor) > 0
  }
  if (data.dailyLimitMinor !== undefined) {
    return true
  }
  return true
}, { message: 'perRequestLimitMinor must be > 0 and dailyLimitMinor >= perRequestLimitMinor', path: ['dailyLimitMinor'] })
export type UpdateAgentInput = z.infer<typeof UpdateAgentInputSchema>

export const PolicyControlsSchema = z.object({
  requireVerifiedSupplier: z.boolean().default(false),
  requireDeliveryAttestation: z.boolean().default(false),
  requireAgentIntent: z.boolean().default(false),
  requireSupportingEvidence: z.boolean().default(false),
  requireTwoPersonApproval: z.boolean().default(false),
})
export type PolicyControls = z.infer<typeof PolicyControlsSchema>

export const PolicySchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  maxInvoiceMinor: minorUnitsSchema,
  dailyCapMinor: minorUnitsSchema,
  controls: PolicyControlsSchema,
  status: PolicyStatusSchema.default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Policy = z.infer<typeof PolicySchema>

export const CreatePolicyInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  maxInvoiceMinor: z.string(),
  dailyCapMinor: z.string(),
  controls: PolicyControlsSchema,
  status: PolicyStatusSchema.optional(),
  agentIds: z.array(uuidSchema).default([]),
}).refine((data) => {
  const max = BigInt(data.maxInvoiceMinor)
  const daily = BigInt(data.dailyCapMinor)
  return max > 0 && daily >= max
}, { message: 'maxInvoiceMinor must be > 0 and dailyCapMinor >= maxInvoiceMinor', path: ['dailyCapMinor'] })
export type CreatePolicyInput = z.input<typeof CreatePolicyInputSchema>

export const UpdatePolicyInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  maxInvoiceMinor: z.string().optional(),
  dailyCapMinor: z.string().optional(),
  controls: PolicyControlsSchema.partial().optional(),
  status: PolicyStatusSchema.optional(),
}).refine((data) => {
  if (data.maxInvoiceMinor !== undefined && data.dailyCapMinor !== undefined) {
    const max = BigInt(data.maxInvoiceMinor)
    const daily = BigInt(data.dailyCapMinor)
    return max > 0 && daily >= max
  }
  if (data.maxInvoiceMinor !== undefined) {
    return BigInt(data.maxInvoiceMinor) > 0
  }
  if (data.dailyCapMinor !== undefined) {
    return true
  }
  return true
}, { message: 'maxInvoiceMinor must be > 0 and dailyCapMinor >= maxInvoiceMinor', path: ['dailyCapMinor'] })
export type UpdatePolicyInput = z.infer<typeof UpdatePolicyInputSchema>

export const InvoiceSchema = z.object({
  id: uuidSchema,
  orgId: uuidSchema,
  invoiceNumber: z.string().min(1).max(100),
  supplierId: uuidSchema,
  amountMinor: minorUnitsSchema,
  currency: CurrencySchema,
  mint: z.string().max(100).optional().nullable(),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  documentRef: z.string().max(255).optional().nullable(),
  documentPath: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: InvoiceStatusSchema.default('open'),
  attestedAt: z.string().datetime().optional().nullable(),
  attestedBy: uuidSchema.optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).refine((data) => new Date(data.dueDate) >= new Date(data.issueDate), { message: 'dueDate must be >= issueDate', path: ['dueDate'] })
  .refine((data) => BigInt(data.amountMinor) > 0, { message: 'amountMinor must be > 0', path: ['amountMinor'] })
export type Invoice = z.infer<typeof InvoiceSchema>

export const CreateInvoiceInputSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  supplierId: uuidSchema,
  amountMinor: z.string(),
  currency: CurrencySchema,
  mint: z.string().max(100).optional(),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  documentRef: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
}).refine((data) => BigInt(data.amountMinor) > 0, { message: 'amountMinor must be > 0', path: ['amountMinor'] })
  .refine((data) => new Date(data.dueDate) >= new Date(data.issueDate), { message: 'dueDate must be >= issueDate', path: ['dueDate'] })
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>

export const PolicyAgentAssignmentSchema = z.object({
  policyId: uuidSchema,
  agentIds: z.array(uuidSchema).min(1),
})
export type PolicyAgentAssignment = z.infer<typeof PolicyAgentAssignmentSchema>

export const SupplierFilterSchema = z.object({
  verificationStatus: SupplierVerificationStatusSchema.optional(),
  category: z.string().optional(),
})
export type SupplierFilter = z.infer<typeof SupplierFilterSchema>

export const InvoiceFilterSchema = z.object({
  status: InvoiceStatusSchema.optional(),
  supplierId: uuidSchema.optional(),
})
export type InvoiceFilter = z.infer<typeof InvoiceFilterSchema>

export const RegistryErrorSchema = z.object({
  code: z.enum(['not_found', 'conflict', 'validation', 'forbidden']),
  message: z.string(),
})
export type RegistryError = z.infer<typeof RegistryErrorSchema>

export function makeRegistryError(code: RegistryError['code'], message: string): RegistryError {
  return { code, message }
}

export const SOLANA_DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
export const USDC_DECIMALS = 6