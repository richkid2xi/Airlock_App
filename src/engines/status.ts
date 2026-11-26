/**
 * Engine Status & Degradation Store
 * Rule 3: HONEST FALLBACK.
 * If live throws a transport/RPC error and VITE_ALLOW_MOCK_FALLBACK=true, retry that call
 * on mock and mark the engine "degraded" in the engine-status store.
 * Show a small "Mock data" badge wherever a degraded/mock engine feeds a screen.
 * Never present mock data as live.
 */

export type EngineName = 'invoice' | 'supplier' | 'policy' | 'evaluation' | 'settlement'

export type EngineMode = 'live' | 'mock' | 'degraded'

export interface EngineStatus {
  name: EngineName
  mode: EngineMode
  configuredMode: 'live' | 'mock'
  error?: string
  lastChecked: string
}

type Listener = (statuses: Record<EngineName, EngineStatus>) => void

class EngineStatusStore {
  private statuses: Record<EngineName, EngineStatus> = {
    invoice: { name: 'invoice', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    supplier: { name: 'supplier', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    policy: { name: 'policy', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    evaluation: { name: 'evaluation', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
    settlement: { name: 'settlement', mode: 'mock', configuredMode: 'mock', lastChecked: new Date().toISOString() },
  }
  private listeners: Set<Listener> = new Set()

  constructor() {
    this.initFromEnv()
  }

  private initFromEnv() {
    const engines: EngineName[] = ['invoice', 'supplier', 'policy', 'evaluation', 'settlement']
    for (const name of engines) {
      const envKey = `VITE_ENGINE_${name.toUpperCase()}`
      const envVal = (import.meta as any).env?.[envKey]?.toLowerCase()
      const configuredMode = envVal === 'live' ? 'live' : 'mock'
      this.statuses[name] = {
        name,
        mode: configuredMode,
        configuredMode,
        lastChecked: new Date().toISOString(),
      }
    }
  }

  getSnapshot(): Record<EngineName, EngineStatus> {
    return { ...this.statuses }
  }

  getStatus(name: EngineName): EngineStatus {
    return this.statuses[name] || {
      name,
      mode: 'mock',
      configuredMode: 'mock',
      lastChecked: new Date().toISOString(),
    }
  }

  isMockOrDegraded(name: EngineName): boolean {
    const s = this.statuses[name]
    return !s || s.mode === 'mock' || s.mode === 'degraded'
  }

  setDegraded(name: EngineName, error: Error | string) {
    const errStr = typeof error === 'string' ? error : error.message
    this.statuses[name] = {
      ...this.statuses[name],
      mode: 'degraded',
      error: errStr,
      lastChecked: new Date().toISOString(),
    }
    this.notify()
  }

  setLive(name: EngineName) {
    this.statuses[name] = {
      ...this.statuses[name],
      mode: 'live',
      error: undefined,
      lastChecked: new Date().toISOString(),
    }
    this.notify()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const snap = this.getSnapshot()
    for (const l of this.listeners) {
      l(snap)
    }
  }
}

export const engineStatusStore = new EngineStatusStore()
