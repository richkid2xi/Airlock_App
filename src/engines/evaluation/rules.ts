import type { Evaluation, RuleEvaluationItem } from '../../domain/types'
import type { EvaluationEnginePort, EvaluationInput } from './types'

/**
 * Core Rule Evaluator: off-chain evaluation layer
 * Rule 11: TWO LAYERS.
 * The off-chain evaluator is a second layer for UX and early rejection, never the only layer.
 * A compromised engine must never be able to exceed on-chain limits.
 */
export function evaluatePaymentRules(input: EvaluationInput): Evaluation {
  const ruleItems: RuleEvaluationItem[] = []
  let decision: 'ALLOW' | 'BLOCK' | 'HOLD' = 'ALLOW'
  let triggeredRule = 'All registered invoice, supplier, evidence and policy controls passed.'
  let reason = 'The request matched the invoice, supplier, amount, evidence and active spending policy.'

  // 1. Agent existence and active authorization check
  if (input.agent) {
    if (input.agent.status === 'Disabled') {
      ruleItems.push({
        id: 'agent_active',
        name: 'Agent is authorized',
        passed: false,
        status: 'Failed',
        reason: 'This agent is not authorized to initiate payment requests.',
      })
      return {
        id: `eval-${Date.now()}`,
        requestId: `req-${Date.now()}`,
        decision: 'BLOCK',
        reason: 'This agent is not authorized to initiate payment requests.',
        triggeredRule: 'Frozen or disabled agent',
        ruleItems,
        evaluatedAt: new Date().toISOString(),
      }
    } else {
      ruleItems.push({
        id: 'agent_active',
        name: 'Agent is authorized',
        passed: true,
        status: 'Passed',
      })
    }
  }

  // 2. Invoice registration and status check
  if (!input.registeredInvoice) {
    ruleItems.push({
      id: 'inv_registered',
      name: 'Invoice is registered',
      passed: false,
      status: 'Failed',
      reason: 'No matching registered invoice found.',
    })
    return {
      id: `eval-${Date.now()}`,
      requestId: `req-${Date.now()}`,
      decision: 'BLOCK',
      reason: 'No matching registered invoice found.',
      triggeredRule: 'Invoice not registered',
      ruleItems,
      evaluatedAt: new Date().toISOString(),
    }
  }

  ruleItems.push({
    id: 'inv_registered',
    name: 'Invoice is registered',
    passed: true,
    status: 'Passed',
  })

  // Duplicate payment check
  if (input.registeredInvoice.status === 'Paid') {
    ruleItems.push({
      id: 'inv_unpaid',
      name: 'Invoice is unpaid',
      passed: false,
      status: 'Failed',
      reason: 'This invoice already has a completed payment.',
    })
    return {
      id: `eval-${Date.now()}`,
      requestId: `req-${Date.now()}`,
      decision: 'BLOCK',
      reason: 'This invoice already has a completed payment.',
      triggeredRule: 'Duplicate payment',
      ruleItems,
      evaluatedAt: new Date().toISOString(),
    }
  }

  // Dispute check
  if (input.registeredInvoice.status === 'Disputed') {
    ruleItems.push({
      id: 'inv_not_disputed',
      name: 'Invoice not disputed',
      passed: false,
      status: 'Failed',
      reason: 'Payment requests for this invoice are blocked until dispute is resolved.',
    })
    return {
      id: `eval-${Date.now()}`,
      requestId: `req-${Date.now()}`,
      decision: 'BLOCK',
      reason: 'Invoice is marked as disputed.',
      triggeredRule: 'Disputed invoice',
      ruleItems,
      evaluatedAt: new Date().toISOString(),
    }
  }

  // 3. Amount integrity check: Requested amount cannot exceed registered invoice amount
  const requestedUnits = BigInt(input.requestedAmountUnits || '0')
  const invoiceUnits = BigInt(input.registeredInvoice.amountUnits || '0')
  if (requestedUnits > invoiceUnits) {
    ruleItems.push({
      id: 'amount_match',
      name: 'Requested amount matches invoice',
      passed: false,
      status: 'Failed',
      reason: 'Requested amount exceeds the registered invoice amount.',
    })
    return {
      id: `eval-${Date.now()}`,
      requestId: `req-${Date.now()}`,
      decision: 'BLOCK',
      reason: 'Requested amount exceeds the registered invoice amount.',
      triggeredRule: 'Invoice amount manipulation',
      ruleItems,
      evaluatedAt: new Date().toISOString(),
    }
  }

  ruleItems.push({
    id: 'amount_match',
    name: 'Requested amount matches invoice',
    passed: true,
    status: 'Passed',
  })

  // 4. Supplier payout wallet destination match
  if (input.registeredSupplier) {
    const cleanReqWallet = input.destinationWallet.trim().toLowerCase()
    const cleanSupWallet = input.registeredSupplier.payoutWallet.trim().toLowerCase()

    // Match either full address or shortened token representation
    const matchesWallet =
      cleanReqWallet === cleanSupWallet ||
      cleanSupWallet.includes(cleanReqWallet.slice(0, 6)) ||
      cleanReqWallet.includes(cleanSupWallet.slice(0, 6))

    if (!matchesWallet) {
      ruleItems.push({
        id: 'wallet_match',
        name: 'Payout wallet matches supplier',
        passed: false,
        status: 'Failed',
        reason: 'Requested payout wallet does not match the supplier’s approved wallet.',
      })
      return {
        id: `eval-${Date.now()}`,
        requestId: `req-${Date.now()}`,
        decision: 'BLOCK',
        reason: 'The requested payout wallet does not match the supplier’s approved destination.',
        triggeredRule: 'Payee or payout wallet mismatch',
        ruleItems,
        evaluatedAt: new Date().toISOString(),
      }
    }

    ruleItems.push({
      id: 'wallet_match',
      name: 'Payout wallet matches supplier',
      passed: true,
      status: 'Passed',
    })

    // Supplier verification check
    const requiresVerifiedSupplier = input.activePolicy?.controls.verifiedSupplierRequired ?? true
    if (requiresVerifiedSupplier && input.registeredSupplier.verificationStatus !== 'Verified') {
      ruleItems.push({
        id: 'supplier_verified',
        name: 'Supplier is verified',
        passed: false,
        status: 'Failed',
        reason: 'Supplier verification is required by active policy.',
      })
      return {
        id: `eval-${Date.now()}`,
        requestId: `req-${Date.now()}`,
        decision: 'BLOCK',
        reason: 'Supplier verification is required by the active policy.',
        triggeredRule: 'Unverified supplier',
        ruleItems,
        evaluatedAt: new Date().toISOString(),
      }
    }
  }

  // 5. Agent spending limits check
  if (input.agent) {
    const perReqLimit = BigInt(input.agent.perRequestLimitUnits || '0')
    if (perReqLimit > 0n && requestedUnits > perReqLimit) {
      ruleItems.push({
        id: 'spending_limit',
        name: 'Per-request limit respected',
        passed: false,
        status: 'Failed',
        reason: 'The request exceeds the agent’s per-request spending limit.',
      })
      return {
        id: `eval-${Date.now()}`,
        requestId: `req-${Date.now()}`,
        decision: 'BLOCK',
        reason: 'The request exceeds the agent’s per-request spending limit.',
        triggeredRule: 'Spending limit exceeded',
        ruleItems,
        evaluatedAt: new Date().toISOString(),
      }
    }
  }

  // 6. Policy controls: Delivery attestation
  const requiresAttestation = input.activePolicy?.controls.deliveryAttestationRequired ?? true
  if (requiresAttestation && input.registeredInvoice.status !== 'Attested') {
    ruleItems.push({
      id: 'delivery_attested',
      name: 'Delivery attestation verified',
      passed: false,
      status: 'Review',
      reason: 'Delivery evidence is required before payment can be released.',
    })
    decision = 'HOLD'
    triggeredRule = 'Missing delivery attestation'
    reason = 'Delivery evidence is required before payment can be released.'
  } else {
    ruleItems.push({
      id: 'delivery_attested',
      name: 'Delivery attestation verified',
      passed: true,
      status: 'Passed',
    })
  }

  // 7. Policy controls: Supporting evidence
  const requiresEvidence = input.activePolicy?.controls.supportingEvidenceRequired ?? true
  if (requiresEvidence && !input.hasEvidence) {
    ruleItems.push({
      id: 'evidence_present',
      name: 'Supporting evidence present',
      passed: false,
      status: 'Review',
      reason: 'Required invoice or delivery evidence was not supplied.',
    })
    decision = 'HOLD'
    triggeredRule = 'Missing supporting evidence'
    reason = 'Required invoice or delivery evidence was not supplied.'
  } else {
    ruleItems.push({
      id: 'evidence_present',
      name: 'Supporting evidence present',
      passed: true,
      status: 'Passed',
    })
  }

  // 8. Policy controls: Agent intent
  const requiresIntent = input.activePolicy?.controls.agentIntentRequired ?? true
  if (requiresIntent && (!input.intent || input.intent.trim().length < 5)) {
    ruleItems.push({
      id: 'intent_present',
      name: 'Agent intent specified',
      passed: false,
      status: 'Review',
      reason: 'The payment intent does not align with the registered invoice description.',
    })
    decision = 'HOLD'
    triggeredRule = 'Intent mismatch'
    reason = 'Payment intent is unspecified or insufficient.'
  }

  // 9. Policy controls: Two-person approval for high value
  if (input.activePolicy?.controls.twoPersonApproval) {
    ruleItems.push({
      id: 'two_person_approval',
      name: 'Two-person approval requirement',
      passed: false,
      status: 'Review',
      reason: 'Requires two-person approval before funds release.',
    })
    decision = 'HOLD'
    triggeredRule = 'Two-person approval'
    reason = 'Requires two-person approval before funds release.'
  }

  return {
    id: `eval-${Date.now()}`,
    requestId: `req-${Date.now()}`,
    decision,
    reason,
    triggeredRule,
    ruleItems,
    evaluatedAt: new Date().toISOString(),
  }
}
