/**
 * UNVERIFIED against a real wallet
 *
 * Live Onboarding Engine — persists onboarding progress to Supabase.
 * saveStep sets onboarding_step = max(existing, step + 1).
 * complete() calls the complete_onboarding RPC.
 */

import type { OnboardingPort, OnboardingState } from './types'
import { supabase } from '../../lib/supabase'
import { decimalStringToBigInt, minorUnitsToInputString } from '@airlock/shared/minorUnits'

function mapDraftToDb(step: number, draft: Record<string, unknown>): Record<string, unknown> {
  const db: Record<string, unknown> = {}

  if (step === 0) {
    // Organization step
    if (draft.organizationName) db.name = draft.organizationName as string
    if (draft.businessEmail) db.business_email = draft.businessEmail as string
    if (draft.industry) db.industry = draft.industry as string
    if (draft.size) db.size = draft.size as string
  }

  if (step === 1) {
    // Payment setup step
    if (draft.settlementCluster) db.settlement_cluster = draft.settlementCluster as string
    if (draft.settlementAsset) db.settlement_asset = draft.settlementAsset as string
    if (draft.reportingCurrency) db.reporting_currency = draft.reportingCurrency as string
    if (draft.maxInvoiceAmount) {
      try { db.max_invoice_minor = decimalStringToBigInt(String(draft.maxInvoiceAmount)) } catch {}
    }
    if (draft.approvalThreshold) {
      try { db.approval_threshold_minor = decimalStringToBigInt(String(draft.approvalThreshold)) } catch {}
    }
  }

  return db
}

export class LiveOnboardingEngine implements OnboardingPort {
  async get(): Promise<OnboardingState> {
    const { data, error } = await supabase
      .from('organizations')
      .select('name, business_email, industry, size, settlement_cluster, settlement_asset, reporting_currency, max_invoice_minor, approval_threshold_minor, onboarding_step, onboarded_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return { draft: {}, completed: false, step: 0 }
    const row = data as Record<string, unknown>
    const completed = row.onboarded_at != null
    const step = typeof row.onboarding_step === 'number' ? row.onboarding_step : 0
    const draft: Record<string, unknown> = {}
    if (row.name != null) draft.organizationName = row.name
    if (row.business_email != null) draft.businessEmail = row.business_email
    if (row.industry != null) draft.industry = row.industry
    if (row.size != null) draft.size = row.size
    if (row.settlement_cluster != null) draft.settlementCluster = row.settlement_cluster
    if (row.settlement_asset != null) draft.settlementAsset = row.settlement_asset
    if (row.reporting_currency != null) draft.reportingCurrency = row.reporting_currency
    if (row.max_invoice_minor != null) draft.maxInvoiceAmount = minorUnitsToInputString(BigInt(String(row.max_invoice_minor)))
    if (row.approval_threshold_minor != null) draft.approvalThreshold = minorUnitsToInputString(BigInt(String(row.approval_threshold_minor)))
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

    const dbData = mapDraftToDb(step, data)

    if (!existing) {
      // First save: insert the organization so subsequent updates have a row to hit.
      const { error: insertError } = await (supabase.from('organizations') as any)
        .insert({ owner_id: ownerId, onboarding_step: nextStep, ...dbData })
      if (insertError) throw insertError
      return
    }

    const { error } = await (supabase.from('organizations') as any)
      .update({ onboarding_step: nextStep, ...dbData })
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