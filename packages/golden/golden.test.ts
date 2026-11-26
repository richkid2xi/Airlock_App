import { describe, it, expect } from 'vitest'
import { EVALUATION_GOLDEN_VECTORS } from '../../packages/golden/evaluationVectors'

describe('Golden Vectors: Baseline verification', () => {
  it('loads all golden vectors correctly', () => {
    expect(EVALUATION_GOLDEN_VECTORS.length).toBeGreaterThanOrEqual(10)
    for (const gv of EVALUATION_GOLDEN_VECTORS) {
      expect(gv.id).toBeDefined()
      expect(gv.expectedDecision).toMatch(/^(ALLOW|BLOCK|HOLD)$/)
      expect(gv.expectedReasonSnippet.length).toBeGreaterThan(0)
    }
  })
})
