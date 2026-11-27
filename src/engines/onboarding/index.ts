import type { OnboardingPort, OnboardingState } from './types'
import { LiveOnboardingEngine } from './live'

export class OnboardingEngineProxy implements OnboardingPort {
  private live: LiveOnboardingEngine | null = null

  private getLive(): LiveOnboardingEngine {
    return this.live ?? (this.live = new LiveOnboardingEngine())
  }

  async get(): Promise<OnboardingState> {
    return await this.getLive().get()
  }

  async saveStep(step: number, data: Record<string, unknown>): Promise<void> {
    return await this.getLive().saveStep(step, data)
  }

  async complete(): Promise<void> {
    return await this.getLive().complete()
  }
}

export const onboardingEngine: OnboardingPort = new OnboardingEngineProxy()
export type { OnboardingPort, OnboardingState } from './types'
