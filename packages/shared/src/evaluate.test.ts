import { describe, it, expect } from 'vitest'
import { evaluate, type EvaluateInput } from './evaluate'

const baseInput: EvaluateInput = {
  invoiceNumber: 'INV-2048',
  requestedAmountUnits: '12480000000',
  destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  agentId: 'agt-procurebot',
  intent: 'Settle registered software services invoice',
  hasEvidence: true,
  registeredInvoice: {
    number: 'INV-2048',
    amountUnits: '12480000000',
    status: 'Attested',
  },
  registeredSupplier: {
    payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    verificationStatus: 'Verified',
  },
  agent: {
    status: 'Active',
    perRequestLimitUnits: '25000000000',
  },
  policyControls: {
    verifiedSupplierRequired: true,
    deliveryAttestationRequired: true,
    agentIntentRequired: true,
    supportingEvidenceRequired: true,
    twoPersonApproval: false,
  },
}

function inputWith(overrides: Partial<EvaluateInput>): EvaluateInput {
  return { ...baseInput, ...overrides }
}

describe('Shared evaluator: pure evaluate() against golden vectors', () => {
  it('GV-001: valid payment request matching invoice, verified supplier, and limits → ALLOW', () => {
    const result = evaluate(inputWith({
      policyControls: {
        verifiedSupplierRequired: true,
        deliveryAttestationRequired: true,
        agentIntentRequired: true,
        supportingEvidenceRequired: true,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('ALLOW')
    expect(result.reason).toContain('All registered invoice, supplier, evidence and policy controls passed')
  })

  it('GV-002: payee/payout wallet mismatch → BLOCK', () => {
    const result = evaluate(inputWith({
      destinationWallet: 'AttackerWallet111111111111111111111111111111',
      policyControls: {
        verifiedSupplierRequired: true,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('BLOCK')
    expect(result.reason).toContain('Payout wallet does not match')
    expect(result.triggeredRule).toBe('wallet-mismatch')
  })

  it('GV-003: invoice amount manipulation (requested > registered) → BLOCK', () => {
    const result = evaluate(inputWith({
      requestedAmountUnits: '15000000000',
      policyControls: {
        verifiedSupplierRequired: false,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('BLOCK')
    expect(result.reason).toContain('exceeds the registered invoice amount')
    expect(result.triggeredRule).toBe('amount-exceeds-invoice')
  })

  it('GV-004: unverified supplier when policy requires verified → BLOCK', () => {
    const result = evaluate(inputWith({
      destinationWallet: 'SupplierWallet111111111111111111111111111111',
      registeredSupplier: {
        payoutWallet: 'SupplierWallet111111111111111111111111111111',
        verificationStatus: 'Unverified',
      },
      policyControls: {
        verifiedSupplierRequired: true,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('BLOCK')
    expect(result.reason).toContain('Supplier verification is required')
    expect(result.triggeredRule).toBe('verified-supplier')
  })

  it('GV-005: duplicate payment on already paid invoice → BLOCK', () => {
    const result = evaluate(inputWith({
      registeredInvoice: {
        number: 'INV-2048',
        amountUnits: '12480000000',
        status: 'Paid',
      },
      policyControls: {
        verifiedSupplierRequired: false,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('BLOCK')
    expect(result.reason).toContain('already has a completed payment')
    expect(result.triggeredRule).toBe('invoice-paid')
  })

  it('GV-006: missing delivery attestation → HOLD', () => {
    const result = evaluate(inputWith({
      requestedAmountUnits: '8920000000',
      registeredInvoice: {
        number: 'INV-2053',
        amountUnits: '8920000000',
        status: 'Open',
      },
      policyControls: {
        verifiedSupplierRequired: false,
        deliveryAttestationRequired: true,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('HOLD')
    expect(result.reason).toContain('Delivery evidence is required')
    expect(result.triggeredRule).toBe('delivery-attestation')
  })

  it('GV-007: spending limit exceeded → BLOCK', () => {
    const result = evaluate(inputWith({
      requestedAmountUnits: '30000000000',
      registeredInvoice: {
        number: 'INV-9999',
        amountUnits: '30000000000',
        status: 'Attested',
      },
      agent: {
        status: 'Active',
        perRequestLimitUnits: '25000000000',
      },
      policyControls: {
        verifiedSupplierRequired: false,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('BLOCK')
    expect(result.reason).toContain('exceeds the agent')
    expect(result.triggeredRule).toBe('per-request-limit')
  })

  it('GV-008: missing supporting evidence → HOLD', () => {
    const result = evaluate(inputWith({
      hasEvidence: false,
      policyControls: {
        verifiedSupplierRequired: false,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: true,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('HOLD')
    expect(result.reason).toContain('Required invoice or delivery evidence was not supplied')
    expect(result.triggeredRule).toBe('supporting-evidence')
  })

  it('GV-009: frozen/disabled agent → BLOCK', () => {
    const result = evaluate(inputWith({
      agent: {
        status: 'Disabled',
        perRequestLimitUnits: '2500000000',
      },
      policyControls: {
        verifiedSupplierRequired: false,
        deliveryAttestationRequired: false,
        agentIntentRequired: false,
        supportingEvidenceRequired: false,
        twoPersonApproval: false,
      },
    }))
    expect(result.decision).toBe('BLOCK')
    expect(result.reason).toContain('agent is not authorized')
    expect(result.triggeredRule).toBe('agent-disabled')
  })

  it('GV-010: two-person approval required → HOLD', () => {
    const result = evaluate(inputWith({
      policyControls: {
        verifiedSupplierRequired: true,
        deliveryAttestationRequired: true,
        agentIntentRequired: true,
        supportingEvidenceRequired: true,
        twoPersonApproval: true,
      },
    }))
    expect(result.decision).toBe('HOLD')
    expect(result.reason).toContain('Requires two-person approval before funds release')
    expect(result.triggeredRule).toBe('two-person-approval')
  })

  it('all 10 golden vectors produce expected decisions', () => {
    const cases: Array<{ name: string; input: EvaluateInput; expected: 'ALLOW' | 'BLOCK' | 'HOLD' }> = [
      { name: 'GV-001', input: inputWith({ policyControls: { verifiedSupplierRequired: true, deliveryAttestationRequired: true, agentIntentRequired: true, supportingEvidenceRequired: true, twoPersonApproval: false } }), expected: 'ALLOW' },
      { name: 'GV-002', input: inputWith({ destinationWallet: 'AttackerWallet111111111111111111111111111111', policyControls: { verifiedSupplierRequired: true, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'BLOCK' },
      { name: 'GV-003', input: inputWith({ requestedAmountUnits: '15000000000', policyControls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'BLOCK' },
      { name: 'GV-004', input: inputWith({ registeredSupplier: { payoutWallet: 'SupplierWallet111111111111111111111111111111', verificationStatus: 'Unverified' }, policyControls: { verifiedSupplierRequired: true, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'BLOCK' },
      { name: 'GV-005', input: inputWith({ registeredInvoice: { number: 'INV-2048', amountUnits: '12480000000', status: 'Paid' }, policyControls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'BLOCK' },
      { name: 'GV-006', input: inputWith({ requestedAmountUnits: '8920000000', registeredInvoice: { number: 'INV-2053', amountUnits: '8920000000', status: 'Open' }, policyControls: { verifiedSupplierRequired: false, deliveryAttestationRequired: true, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'HOLD' },
      { name: 'GV-007', input: inputWith({ requestedAmountUnits: '30000000000', registeredInvoice: { number: 'INV-9999', amountUnits: '30000000000', status: 'Attested' }, agent: { status: 'Active', perRequestLimitUnits: '25000000000' }, policyControls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'BLOCK' },
      { name: 'GV-008', input: inputWith({ hasEvidence: false, policyControls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: true, twoPersonApproval: false } }), expected: 'HOLD' },
      { name: 'GV-009', input: inputWith({ agent: { status: 'Disabled', perRequestLimitUnits: '2500000000' }, policyControls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } }), expected: 'BLOCK' },
      { name: 'GV-010', input: inputWith({ policyControls: { verifiedSupplierRequired: true, deliveryAttestationRequired: true, agentIntentRequired: true, supportingEvidenceRequired: true, twoPersonApproval: true } }), expected: 'HOLD' },
    ]
    for (const c of cases) {
      const result = evaluate(c.input)
      expect(result.decision, c.name).toBe(c.expected)
    }
  })
})
