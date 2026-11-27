import type { Decision, PolicyControls } from './types'

export interface EvaluateInvoiceInput {
  number: string
  amountUnits: string
  status: 'Open' | 'Attested' | 'Paid' | 'Disputed'
}

export interface EvaluateSupplierInput {
  payoutWallet: string
  verificationStatus: 'Verified' | 'Unverified' | 'Review required'
}

export interface EvaluateAgentInput {
  status: 'Active' | 'Disabled'
  perRequestLimitUnits: string
}

export interface EvaluateInput {
  invoiceNumber: string
  requestedAmountUnits: string
  destinationWallet: string
  agentId: string
  intent: string
  hasEvidence: boolean
  registeredInvoice?: EvaluateInvoiceInput | null
  registeredSupplier?: EvaluateSupplierInput | null
  agent?: EvaluateAgentInput | null
  policyControls: PolicyControls
}

export interface EvaluateRuleItem {
  id: string
  name: string
  passed: boolean
  status: 'Passed' | 'Failed' | 'Review'
  reason?: string
}

export interface EvaluateOutput {
  decision: Decision
  reason: string
  triggeredRule?: string
  ruleItems: EvaluateRuleItem[]
}

function toMinorUnitsSafe(value: string): bigint {
  try { return BigInt(value) } catch { return BigInt(0) }
}

export function evaluate(input: EvaluateInput): EvaluateOutput {
  const rules: EvaluateRuleItem[] = []

  // Hard block 1: agent disabled
  if (input.agent?.status === 'Disabled') {
    rules.push({ id: 'agent-disabled', name: 'Agent authorized', passed: false, status: 'Failed', reason: 'Agent is not authorized to initiate payment requests.' })
    return {
      decision: 'BLOCK',
      reason: 'agent is not authorized.',
      triggeredRule: 'agent-disabled',
      ruleItems: rules,
    }
  }
  rules.push({ id: 'agent-disabled', name: 'Agent authorized', passed: true, status: 'Passed' })

  // Hard block 2: invoice already paid (duplicate)
  if (input.registeredInvoice?.status === 'Paid') {
    rules.push({ id: 'invoice-paid', name: 'Invoice not already paid', passed: false, status: 'Failed', reason: 'This invoice already has a completed payment.' })
    return {
      decision: 'BLOCK',
      reason: 'This invoice already has a completed payment.',
      triggeredRule: 'invoice-paid',
      ruleItems: rules,
    }
  }
  rules.push({ id: 'invoice-paid', name: 'Invoice not already paid', passed: true, status: 'Passed' })

  // Hard block 3: payout wallet mismatch
  if (input.registeredSupplier && input.destinationWallet !== input.registeredSupplier.payoutWallet) {
    rules.push({ id: 'wallet-mismatch', name: 'Payout wallet matches supplier', passed: false, status: 'Failed', reason: 'Requested payout wallet does not match the supplier’s approved wallet.' })
    return {
      decision: 'BLOCK',
      reason: "Payout wallet does not match the supplier's approved wallet.",
      triggeredRule: 'wallet-mismatch',
      ruleItems: rules,
    }
  }
  rules.push({ id: 'wallet-mismatch', name: 'Payout wallet matches supplier', passed: true, status: 'Passed' })

  // Hard block 4: requested amount exceeds invoice amount
  if (input.registeredInvoice) {
    const requested = toMinorUnitsSafe(input.requestedAmountUnits)
    const invoiceAmount = toMinorUnitsSafe(input.registeredInvoice.amountUnits)
    if (requested > invoiceAmount) {
      rules.push({ id: 'amount-exceeds-invoice', name: 'Requested amount within invoice amount', passed: false, status: 'Failed', reason: 'Requested amount exceeds the registered invoice amount.' })
      return {
        decision: 'BLOCK',
        reason: 'Requested amount exceeds the registered invoice amount.',
        triggeredRule: 'amount-exceeds-invoice',
        ruleItems: rules,
      }
    }
  }
  rules.push({ id: 'amount-exceeds-invoice', name: 'Requested amount within invoice amount', passed: true, status: 'Passed' })

  // Hard block 5: requested amount exceeds agent per-request limit
  if (input.agent) {
    const requested = toMinorUnitsSafe(input.requestedAmountUnits)
    const limit = toMinorUnitsSafe(input.agent.perRequestLimitUnits)
    if (limit > BigInt(0) && requested > limit) {
      rules.push({ id: 'per-request-limit', name: 'Within agent per-request limit', passed: false, status: 'Failed', reason: 'The request exceeds the agent’s per-request spending limit.' })
      return {
        decision: 'BLOCK',
        reason: "The request exceeds the agent's per-request spending limit.",
        triggeredRule: 'per-request-limit',
        ruleItems: rules,
      }
    }
  }
  rules.push({ id: 'per-request-limit', name: 'Within agent per-request limit', passed: true, status: 'Passed' })

  // Policy control: verified supplier required
  if (input.policyControls.verifiedSupplierRequired) {
    if (!input.registeredSupplier || input.registeredSupplier.verificationStatus !== 'Verified') {
      rules.push({ id: 'verified-supplier', name: 'Supplier verified', passed: false, status: 'Failed', reason: 'Supplier verification is required.' })
      return {
        decision: 'BLOCK',
        reason: 'Supplier verification is required.',
        triggeredRule: 'verified-supplier',
        ruleItems: rules,
      }
    }
  }
  rules.push({ id: 'verified-supplier', name: 'Supplier verified', passed: true, status: 'Passed' })

  // Policy control: delivery attestation required
  if (input.policyControls.deliveryAttestationRequired) {
    if (!input.registeredInvoice || input.registeredInvoice.status !== 'Attested') {
      rules.push({ id: 'delivery-attestation', name: 'Delivery attested', passed: false, status: 'Review', reason: 'Delivery evidence is required before payment can be released.' })
      return {
        decision: 'HOLD',
        reason: 'Delivery evidence is required before payment can be released.',
        triggeredRule: 'delivery-attestation',
        ruleItems: rules,
      }
    }
  }
  rules.push({ id: 'delivery-attestation', name: 'Delivery attested', passed: true, status: 'Passed' })

  // Policy control: supporting evidence required
  if (input.policyControls.supportingEvidenceRequired) {
    if (!input.hasEvidence) {
      rules.push({ id: 'supporting-evidence', name: 'Supporting evidence present', passed: false, status: 'Review', reason: 'Required invoice or delivery evidence was not supplied.' })
      return {
        decision: 'HOLD',
        reason: 'Required invoice or delivery evidence was not supplied.',
        triggeredRule: 'supporting-evidence',
        ruleItems: rules,
      }
    }
  }
  rules.push({ id: 'supporting-evidence', name: 'Supporting evidence present', passed: true, status: 'Passed' })

  // Policy control: two-person approval
  if (input.policyControls.twoPersonApproval) {
    rules.push({ id: 'two-person-approval', name: 'Two-person approval', passed: false, status: 'Review', reason: 'Requires two-person approval before funds release.' })
    return {
      decision: 'HOLD',
      reason: 'Requires two-person approval before funds release.',
      triggeredRule: 'two-person-approval',
      ruleItems: rules,
    }
  }
  rules.push({ id: 'two-person-approval', name: 'Two-person approval', passed: true, status: 'Passed' })

  return {
    decision: 'ALLOW',
    reason: 'All registered invoice, supplier, evidence and policy controls passed.',
    triggeredRule: undefined,
    ruleItems: rules,
  }
}
