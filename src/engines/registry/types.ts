import type {
  Supplier,
  Agent,
  Policy,
  Invoice,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreateAgentInput,
  UpdateAgentInput,
  CreatePolicyInput,
  UpdatePolicyInput,
  CreateInvoiceInput,
  SupplierFilter,
  InvoiceFilter,
  RegistryError,
} from '@airlock/shared/registry'

export type {
  Supplier,
  Agent,
  Policy,
  Invoice,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreateAgentInput,
  UpdateAgentInput,
  CreatePolicyInput,
  UpdatePolicyInput,
  CreateInvoiceInput,
  SupplierFilter,
  InvoiceFilter,
} from '@airlock/shared/registry'

export type RegistryEnginePort = {
  suppliers: {
    list(filter?: SupplierFilter): Promise<Supplier[]>
    get(id: string): Promise<Supplier | null>
    create(input: CreateSupplierInput): Promise<Supplier>
    update(id: string, patch: UpdateSupplierInput): Promise<Supplier>
    verify(id: string): Promise<Supplier>
  }
  agents: {
    list(): Promise<Agent[]>
    get(id: string): Promise<Agent | null>
    create(input: CreateAgentInput): Promise<Agent>
    update(id: string, patch: UpdateAgentInput): Promise<Agent>
    setStatus(id: string, status: Agent['status']): Promise<Agent>
    setLimits(id: string, perRequestLimitMinor: string, dailyLimitMinor: string): Promise<Agent>
  }
  policies: {
    list(): Promise<Policy[]>
    get(id: string): Promise<Policy | null>
    create(input: CreatePolicyInput): Promise<Policy>
    update(id: string, patch: UpdatePolicyInput): Promise<Policy>
    assignAgents(policyId: string, agentIds: string[]): Promise<Policy>
  }
  invoices: {
    list(filter?: InvoiceFilter): Promise<Invoice[]>
    get(id: string): Promise<Invoice | null>
    create(input: CreateInvoiceInput): Promise<Invoice>
    attest(id: string): Promise<Invoice>
    dispute(id: string): Promise<Invoice>
    uploadDocument(id: string, file: File): Promise<Invoice>
    getDocumentUrl(id: string): Promise<{ url: string; expiresIn: number }>
  }
}

export class RegistryPortError extends Error {
  code: RegistryError['code']
  constructor(code: RegistryError['code'], message: string) {
    super(message)
    this.name = 'RegistryPortError'
    this.code = code
  }
}

export function mapPostgrestError(err: { code?: string; message?: string }): RegistryError {
  if (err.code === 'PGRST116' || err.message?.includes('multiple (or no) rows')) {
    return { code: 'not_found', message: err.message ?? 'Not found' }
  }
  if (err.code === '23505' || err.message?.includes('duplicate key')) {
    return { code: 'conflict', message: err.message ?? 'Conflict' }
  }
  if (err.code === '23503' || err.message?.includes('violates foreign key')) {
    return { code: 'validation', message: err.message ?? 'Validation error' }
  }
  if (err.code === '42501' || err.message?.includes('permission denied')) {
    return { code: 'forbidden', message: err.message ?? 'Forbidden' }
  }
  if (err.code === '22P02' || err.message?.includes('invalid input syntax')) {
    return { code: 'validation', message: err.message ?? 'Validation error' }
  }
  return { code: 'validation', message: err.message ?? 'Unknown error' }
}