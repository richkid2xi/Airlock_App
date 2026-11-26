import { OnboardingPort, OnboardingState } from './types'
import { engineRegistry } from '../registry'

const STORAGE_KEY = 'airlock-onboarding'

/**
 * Mock onboarding engine — preserves the current localStorage-backed
 * draft behaviour so the UI cannot tell the difference when
 * VITE_ENGINE_ONBOARDING=mock.
 */
class MockOnboardingEngine implements OnboardingPort {
  private state: OnboardingState = { draft: {}, completed: false }

  async get(): Promise<OnboardingState> {
    // Original behaviour: fresh in-memory state per mount
    return { draft: {}, completed: false }
  }

  async saveStep(_step: number, data: Record<string, unknown>): Promise<void> {
    // Mock behaviour: onboarding values are discarded locally
    return Promise.resolve()
  }

  async complete(): Promise<void> {
    // Mock behaviour: completion only drives local navigation
    return Promise.resolve()
  }
}

export const mockOnboardingEngine = new MockOnboardingEngine()
export { engineRegistry }