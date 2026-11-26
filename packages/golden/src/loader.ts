import exampleVectorJson from '../vectors/example.json'

export type Decision = 'ALLOW' | 'BLOCK' | 'HOLD'

export interface GoldenVectorInput {
  invoice: Record<string, unknown>
  supplier: Record<string, unknown>
  agent: Record<string, unknown>
  policy: Record<string, unknown>
  request: Record<string, unknown>
  history: Record<string, unknown>[]
}

export interface GoldenVectorExpected {
  decision: Decision
  failedRule?: string | null
  reasonCode: string
}

export interface GoldenVector {
  id: string
  description: string
  input: GoldenVectorInput
  expected: GoldenVectorExpected
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates and casts a raw value into a GoldenVector.
 * Throws a descriptive error when the vector does not match the documented shape.
 */
export function validateGoldenVector(raw: unknown, source: string): GoldenVector {
  if (!isObject(raw)) {
    throw new Error(`Golden vector (${source}) must be an object`)
  }
  const { id, description, input, expected } = raw
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(`Golden vector (${source}) has invalid 'id'`)
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`Golden vector (${source}) has invalid 'description'`)
  }
  if (!isObject(input)) {
    throw new Error(`Golden vector (${source}) has invalid 'input'`)
  }
  for (const key of ['invoice', 'supplier', 'agent', 'policy', 'request'] as const) {
    const value = input[key as string]
    if (!isObject(value)) {
      throw new Error(`Golden vector (${source}) input.${key} must be an object`)
    }
  }
  if (!Array.isArray(input.history)) {
    throw new Error(`Golden vector (${source}) input.history must be an array`)
  }
  if (!isObject(expected)) {
    throw new Error(`Golden vector (${source}) has invalid 'expected'`)
  }
  const decision = expected.decision
  if (decision !== 'ALLOW' && decision !== 'BLOCK' && decision !== 'HOLD') {
    throw new Error(`Golden vector (${source}) expected.decision must be ALLOW, BLOCK or HOLD`)
  }
  if (typeof expected.reasonCode !== 'string' || expected.reasonCode.length === 0) {
    throw new Error(`Golden vector (${source}) expected.reasonCode must be a non-empty string`)
  }
  const failedRule = expected.failedRule
  if (failedRule !== undefined && failedRule !== null && typeof failedRule !== 'string') {
    throw new Error(`Golden vector (${source}) expected.failedRule must be a string, null or undefined`)
  }
  return {
    id,
    description,
    input: {
      invoice: input.invoice as Record<string, unknown>,
      supplier: input.supplier as Record<string, unknown>,
      agent: input.agent as Record<string, unknown>,
      policy: input.policy as Record<string, unknown>,
      request: input.request as Record<string, unknown>,
      history: input.history as Record<string, unknown>[],
    },
    expected: {
      decision,
      failedRule: (failedRule as string | null | undefined) ?? null,
      reasonCode: expected.reasonCode,
    },
  }
}

/** The single example golden vector shipped with the repo (real vectors arrive in Module 4). */
export function loadExampleVector(): GoldenVector {
  return validateGoldenVector(exampleVectorJson, 'example.json')
}

/** Loads every golden vector available at build time. Currently only the example vector. */
export function loadAllGoldenVectors(): GoldenVector[] {
  return [loadExampleVector()]
}