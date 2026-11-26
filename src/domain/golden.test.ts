import { describe, it, expect } from 'vitest'
import { loadExampleVector, loadAllGoldenVectors, schema } from '@airlock/golden'

describe('Golden vector loads from the web app', () => {
  it('loads the example golden vector in the browser/web test environment', () => {
    const vector = loadExampleVector()
    expect(vector.id).toBe('GV-EXAMPLE-001')
    expect(vector.expected.decision).toBe('ALLOW')
  })

  it('exposes the JSON schema and all vectors to web code', () => {
    const vectors = loadAllGoldenVectors()
    expect(vectors).toHaveLength(1)
    expect((schema as { $schema?: string }).$schema).toContain('json-schema.org')
  })
})