import { useState, useEffect } from 'react'
import { engineStatusStore, type EngineName, type EngineStatus } from './status'

/**
 * React hook to observe engine status.
 */
export function useEngineStatus(name: EngineName): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>(() => engineStatusStore.getStatus(name))

  useEffect(() => {
    return engineStatusStore.subscribe(all => {
      setStatus(all[name])
    })
  }, [name])

  return status
}

/**
 * Universal safe execution wrapper:
 * If live throws a transport/RPC error and VITE_ALLOW_MOCK_FALLBACK=true, retry on mock and mark degraded.
 */
export async function withFallback<T>(
  engineName: EngineName,
  liveFn: () => Promise<T>,
  mockFn: () => Promise<T>
): Promise<T> {
  const configuredMode = (import.meta as any).env?.[`VITE_ENGINE_${engineName.toUpperCase()}`]?.toLowerCase()
  const allowFallback = (import.meta as any).env?.VITE_ALLOW_MOCK_FALLBACK !== 'false'

  if (configuredMode === 'live') {
    try {
      const res = await liveFn()
      engineStatusStore.setLive(engineName)
      return res
    } catch (err: any) {
      if (allowFallback) {
        console.warn(`[Engine ${engineName}] Live call failed; falling back to mock:`, err)
        engineStatusStore.setDegraded(engineName, err)
        return await mockFn()
      }
      throw err
    }
  }

  return await mockFn()
}
