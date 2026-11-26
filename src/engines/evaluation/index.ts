import type { Evaluation, Policy } from '../../domain/types'
import { withFallback } from '../fallback'
import type { EvaluationEnginePort, PolicyEnginePort, EvaluationInput } from './types'
import { mockEvaluationEngine, mockPolicyEngine } from './mock'
import { liveEvaluationEngine, livePolicyEngine } from './live'

export * from './types'
export { evaluatePaymentRules } from './rules'

class EvaluationEngineProxy implements EvaluationEnginePort {
  async evaluateRequest(input: EvaluationInput): Promise<Evaluation> {
    return withFallback(
      'evaluation',
      () => liveEvaluationEngine.evaluateRequest(input),
      () => mockEvaluationEngine.evaluateRequest(input)
    )
  }
}

class PolicyEngineProxy implements PolicyEnginePort {
  async listPolicies(): Promise<Policy[]> {
    return withFallback(
      'policy',
      () => livePolicyEngine.listPolicies(),
      () => mockPolicyEngine.listPolicies()
    )
  }

  async getPolicyById(id: string): Promise<Policy | null> {
    return withFallback(
      'policy',
      () => livePolicyEngine.getPolicyById(id),
      () => mockPolicyEngine.getPolicyById(id)
    )
  }

  async createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy> {
    return withFallback(
      'policy',
      () => livePolicyEngine.createPolicy(policy),
      () => mockPolicyEngine.createPolicy(policy)
    )
  }

  async updatePolicy(policy: Policy): Promise<Policy> {
    return withFallback(
      'policy',
      () => livePolicyEngine.updatePolicy(policy),
      () => mockPolicyEngine.updatePolicy(policy)
    )
  }

  async assignPolicyToAgents(policyId: string, agentNames: string[]): Promise<Policy> {
    return withFallback(
      'policy',
      () => livePolicyEngine.assignPolicyToAgents(policyId, agentNames),
      () => mockPolicyEngine.assignPolicyToAgents(policyId, agentNames)
    )
  }
}

export const evaluationEngine: EvaluationEnginePort = new EvaluationEngineProxy()
export const policyEngine: PolicyEnginePort = new PolicyEngineProxy()
