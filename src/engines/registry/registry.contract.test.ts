import { describe, it, expect, beforeEach } from 'vitest'
import type { RegistryEnginePort } from './types'
import { createMockRegistry } from './mock'

const UUID_SUP_ACME = '00000000-0000-4000-8000-000000000101'
const UUID_SUP_BETA = '00000000-0000-4000-8000-000000000102'
const UUID_SUP_GAMMA = '00000000-0000-4000-8000-000000000103'
const UUID_AGENT_RISK = '00000000-0000-4000-8000-000000000201'
const UUID_AGENT_COMP = '00000000-0000-4000-8000-000000000202'
const UUID_AGENT_OPS = '00000000-0000-4000-8000-000000000203'
const UUID_POL_STANDARD = '00000000-0000-4000-8000-000000000301'
const UUID_POL_RESTRICTED = '00000000-0000-4000-8000-000000000302'
const UUID_INV_001 = '00000000-0000-4000-8000-000000000401'
const UUID_INV_002 = '00000000-0000-4000-8000-000000000402'
const UUID_INV_003 = '00000000-0000-4000-8000-000000000403'
const WALLET_A = '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9'
const WALLET_B = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'

function freshEngine(): RegistryEnginePort {
  return createMockRegistry()
}

function expectNotFound<T>(fn: () => Promise<T>, _id: string) {
  return expect(fn()).rejects.toMatchObject({ code: 'not_found', message: expect.stringContaining('not found') })
}

function expectValidation<T>(fn: () => Promise<T>, messageSubstring: string) {
  return expect(fn()).rejects.toMatchObject({ code: 'validation', message: expect.stringContaining(messageSubstring) })
}

describe('Registry Engine Contract', () => {
  let engines: RegistryEnginePort

  beforeEach(() => {
    engines = freshEngine()
  })

  describe('suppliers', () => {
    it('list returns all suppliers', async () => {
      const result = await engines.suppliers.list()
      expect(result).toHaveLength(3)
    })

    it('get returns a supplier by id', async () => {
      const result = await engines.suppliers.get(UUID_SUP_ACME)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(UUID_SUP_ACME)
    })

    it('get returns null for non-existent id', async () => {
      const result = await engines.suppliers.get('non-existent')
      expect(result).toBeNull()
    })

    it('create returns a new supplier with unverified status', async () => {
      const input = {
        name: 'New Supplier',
        payoutWallet: WALLET_A,
        businessEmail: 'new@supplier.com',
      }
      const result = await engines.suppliers.create(input)
      expect(result.verificationStatus).toBe('unverified')
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('update respects wallet change verification reset rule', async () => {
      await engines.suppliers.verify(UUID_SUP_GAMMA)
      const supplier = await engines.suppliers.get(UUID_SUP_GAMMA)
      expect(supplier?.verificationStatus).toBe('verified')

      const updated = await engines.suppliers.update(UUID_SUP_GAMMA, {
        payoutWallet: WALLET_B,
        name: 'Gamma Services Updated',
      })
      expect(updated.verificationStatus).toBe('review_required')
      expect(updated.verifiedAt).toBeNull()
      expect(updated.verifiedBy).toBeNull()
    })

    it('update cannot set verification_status directly (column grants)', async () => {
      const original = await engines.suppliers.get(UUID_SUP_ACME)
      const result = await engines.suppliers.update(UUID_SUP_ACME, {
        verificationStatus: 'verified' as const,
      })
      expect(result?.verificationStatus).toBe(original?.verificationStatus)
    })

    it('verify sets verification_status to verified', async () => {
      const result = await engines.suppliers.verify(UUID_SUP_BETA)
      expect(result.verificationStatus).toBe('verified')
      expect(result.verifiedAt).not.toBeNull()
      expect(result.verifiedBy).not.toBeNull()
    })

    it('update on missing supplier throws not_found', async () => {
      await expectNotFound(() => engines.suppliers.update('00000000-0000-4000-8000-0000000099ff', { name: 'X' }), 'Supplier not found')
    })
  })

  describe('agents', () => {
    it('list returns all agents', async () => {
      const result = await engines.agents.list()
      expect(result).toHaveLength(3)
    })

    it('get returns an agent by id', async () => {
      const result = await engines.agents.get(UUID_AGENT_RISK)
      expect(result).not.toBeNull()
      expect(result?.identifier).toBe('risk-001')
    })

    it('create returns a new agent', async () => {
      const input = {
        name: 'New Agent',
        identifier: 'new-agent-001',
        perRequestLimitMinor: '5000',
        dailyLimitMinor: '25000',
      }
      const result = await engines.agents.create(input)
      expect(result.identifier).toBe('new-agent-001')
      expect(result.perRequestLimitMinor).toBe('5000')
      expect(result.dailyLimitMinor).toBe('25000')
    })

    it('create rejects perRequestLimitMinor <= 0', async () => {
      const input = {
        name: 'Bad Agent',
        identifier: 'bad-agent',
        perRequestLimitMinor: '0',
        dailyLimitMinor: '1000',
      }
      await expectValidation(() => engines.agents.create(input), 'perRequestLimitMinor must be > 0')
    })

    it('create rejects dailyLimitMinor < perRequestLimitMinor', async () => {
      const input = {
        name: 'Bad Agent',
        identifier: 'bad-agent-2',
        perRequestLimitMinor: '5000',
        dailyLimitMinor: '1000',
      }
      await expectValidation(() => engines.agents.create(input), 'dailyLimitMinor must be >= perRequestLimitMinor')
    })

    it('create rejects duplicate identifier', async () => {
      await expect(
        engines.agents.create({
          name: 'Dup', identifier: 'risk-001',
          perRequestLimitMinor: '1000', dailyLimitMinor: '1000',
        })
      ).rejects.toMatchObject({ code: 'conflict' })
    })

    it('setStatus changes agent status', async () => {
      const result = await engines.agents.setStatus(UUID_AGENT_OPS, 'active')
      expect(result.status).toBe('active')
    })

    it('setLimits validates positive per-request and daily >= per-request', async () => {
      await expectValidation(
        () => engines.agents.setLimits(UUID_AGENT_OPS, '0', '1000'),
        'perRequestLimitMinor must be > 0'
      )
      await expectValidation(
        () => engines.agents.setLimits(UUID_AGENT_OPS, '5000', '1000'),
        'dailyLimitMinor must be >= perRequestLimitMinor'
      )
    })

    it('setLimits sets limits correctly', async () => {
      const result = await engines.agents.setLimits(UUID_AGENT_OPS, '20000', '1000000')
      expect(result.perRequestLimitMinor).toBe('20000')
      expect(result.dailyLimitMinor).toBe('1000000')
    })

    it('create with policyIds assigns the agent to the policy', async () => {
      const agent = await engines.agents.create({
        name: 'Policy Bound Agent', identifier: 'pb-agent',
        perRequestLimitMinor: '1000', dailyLimitMinor: '5000',
        policyIds: [UUID_POL_STANDARD],
      })
      const policy = await engines.policies.get(UUID_POL_STANDARD)
      expect(policy).not.toBeNull()
      expect(agent.identifier).toBe('pb-agent')
    })
  })

  describe('policies', () => {
    it('list returns all policies', async () => {
      const result = await engines.policies.list()
      expect(result).toHaveLength(3)
    })

    it('get returns a policy by id', async () => {
      const result = await engines.policies.get(UUID_POL_STANDARD)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Standard Policy')
    })

    it('create returns a new policy', async () => {
      const input = {
        name: 'New Policy',
        description: 'New policy description',
        maxInvoiceMinor: '100000',
        dailyCapMinor: '5000000',
        controls: {
          requireVerifiedSupplier: true,
          requireDeliveryAttestation: false,
          requireAgentIntent: true,
          requireSupportingEvidence: false,
          requireTwoPersonApproval: false,
        },
      }
      const result = await engines.policies.create(input)
      expect(result.name).toBe('New Policy')
      expect(result.maxInvoiceMinor).toBe('100000')
    })

    it('create validates maxInvoiceMinor > 0 and dailyCapMinor >= max', async () => {
      await expectValidation(
        () => engines.policies.create({
          name: 'Bad', maxInvoiceMinor: '0', dailyCapMinor: '1000',
          controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false },
        }),
        'maxInvoiceMinor must be > 0'
      )
      await expectValidation(
        () => engines.policies.create({
          name: 'Bad', maxInvoiceMinor: '5000', dailyCapMinor: '1000',
          controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false },
        }),
        'dailyCapMinor must be >= maxInvoiceMinor'
      )
    })

    it('update validates limits when both provided', async () => {
      await expectValidation(
        () => engines.policies.update(UUID_POL_STANDARD, {
          maxInvoiceMinor: '5000', dailyCapMinor: '1000',
        }),
        'dailyCapMinor must be >= maxInvoiceMinor'
      )
    })

    it('assignAgents assigns agents to policy', async () => {
      const result = await engines.policies.assignAgents(UUID_POL_STANDARD, [UUID_AGENT_RISK, UUID_AGENT_COMP])
      expect(result.id).toBe(UUID_POL_STANDARD)
      const policy = await engines.policies.get(UUID_POL_STANDARD)
      expect(policy).not.toBeNull()
    })
  })

  describe('invoices', () => {
    it('list returns all invoices', async () => {
      const result = await engines.invoices.list()
      expect(result).toHaveLength(3)
    })

    it('get returns an invoice by id', async () => {
      const result = await engines.invoices.get(UUID_INV_001)
      expect(result).not.toBeNull()
      expect(result?.invoiceNumber).toBe('INV-001')
    })

    it('create returns a new invoice with open status', async () => {
      const input = {
        invoiceNumber: 'INV-NEW',
        supplierId: UUID_SUP_ACME,
        payeeWallet: WALLET_A,
        amountMinor: '75000',
        currency: 'USD' as const,
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
      }
      const result = await engines.invoices.create(input)
      expect(result.status).toBe('open')
      expect(result.invoiceNumber).toBe('INV-NEW')
    })

    it('create rejects duplicate invoice number', async () => {
      await expect(
        engines.invoices.create({
          invoiceNumber: 'INV-001',
          supplierId: UUID_SUP_ACME,
          payeeWallet: WALLET_A,
          amountMinor: '1000',
          currency: 'USD' as const,
          issueDate: '2026-03-01',
          dueDate: '2026-03-31',
        })
      ).rejects.toMatchObject({ code: 'conflict' })
    })

    it('create rejects amountMinor <= 0', async () => {
      await expectValidation(
        () => engines.invoices.create({
          invoiceNumber: 'INV-BAD',
          supplierId: UUID_SUP_ACME,
          payeeWallet: WALLET_A,
          amountMinor: '0',
          currency: 'USD' as const,
          issueDate: '2026-03-01',
          dueDate: '2026-03-31',
        }),
        'amountMinor must be > 0'
      )
    })

    it('attest changes status from open to attested', async () => {
      const result = await engines.invoices.attest(UUID_INV_001)
      expect(result.status).toBe('attested')
      expect(result.attestedAt).not.toBeNull()
      expect(result.attestedBy).not.toBeNull()
    })

    it('attest rejects non-open invoice', async () => {
      await expectValidation(
        () => engines.invoices.attest(UUID_INV_003),
        'Only open invoices can be attested'
      )
    })

    it('dispute changes status to disputed from open', async () => {
      const invOpen = await engines.invoices.create({
        invoiceNumber: 'INV-DISPUTE-1',
        supplierId: UUID_SUP_ACME,
        payeeWallet: WALLET_A,
        amountMinor: '30000',
        currency: 'USD' as const,
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
      })
      const result = await engines.invoices.dispute(invOpen.id)
      expect(result.status).toBe('disputed')
    })

    it('dispute changes status from attested to disputed', async () => {
      const invAttested = await engines.invoices.create({
        invoiceNumber: 'INV-DISPUTE-2',
        supplierId: UUID_SUP_ACME,
        payeeWallet: WALLET_A,
        amountMinor: '30000',
        currency: 'USD' as const,
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
      })
      const attested = await engines.invoices.attest(invAttested.id)
      expect(attested.status).toBe('attested')
      const result = await engines.invoices.dispute(attested.id)
      expect(result.status).toBe('disputed')
    })
  })
})