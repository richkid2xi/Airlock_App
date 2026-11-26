import type { Invoice, Supplier, Agent, Policy, PaymentRequest, Decision } from './types'
import { toMinorUnits, formatMinorUnits, fromMinorUnits } from './money'

/**
 * Temporary adapters to keep untouched pages and UI components working seamlessly
 * with the legacy positional string[] row formats.
 */

// Invoice row format:
// [0]: Invoice number / ID
// [1]: Supplier name
// [2]: Formatted amount including symbol
// [3]: Issue date
// [4]: Due date
// [5]: Status
export function invoiceToRow(invoice: Invoice, symbol: string = '€'): string[] {
  return [
    invoice.number,
    invoice.supplierName,
    formatMinorUnits(invoice.amountUnits, 6, symbol),
    invoice.issueDate,
    invoice.dueDate,
    invoice.status,
  ]
}

export function invoiceFromRow(row: string[], id?: string): Invoice {
  const number = row[0]
  const supplierName = row[1]
  const amountUnits = toMinorUnits(row[2])
  return {
    id: id || `inv_${number.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    number,
    supplierId: `sup_${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    supplierName,
    amountUnits,
    currency: 'USDC',
    issueDate: row[3],
    dueDate: row[4],
    status: (row[5] as Invoice['status']) || 'Open',
  }
}

// Supplier row format:
// [0]: Supplier name / ID
// [1]: Shortened or edited payout wallet string
// [2]: Verification status
// [3]: Invoice count string
// [4]: Last payment text
// [5]: Operational status
export function supplierToRow(supplier: Supplier): string[] {
  return [
    supplier.name,
    supplier.payoutWallet,
    supplier.verificationStatus,
    supplier.invoiceCount.toString(),
    supplier.lastPaymentDate || 'Never',
    supplier.operationalStatus,
  ]
}

export function supplierFromRow(row: string[], id?: string): Supplier {
  const name = row[0]
  return {
    id: id || `sup_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name,
    payoutWallet: row[1],
    verificationStatus: (row[2] as Supplier['verificationStatus']) || 'Unverified',
    invoiceCount: parseInt(row[3] || '0', 10) || 0,
    lastPaymentDate: row[4] || 'Never',
    operationalStatus: (row[5] as Supplier['operationalStatus']) || 'Pending',
  }
}

// Agent row format:
// [0]: Agent name / ID
// [1]: Agent identifier
// [2]: Active/Disabled
// [3]: Formatted per-request limit
// [4]: Formatted daily limit
// [5]: Request count string
export function agentToRow(agent: Agent, symbol: string = '€'): string[] {
  return [
    agent.name,
    agent.identifier,
    agent.status,
    formatMinorUnits(agent.perRequestLimitUnits, 6, symbol),
    formatMinorUnits(agent.dailyLimitUnits, 6, symbol),
    agent.requestCount.toString(),
  ]
}

export function agentFromRow(row: string[], id?: string): Agent {
  const name = row[0]
  return {
    id: id || `agt_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name,
    identifier: row[1],
    status: (row[2] as Agent['status']) || 'Active',
    perRequestLimitUnits: toMinorUnits(row[3]),
    dailyLimitUnits: toMinorUnits(row[4]),
    requestCount: parseInt(row[5] || '0', 10) || 0,
    assignedPolicyIds: [],
  }
}

// Activity row format:
// [0]: Reference / Invoice ID
// [1]: Supplier name
// [2]: Agent name
// [3]: Formatted amount
// [4]: ALLOW/BLOCK/HOLD
// [5]: Display timestamp
export function paymentRequestToRow(req: PaymentRequest, symbol: string = '€'): string[] {
  return [
    req.invoiceNumber || req.id,
    req.supplierName,
    req.agentName,
    formatMinorUnits(req.amountUnits, 6, symbol),
    req.decision,
    req.timestamp,
  ]
}

export function paymentRequestFromRow(row: string[], id?: string): PaymentRequest {
  const ref = row[0]
  const supplierName = row[1]
  const agentName = row[2]
  return {
    id: id || `req_${ref.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    invoiceId: `inv_${ref.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    invoiceNumber: ref,
    supplierId: `sup_${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    supplierName,
    agentId: `agt_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    agentName,
    amountUnits: toMinorUnits(row[3]),
    destinationWallet: '0x712F •••• 88D0',
    intent: 'Settle registered supplier invoice after delivery of contracted services.',
    timestamp: row[5],
    decision: (row[4] as Decision) || 'HOLD',
  }
}

// Policy conversion to/from legacy PolicyRecord (if needed)
export function policyToLegacyRecord(policy: Policy): {
  id: string
  name: string
  description: string
  max: number
  daily: number
  controls: boolean[]
  assigned: string[]
  status: 'Active' | 'Draft'
} {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    max: parseFloat(fromMinorUnits(policy.maxAmountUnits, 6)),
    daily: parseFloat(fromMinorUnits(policy.dailyCapUnits, 6)),
    controls: [
      policy.controls.verifiedSupplierRequired,
      policy.controls.deliveryAttestationRequired,
      policy.controls.agentIntentRequired,
      policy.controls.supportingEvidenceRequired,
      policy.controls.twoPersonApproval,
    ],
    assigned: policy.assignedAgentNames,
    status: policy.status,
  }
}

export function policyFromLegacyRecord(record: {
  id: string
  name: string
  description: string
  max: number
  daily: number
  controls: boolean[]
  assigned: string[]
  status: 'Active' | 'Draft'
}): Policy {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    maxAmountUnits: toMinorUnits(record.max),
    dailyCapUnits: toMinorUnits(record.daily),
    controls: {
      verifiedSupplierRequired: !!record.controls[0],
      deliveryAttestationRequired: !!record.controls[1],
      agentIntentRequired: !!record.controls[2],
      supportingEvidenceRequired: !!record.controls[3],
      twoPersonApproval: !!record.controls[4],
    },
    assignedAgentNames: record.assigned,
    status: record.status,
  }
}
