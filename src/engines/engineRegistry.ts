import { useSyncExternalStore } from 'react'

export type EngineName =
  | 'auth'
  | 'onboarding'
  | 'registry'
  | 'chain'
  | 'evaluation'
  | 'requests'
  | 'approvals'
  | 'metrics'

export type EngineMode = 'live' | 'degraded'

export interface EngineState {
  name: EngineName
  mode: EngineMode
  error?: string
  lastChecked: string
}

type EngineStoreState = Record<EngineName, EngineState>
type Listener = () => void

class EngineRegistryStore {
  private state: EngineStoreState = {
    auth: { name: 'auth', mode: 'live', lastChecked: new Date().toISOString() },
    onboarding: { name: 'onboarding', mode: 'live', lastChecked: new Date().toISOString() },
    registry: { name: 'registry', mode: 'live', lastChecked: new Date().toISOString() },
    chain: { name: 'chain', mode: 'live', lastChecked: new Date().toISOString() },
    evaluation: { name: 'evaluation', mode: 'live', lastChecked: new Date().toISOString() },
    requests: { name: 'requests', mode: 'live', lastChecked: new Date().toISOString() },
    approvals: { name: 'approvals', mode: 'live', lastChecked: new Date().toISOString() },
    metrics: { name: 'metrics', mode: 'live', lastChecked: new Date().toISOString() },
  }
  private listeners: Set<Listener> = new Set()

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
