import { describe, it, expect } from 'vitest'
import {
  uuidSchema,
  base58WalletSchema,
  CurrencySchema,
  SupplierVerificationStatusSchema,
  SupplierOperationalStatusSchema,
  AgentStatusSchema,
  PolicyStatusSchema,
  InvoiceStatusSchema,
  SupplierSchema,
  CreateSupplierInputSchema,
  UpdateSupplierInputSchema,
  AgentSchema,
  CreateAgentInputSchema,
  UpdateAgentInputSchema,
  PolicyControlsSchema,
  PolicySchema,
  CreatePolicyInputSchema,
  UpdatePolicyInputSchema,
  InvoiceSchema,
  CreateInvoiceInputSchema,
  PolicyAgentAssignmentSchema,
  SupplierFilterSchema,
  InvoiceFilterSchema,
  makeRegistryError,
  SOLANA_DEVNET_USDC_MINT,
  USDC_DECIMALS,
} from './registry'

describe('packages/shared registry types', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'
  const validWallet = '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9'
  const validMinorUnits = '1000000'

  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      expect(uuidSchema.parse(validUuid)).toBe(validUuid)
    })
    it('rejects invalid UUID', () => {
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow()
    })
  })

  describe('base58WalletSchema', () => {
    it('accepts valid base58 wallet (32-44 chars)', () => {
      expect(base58WalletSchema.parse(validWallet)).toBe(validWallet)
    })
    it('rejects too short wallet', () => {
      expect(() => base58WalletSchema.parse('short')).toThrow()
    })
    it('rejects too long wallet', () => {
      expect(() => base58WalletSchema.parse('a'.repeat(45))).toThrow()
    })
  })

  describe('CurrencySchema', () => {
    it('accepts EUR, USD, GBP, USDC', () => {
      expect(CurrencySchema.parse('EUR')).toBe('EUR')
      expect(CurrencySchema.parse('USD')).toBe('USD')
      expect(CurrencySchema.parse('GBP')).toBe('GBP')
      expect(CurrencySchema.parse('USDC')).toBe('USDC')
    })
    it('rejects invalid currency', () => {
      expect(() => CurrencySchema.parse('BTC')).toThrow()
    })
  })

  describe('SupplierVerificationStatusSchema', () => {
    it('accepts unverified, review_required, verified', () => {
      expect(SupplierVerificationStatusSchema.parse('unverified')).toBe('unverified')
      expect(SupplierVerificationStatusSchema.parse('review_required')).toBe('review_required')
      expect(SupplierVerificationStatusSchema.parse('verified')).toBe('verified')
    })
    it('rejects invalid status', () => {
      expect(() => SupplierVerificationStatusSchema.parse('verified_wrong')).toThrow()
    })
  })

  describe('SupplierOperationalStatusSchema', () => {
    it('accepts active, pending, restricted', () => {
      expect(SupplierOperationalStatusSchema.parse('active')).toBe('active')
      expect(SupplierOperationalStatusSchema.parse('pending')).toBe('pending')
      expect(SupplierOperationalStatusSchema.parse('restricted')).toBe('restricted')
    })
  })

  describe('AgentStatusSchema', () => {
    it('accepts active, disabled', () => {
      expect(AgentStatusSchema.parse('active')).toBe('active')
      expect(AgentStatusSchema.parse('disabled')).toBe('disabled')
    })
  })

  describe('PolicyStatusSchema', () => {
    it('accepts active, draft', () => {
      expect(PolicyStatusSchema.parse('active')).toBe('active')
      expect(PolicyStatusSchema.parse('draft')).toBe('draft')
    })
  })

  describe('InvoiceStatusSchema', () => {
    it('accepts open, attested, paid, disputed', () => {
      expect(InvoiceStatusSchema.parse('open')).toBe('open')
      expect(InvoiceStatusSchema.parse('attested')).toBe('attested')
      expect(InvoiceStatusSchema.parse('paid')).toBe('paid')
      expect(InvoiceStatusSchema.parse('disputed')).toBe('disputed')
    })
  })

  describe('SupplierSchema', () => {
    const validSupplier = {
      id: validUuid,
      orgId: validUuid,
      name: 'Test Supplier',
      businessEmail: 'test@supplier.com',
      address: '123 Test St',
      category: 'Services',
      verificationReference: 'REF-001',
      payoutWallet: validWallet,
      verificationStatus: 'unverified' as const,
      verifiedAt: null,
      verifiedBy: null,
      notes: 'Some notes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    it('accepts valid supplier', () => {
      const result = SupplierSchema.parse(validSupplier)
      expect(result.name).toBe('Test Supplier')
    })
    it('rejects missing required fields', () => {
      expect(() => SupplierSchema.parse({ ...validSupplier, name: '' })).toThrow()
      expect(() => SupplierSchema.parse({ ...validSupplier, payoutWallet: 'short' })).toThrow()
    })
  })

  describe('CreateSupplierInputSchema', () => {
    it('accepts valid input', () => {
      const input = {
        name: 'New Supplier',
        payoutWallet: validWallet,
        businessEmail: 'new@supplier.com',
        address: '456 New St',
        category: 'Goods',
        verificationReference: 'REF-002',
        notes: 'Notes',
      }
      const result = CreateSupplierInputSchema.parse(input)
      expect(result.name).toBe('New Supplier')
    })
    it('requires name and payoutWallet', () => {
      expect(() => CreateSupplierInputSchema.parse({ payoutWallet: validWallet })).toThrow()
      expect(() => CreateSupplierInputSchema.parse({ name: 'Test' })).toThrow()
    })
  })

  describe('UpdateSupplierInputSchema', () => {
    it('accepts partial updates', () => {
      const input = { name: 'Updated Name', notes: 'New notes' }
      const result = UpdateSupplierInputSchema.parse(input)
      expect(result.name).toBe('Updated Name')
    })
    it('validates payoutWallet if provided', () => {
      expect(() => UpdateSupplierInputSchema.parse({ payoutWallet: 'short' })).toThrow()
    })
  })

  describe('AgentSchema', () => {
    const validAgent = {
      id: validUuid,
      orgId: validUuid,
      name: 'Test Agent',
      identifier: 'agent-001',
      description: 'Test agent description',
      status: 'active' as const,
      perRequestLimitMinor: validMinorUnits,
      dailyLimitMinor: '5000000',
      currency: 'USDC' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    it('accepts valid agent', () => {
      const result = AgentSchema.parse(validAgent)
      expect(result.identifier).toBe('agent-001')
    })
  })

  describe('CreateAgentInputSchema', () => {
    it('accepts valid input with policyIds', () => {
      const input = {
        name: 'New Agent',
        identifier: 'agent-002',
        description: 'Description',
        status: 'active' as const,
        perRequestLimitMinor: validMinorUnits,
        dailyLimitMinor: '5000000',
        currency: 'USDC' as const,
        policyIds: [validUuid],
      }
      const result = CreateAgentInputSchema.parse(input)
      expect(result.policyIds).toEqual([validUuid])
    })
    it('rejects perRequestLimitMinor <= 0', () => {
      expect(() => CreateAgentInputSchema.parse({
        name: 'A', identifier: 'i', perRequestLimitMinor: '0', dailyLimitMinor: '1000',
      })).toThrow()
    })
    it('rejects dailyLimitMinor < perRequestLimitMinor', () => {
      expect(() => CreateAgentInputSchema.parse({
        name: 'A', identifier: 'i', perRequestLimitMinor: '5000', dailyLimitMinor: '1000',
      })).toThrow()
    })
    it('defaults policyIds to empty array', () => {
      const input = {
        name: 'New Agent',
        identifier: 'agent-003',
        perRequestLimitMinor: validMinorUnits,
        dailyLimitMinor: '5000000',
      }
      const result = CreateAgentInputSchema.parse(input)
      expect(result.policyIds).toEqual([])
    })
  })

  describe('UpdateAgentInputSchema', () => {
    it('accepts partial updates', () => {
      const input = { name: 'Updated', status: 'disabled' as const }
      const result = UpdateAgentInputSchema.parse(input)
      expect(result.status).toBe('disabled')
    })
    it('validates limits when both provided', () => {
      expect(() => UpdateAgentInputSchema.parse({
        perRequestLimitMinor: '0', dailyLimitMinor: '1000',
      })).toThrow()
      expect(() => UpdateAgentInputSchema.parse({
        perRequestLimitMinor: '5000', dailyLimitMinor: '1000',
      })).toThrow()
    })
  })

  describe('PolicyControlsSchema', () => {
    it('defaults all to false', () => {
      const result = PolicyControlsSchema.parse({})
      expect(result.requireVerifiedSupplier).toBe(false)
      expect(result.requireDeliveryAttestation).toBe(false)
      expect(result.requireAgentIntent).toBe(false)
      expect(result.requireSupportingEvidence).toBe(false)
      expect(result.requireTwoPersonApproval).toBe(false)
    })
    it('accepts explicit booleans', () => {
      const result = PolicyControlsSchema.parse({
        requireVerifiedSupplier: true,
        requireTwoPersonApproval: true,
      })
      expect(result.requireVerifiedSupplier).toBe(true)
      expect(result.requireTwoPersonApproval).toBe(true)
    })
  })

  describe('PolicySchema', () => {
    const validPolicy = {
      id: validUuid,
      orgId: validUuid,
      name: 'Test Policy',
      description: 'Policy description',
      maxInvoiceMinor: validMinorUnits,
      dailyCapMinor: '5000000',
      controls: {
        requireVerifiedSupplier: true,
        requireDeliveryAttestation: false,
        requireAgentIntent: true,
        requireSupportingEvidence: false,
        requireTwoPersonApproval: false,
      },
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    it('accepts valid policy', () => {
      const result = PolicySchema.parse(validPolicy)
      expect(result.controls.requireVerifiedSupplier).toBe(true)
    })
  })

  describe('CreatePolicyInputSchema', () => {
    it('accepts valid input with agentIds', () => {
      const input = {
        name: 'New Policy',
        description: 'Description',
        maxInvoiceMinor: validMinorUnits,
        dailyCapMinor: '5000000',
        controls: {
          requireVerifiedSupplier: true,
          requireDeliveryAttestation: false,
          requireAgentIntent: true,
          requireSupportingEvidence: false,
          requireTwoPersonApproval: false,
        },
        status: 'active' as const,
        agentIds: [validUuid, '223e4567-e89b-12d3-a456-426614174001'],
      }
      const result = CreatePolicyInputSchema.parse(input)
      expect(result.agentIds).toHaveLength(2)
    })
    it('rejects maxInvoiceMinor <= 0', () => {
      expect(() => CreatePolicyInputSchema.parse({
        name: 'P', maxInvoiceMinor: '0', dailyCapMinor: '1000',
        controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false },
      })).toThrow()
    })
    it('rejects dailyCapMinor < maxInvoiceMinor', () => {
      expect(() => CreatePolicyInputSchema.parse({
        name: 'P', maxInvoiceMinor: '5000', dailyCapMinor: '1000',
        controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false },
      })).toThrow()
    })
    it('defaults agentIds to empty array', () => {
      const input = {
        name: 'New Policy',
        maxInvoiceMinor: validMinorUnits,
        dailyCapMinor: '5000000',
        controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false },
      }
      const result = CreatePolicyInputSchema.parse(input)
      expect(result.agentIds).toEqual([])
    })
  })

  describe('UpdatePolicyInputSchema', () => {
    it('accepts partial updates', () => {
      const input = { name: 'Updated', status: 'draft' as const }
      const result = UpdatePolicyInputSchema.parse(input)
      expect(result.status).toBe('draft')
    })
    it('validates limits when both provided', () => {
      expect(() => UpdatePolicyInputSchema.parse({
        maxInvoiceMinor: '0', dailyCapMinor: '1000',
      })).toThrow()
      expect(() => UpdatePolicyInputSchema.parse({
        maxInvoiceMinor: '5000', dailyCapMinor: '1000',
      })).toThrow()
    })
  })

  describe('InvoiceSchema', () => {
    const validInvoice = {
      id: validUuid,
      orgId: validUuid,
      invoiceNumber: 'INV-001',
      supplierId: validUuid,
      amountMinor: validMinorUnits,
      currency: 'USDC' as const,
      mint: SOLANA_DEVNET_USDC_MINT,
      issueDate: '2026-01-15',
      dueDate: '2026-02-15',
      documentRef: 'DOC-001',
      notes: 'Invoice notes',
      status: 'open' as const,
      attestedAt: null,
      attestedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    it('accepts valid invoice', () => {
      const result = InvoiceSchema.parse(validInvoice)
      expect(result.invoiceNumber).toBe('INV-001')
    })
    it('accepts optional documentPath', () => {
      const withDoc = InvoiceSchema.parse({ ...validInvoice, documentPath: 'org/inv/file.pdf' })
      expect(withDoc.documentPath).toBe('org/inv/file.pdf')
      const withoutDoc = InvoiceSchema.parse(validInvoice)
      expect(withoutDoc.documentPath ?? null).toBeNull()
    })
    it('rejects dueDate before issueDate', () => {
      expect(() => InvoiceSchema.parse({ ...validInvoice, dueDate: '2026-01-10' })).toThrow()
    })
    it('rejects amountMinor <= 0', () => {
      expect(() => InvoiceSchema.parse({ ...validInvoice, amountMinor: '0' })).toThrow()
    })
  })

  describe('CreateInvoiceInputSchema', () => {
    it('accepts valid input', () => {
      const input = {
        invoiceNumber: 'INV-002',
        supplierId: validUuid,
        amountMinor: validMinorUnits,
        currency: 'USDC' as const,
        mint: SOLANA_DEVNET_USDC_MINT,
        issueDate: '2026-01-15',
        dueDate: '2026-02-15',
        documentRef: 'DOC-002',
        notes: 'Notes',
      }
      const result = CreateInvoiceInputSchema.parse(input)
      expect(result.invoiceNumber).toBe('INV-002')
    })
    it('rejects amountMinor <= 0', () => {
      expect(() => CreateInvoiceInputSchema.parse({
        invoiceNumber: 'INV', supplierId: validUuid, amountMinor: '0', currency: 'USDC', issueDate: '2026-01-15', dueDate: '2026-02-15',
      })).toThrow()
    })
    it('rejects dueDate before issueDate', () => {
      expect(() => CreateInvoiceInputSchema.parse({
        invoiceNumber: 'INV', supplierId: validUuid, amountMinor: '1000', currency: 'USDC', issueDate: '2026-01-15', dueDate: '2026-01-10',
      })).toThrow()
    })
  })

  describe('PolicyAgentAssignmentSchema', () => {
    it('accepts valid assignment', () => {
      const input = { policyId: validUuid, agentIds: [validUuid] }
      const result = PolicyAgentAssignmentSchema.parse(input)
      expect(result.agentIds).toHaveLength(1)
    })
    it('requires at least one agentId', () => {
      expect(() => PolicyAgentAssignmentSchema.parse({ policyId: validUuid, agentIds: [] })).toThrow()
    })
  })

  describe('SupplierFilterSchema', () => {
    it('accepts optional filters', () => {
      const result = SupplierFilterSchema.parse({ verificationStatus: 'verified', category: 'Services' })
      expect(result.verificationStatus).toBe('verified')
    })
  })

  describe('InvoiceFilterSchema', () => {
    it('accepts optional filters', () => {
      const result = InvoiceFilterSchema.parse({ status: 'open', supplierId: validUuid })
      expect(result.status).toBe('open')
    })
  })

  describe('makeRegistryError', () => {
    it('creates error with code and message', () => {
      const err = makeRegistryError('not_found', 'Supplier not found')
      expect(err.code).toBe('not_found')
      expect(err.message).toBe('Supplier not found')
    })
  })

  describe('constants', () => {
    it('exports SOLANA_DEVNET_USDC_MINT', () => {
      expect(SOLANA_DEVNET_USDC_MINT).toBe('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
    })
    it('exports USDC_DECIMALS = 6', () => {
      expect(USDC_DECIMALS).toBe(6)
    })
  })
})