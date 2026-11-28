import type { EvaluationEnginePort, EvaluationInput } from './types'
import { liveEvaluationEngine } from './live'

export * from './types'
export { evaluatePaymentRules } from './rules'

export const evaluationEngine: EvaluationEnginePort = liveEvaluationEngine
