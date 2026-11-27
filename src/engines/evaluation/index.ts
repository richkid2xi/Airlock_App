import type { Evaluation, Policy } from '../../domain/types'
import type { EvaluationEnginePort, PolicyEnginePort, EvaluationInput } from './types'
import { liveEvaluationEngine, livePolicyEngine } from './live'

export * from './types'
export { evaluatePaymentRules } from './rules'

export const evaluationEngine: EvaluationEnginePort = liveEvaluationEngine
export const policyEngine: PolicyEnginePort = livePolicyEngine
