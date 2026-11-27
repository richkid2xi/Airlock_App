import type { Decision } from './types'

export interface EvaluatePaymentRequestInput {
  org: string
  agent: {
    id: string
    name: string
    identifier: string
    status: 'active' | 'disabled'
    perRequestLimitMinor: string
    dailyLimitMinor: string
  }
  policy: {
    id: string
    name: string
    controls: {
      verifiedSupplierRequired: boolean
      deliveryAttestationRequired: boolean
      agentIntentRequired: boolean
      supportingEvidenceRequired: boolean
      twoPersonApproval: boolean
    }
    approvalThresholdMinor?: string
    maxInvoiceMinor?: string
  }
  supplier: {
    id: string
    name: string
    payoutWallet: string
    verificationStatus: 'verified' | 'unverified' | 'review_required'
  }
  invoice: {
    id: string
    invoiceNumber: string
    supplierId: string
    payeeWallet: string
    amountMinor: string
    currency: string
    mint: string | null
    status: 'open' | 'attested' | 'paid' | 'disputed'
  }
  request: {
    invoiceId: string
    claimedPayee?: string
    claimedAmountMinor?: string
    claimedMint?: string
  }
  history: {
    committedTodayMinor: string
    committedInvoiceIds: string[]
  }
  now: string
}

export interface RuleResult {
  id: string
  label: string
  status: 'pass' | 'fail' | 'hold' | 'skipped'
  detail: string
}

export interface EvaluatePaymentRequestOutput {
  decision: Decision
  failedRule?: string
  reasonCode: string
  rules: RuleResult[]
  snapshot: {
    org: string
    agentId: string
    invoiceId: string
    requestedAmountMinor: string
    payeeWallet: string
    currency: string
    mint: string | null
    decision: Decision
    twoPersonApproval: boolean
    evaluatedAt: string
  }
}

function minor(value: string | undefined | null): bigint {
  try { return BigInt(value ?? '0') } catch { return BigInt(0) }
}

export function evaluatePaymentRequest(input: EvaluatePaymentRequestInput): EvaluatePaymentRequestOutput {
  const rules: RuleResult[] = []
  const { agent, policy, supplier, invoice, request, history } = input

  const requestedAmountMinor = request.claimedAmountMinor ?? invoice.amountMinor
  const requestedAmount = minor(requestedAmountMinor)
  const invoiceAmount = minor(invoice.amountMinor)
  const perRequestLimit = minor(agent.perRequestLimitMinor)
  const dailyLimit = minor(agent.dailyLimitMinor)
  const committedToday = minor(history.committedTodayMinor)

  // Snapshot base
  const snapshotBase = {
    org: input.org,
    agentId: agent.id,
    invoiceId: invoice.id,
    requestedAmountMinor,
    payeeWallet: request.claimedPayee ?? invoice.payeeWallet,
    currency: invoice.currency,
    mint: request.claimedMint ?? invoice.mint,
    twoPersonApproval: policy.controls.twoPersonApproval,
  }

  // 1. agent active -> BLOCK agent_disabled
  if (agent.status === 'disabled') {
    rules.push({ id: 'agent_disabled', label: 'Agent authorized', status: 'fail', detail: 'This agent is not authorized to initiate payment requests.' })
    return { decision: 'BLOCK', failedRule: 'agent_disabled', reasonCode: 'agent_disabled', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'agent_disabled', label: 'Agent authorized', status: 'pass', detail: 'Agent is active.' })

  // 2. invoice exists in same org -> BLOCK invoice_not_found
  if (!invoice.id || invoice.supplierId === '') {
    rules.push({ id: 'invoice_not_found', label: 'Invoice registered', status: 'fail', detail: 'No matching registered invoice found in this organization.' })
    return { decision: 'BLOCK', failedRule: 'invoice_not_found', reasonCode: 'invoice_not_found', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'invoice_not_found', label: 'Invoice registered', status: 'pass', detail: 'Invoice is registered in this organization.' })

  // 3. committed or disputed -> BLOCK invoice_already_paid / invoice_disputed
  if (history.committedInvoiceIds.includes(invoice.id)) {
    rules.push({ id: 'invoice_already_paid', label: 'Invoice not already committed', status: 'fail', detail: 'This invoice already has a committed payment.' })
    return { decision: 'BLOCK', failedRule: 'invoice_already_paid', reasonCode: 'invoice_already_paid', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'invoice_already_paid', label: 'Invoice not already committed', status: 'pass', detail: 'Invoice is not committed yet.' })

  if (invoice.status === 'disputed') {
    rules.push({ id: 'invoice_disputed', label: 'Invoice not disputed', status: 'fail', detail: 'Payment requests for this invoice are blocked until the dispute is resolved.' })
    return { decision: 'BLOCK', failedRule: 'invoice_disputed', reasonCode: 'invoice_disputed', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'invoice_disputed', label: 'Invoice not disputed', status: 'pass', detail: 'Invoice is not disputed.' })

  // 4. claimed payee / amount / mint must equal invoice -> BLOCK payee_mismatch / amount_mismatch / mint_mismatch
  if (request.claimedPayee && request.claimedPayee !== invoice.payeeWallet) {
    rules.push({ id: 'payee_mismatch', label: 'Claimed payee matches invoice payee', status: 'fail', detail: 'Requested payout wallet does not match the invoice payee.' })
    return { decision: 'BLOCK', failedRule: 'payee_mismatch', reasonCode: 'payee_mismatch', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'payee_mismatch', label: 'Claimed payee matches invoice payee', status: 'pass', detail: 'Claimed payee matches invoice payee.' })

  if (request.claimedAmountMinor !== undefined && request.claimedAmountMinor !== invoice.amountMinor) {
    rules.push({ id: 'amount_mismatch', label: 'Claimed amount matches invoice amount', status: 'fail', detail: 'Requested amount does not match the invoice amount.' })
    return { decision: 'BLOCK', failedRule: 'amount_mismatch', reasonCode: 'amount_mismatch', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'amount_mismatch', label: 'Claimed amount matches invoice amount', status: 'pass', detail: 'Claimed amount matches invoice amount.' })

  if (request.claimedMint !== undefined && request.claimedMint !== null && invoice.mint !== null && request.claimedMint !== invoice.mint) {
    rules.push({ id: 'mint_mismatch', label: 'Claimed mint matches invoice mint', status: 'fail', detail: 'Requested mint does not match the invoice mint.' })
    return { decision: 'BLOCK', failedRule: 'mint_mismatch', reasonCode: 'mint_mismatch', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'mint_mismatch', label: 'Claimed mint matches invoice mint', status: 'pass', detail: 'Claimed mint matches invoice mint.' })

  // 5. above agent per-request limit or policy max invoice -> BLOCK over_limit
  if (perRequestLimit > BigInt(0) && requestedAmount > perRequestLimit) {
    rules.push({ id: 'over_limit', label: 'Within agent per-request limit', status: 'fail', detail: 'Requested amount exceeds the agent per-request limit.' })
    return { decision: 'BLOCK', failedRule: 'over_limit', reasonCode: 'over_limit', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'over_limit', label: 'Within agent per-request limit', status: 'pass', detail: 'Requested amount is within the agent per-request limit.' })

  if (policy.maxInvoiceMinor !== undefined && minor(policy.maxInvoiceMinor) > BigInt(0) && requestedAmount > minor(policy.maxInvoiceMinor)) {
    rules.push({ id: 'over_limit', label: 'Within policy max invoice', status: 'fail', detail: 'Requested amount exceeds the policy max invoice amount.' })
    return { decision: 'BLOCK', failedRule: 'over_limit', reasonCode: 'over_limit', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'over_limit', label: 'Within policy max invoice', status: 'pass', detail: 'Requested amount is within the policy max invoice amount.' })

  // 6. today's committed total + amount above daily cap -> BLOCK daily_cap_exceeded
  if (requestedAmount + committedToday > dailyLimit && dailyLimit > BigInt(0)) {
    rules.push({ id: 'daily_cap_exceeded', label: 'Within daily cap', status: 'fail', detail: 'Today committed total plus requested amount exceeds the daily cap.' })
    return { decision: 'BLOCK', failedRule: 'daily_cap_exceeded', reasonCode: 'daily_cap_exceeded', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'daily_cap_exceeded', label: 'Within daily cap', status: 'pass', detail: 'Daily cap not exceeded.' })

  // 7. policy requires verified supplier and it is not -> BLOCK supplier_unverified
  if (policy.controls.verifiedSupplierRequired && supplier.verificationStatus !== 'verified') {
    rules.push({ id: 'supplier_unverified', label: 'Supplier verified', status: 'fail', detail: 'Supplier verification is required by the active policy.' })
    return { decision: 'BLOCK', failedRule: 'supplier_unverified', reasonCode: 'supplier_unverified', rules, snapshot: { ...snapshotBase, decision: 'BLOCK', evaluatedAt: input.now } }
  }
  rules.push({ id: 'supplier_unverified', label: 'Supplier verified', status: 'pass', detail: 'Supplier is verified.' })

  // 8. attestation required but missing -> HOLD needs_attestation
  if (policy.controls.deliveryAttestationRequired && invoice.status !== 'attested') {
    rules.push({ id: 'needs_attestation', label: 'Delivery attested', status: 'hold', detail: 'Delivery evidence is required before payment can be released.' })
    return { decision: 'HOLD', failedRule: 'needs_attestation', reasonCode: 'needs_attestation', rules, snapshot: { ...snapshotBase, decision: 'HOLD', evaluatedAt: input.now } }
  }
  rules.push({ id: 'needs_attestation', label: 'Delivery attested', status: 'pass', detail: 'Delivery attested.' })

  // 9. above approval threshold or two-person approval -> HOLD needs_approval
  if (policy.controls.twoPersonApproval) {
    rules.push({ id: 'needs_approval', label: 'Two-person approval', status: 'hold', detail: 'Requires two-person approval before funds release.' })
    return { decision: 'HOLD', failedRule: 'needs_approval', reasonCode: 'needs_approval', rules, snapshot: { ...snapshotBase, decision: 'HOLD', evaluatedAt: input.now } }
  }
  rules.push({ id: 'needs_approval', label: 'Two-person approval', status: 'pass', detail: 'Two-person approval not required.' })

  if (policy.approvalThresholdMinor !== undefined && minor(policy.approvalThresholdMinor) > BigInt(0) && requestedAmount > minor(policy.approvalThresholdMinor)) {
    rules.push({ id: 'needs_approval', label: 'Within approval threshold', status: 'hold', detail: 'Amount exceeds the approval threshold and needs human review.' })
    return { decision: 'HOLD', failedRule: 'needs_approval', reasonCode: 'needs_approval', rules, snapshot: { ...snapshotBase, decision: 'HOLD', evaluatedAt: input.now } }
  }
  rules.push({ id: 'needs_approval', label: 'Within approval threshold', status: 'pass', detail: 'Amount is within the approval threshold.' })

  rules.push({ id: 'final_decision', label: 'Decision', status: 'pass', detail: 'All controls passed; request allowed.' })
  return { decision: 'ALLOW', failedRule: undefined, reasonCode: '', rules, snapshot: { ...snapshotBase, decision: 'ALLOW', evaluatedAt: input.now } }
}
