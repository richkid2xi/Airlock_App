import type { Evaluation } from '../../domain/types'
import type { EvaluationEnginePort, PolicyEnginePort, EvaluationInput } from './types'
import { evaluatePaymentRules } from './rules'

export class LiveEvaluationEngine implements EvaluationEnginePort {
  async evaluateRequest(input: EvaluationInput): Promise<Evaluation> {
    return evaluatePaymentRules(input)
  }
}

export const liveEvaluationEngine = new LiveEvaluationEngine()
