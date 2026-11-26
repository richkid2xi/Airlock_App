import { describe, it, expect } from 'vitest'
import { EVALUATION_GOLDEN_VECTORS } from './evaluationVectors'
import { loadExampleVector, loadAllGoldenVectors, GoldenVector, GoldenVectorExpected } from './src/index'

describe('Golden Vectors: Baseline verification (Module 2 parity)', () => {
  it('loads all TS golden vectors correctly', () => {
    expect(EVALUATION_GOLDEN_VECTORS.length).toBeGreaterThanOrEqual(10)
    for (const gv of EVALUATION_GOLDEN_VECTORS) {
      expect(gv.id).toBeDefined()
      expect(gv.expectedDecision).toMatch(/^(ALLOW|BLOCK|HOLD)$/)
      expect(gv.expectedReasonSnippet.length).toBeGreaterThan(0)
    }
  })
})

describe('Golden Vectors: JSON loader (Step 7 - shared by web, server, test)', () => {
  it('loads the example vector with correct shape', () => {
    const vector = loadExampleVector()
    expect(vector.id).toBe('GV-EXAMPLE-001')
    expect(vector.description).toContain('Valid request')
    expect(vector.input.invoice).toBeDefined()
    expect(vector.input.supplier).toBeDefined()
    expect(vector.input.agent).toBeDefined()
    expect(vector.input.policy).toBeDefined()
    expect(vector.input.request).toBeDefined()
    expect(vector.input.history).toEqual([])
    expect(vector.expected.decision).toBe('ALLOW')
    expect(vector.expected.failedRule).toBeNull()
    expect(vector.expected.reasonCode).toBe('all_controls_passed')
  })

  it('loadAllGoldenVectors returns the example vector', () => {
    const vectors = loadAllGoldenVectors()
    expect(vectors).toHaveLength(1)
    expect(vectors[0].id).toBe('GV-EXAMPLE-001')
  })

  it('validates type shape for Decision enum', () => {
    const vector = loadExampleVector()
    const decision: 'ALLOW' | 'BLOCK' | 'HOLD' = vector.expected.decision
    expect(decision).toBe('ALLOW')
  })

  it('validates type shape for GoldenVector interface', () => {
    const vector: GoldenVector = loadExampleVector()
    const expected: GoldenVectorExpected = vector.expected
    expect(expected.decision).toBe('ALLOW')
  })
})