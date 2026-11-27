import type { Decision, PolicyControls } from '@airlock/shared'

/**
 * Golden vector definition for payment requests evaluation
 * Rule 10: TEST FIRST. Define golden vectors in packages/golden BEFORE writing the logic they test.
 */
export interface EvaluationGoldenVector {
  id: string
  description: string
  request: {
    invoiceNumber: string
    requestedAmountUnits: string
    destinationWallet: string
    agentId: string
    intent: string
    hasEvidence: boolean
  }
  registeredInvoice?: {
    number: string
    amountUnits: string
    status: 'Open' | 'Attested' | 'Paid' | 'Disputed'
  }
  registeredSupplier?: {
    payoutWallet: string
    verificationStatus: 'Verified' | 'Unverified' | 'Review required'
    operationalStatus: 'Active' | 'Pending' | 'Restricted'
  }
  agentState?: {
    status: 'Active' | 'Disabled'
    perRequestLimitUnits: string
    dailyLimitUnits: string
    spentTodayUnits: string
  }
  policyControls: PolicyControls
  expectedDecision: Decision
  expectedReasonSnippet: string
}

export const EVALUATION_GOLDEN_VECTORS: EvaluationGoldenVector[] = [
  {
    id: 'GV-001',
    description: 'Valid payment request matching invoice, verified supplier, and limits',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '12480000000', // 12,480.00 USDC
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      agentId: 'agt-procurebot',
      intent: 'Settle registered software services invoice',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    agentState: {
      status: 'Active',
      perRequestLimitUnits: '25000000000',
      dailyLimitUnits: '75000000000',
      spentTodayUnits: '0',
    },
    policyControls: {
      verifiedSupplierRequired: true,
      deliveryAttestationRequired: true,
      agentIntentRequired: true,
      supportingEvidenceRequired: true,
      twoPersonApproval: false,
    },
    expectedDecision: 'ALLOW',
    expectedReasonSnippet: 'All registered invoice, supplier, evidence and policy controls passed',
  },
  {
    id: 'GV-002',
    description: 'Payee or payout wallet mismatch between request and registered supplier',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '12480000000',
      destinationWallet: 'AttackerWallet111111111111111111111111111111',
      agentId: 'agt-procurebot',
      intent: 'Settle software services',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    policyControls: {
      verifiedSupplierRequired: true,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'BLOCK',
    expectedReasonSnippet: 'payout wallet does not match',
  },
  {
    id: 'GV-003',
    description: 'Invoice amount manipulation: agent requests more than registered invoice amount',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '15000000000', // Requests 15,000 but invoice is 12,480
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      agentId: 'agt-procurebot',
      intent: 'Settle software services',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    policyControls: {
      verifiedSupplierRequired: false,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'BLOCK',
    expectedReasonSnippet: 'Requested amount exceeds the registered invoice amount',
  },
  {
    id: 'GV-004',
    description: 'Unverified supplier when policy requires verified supplier',
    request: {
      invoiceNumber: 'INV-2042',
      requestedAmountUnits: '4200000000',
      destinationWallet: 'SupplierWallet111111111111111111111111111111',
      agentId: 'agt-procurebot',
      intent: 'Hardware purchase',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2042',
      amountUnits: '4200000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: 'SupplierWallet111111111111111111111111111111',
      verificationStatus: 'Unverified',
      operationalStatus: 'Restricted',
    },
    policyControls: {
      verifiedSupplierRequired: true,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'BLOCK',
    expectedReasonSnippet: 'Supplier verification is required',
  },
  {
    id: 'GV-005',
    description: 'Duplicate payment on already paid invoice',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '12480000000',
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      agentId: 'agt-procurebot',
      intent: 'Settle software services',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Paid',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    policyControls: {
      verifiedSupplierRequired: false,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'BLOCK',
    expectedReasonSnippet: 'already has a completed payment',
  },
  {
    id: 'GV-006',
    description: 'Missing delivery attestation holds payment for human review',
    request: {
      invoiceNumber: 'INV-2053',
      requestedAmountUnits: '8920000000',
      destinationWallet: 'AtlasWallet111111111111111111111111111111',
      agentId: 'agt-ap-assistant',
      intent: 'Freight payment',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2053',
      amountUnits: '8920000000',
      status: 'Open', // NOT attested
    },
    registeredSupplier: {
      payoutWallet: 'AtlasWallet111111111111111111111111111111',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    policyControls: {
      verifiedSupplierRequired: false,
      deliveryAttestationRequired: true,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'HOLD',
    expectedReasonSnippet: 'Delivery evidence is required before payment can be released',
  },
  {
    id: 'GV-007',
    description: 'Spending limit exceeded for agent',
    request: {
      invoiceNumber: 'INV-9999',
      requestedAmountUnits: '30000000000', // 30,000 exceeds 25,000 limit
      destinationWallet: 'SupplierWallet111111111111111111111111111111',
      agentId: 'agt-procurebot',
      intent: 'Heavy procurement',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-9999',
      amountUnits: '30000000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: 'SupplierWallet111111111111111111111111111111',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    agentState: {
      status: 'Active',
      perRequestLimitUnits: '25000000000',
      dailyLimitUnits: '75000000000',
      spentTodayUnits: '0',
    },
    policyControls: {
      verifiedSupplierRequired: false,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'BLOCK',
    expectedReasonSnippet: 'exceeds the agent’s per-request spending limit',
  },
  {
    id: 'GV-008',
    description: 'Missing supporting evidence holds payment for review',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '12480000000',
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      agentId: 'agt-procurebot',
      intent: 'Settle software services',
      hasEvidence: false,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    policyControls: {
      verifiedSupplierRequired: false,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: true,
      twoPersonApproval: false,
    },
    expectedDecision: 'HOLD',
    expectedReasonSnippet: 'Required invoice or delivery evidence was not supplied',
  },
  {
    id: 'GV-009',
    description: 'Frozen or disabled agent cannot initiate payment',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '12480000000',
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      agentId: 'agt-research-agent',
      intent: 'Research purchase',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    agentState: {
      status: 'Disabled',
      perRequestLimitUnits: '2500000000',
      dailyLimitUnits: '5000000000',
      spentTodayUnits: '0',
    },
    policyControls: {
      verifiedSupplierRequired: false,
      deliveryAttestationRequired: false,
      agentIntentRequired: false,
      supportingEvidenceRequired: false,
      twoPersonApproval: false,
    },
    expectedDecision: 'BLOCK',
    expectedReasonSnippet: 'agent is not authorized',
  },
  {
    id: 'GV-010',
    description: 'Two-person approval requirement flags high-value payment as HOLD',
    request: {
      invoiceNumber: 'INV-2048',
      requestedAmountUnits: '12480000000',
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      agentId: 'agt-procurebot',
      intent: 'Settle software services',
      hasEvidence: true,
    },
    registeredInvoice: {
      number: 'INV-2048',
      amountUnits: '12480000000',
      status: 'Attested',
    },
    registeredSupplier: {
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    },
    policyControls: {
      verifiedSupplierRequired: true,
      deliveryAttestationRequired: true,
      agentIntentRequired: true,
      supportingEvidenceRequired: true,
      twoPersonApproval: true,
    },
    expectedDecision: 'HOLD',
    expectedReasonSnippet: 'Requires two-person approval before funds release.',
  },
]

// ---------------------------------------------------------------------------
// NEW SHAPE — GV-011..GV-030 (request evaluation slice)
// Keep GV-001..010 above untouched. New vectors use this shape:
// { id, description, input:{org, agent, policy, supplier, invoice, request:{invoiceId, claimedPayee?, claimedAmountMinor?, claimedMint?}, history:{committedTodayMinor, committedInvoiceIds}, now},
//   expected:{decision, failedRule?, reasonCode, onChainEnforced} }
// Money as minor-unit strings; never floats.
// ---------------------------------------------------------------------------
export interface PaymentEvaluationVector {
  id: string
  description: string
  input: {
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
  expected: {
    decision: 'ALLOW' | 'BLOCK' | 'HOLD'
    failedRule?: string
    reasonCode: string
    onChainEnforced: boolean
  }
}

export const PAYMENT_EVALUATION_VECTORS: PaymentEvaluationVector[] = [
  // GV-011: amount exactly at per-request limit -> ALLOW
  {
    id: 'GV-011',
    description: 'Amount exactly at the agent per-request limit -> ALLOW',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false }, maxInvoiceMinor: '100000000000' },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '50000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'ALLOW', failedRule: undefined, reasonCode: '', onChainEnforced: true },
  },
  // GV-012: one minor unit over per-request limit -> BLOCK over_limit
  {
    id: 'GV-012',
    description: 'Amount one minor unit over per-request limit -> BLOCK over_limit',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false }, maxInvoiceMinor: '100000000000' },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '50000000001', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', claimedAmountMinor: '50000000001' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'over_limit', reasonCode: 'over_limit', onChainEnforced: true },
  },
  // GV-013: same invoice twice -> BLOCK invoice_already_paid (committedInvoiceIds contains invoiceId)
  {
    id: 'GV-013',
    description: 'Same invoice requested again while committed -> BLOCK invoice_already_paid',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'paid' },
      request: { invoiceId: 'inv-1' },
      history: { committedTodayMinor: '10000000000', committedInvoiceIds: ['inv-1'] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'invoice_already_paid', reasonCode: 'invoice_already_paid', onChainEnforced: true },
  },
  // GV-014: already committed invoice id -> BLOCK invoice_already_paid
  {
    id: 'GV-014',
    description: 'Invoice id already in committed set -> BLOCK invoice_already_paid',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1' },
      history: { committedTodayMinor: '5000000000', committedInvoiceIds: ['inv-1', 'inv-2'] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'invoice_already_paid', reasonCode: 'invoice_already_paid', onChainEnforced: true },
  },
  // GV-015: disputed invoice -> BLOCK invoice_disputed
  {
    id: 'GV-015',
    description: 'Invoice disputed -> BLOCK invoice_disputed',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'disputed' },
      request: { invoiceId: 'inv-1' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'invoice_disputed', reasonCode: 'invoice_disputed', onChainEnforced: true },
  },
  // GV-016: agent disabled -> BLOCK agent_disabled
  {
    id: 'GV-016',
    description: 'Agent disabled -> BLOCK agent_disabled',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'disabled', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'agent_disabled', reasonCode: 'agent_disabled', onChainEnforced: true },
  },
  // GV-017: claimed payee different -> BLOCK payee_mismatch
  {
    id: 'GV-017',
    description: 'Claimed payee differs from invoice payee -> BLOCK payee_mismatch',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: 'AttackerWallet111111111111111111111111111111' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'payee_mismatch', reasonCode: 'payee_mismatch', onChainEnforced: true },
  },
  // GV-018: claimed payee equal -> ALLOW
  {
    id: 'GV-018',
    description: 'Claimed payee equal to invoice payee -> ALLOW',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'ALLOW', failedRule: undefined, reasonCode: '', onChainEnforced: true },
  },
  // GV-019: claimed amount different -> BLOCK amount_mismatch
  {
    id: 'GV-019',
    description: 'Claimed amount differs from invoice amount -> BLOCK amount_mismatch',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', claimedAmountMinor: '9000000000' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'amount_mismatch', reasonCode: 'amount_mismatch', onChainEnforced: true },
  },
  // GV-020: claimed mint different -> BLOCK mint_mismatch
  {
    id: 'GV-020',
    description: 'Claimed mint differs from invoice mint -> BLOCK mint_mismatch',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', claimedMint: 'AttackerMint111111111111111111111111111111' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'mint_mismatch', reasonCode: 'mint_mismatch', onChainEnforced: true },
  },
  // GV-021: supplier unverified, policy requires verified -> BLOCK supplier_unverified
  {
    id: 'GV-021',
    description: 'Supplier unverified, policy requires verified supplier -> BLOCK supplier_unverified',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: true, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Lagos Parts Ltd', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'unverified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'supplier_unverified', reasonCode: 'supplier_unverified', onChainEnforced: true },
  },
  // GV-022: wallet changed after verification -> review_required -> BLOCK supplier_unverified
  {
    id: 'GV-022',
    description: 'Wallet changed after verification (review_required) -> BLOCK supplier_unverified',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: true, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Lagos Parts Ltd', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'review_required' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'supplier_unverified', reasonCode: 'supplier_unverified', onChainEnforced: true },
  },
  // GV-023: daily cap reached exactly -> ALLOW (not over)
  {
    id: 'GV-023',
    description: 'Daily cap reached exactly -> ALLOW',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '10000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', claimedAmountMinor: '10000000000' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'ALLOW', failedRule: undefined, reasonCode: '', onChainEnforced: true },
  },
  // GV-024: daily cap exceeded -> BLOCK daily_cap_exceeded
  {
    id: 'GV-024',
    description: 'Daily cap exceeded -> BLOCK daily_cap_exceeded',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '10000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000001', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', claimedAmountMinor: '10000000001' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'daily_cap_exceeded', reasonCode: 'daily_cap_exceeded', onChainEnforced: true },
  },
  // GV-025: above approval threshold -> HOLD needs_approval
  {
    id: 'GV-025',
    description: 'Amount above approval threshold -> HOLD needs_approval',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '500000000000', dailyLimitMinor: '1000000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false }, approvalThresholdMinor: '100000000000', maxInvoiceMinor: '500000000000' },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '150000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', claimedAmountMinor: '150000000000' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'HOLD', failedRule: 'needs_approval', reasonCode: 'needs_approval', onChainEnforced: false },
  },
  // GV-026: two-person approval -> HOLD needs_approval
  {
    id: 'GV-026',
    description: 'Two-person approval required -> HOLD needs_approval',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '500000000000', dailyLimitMinor: '1000000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: true } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'HOLD', failedRule: 'needs_approval', reasonCode: 'needs_approval', onChainEnforced: false },
  },
  // GV-027: missing attestation -> HOLD needs_attestation
  {
    id: 'GV-027',
    description: 'Attestation required but missing -> HOLD needs_attestation',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '500000000000', dailyLimitMinor: '1000000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: true, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'open' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'HOLD', failedRule: 'needs_attestation', reasonCode: 'needs_attestation', onChainEnforced: false },
  },
  // GV-028: another organisation's invoice -> BLOCK invoice_not_found
  {
    id: 'GV-028',
    description: "Invoice belongs to another organisation -> BLOCK invoice_not_found",
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-2', invoiceNumber: 'INV-9999', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-2', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'invoice_not_found', reasonCode: 'invoice_not_found', onChainEnforced: true },
  },
  // GV-029: unknown invoice -> BLOCK invoice_not_found
  {
    id: 'GV-029',
    description: 'Invoice not found -> BLOCK invoice_not_found',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-missing', invoiceNumber: 'INV-NONE', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-missing' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'BLOCK', failedRule: 'invoice_not_found', reasonCode: 'invoice_not_found', onChainEnforced: true },
  },
  // GV-030: all controls pass, under all caps -> ALLOW
  {
    id: 'GV-030',
    description: 'All controls pass, under all caps -> ALLOW',
    input: {
      org: 'org-1',
      agent: { id: 'agt-1', name: 'Procure Bot', identifier: 'procure-1', status: 'active', perRequestLimitMinor: '50000000000', dailyLimitMinor: '150000000000' },
      policy: { id: 'pol-1', name: 'Standard', controls: { verifiedSupplierRequired: false, deliveryAttestationRequired: false, agentIntentRequired: false, supportingEvidenceRequired: false, twoPersonApproval: false } },
      supplier: { id: 'sup-1', name: 'Accra Trade Co', payoutWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', verificationStatus: 'verified' },
      invoice: { id: 'inv-1', invoiceNumber: 'INV-2048', supplierId: 'sup-1', payeeWallet: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', amountMinor: '10000000000', currency: 'USDC', mint: null, status: 'attested' },
      request: { invoiceId: 'inv-1', claimedPayee: '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9' },
      history: { committedTodayMinor: '0', committedInvoiceIds: [] },
      now: '2026-05-15T10:00:00Z',
    },
    expected: { decision: 'ALLOW', failedRule: undefined, reasonCode: '', onChainEnforced: true },
  },
]

