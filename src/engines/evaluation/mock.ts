import type { Evaluation, Policy } from '../../domain/types'
import { SEED_POLICIES } from '../../domain/seed'
import type { EvaluationEnginePort, PolicyEnginePort, EvaluationInput } from './types'
import { evaluatePaymentRules } from './rules'

const STORAGE_KEY = 'airlock-policies-typed'

export class MockPolicyEngine implements PolicyEnginePort {
  private policies: Policy[] = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const saved = typeof window !== 'undefined' ? window.sessionStorage?.getItem(STORAGE_KEY) : null
      if (saved) {
        this.policies = JSON.parse(saved)
        return
      }
    } catch {
      // ignore
    }
    this.policies = [...SEED_POLICIES]
  }

  private persist() {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(this.policies))
      }
    } catch {
      // ignore
    }
  }

  async listPolicies(): Promise<Policy[]> {
    return [...this.policies]
  }

  async getPolicyById(id: string): Promise<Policy | null> {
    const p = this.policies.find(x => x.id === id)
    return p ? { ...p } : null
  }

  async createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy> {
    const newPolicy: Policy = {
      ...policy,
      id: `policy-${Date.now()}`,
    }
    this.policies = [...this.policies, newPolicy]
    this.persist()
    return newPolicy
  }

  async updatePolicy(policy: Policy): Promise<Policy> {
    const idx = this.policies.findIndex(p => p.id === policy.id)
    if (idx === -1) throw new Error(`Policy ${policy.id} not found`)
    this.policies[idx] = policy
    this.persist()
    return policy
  }

  async assignPolicyToAgents(policyId: string, agentNames: string[]): Promise<Policy> {
    const idx = this.policies.findIndex(p => p.id === policyId)
    if (idx === -1) throw new Error(`Policy ${policyId} not found`)
    const updated = { ...this.policies[idx], assignedAgentNames: agentNames }
    this.policies[idx] = updated
    this.persist()
    return updated
  }
}

export class MockEvaluationEngine implements EvaluationEnginePort {
  async evaluateRequest(input: EvaluationInput): Promise<Evaluation> {
    return evaluatePaymentRules(input)
  }
}

export const mockPolicyEngine = new MockPolicyEngine()
export const mockEvaluationEngine = new MockEvaluationEngine()
