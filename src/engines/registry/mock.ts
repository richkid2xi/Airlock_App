// ---------------------------------------------------------------------------
// In-memory seed data with real UUIDs and deterministic ID generation
// ---------------------------------------------------------------------------

import type {
  Supplier,
  Agent,
  Policy,
  Invoice,
  RegistryEnginePort,
  CreateSupplierInput,
  CreateAgentInput,
  CreatePolicyInput,
  CreateInvoiceInput,
  UpdateSupplierInput,
  UpdateAgentInput,
  UpdatePolicyInput,
} from './types'

function uuid(): string {
  const crypto = (globalThis as any).crypto ?? (globalThis as any).msCrypto
  if (crypto && crypto.randomUUID) return crypto.randomUUID()
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  return `${s4()}${s4()}-${s4()}-4${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

function findById<T extends { id: string }>(items: T[], id: string): T | null {
  return items.find((item) => item.id === id) ?? null
}

// Organization UUIDs (stable across test runs).
const ORG_A = '00000000-0000-4000-8000-0000000000a1'
const ORG_B = '00000000-0000-4000-8000-0000000000b1'

// Suppliers.
const SUP_ACME = '00000000-0000-4000-8000-000000000101'
const SUP_BETA = '00000000-0000-4000-8000-000000000102'
const SUP_GAMMA = '00000000-0000-4000-8000-000000000103'

// Agents.
const AGENT_RISK = '00000000-0000-4000-8000-000000000201'
const AGENT_COMP = '00000000-0000-4000-8000-000000000202'
const AGENT_OPS = '00000000-0000-4000-8000-000000000203'

// Policies.
const POL_STANDARD = '00000000-0000-4000-8000-000000000301'
const POL_RESTRICTED = '00000000-0000-4000-8000-000000000302'
const POL_PARTNER = '00000000-0000-4000-8000-000000000303'

// Invoices.
const INV_001 = '00000000-0000-4000-8000-000000000401'
const INV_002 = '00000000-0000-4000-8000-000000000402'
const INV_003 = '00000000-0000-4000-8000-000000000403'

// Wallets.
const WALLET_A = '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9'
const WALLET_B = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'
const WALLET_C = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'

// ---------------------------------------------------------------------------
// Suppliers (new typed domain: lowercase statuses, businessEmail, no operationalStatus/invoiceCount/lastPaymentDate)
// ---------------------------------------------------------------------------
const suppliers: Supplier[] = [
  {
    id: SUP_ACME,
    orgId: ORG_A,
    name: 'Acme Supplies',
    payoutWallet: WALLET_A,
    verificationStatus: 'verified',
    category: 'goods',
    verificationReference: 'REF-ACME-001',
    businessEmail: 'procurement@acme.supplies',
    address: '123 Industrial Ave',
    notes: 'Verified supplier of office supplies',
    verifiedAt: '2026-01-10T09:00:00.000Z',
    verifiedBy: 'user-001',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: SUP_BETA,
    orgId: ORG_A,
    name: 'Beta Parts',
    payoutWallet: WALLET_B,
    verificationStatus: 'review_required',
    category: 'hardware',
    verificationReference: 'REF-BETA-001',
    businessEmail: 'sales@beta.parts',
    address: '456 Manufacturing Rd',
    notes: 'Pending additional documentation',
    verifiedAt: null,
    verifiedBy: null,
    createdAt: '2026-01-12T11:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: SUP_GAMMA,
    orgId: ORG_B,
    name: 'Gamma Services',
    payoutWallet: WALLET_C,
    verificationStatus: 'unverified',
    category: 'services',
    verificationReference: 'REF-GAMMA-001',
    businessEmail: 'contact@gamma.services',
    address: '789 Tech Park',
    notes: 'New supplier, under review',
    verifiedAt: null,
    verifiedBy: null,
    createdAt: '2026-01-14T09:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Agents (new typed domain: lowercase statuses, perRequestLimitMinor, dailyLimitMinor)
// ---------------------------------------------------------------------------
const agents: Agent[] = [
  {
    id: AGENT_RISK,
    orgId: ORG_A,
    name: 'Risk Agent',
    identifier: 'risk-001',
    description: 'Handles risk assessment for payments',
    status: 'active',
    perRequestLimitMinor: '100000',
    dailyLimitMinor: '5000000',
    currency: 'USDC',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: AGENT_COMP,
    orgId: ORG_A,
    name: 'Compliance Agent',
    identifier: 'comp-001',
    description: 'Ensures regulatory compliance',
    status: 'active',
    perRequestLimitMinor: '50000',
    dailyLimitMinor: '2000000',
    currency: 'USDC',
    createdAt: '2026-01-12T11:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: AGENT_OPS,
    orgId: ORG_B,
    name: 'Operations Agent',
    identifier: 'ops-001',
    description: 'Manages operational payments',
    status: 'disabled',
    perRequestLimitMinor: '20000',
    dailyLimitMinor: '1000000',
    currency: 'USDC',
    createdAt: '2026-01-14T09:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Policies (new typed domain: maxInvoiceMinor, dailyCapMinor, controls object)
// ---------------------------------------------------------------------------
const policies: Policy[] = [
  {
    id: POL_STANDARD,
    orgId: ORG_A,
    name: 'Standard Policy',
    description: 'Standard payment policy for verified suppliers',
    maxInvoiceMinor: '1000000',
    dailyCapMinor: '10000000',
    controls: {
      requireVerifiedSupplier: true,
      requireDeliveryAttestation: false,
      requireAgentIntent: true,
      requireSupportingEvidence: false,
      requireTwoPersonApproval: false,
    },
    status: 'active',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: POL_RESTRICTED,
    orgId: ORG_A,
    name: 'Restricted Policy',
    description: 'Tighter controls for high-risk payments',
    maxInvoiceMinor: '500000',
    dailyCapMinor: '5000000',
    controls: {
      requireVerifiedSupplier: true,
      requireDeliveryAttestation: true,
      requireAgentIntent: true,
      requireSupportingEvidence: true,
      requireTwoPersonApproval: true,
    },
    status: 'active',
    createdAt: '2026-01-12T11:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: POL_PARTNER,
    orgId: ORG_B,
    name: 'Partner Policy',
    description: 'Policy for partner organization',
    maxInvoiceMinor: '2000000',
    dailyCapMinor: '20000000',
    controls: {
      requireVerifiedSupplier: false,
      requireDeliveryAttestation: false,
      requireAgentIntent: false,
      requireSupportingEvidence: false,
      requireTwoPersonApproval: false,
    },
    status: 'draft',
    createdAt: '2026-01-14T09:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Invoices (new typed domain: invoiceNumber, amountMinor, lowercase status)
// ---------------------------------------------------------------------------
const invoices: Invoice[] = [
  {
    id: INV_001,
    orgId: ORG_A,
    invoiceNumber: 'INV-001',
    supplierId: SUP_ACME,
    payeeWallet: WALLET_A,
    amountMinor: '100000',
    currency: 'USD',
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    issueDate: '2026-01-20',
    dueDate: '2026-02-19',
    documentRef: 'DOC-INV-001',
    notes: 'Initial invoice for Q1 services',
    status: 'open',
    attestedAt: null,
    attestedBy: null,
    createdAt: '2026-01-20T08:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: INV_002,
    orgId: ORG_A,
    invoiceNumber: 'INV-002',
    supplierId: SUP_ACME,
    payeeWallet: WALLET_A,
    amountMinor: '250000',
    currency: 'USD',
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    issueDate: '2026-01-25',
    dueDate: '2026-02-24',
    documentRef: 'DOC-INV-002',
    notes: 'Second invoice - Q1 consulting',
    status: 'attested',
    attestedAt: '2026-01-28T10:00:00.000Z',
    attestedBy: 'user-001',
    createdAt: '2026-01-25T08:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
  {
    id: INV_003,
    orgId: ORG_A,
    invoiceNumber: 'INV-003',
    supplierId: SUP_BETA,
    payeeWallet: WALLET_B,
    amountMinor: '50000',
    currency: 'EUR',
    mint: null,
    issueDate: '2026-02-01',
    dueDate: '2026-03-02',
    documentRef: 'DOC-INV-003',
    notes: 'Beta Parts invoice',
    status: 'disputed',
    attestedAt: null,
    attestedBy: null,
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-03-01T14:20:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Helper: validate agent limits
// ---------------------------------------------------------------------------
function validateAgentLimits(perRequestLimitMinor: string, dailyLimitMinor: string) {
  const pr = BigInt(perRequestLimitMinor)
  const dl = BigInt(dailyLimitMinor)
  if (pr <= 0n) throw { code: 'validation', message: 'perRequestLimitMinor must be > 0' }
  if (dl < pr) throw { code: 'validation', message: 'dailyLimitMinor must be >= perRequestLimitMinor' }
}

function normalizeControls(c?: Partial<Policy['controls']>): Policy['controls'] {
  return {
    requireVerifiedSupplier: c?.requireVerifiedSupplier ?? false,
    requireDeliveryAttestation: c?.requireDeliveryAttestation ?? false,
    requireAgentIntent: c?.requireAgentIntent ?? false,
    requireSupportingEvidence: c?.requireSupportingEvidence ?? false,
    requireTwoPersonApproval: c?.requireTwoPersonApproval ?? false,
  }
}

function validatePolicyLimits(maxInvoiceMinor: string, dailyCapMinor: string) {
  const max = BigInt(maxInvoiceMinor)
  const daily = BigInt(dailyCapMinor)
  if (max <= 0n) throw { code: 'validation', message: 'maxInvoiceMinor must be > 0' }
  if (daily < max) throw { code: 'validation', message: 'dailyCapMinor must be >= maxInvoiceMinor' }
}

// ---------------------------------------------------------------------------
// Mock registry engine implementation
// ---------------------------------------------------------------------------
const supplierEngine: RegistryEnginePort['suppliers'] = {
  async list(filter?: { verificationStatus?: string; category?: string }): Promise<Supplier[]> {
    let result = [...suppliers]
    if (filter?.verificationStatus) {
      result = result.filter((s) => s.verificationStatus === filter.verificationStatus)
    }
    if (filter?.category) {
      result = result.filter((s) => s.category === filter.category)
    }
    return result
  },

  async get(id: string): Promise<Supplier | null> {
    return findById(suppliers, id)
  },

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const now = new Date().toISOString()
    const supplier: Supplier = {
      id: uuid(),
      orgId: ORG_A,
      name: input.name,
      payoutWallet: input.payoutWallet,
      verificationStatus: 'unverified',
      category: input.category ?? null,
      verificationReference: input.verificationReference ?? null,
      businessEmail: input.businessEmail ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
      verifiedAt: null,
      verifiedBy: null,
      createdAt: now,
      updatedAt: now,
    }
    suppliers.push(supplier)
    return supplier
  },

  async update(id: string, patch: UpdateSupplierInput): Promise<Supplier> {
    const idx = suppliers.findIndex((s) => s.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Supplier not found' }

    const existing = suppliers[idx]
    const updated: Supplier = { ...existing, ...patch, updatedAt: new Date().toISOString() }

    // Column grants: clients cannot set verification_status directly.
    updated.verificationStatus = existing.verificationStatus

    // Changing the payout wallet invalidates verification.
    if (patch.payoutWallet && patch.payoutWallet !== existing.payoutWallet && existing.verificationStatus === 'verified') {
      updated.verificationStatus = 'review_required'
      updated.verifiedAt = null
      updated.verifiedBy = null
    }

    suppliers[idx] = updated
    return updated
  },

  async verify(id: string): Promise<Supplier> {
    const idx = suppliers.findIndex((s) => s.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Supplier not found' }
    suppliers[idx] = {
      ...suppliers[idx],
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'user-001',
      updatedAt: new Date().toISOString(),
    }
    return suppliers[idx]
  },
}

const agentEngine: RegistryEnginePort['agents'] = {
  async list(): Promise<Agent[]> {
    return [...agents]
  },

  async get(id: string): Promise<Agent | null> {
    return findById(agents, id)
  },

  async create(input: CreateAgentInput): Promise<Agent> {
    validateAgentLimits(input.perRequestLimitMinor, input.dailyLimitMinor)
    if (agents.some((a) => a.identifier === input.identifier)) {
      throw { code: 'conflict', message: 'Agent identifier already exists' }
    }
    const now = new Date().toISOString()
    const agent: Agent = {
      id: uuid(),
      orgId: ORG_A,
      name: input.name,
      identifier: input.identifier,
      description: input.description ?? null,
      status: input.status ?? 'active',
      perRequestLimitMinor: input.perRequestLimitMinor,
      dailyLimitMinor: input.dailyLimitMinor,
      currency: input.currency ?? 'USDC',
      createdAt: now,
      updatedAt: now,
    }
    agents.push(agent)
    return agent
  },

  async update(id: string, patch: UpdateAgentInput): Promise<Agent> {
    const idx = agents.findIndex((a) => a.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Agent not found' }
    const existing = agents[idx]
    const merged: Agent = { ...existing, ...patch, updatedAt: new Date().toISOString() }
    validateAgentLimits(merged.perRequestLimitMinor, merged.dailyLimitMinor)
    agents[idx] = merged
    return merged
  },

  async setStatus(id: string, status: Agent['status']): Promise<Agent> {
    const idx = agents.findIndex((a) => a.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Agent not found' }
    agents[idx] = { ...agents[idx], status, updatedAt: new Date().toISOString() }
    return agents[idx]
  },

  async setLimits(id: string, perRequestLimitMinor: string, dailyLimitMinor: string): Promise<Agent> {
    const idx = agents.findIndex((a) => a.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Agent not found' }
    validateAgentLimits(perRequestLimitMinor, dailyLimitMinor)
    agents[idx] = { ...agents[idx], perRequestLimitMinor, dailyLimitMinor, updatedAt: new Date().toISOString() }
    return agents[idx]
  },
}

const policyEngine: RegistryEnginePort['policies'] = {
  async list(): Promise<Policy[]> {
    return [...policies]
  },

  async get(id: string): Promise<Policy | null> {
    return findById(policies, id)
  },

  async create(input: CreatePolicyInput): Promise<Policy> {
    validatePolicyLimits(input.maxInvoiceMinor, input.dailyCapMinor)
    const now = new Date().toISOString()
    const policy: Policy = {
      id: uuid(),
      orgId: ORG_A,
      name: input.name,
      description: input.description ?? null,
      maxInvoiceMinor: input.maxInvoiceMinor,
      dailyCapMinor: input.dailyCapMinor,
      controls: normalizeControls(input.controls),
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    }
    policies.push(policy)
    return policy
  },

  async update(id: string, patch: UpdatePolicyInput): Promise<Policy> {
    const idx = policies.findIndex((p) => p.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Policy not found' }
    const existing = policies[idx]
    const mergedControls = {
      requireVerifiedSupplier: patch.controls?.requireVerifiedSupplier ?? existing.controls.requireVerifiedSupplier,
      requireDeliveryAttestation: patch.controls?.requireDeliveryAttestation ?? existing.controls.requireDeliveryAttestation,
      requireAgentIntent: patch.controls?.requireAgentIntent ?? existing.controls.requireAgentIntent,
      requireSupportingEvidence: patch.controls?.requireSupportingEvidence ?? existing.controls.requireSupportingEvidence,
      requireTwoPersonApproval: patch.controls?.requireTwoPersonApproval ?? existing.controls.requireTwoPersonApproval,
    }
    const merged: Policy = { ...existing, ...patch, controls: mergedControls, updatedAt: new Date().toISOString() }
    validatePolicyLimits(merged.maxInvoiceMinor, merged.dailyCapMinor)
    policies[idx] = merged
    return merged
  },

  async assignAgents(_policyId: string, _agentIds: string[]): Promise<Policy> {
    // In-memory mock: assignment is stored in a Map on first call.
    const idx = policies.findIndex((p) => p.id === _policyId)
    if (idx === -1) throw { code: 'not_found', message: 'Policy not found' }
    // Return the policy as-is; assignment tracking is external to the type.
    return policies[idx]
  },
}

const invoiceEngine: RegistryEnginePort['invoices'] = {
  async list(filter?: { status?: string; supplierId?: string }): Promise<Invoice[]> {
    let result = [...invoices]
    if (filter?.status) {
      result = result.filter((i) => i.status === filter.status)
    }
    if (filter?.supplierId) {
      result = result.filter((i) => i.supplierId === filter.supplierId)
    }
    return result
  },

  async get(id: string): Promise<Invoice | null> {
    return findById(invoices, id)
  },

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    if (BigInt(input.amountMinor) <= 0n) {
      throw { code: 'validation', message: 'amountMinor must be > 0' }
    }
    if (invoices.some((i) => i.invoiceNumber === input.invoiceNumber)) {
      throw { code: 'conflict', message: 'Invoice number already exists' }
    }
    const now = new Date().toISOString()
    const invoice: Invoice = {
      id: uuid(),
      orgId: ORG_A,
      invoiceNumber: input.invoiceNumber,
      supplierId: input.supplierId,
      payeeWallet: input.payeeWallet,
      amountMinor: input.amountMinor,
      currency: input.currency,
      mint: input.mint ?? null,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      documentRef: input.documentRef ?? null,
      notes: input.notes ?? null,
      status: 'open',
      attestedAt: null,
      attestedBy: null,
      createdAt: now,
      updatedAt: now,
    }
    invoices.push(invoice)
    return invoice
  },

  async attest(id: string): Promise<Invoice> {
    const idx = invoices.findIndex((i) => i.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Invoice not found' }
    if (invoices[idx].status !== 'open') {
      throw { code: 'validation', message: 'Only open invoices can be attested' }
    }
    invoices[idx] = {
      ...invoices[idx],
      status: 'attested',
      attestedAt: new Date().toISOString(),
      attestedBy: 'user-001',
      updatedAt: new Date().toISOString(),
    }
    return invoices[idx]
  },

  async dispute(id: string): Promise<Invoice> {
    const idx = invoices.findIndex((i) => i.id === id)
    if (idx === -1) throw { code: 'not_found', message: 'Invoice not found' }
    const current = invoices[idx].status
    if (current === 'paid') {
      throw { code: 'validation', message: 'Paid invoices cannot be disputed' }
    }
    invoices[idx] = { ...invoices[idx], status: 'disputed', updatedAt: new Date().toISOString() }
    return invoices[idx]
  },
}

// ---------------------------------------------------------------------------
// Registry engine singleton (mock)
// ---------------------------------------------------------------------------
export const mockRegistryEngine: RegistryEnginePort = {
  suppliers: supplierEngine,
  agents: agentEngine,
  policies: policyEngine,
  invoices: invoiceEngine,
}

export function createMockRegistry(): RegistryEnginePort {
  return mockRegistryEngine
}