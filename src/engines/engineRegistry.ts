import { useSyncExternalStore } from 'react'

/**
 * 8 Engines as specified in Step 5:
 * auth, onboarding, registry, chain, evaluation, requests, approvals, metrics
 */
export type EngineName =
  | 'auth'
  | 'onboarding'
  | 'registry'
  | 'chain'
  | 'evaluation'
  | 'requests'
  | 'approvals'
  | 'metrics'

export type EngineMode = 'live' | 'mock' | 'degraded'

export interface EngineState {
  name: EngineName
  mode: EngineMode
  configuredMode: 'live' | 'mock'
  error?: string
  lastChecked: string
}

type EngineStoreState = Record<EngineName, EngineState>
type Listener = () => void

class EngineRegistryStore {
  private state: EngineStoreState = {
    auth: { name: 'auth', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    onboarding: { name: 'onboarding', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    registry: { name: 'registry', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    chain: { name: 'chain', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    evaluation: { name: 'evaluation', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    requests: { name: 'requests', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    approvals: { name: 'approvals', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    metrics: { name: 'metrics', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
  }
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.initFromEnv()
  }

  private initFromEnv() {
    const names: EngineName[] = [
      'auth',
      'onboarding',
      'registry',
      'chain',
      'evaluation',
      'requests',
      'approvals',
      'metrics',
    ]
    for (const name of names) {
      const envKey = `VITE_ENGINE_${name.toUpperCase()}`
      const envVal = (import.meta as any).env?.[envKey]?.toLowerCase()
      const configured = envVal === 'live' ? 'live' : 'mock'
      this.state[name] = {
        name,
        mode: configured,
        configuredMode: configured,
        lastChecked: new Date().toISOString(),
      }
    }
  }

  getSnapshot = (): EngineStoreState => {
    return this.state
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setDegraded(name: EngineName, error: Error | string) {
    const err = typeof error === 'string' ? error : error.message
    this.state = {
      ...this.state,
      [name]: {
        ...this.state[name],
        mode: 'degraded',
        error: err,
        lastChecked: new Date().toISOString(),
      },
    }
    this.emit()
  }

  setLive(name: EngineName) {
    this.state = {
      ...this.state,
      [name]: {
        ...this.state[name],
        mode: 'live',
        error: undefined,
        lastChecked: new Date().toISOString(),
      },
    }
    this.emit()
  }

  private emit() {
    for (const l of this.listeners) l()
  }
}

export const engineRegistry = new EngineRegistryStore()

export function useEngineRegistry(): EngineStoreState {
  return useSyncExternalStore(engineRegistry.subscribe, engineRegistry.getSnapshot)
}

export function useEngine(name: EngineName): EngineState {
  const store = useEngineRegistry()
  return store[name]
}

export function resolveEngine<T>(name: EngineName, mockImpl: T, liveImpl: T): T {
  const envVal = (import.meta as any).env?.[`VITE_ENGINE_${name.toUpperCase()}`]?.toLowerCase()
  return envVal === 'live' ? liveImpl : mockImpl
}

export async function withFallback<T>(
  name: EngineName,
  liveFn: () => Promise<T>,
  mockFn: () => Promise<T>
): Promise<T> {
  const envVal = (import.meta as any).env?.[`VITE_ENGINE_${name.toUpperCase()}`]?.toLowerCase()
  const allowFallback = (import.meta as any).env?.VITE_ALLOW_MOCK_FALLBACK !== 'false'

  if (envVal === 'live') {
    try {
      const res = await liveFn()
      engineRegistry.setLive(name)
      return res
    } catch (err: any) {
      if (allowFallback) {
        console.warn(`[Engine ${name}] Live call failed; falling back to mock:`, err)
        engineRegistry.setDegraded(name, err)
        return await mockFn()
      }
      throw err
    }
  }

  return await mockFn()
}
