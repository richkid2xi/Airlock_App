/**
 * UNVERIFIED against a real wallet
 *
 * Live Onboarding Engine — persists onboarding progress to Supabase.
 * saveStep sets onboarding_step = max(existing, step + 1).
 * complete() calls the complete_onboarding RPC.
 */

import type { OnboardingPort, OnboardingState } from './types'
import { supabase } from '../../lib/supabase'

export class LiveOnboardingEngine implements OnboardingPort {
  async get(): Promise<OnboardingState> {
    const { data, error } = await supabase
      .from('organizations')
      .select('name, business_email, onboarding_step, onboarded_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return { draft: {}, completed: false, step: 0 }
    const row = data as Record<string, unknown>
    const completed = row.onboarded_at != null
    const step = typeof row.onboarding_step === 'number' ? row.onboarding_step : 0
    const draft: Record<string, unknown> = {}
    if (row.name != null) draft.name = row.name
    if (row.business_email != null) draft.business_email = row.business_email
    return { draft, completed, step }
  }

  async saveStep(step: number, data: Record<string, unknown>): Promise<void> {
    const { data: existing } = await supabase
      .from('organizations')
      .select('onboarding_step')
      .maybeSingle()

    const currentStep = typeof (existing as any)?.onboarding_step === 'number' ? (existing as any).onboarding_step : 0
    const nextStep = Math.max(currentStep, step + 1)

    const { data: auth } = await supabase.auth.getUser()
    const ownerId = auth?.user?.id

    const { error } = await (supabase.from('organizations') as any)
      .update({ onboarding_step: nextStep, ...data })
      .eq('owner_id', ownerId)

    if (error) throw error
  }

  async complete(): Promise<void> {
    const { error } = await supabase.rpc('complete_onboarding')
    if (error) throw error
  }
}

export function createLiveOnboardingEngine(): LiveOnboardingEngine {
  return new LiveOnboardingEngine()
}