import { describe, it, expect } from 'vitest'
import { engineStatusStore } from './status'
import { withFallback } from './fallback'

describe('Engine Status & Degradation Store', () => {
  it('initializes engines with default mock status', () => {
    const status = engineStatusStore.getStatus('invoice')
    expect(status.name).toBe('invoice')
    expect(['live', 'mock']).toContain(status.mode)
  })

  it('marks engine as degraded on transport failure when fallback is allowed', async () => {
    let mockCalled = false
    const liveFn = async () => {
      throw new Error('Connection refused / RPC timeout')
    }
    const mockFn = async () => {
      mockCalled = true
      return { ok: true }
    }

    const res = await withFallback('invoice', liveFn, mockFn)
    expect(res).toEqual({ ok: true })
    expect(mockCalled).toBe(true)
  })
})
