import { OnboardingPort, OnboardingState } from './types'

const STORAGE_KEY = 'airlock-onboarding'

/**
 * Mock onboarding engine — preserves the current localStorage-backed
 * draft behaviour so the UI cannot tell the difference when
 * VITE_ENGINE_ONBOARDING=mock.
 */
class MockOnboardingEngine implements OnboardingPort {
  private read(): OnboardingState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore parse errors, return fresh state
    }
    return { draft: {}, completed: false, step: 0 }
  }

  private write(state: OnboardingState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota exceeded
    }
  }

  async get(): Promise<OnboardingState> {
    return this.read()
  }

  async saveStep(step: number, data: Record<string, unknown>): Promise<void> {
    const current = this.read()
    const draft = { ...current.draft, ...data, onboarding_step: Math.max(current.step ?? 0, step) }
    const nextStep = Math.max(current.step ?? 0, step)
    this.write({ draft, completed: current.completed, step: nextStep })
    return Promise.resolve()
  }

  async complete(): Promise<void> {
    const current = this.read()
    this.write({ ...current, completed: true })
    return Promise.resolve()
  }
}

export const mockOnboardingEngine = new MockOnboardingEngine()
export { engineRegistry } from '../engineRegistry'