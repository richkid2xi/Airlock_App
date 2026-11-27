import { describe, it, expect } from 'vitest'
import { evaluatePaymentRequest } from '../src/evaluateRequest'

describe('Pure evaluator: request evaluation', () => {
  const baseOrg = 'org-1'
  const baseSupplier = { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' }
  const baseInvoice = { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' }
  const baseAgent = { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' }
  const basePolicy = { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }

  function makeInput(overrides: any = {}): any {
    return {
      org: baseOrg,
      agent: overrides.agent ?? baseAgent,
      policy: overrides.policy ?? basePolicy,
      supplier: overrides.supplier ?? baseSupplier,
      invoice: overrides.invoice ?? baseInvoice,
      request: overrides.request ?? { invoiceId: 'inv-1' },
      history: overrides.history ?? { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    }
  }

  it('allows a clean request', () => {
    const r = evaluatePaymentRequest(makeInput())
    expect(r.decision).toBe('ALLOW')
    expect(r.failedRule).toBeUndefined()
    expect(r.reasonCode).toBe('')
    expect(r.rules.every(x => x.status === 'pass')).toBe(true)
  })

  it('blocks disabled agent first', () => {
    const r = evaluatePaymentRequest(makeInput({ agent: { ...baseAgent, status: 'disabled' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('agent_disabled')
  })

  it('blocks disputed invoice', () => {
    const r = evaluatePaymentRequest(makeInput({ invoice: { ...baseInvoice, status: 'disputed' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('invoice_disputed')
  })

  it('blocks committed invoice id', () => {
    const r = evaluatePaymentRequest(makeInput({ history: { ...{ committedTodayMinor: '0', committedInvoiceIds: [] }, committedInvoiceIds: ['inv-1'] } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('invoice_already_paid')
  })

  it('blocks payee mismatch', () => {
    const r = evaluatePaymentRequest(makeInput({ request: { ...{ invoiceId: 'inv-1' }, claimedPayee: 'AttackerWallet111111111111111111111111111111' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('payee_mismatch')
  })

  it('blocks amount mismatch', () => {
    const r = evaluatePaymentRequest(makeInput({ request: { ...{ invoiceId: 'inv-1' }, claimedAmountMinor: '9000000000' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('amount_mismatch')
  })

  it('blocks mint mismatch', () => {
    const r = evaluatePaymentRequest(makeInput({ invoice: { ...baseInvoice, mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' }, request: { ...{ invoiceId: 'inv-1' }, claimedMint: 'AttackerMint111111111111111111111111111111' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('mint_mismatch')
  })

  it('blocks per-request limit exceeded', () => {
    const r = evaluatePaymentRequest(makeInput({ invoice: { ...baseInvoice, amountMinor: '50000000001' }, request: { ...{ invoiceId: 'inv-1' }, claimedAmountMinor: '50000000001' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('over_limit')
  })

  it('allows amount exactly at limit', () => {
    const r = evaluatePaymentRequest(makeInput({ invoice: { ...baseInvoice, amountMinor: '50000000000' }, request: { ...{ invoiceId: 'inv-1' }, claimedAmountMinor: '50000000000' } }))
    expect(r.decision).toBe('ALLOW')
  })

  it('blocks daily cap exceeded', () => {
    const r = evaluatePaymentRequest(makeInput({ agent: { ...baseAgent, perRequestLimitMinor: '500000000000', dailyLimitMinor: '10000000000' }, invoice: { ...baseInvoice, amountMinor: '10000000001' }, request: { ...{ invoiceId: 'inv-1' }, claimedAmountMinor: '10000000001' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('daily_cap_exceeded')
  })

  it('allows daily cap reached exactly', () => {
    const r = evaluatePaymentRequest(makeInput({ agent: { ...baseAgent, perRequestLimitMinor: '500000000000', dailyLimitMinor: '10000000000' }, invoice: { ...baseInvoice, amountMinor: '10000000000' }, request: { ...{ invoiceId: 'inv-1' }, claimedAmountMinor: '10000000000' } }))
    expect(r.decision).toBe('ALLOW')
  })

  it('holds for missing attestation', () => {
    const r = evaluatePaymentRequest(makeInput({ policy: { ...basePolicy, controls: { ...basePolicy.controls, deliveryAttestationRequired: true } }, invoice: { ...baseInvoice, status: 'open' } }))
    expect(r.decision).toBe('HOLD')
    expect(r.reasonCode).toBe('needs_attestation')
  })

  it('holds for two-person approval', () => {
    const r = evaluatePaymentRequest(makeInput({ policy: { ...basePolicy, controls: { ...basePolicy.controls, twoPersonApproval: true } } }))
    expect(r.decision).toBe('HOLD')
    expect(r.reasonCode).toBe('needs_approval')
  })

  it('holds for above approval threshold', () => {
    const r = evaluatePaymentRequest(makeInput({ policy: { ...basePolicy, approvalThresholdMinor: '10000000000' }, invoice: { ...baseInvoice, amountMinor: '10000000001' }, request: { ...{ invoiceId: 'inv-1' }, claimedAmountMinor: '10000000001' } }))
    expect(r.decision).toBe('HOLD')
    expect(r.reasonCode).toBe('needs_approval')
  })

  it('blocks unverified supplier when required', () => {
    const r = evaluatePaymentRequest(makeInput({ policy: { ...basePolicy, controls: { ...basePolicy.controls, verifiedSupplierRequired: true } }, supplier: { ...baseSupplier, verificationStatus: 'unverified' } }))
    expect(r.decision).toBe('BLOCK')
    expect(r.reasonCode).toBe('supplier_unverified')
  })

  it('is deterministic across repeated calls', () => {
    const a = evaluatePaymentRequest(makeInput())
    const b = evaluatePaymentRequest(makeInput())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('ignores irrelevant fields', () => {
    const r1 = evaluatePaymentRequest(makeInput())
    const r2 = evaluatePaymentRequest(makeInput({ agent: { ...baseAgent, name: 'Renamed Agent' }, org: 'org-other' }))
    expect(r1.decision).toBe(r2.decision)
    expect(r1.reasonCode).toBe(r2.reasonCode)
  })
})