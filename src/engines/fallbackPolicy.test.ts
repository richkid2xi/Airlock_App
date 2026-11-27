import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isFatalAuthError, isTransportError, withPolicyFallback, allowMockFallback, configuredLive } from './fallbackPolicy'

describe('fallbackPolicy', () => {
  beforeEach(() => {
    process.env.VITE_ENGINE_AUTH = 'live'
    process.env.VITE_ENGINE_ONBOARDING = 'live'
    process.env.VITE_ALLOW_MOCK_FALLBACK = 'true'
  })

  afterEach(() => {
    delete process.env.VITE_ENGINE_AUTH
    delete process.env.VITE_ENGINE_ONBOARDING
    delete process.env.VITE_ALLOW_MOCK_FALLBACK
  })

  describe('isFatalAuthError', () => {
    it('returns true for status 401', () => {
      expect(isFatalAuthError({ status: 401 })).toBe(true)
    })
    it('returns true for status 403', () => {
      expect(isFatalAuthError({ status: 403 })).toBe(true)
    })
    it('returns true for code "401"', () => {
      expect(isFatalAuthError({ code: '401' })).toBe(true)
    })
    it('returns false for status 500', () => {
      expect(isFatalAuthError({ status: 500 })).toBe(false)
    })
    it('returns false for network error', () => {
      expect(isFatalAuthError({ code: 'fetch_failed' })).toBe(false)
    })
  })

  describe('isTransportError', () => {
    it('returns true for fetch_failed code', () => {
      expect(isTransportError({ code: 'fetch_failed' })).toBe(true)
    })
    it('returns true for network_error code', () => {
      expect(isTransportError({ code: 'network_error' })).toBe(true)
    })
    it('returns true for TypeError name', () => {
      expect(isTransportError({ name: 'TypeError', message: 'Failed to fetch' })).toBe(true)
    })
    it('returns true for NetworkError name', () => {
      expect(isTransportError({ name: 'NetworkError' })).toBe(true)
    })
    it('returns false for status 401', () => {
      expect(isTransportError({ status: 401 })).toBe(false)
    })
    it('returns false for generic error', () => {
      expect(isTransportError(new Error('random'))).toBe(false)
    })
  })

  describe('withPolicyFallback', () => {
    it('uses mock when engine not live', async () => {
      process.env.VITE_ENGINE_AUTH = 'mock'
      const mock = vi.fn().mockResolvedValue('mock-result')
      const live = vi.fn().mockResolvedValue('live-result')
      const res = await withPolicyFallback('auth', live, mock)
      expect(res).toBe('mock-result')
      expect(live).not.toHaveBeenCalled()
      expect(mock).toHaveBeenCalled()
    })

    it('uses live when engine is live and succeeds', async () => {
      process.env.VITE_ENGINE_AUTH = 'live'
      const mock = vi.fn()
      const live = vi.fn().mockResolvedValue('live-result')
      const res = await withPolicyFallback('auth', live, mock)
      expect(res).toBe('live-result')
      expect(live).toHaveBeenCalled()
      expect(mock).not.toHaveBeenCalled()
    })

    it('throws fatal error (401) without fallback', async () => {
      const mock = vi.fn()
      const live = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' })
      await expect(withPolicyFallback('auth', live, mock)).rejects.toMatchObject({ status: 401 })
      expect(mock).not.toHaveBeenCalled()
    })

    it('throws fatal error (403) without fallback', async () => {
      const mock = vi.fn()
      const live = vi.fn().mockRejectedValue({ status: 403, message: 'Forbidden' })
      await expect(withPolicyFallback('auth', live, mock)).rejects.toMatchObject({ status: 403 })
      expect(mock).not.toHaveBeenCalled()
    })

    it('falls back on network error when allowed', async () => {
      const mock = vi.fn().mockResolvedValue('mock-result')
      const live = vi.fn().mockRejectedValue({ code: 'fetch_failed' })
      const res = await withPolicyFallback('auth', live, mock)
      expect(res).toBe('mock-result')
      expect(mock).toHaveBeenCalled()
    })

    it('does NOT fallback on network error when VITE_ALLOW_MOCK_FALLBACK=false', async () => {
      process.env.VITE_ALLOW_MOCK_FALLBACK = 'false'
      const mock = vi.fn()
      const live = vi.fn().mockRejectedValue({ code: 'fetch_failed' })
      await expect(withPolicyFallback('auth', live, mock)).rejects.toMatchObject({ code: 'fetch_failed' })
      expect(mock).not.toHaveBeenCalled()
    })

    it('does NOT fallback on non-fatal non-transport error', async () => {
      const mock = vi.fn()
      const live = vi.fn().mockRejectedValue({ status: 500, message: 'Server error' })
      await expect(withPolicyFallback('auth', live, mock)).rejects.toMatchObject({ status: 500 })
      expect(mock).not.toHaveBeenCalled()
    })
  })

  describe('allowMockFallback', () => {
    it('true by default', () => {
      delete process.env.VITE_ALLOW_MOCK_FALLBACK
      expect(allowMockFallback()).toBe(true)
    })
    it('false when explicitly set', () => {
      process.env.VITE_ALLOW_MOCK_FALLBACK = 'false'
      expect(allowMockFallback()).toBe(false)
    })
  })

  describe('configuredLive', () => {
    it('false by default', () => {
      delete process.env.VITE_ENGINE_AUTH
      expect(configuredLive('auth')).toBe(false)
    })
    it('true when VITE_ENGINE_AUTH=live', () => {
      process.env.VITE_ENGINE_AUTH = 'live'
      expect(configuredLive('auth')).toBe(true)
    })
    it('false when VITE_ENGINE_AUTH=mock', () => {
      process.env.VITE_ENGINE_AUTH = 'mock'
      expect(configuredLive('auth')).toBe(false)
    })
  })
})