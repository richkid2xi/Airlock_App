import type { Evaluation, Policy } from '../../domain/types'
import type { EvaluationEnginePort, PolicyEnginePort, EvaluationInput } from './types'

export class LiveEvaluationEngine implements EvaluationEnginePort {
  private apiUrl: string

  constructor() {
    this.apiUrl = (import.meta as any).env?.VITE_EVALUATION_API_URL || ''
  }

  async evaluateRequest(input: EvaluationInput): Promise<Evaluation> {
    if (!this.apiUrl) throw new Error('VITE_EVALUATION_API_URL not configured')
    const res = await fetch(`${this.apiUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`Evaluation failed: ${res.statusText}`)
    return await res.json()
  }
}

export class LivePolicyEngine implements PolicyEnginePort {
  private apiUrl: string

  constructor() {
    this.apiUrl = (import.meta as any).env?.VITE_POLICY_API_URL || ''
  }

  async listPolicies(): Promise<Policy[]> {
    if (!this.apiUrl) throw new Error('VITE_POLICY_API_URL not configured')
    const res = await fetch(`${this.apiUrl}/policies`)
    if (!res.ok) throw new Error(`Policies fetch failed: ${res.statusText}`)
    return await res.json()
  }

  async getPolicyById(id: string): Promise<Policy | null> {
    if (!this.apiUrl) throw new Error('VITE_POLICY_API_URL not configured')
    const res = await fetch(`${this.apiUrl}/policies/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Policy lookup failed: ${res.statusText}`)
    return await res.json()
  }

  async createPolicy(policy: Omit<Policy, 'id'>): Promise<Policy> {
    if (!this.apiUrl) throw new Error('VITE_POLICY_API_URL not configured')
    const res = await fetch(`${this.apiUrl}/policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy),
    })
    if (!res.ok) throw new Error(`Policy creation failed: ${res.statusText}`)
    return await res.json()
  }

  async updatePolicy(policy: Policy): Promise<Policy> {
    if (!this.apiUrl) throw new Error('VITE_POLICY_API_URL not configured')
    const res = await fetch(`${this.apiUrl}/policies/${encodeURIComponent(policy.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy),
    })
    if (!res.ok) throw new Error(`Policy update failed: ${res.statusText}`)
    return await res.json()
  }

  async assignPolicyToAgents(policyId: string, agentNames: string[]): Promise<Policy> {
    if (!this.apiUrl) throw new Error('VITE_POLICY_API_URL not configured')
    const res = await fetch(`${this.apiUrl}/policies/${encodeURIComponent(policyId)}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentNames }),
    })
    if (!res.ok) throw new Error(`Policy assignment failed: ${res.statusText}`)
    return await res.json()
  }
}

export const liveEvaluationEngine = new LiveEvaluationEngine()
export const livePolicyEngine = new LivePolicyEngine()
