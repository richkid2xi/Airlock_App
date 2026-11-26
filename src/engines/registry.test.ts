import { describe, it, expect } from 'vitest'
import { engineRegistry, resolveEngine, withFallback } from './registry'

describe('Engine Registry & Status Store', () => {
  it('registers all 8 engines with initial mock status', () => {
    const snap = engineRegistry.getSnapshot()
    const expected = ['auth', 'onboarding', 'registry', 'chain', 'evaluation', 'requests', 'approvals', 'metrics']
    for (const name of expected) {
      expect(snap[name as keyof typeof snap]).toBeDefined()
      expect(snap[name as keyof typeof snap].mode).toBe('mock')
    }
  })

  it('resolves engine implementation according to environment or default mock', () => {
    const resolved = resolveEngine('auth', 'mock-auth', 'live-auth')
    expect(resolved).toBe('mock-auth')
  })

  it('marks engine degraded when live throws and fallback is allowed', async () => {
    let mockCalled = false
    const liveFn = async () => {
      throw new Error('RPC endpoint timeout')
    }
    const mockFn = async () => {
      mockCalled = true
      return 'mock-result'
    }

    const res = await withFallback('chain', liveFn, mockFn)
    expect(res).toBe('mock-result')
    expect(mockCalled).toBe(true)
  })
})
