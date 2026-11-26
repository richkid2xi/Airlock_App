import type { Decision, PolicyControls } from '../../src/domain/types'

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
    expectedReasonSnippet: 'Requires two-person approval before funds release',
  },
]
