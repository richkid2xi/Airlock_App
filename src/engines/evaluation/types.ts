import type {
  PaymentRequest,
  Evaluation,
  Policy,
  Agent,
  Invoice,
  Supplier,
  Decision,
} from '../../domain/types'

export interface EvaluationInput {
  invoiceNumber: string
  requestedAmountUnits: string
  destinationWallet: string
  agentNameOrId: string
  intent: string
  hasEvidence: boolean
  registeredInvoice?: Invoice | null
  registeredSupplier?: Supplier | null
  agent?: Agent | null
  activePolicy?: Policy | null
}

export interface EvaluationEnginePort {
  evaluateRequest(input: EvaluationInput): Promise<Evaluation>
}

export interface PolicyEnginePort {
  listPolicies(): Promise<Policy[]>
  getPolicyById(id: string): Promise<Policy | null>
  createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy>
  updatePolicy(policy: Policy): Promise<Policy>
  assignPolicyToAgents(policyId: string, agentNames: string[]): Promise<Policy>
}
