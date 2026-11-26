import { resolveEngine } from '../registry'
import { mockOnboardingEngine } from './mock'

/**
 * Resolve the onboarding engine per VITE_ENGINE_ONBOARDING.
 * Defaults to mock when env is not 'live'. Live engine (src/engines/onboarding/live.ts)
 * is wired in Phase 2D; until then the mock is returned unchanged so the UI
 * needs zero changes when live is plugged in later.
 */
export const onboardingEngine = resolveEngine('onboarding', mockOnboardingEngine, mockOnboardingEngine)

export type { OnboardingPort, OnboardingState } from './types'
