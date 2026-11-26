import { describe, it, expect } from 'vitest'
import { EVALUATION_GOLDEN_VECTORS } from '../../../packages/golden/evaluationVectors'
import { evaluatePaymentRules } from './rules'
import type { Invoice, Supplier, Agent, Policy } from '../../domain/types'

describe('Evaluation Engine: Golden Vector Verification', () => {
  for (const gv of EVALUATION_GOLDEN_VECTORS) {
    it(`evaluates ${gv.id}: ${gv.description}`, () => {
      const registeredInvoice: Invoice | undefined = gv.registeredInvoice
        ? {
            id: `inv-${gv.registeredInvoice.number.toLowerCase()}`,
            number: gv.registeredInvoice.number,
            supplierId: 'sup-1',
            supplierName: 'Supplier Inc.',
            amountUnits: gv.registeredInvoice.amountUnits,
            currency: 'USDC',
            issueDate: '2025-05-01',
            dueDate: '2025-05-30',
            status: gv.registeredInvoice.status,
          }
        : undefined

      const registeredSupplier: Supplier | undefined = gv.registeredSupplier
        ? {
            id: 'sup-1',
            name: 'Supplier Inc.',
            payoutWallet: gv.registeredSupplier.payoutWallet,
            verificationStatus: gv.registeredSupplier.verificationStatus,
            operationalStatus: gv.registeredSupplier.operationalStatus,
            invoiceCount: 1,
          }
        : undefined

      const agent: Agent | undefined = gv.agentState
        ? {
            id: gv.request.agentId,
            name: 'Agent Procure',
            identifier: 'agt_test',
            status: gv.agentState.status,
            perRequestLimitUnits: gv.agentState.perRequestLimitUnits,
            dailyLimitUnits: gv.agentState.dailyLimitUnits,
            requestCount: 10,
            assignedPolicyIds: ['p-1'],
          }
        : undefined

      const activePolicy: Policy = {
        id: 'p-1',
        name: 'Test Policy',
        description: 'Test',
        maxAmountUnits: '50000000000',
        dailyCapUnits: '150000000000',
        controls: gv.policyControls,
        assignedAgentNames: ['Agent Procure'],
        status: 'Active',
      }

      const result = evaluatePaymentRules({
        invoiceNumber: gv.request.invoiceNumber,
        requestedAmountUnits: gv.request.requestedAmountUnits,
        destinationWallet: gv.request.destinationWallet,
        agentNameOrId: gv.request.agentId,
        intent: gv.request.intent,
        hasEvidence: gv.request.hasEvidence,
        registeredInvoice,
        registeredSupplier,
        agent,
        activePolicy,
      })

      expect(result.decision).toBe(gv.expectedDecision)
      const combinedReason = `${result.reason} ${result.triggeredRule || ''}`.toLowerCase()
      expect(combinedReason).toContain(gv.expectedReasonSnippet.toLowerCase())
    })
  }
})
