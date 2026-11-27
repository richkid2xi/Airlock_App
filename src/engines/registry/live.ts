import type {
  Supplier, Agent, Policy, Invoice,
  CreateSupplierInput, UpdateSupplierInput,
  CreateAgentInput, UpdateAgentInput,
  CreatePolicyInput, UpdatePolicyInput,
  CreateInvoiceInput, SupplierFilter, InvoiceFilter,
  RegistryEnginePort,
} from './types'
import { supabase } from '../../lib/supabase'
import { RegistryPortError, mapPostgrestError } from './types'

function mapSupplierRow(row: any): Supplier {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    businessEmail: row.business_email,
    address: row.address,
    category: row.category,
    verificationReference: row.verification_reference,
    payoutWallet: row.payout_wallet,
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapAgentRow(row: any): Agent {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    identifier: row.identifier,
    description: row.description,
    status: row.status,
    perRequestLimitMinor: row.per_request_limit_minor,
    dailyLimitMinor: row.daily_limit_minor,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPolicyRow(row: any): Policy {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    maxInvoiceMinor: row.max_invoice_minor,
    dailyCapMinor: row.daily_cap_minor,
    controls: {
      requireVerifiedSupplier: row.require_verified_supplier,
      requireDeliveryAttestation: row.require_delivery_attestation,
      requireAgentIntent: row.require_agent_intent,
      requireSupportingEvidence: row.require_supporting_evidence,
      requireTwoPersonApproval: row.require_two_person_approval,
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInvoiceRow(row: any): Invoice {
  return {
    id: row.id,
    orgId: row.org_id,
    invoiceNumber: row.invoice_number,
    supplierId: row.supplier_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    mint: row.mint,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    documentRef: row.document_ref,
    documentPath: row.document_path,
    notes: row.notes,
    status: row.status,
    attestedAt: row.attested_at,
    attestedBy: row.attested_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function throwOnError(err: any): never {
  const mapped = mapPostgrestError(err)
  throw new RegistryPortError(mapped.code, mapped.message)
}

function from(table: string): any {
  return (supabase as any).from(table)
}

function rpc(name: string, params: any): any {
  return (supabase as any).rpc(name, params)
}

export const liveRegistryEngine: RegistryEnginePort = {
  suppliers: {
    async list(filter?: SupplierFilter): Promise<Supplier[]> {
      let query = from('suppliers').select('*')
      if (filter?.verificationStatus) {
        query = query.eq('verification_status', filter.verificationStatus)
      }
      if (filter?.category) {
        query = query.eq('category', filter.category)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throwOnError(error)
      return (data ?? []).map(mapSupplierRow)
    },

    async get(id: string): Promise<Supplier | null> {
      const { data, error } = await from('suppliers').select('*').eq('id', id).maybeSingle()
      if (error) throwOnError(error)
      if (!data) return null
      return mapSupplierRow(data)
    },

    async create(input: CreateSupplierInput): Promise<Supplier> {
      const { data, error } = await from('suppliers')
        .insert({
          name: input.name,
          business_email: input.businessEmail,
          address: input.address,
          category: input.category,
          verification_reference: input.verificationReference,
          payout_wallet: input.payoutWallet,
          notes: input.notes,
        })
        .select()
        .single()
      if (error) throwOnError(error)
      return mapSupplierRow(data)
    },

    async update(id: string, patch: UpdateSupplierInput): Promise<Supplier> {
      const updates: Record<string, any> = {}
      if (patch.name !== undefined) updates.name = patch.name
      if (patch.businessEmail !== undefined) updates.business_email = patch.businessEmail
      if (patch.address !== undefined) updates.address = patch.address
      if (patch.category !== undefined) updates.category = patch.category
      if (patch.verificationReference !== undefined) updates.verification_reference = patch.verificationReference
      if (patch.notes !== undefined) updates.notes = patch.notes
      if (patch.payoutWallet !== undefined) updates.payout_wallet = patch.payoutWallet

      const { data, error } = await from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throwOnError(error)
      return mapSupplierRow(data)
    },

    async verify(id: string): Promise<Supplier> {
      const { error } = await rpc('verify_supplier', { supplier_id: id })
      if (error) throwOnError(error)
      const row = await this.get(id)
      if (!row) throw new RegistryPortError('not_found', 'Supplier not found after verification')
      return row
    },
  },

  agents: {
    async list(): Promise<Agent[]> {
      const { data, error } = await from('agents').select('*').order('created_at', { ascending: false })
      if (error) throwOnError(error)
      return (data ?? []).map(mapAgentRow)
    },

    async get(id: string): Promise<Agent | null> {
      const { data, error } = await from('agents').select('*').eq('id', id).maybeSingle()
      if (error) throwOnError(error)
      if (!data) return null
      return mapAgentRow(data)
    },

    async create(input: CreateAgentInput): Promise<Agent> {
      const { data, error } = await from('agents')
        .insert({
          name: input.name,
          identifier: input.identifier,
          description: input.description,
          status: input.status,
          per_request_limit_minor: input.perRequestLimitMinor,
          daily_limit_minor: input.dailyLimitMinor,
          currency: input.currency,
        })
        .select()
        .single()
      if (error) throwOnError(error)
      const agent = mapAgentRow(data)
      const policyIds = input.policyIds ?? []
      if (policyIds.length > 0) {
        const rows = policyIds.map((pid) => ({ policy_id: pid, agent_id: agent.id }))
        const { error: insertError } = await from('policy_agents').insert(rows)
        if (insertError) throwOnError(insertError)
      }
      return agent
    },

    async update(id: string, patch: UpdateAgentInput): Promise<Agent> {
      const updates: Record<string, any> = {}
      if (patch.name !== undefined) updates.name = patch.name
      if (patch.description !== undefined) updates.description = patch.description
      if (patch.status !== undefined) updates.status = patch.status
      if (patch.perRequestLimitMinor !== undefined) updates.per_request_limit_minor = patch.perRequestLimitMinor
      if (patch.dailyLimitMinor !== undefined) updates.daily_limit_minor = patch.dailyLimitMinor
      if (patch.currency !== undefined) updates.currency = patch.currency

      const { data, error } = await from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throwOnError(error)
      return mapAgentRow(data)
    },

    async setStatus(id: string, status: Agent['status']): Promise<Agent> {
      const { data, error } = await from('agents')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throwOnError(error)
      return mapAgentRow(data)
    },

    async setLimits(id: string, perRequestLimitMinor: string, dailyLimitMinor: string): Promise<Agent> {
      const { data, error } = await from('agents')
        .update({ per_request_limit_minor: perRequestLimitMinor, daily_limit_minor: dailyLimitMinor })
        .eq('id', id)
        .select()
        .single()
      if (error) throwOnError(error)
      return mapAgentRow(data)
    },
  },

  policies: {
    async list(): Promise<Policy[]> {
      const { data, error } = await from('policies').select('*').order('created_at', { ascending: false })
      if (error) throwOnError(error)
      return (data ?? []).map(mapPolicyRow)
    },

    async get(id: string): Promise<Policy | null> {
      const { data, error } = await from('policies').select('*').eq('id', id).maybeSingle()
      if (error) throwOnError(error)
      if (!data) return null
      return mapPolicyRow(data)
    },

    async create(input: CreatePolicyInput): Promise<Policy> {
      const { data, error } = await from('policies')
        .insert({
          name: input.name,
          description: input.description,
          max_invoice_minor: input.maxInvoiceMinor,
          daily_cap_minor: input.dailyCapMinor,
          require_verified_supplier: input.controls.requireVerifiedSupplier,
          require_delivery_attestation: input.controls.requireDeliveryAttestation,
          require_agent_intent: input.controls.requireAgentIntent,
          require_supporting_evidence: input.controls.requireSupportingEvidence,
          require_two_person_approval: input.controls.requireTwoPersonApproval,
          status: input.status,
        })
        .select()
        .single()
      if (error) throwOnError(error)
      const policy = mapPolicyRow(data)
      const agentIds = input.agentIds ?? []
      if (agentIds.length > 0) {
        await this.assignAgents(policy.id, agentIds)
      }
      return policy
    },

    async update(id: string, patch: UpdatePolicyInput): Promise<Policy> {
      const updates: Record<string, any> = {}
      if (patch.name !== undefined) updates.name = patch.name
      if (patch.description !== undefined) updates.description = patch.description
      if (patch.maxInvoiceMinor !== undefined) updates.max_invoice_minor = patch.maxInvoiceMinor
      if (patch.dailyCapMinor !== undefined) updates.daily_cap_minor = patch.dailyCapMinor
      if (patch.controls) {
        updates.require_verified_supplier = patch.controls.requireVerifiedSupplier
        updates.require_delivery_attestation = patch.controls.requireDeliveryAttestation
        updates.require_agent_intent = patch.controls.requireAgentIntent
        updates.require_supporting_evidence = patch.controls.requireSupportingEvidence
        updates.require_two_person_approval = patch.controls.requireTwoPersonApproval
      }
      if (patch.status !== undefined) updates.status = patch.status

      const { data, error } = await from('policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throwOnError(error)
      return mapPolicyRow(data)
    },

    async assignAgents(policyId: string, agentIds: string[]): Promise<Policy> {
      const { error } = await from('policy_agents').delete().eq('policy_id', policyId)
      if (error) throwOnError(error)

      if (agentIds.length > 0) {
        const rows = agentIds.map((agentId) => ({ policy_id: policyId, agent_id: agentId }))
        const { error: insertError } = await from('policy_agents').insert(rows)
        if (insertError) throwOnError(insertError)
      }

      const row = await this.get(policyId)
      if (!row) throw new RegistryPortError('not_found', 'Policy not found')
      return row
    },
  },

  invoices: {
    async list(filter?: InvoiceFilter): Promise<Invoice[]> {
      let query = from('invoices').select('*')
      if (filter?.status) {
        query = query.eq('status', filter.status)
      }
      if (filter?.supplierId) {
        query = query.eq('supplier_id', filter.supplierId)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throwOnError(error)
      return (data ?? []).map(mapInvoiceRow)
    },

    async get(id: string): Promise<Invoice | null> {
      const { data, error } = await from('invoices').select('*').eq('id', id).maybeSingle()
      if (error) throwOnError(error)
      if (!data) return null
      return mapInvoiceRow(data)
    },

    async create(input: CreateInvoiceInput): Promise<Invoice> {
      const { data, error } = await from('invoices')
        .insert({
          invoice_number: input.invoiceNumber,
          supplier_id: input.supplierId,
          amount_minor: input.amountMinor,
          currency: input.currency,
          mint: input.mint,
          issue_date: input.issueDate,
          due_date: input.dueDate,
          document_ref: input.documentRef,
          notes: input.notes,
        })
        .select()
        .single()
      if (error) throwOnError(error)
      return mapInvoiceRow(data)
    },

    async attest(id: string): Promise<Invoice> {
      const { error } = await rpc('attest_invoice', { invoice_id: id })
      if (error) throwOnError(error)
      const row = await this.get(id)
      if (!row) throw new RegistryPortError('not_found', 'Invoice not found after attestation')
      return row
    },

    async dispute(id: string): Promise<Invoice> {
      const { error } = await rpc('dispute_invoice', { invoice_id: id })
      if (error) throwOnError(error)
      const row = await this.get(id)
      if (!row) throw new RegistryPortError('not_found', 'Invoice not found after dispute')
      return row
    },

    async uploadDocument(id: string, file: File): Promise<Invoice> {
      const invoice = await this.get(id)
      if (!invoice) throw new RegistryPortError('not_found', 'Invoice not found')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${invoice.orgId}/${invoice.id}/${Date.now()}-${safeName}`
      const { error: uploadError } = await (supabase as any).storage.from('invoice-documents').upload(path, file)
      if (uploadError) throwOnError(uploadError)
      const { error: updateError } = await from('invoices')
        .update({ document_path: path })
        .eq('id', id)
      if (updateError) throwOnError(updateError)
      const row = await this.get(id)
      if (!row) throw new RegistryPortError('not_found', 'Invoice not found after document upload')
      return row
    },

    async getDocumentUrl(id: string): Promise<{ url: string; expiresIn: number }> {
      const invoice = await this.get(id)
      if (!invoice) throw new RegistryPortError('not_found', 'Invoice not found')
      if (!invoice.documentPath) {
        throw new RegistryPortError('not_found', 'Invoice has no document uploaded')
      }
      const { data, error } = await (supabase as any).storage.from('invoice-documents').createSignedUrl(invoice.documentPath, 3600, {})
      if (error) throwOnError(error)
      const signed = data?.signedUrl as string | undefined
      if (!signed) throw new RegistryPortError('not_found', 'Document signed URL unavailable')
      return { url: signed, expiresIn: 3600 }
    },
  },
  resetDemoData: async () => {
    const { error } = await rpc('reset_demo_data', {})
    if (error) throwOnError(error)
  },
  loadDemoData: async () => {
    const { error } = await rpc('load_demo_data', {})
    if (error) throwOnError(error)
  },
}