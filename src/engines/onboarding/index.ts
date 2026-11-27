import type { OnboardingPort, OnboardingState } from './types'
import { engineRegistry } from '../engineRegistry'
import { mockOnboardingEngine } from './mock'
import { LiveOnboardingEngine } from './live'
import { withPolicyFallback } from '../fallbackPolicy'

export class OnboardingEngineProxy implements OnboardingPort {
  private live: LiveOnboardingEngine | null = null

  private getLive(): LiveOnboardingEngine {
    return this.live ?? (this.live = new LiveOnboardingEngine())
  }

  async get(): Promise<OnboardingState> {
    return await withPolicyFallback('onboarding',
      async () => this.getLive().get(),
      async () => mockOnboardingEngine.get()
    )
  }

  async saveStep(step: number, data: Record<string, unknown>): Promise<void> {
    return await withPolicyFallback('onboarding',
      async () => this.getLive().saveStep(step, data),
      async () => mockOnboardingEngine.saveStep(step, data)
    )
  }

  async complete(): Promise<void> {
    return await withPolicyFallback('onboarding',
      async () => this.getLive().complete(),
      async () => mockOnboardingEngine.complete()
    )
  }
}

export const onboardingEngine: OnboardingPort = new OnboardingEngineProxy()
export type { OnboardingPort, OnboardingState } from './types'