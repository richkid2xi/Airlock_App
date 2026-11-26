/**
 * Onboarding engine port.
 * Real implementation will persist via backend org endpoints; mock keeps the
 * current localStorage-backed draft behaviour.
 */
export type OnboardingState = {
  draft: Record<string, unknown>;
  completed: boolean;
}

export interface OnboardingPort {
  /** Fetch the onboarding draft + completion flag. */
  get(): Promise<OnboardingState>;
  /** Persist one validated onboarding step. */
  saveStep(step: number, data: Record<string, unknown>): Promise<void>;
  /** Mark onboarding complete. */
  complete(): Promise<void>;
}

export const ONBOARDING_STEPS = [
  'Connect wallet',
  'Organization',
  'Payment setup',
  'Security',
  'Complete',
] as const
