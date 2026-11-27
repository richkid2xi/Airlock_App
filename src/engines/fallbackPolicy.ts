/**
 * Honest fallback policy shared by auth + onboarding live engines.
 *
 * Rules (AGENTS.md honest fallback):
 * - 401/403 (auth/RLS denials) NEVER fall back to mock.
 * - Transport/RPC/network errors fall back to mock ONLY when
 *   VITE_ALLOW_MOCK_FALLBACK is not 'false', and mark the engine degraded
 *   so a "Mock data" badge is shown.
 * - Other errors rethrow.
 */

import { engineRegistry, type EngineName } from './engineRegistry'

export function isFatalAuthError(err: unknown): boolean {
  const e = err as { code?: string; status?: number; status_code?: number }
  const rawStatus = e?.status ?? e?.status_code
  const status = typeof rawStatus === 'number' ? rawStatus : e?.code ? parseInt(e.code, 10) : NaN
  return status === 401 || status === 403
}

export function isTransportError(err: unknown): boolean {
  const e = err as { code?: string; name?: string }
  if (!e) return false
  const code = (e.code ?? '').toLowerCase()
  const name = (e.name ?? '').toLowerCase()
  return (
    code === 'fetch_failed' ||
    code === 'network_error' ||
    code === 'econnrefused' ||
    code === 'etimedout' ||
    code === 'enotfound' ||
    name === 'typeerror' ||
    name === 'networkerror'
  )
}

function envVal(key: string): string | undefined {
  const processVal = typeof process !== 'undefined' ? process.env?.[key] : undefined
  if (processVal !== undefined) return processVal
  const meta = (import.meta as any).env ?? {}
  return meta[key]
}

export function configuredLive(engineName: EngineName): boolean {
  return (envVal(`VITE_ENGINE_${engineName.toUpperCase()}`) ?? '').toLowerCase() === 'live'
}

export function allowMockFallback(): boolean {
  return envVal('VITE_ALLOW_MOCK_FALLBACK') !== 'false'
}

export async function withPolicyFallback<T>(
  engineName: EngineName,
  liveFn: () => Promise<T>,
  mockFn: () => Promise<T>,
): Promise<T> {
  if (!configuredLive(engineName)) return mockFn()

  try {
    const res = await liveFn()
    engineRegistry.setLive(engineName)
    return res
  } catch (err) {
    if (isFatalAuthError(err)) {
      engineRegistry.setDegraded(engineName, err as Error)
      throw err
    }
    if (allowMockFallback() && isTransportError(err)) {
      engineRegistry.setDegraded(engineName, err as Error)
      return mockFn()
    }
    throw err
  }
}