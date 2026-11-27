import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Status } from '../ui/Status'
import { onboardingEngine } from '../engines/onboarding'
import { OnboardingStep1Schema, OnboardingStep2Schema } from '@airlock/shared'
import { useRoute } from '../router/useRoute'

const steps = ['Organization', 'Payment setup', 'Security', 'Complete']

type Draft = {
  organizationName: string
  businessEmail: string
  industry: string
  size: string
  settlementCluster: string
  settlementAsset: string
  reportingCurrency: string
  maxInvoiceAmount: string
  approvalThreshold: string
}

type FieldErrors = {
  organizationName?: string
  businessEmail?: string
  maxInvoiceAmount?: string
  approvalThreshold?: string
}

const EMPTY_DRAFT: Draft = {
  organizationName: '',
  businessEmail: '',
  industry: '',
  size: '',
  settlementCluster: '',
  settlementAsset: '',
  reportingCurrency: '',
  maxInvoiceAmount: '',
  approvalThreshold: '',
}

const AUTOSAVE_DEBOUNCE_MS = 400

function clusterLabel(): string {
  const cluster = (import.meta as any).env?.VITE_SOLANA_CLUSTER
  return typeof cluster === 'string' && cluster.length > 0 ? cluster : 'devnet'
}

function validateStep1(draft: Draft): FieldErrors {
  const result = OnboardingStep1Schema.safeParse({
    organizationName: draft.organizationName,
    businessEmail: draft.businessEmail,
    industry: draft.industry || undefined,
    size: draft.size || undefined,
  })
  if (result.success) return {}
  const f = result.error.flatten().fieldErrors
  return {
    organizationName: f.organizationName?.[0],
    businessEmail: f.businessEmail?.[0],
  }
}

function validateStep2(draft: Draft): FieldErrors {
  const result = OnboardingStep2Schema.safeParse({
    approvalThreshold: draft.approvalThreshold,
    maxInvoiceAmount: draft.maxInvoiceAmount,
  })
  if (result.success) return {}
  const f = result.error.flatten().fieldErrors
  return {
    maxInvoiceAmount: f.maxInvoiceAmount?.[0],
    approvalThreshold: f.approvalThreshold?.[0],
  }
}

export function Onboarding({ onComplete, startAt = 0, walletName }: { onComplete: () => void; startAt?: number; walletName?: string }) {
  const { navigate } = useRoute()
  const [step, setStep] = useState(startAt)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [maxSavedStep, setMaxSavedStep] = useState(startAt)
  const [completeState, setCompleteState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [completeError, setCompleteError] = useState<string | null>(null)
  const autosaveTimer = useRef<number | null>(null)

  const cluster = clusterLabel()

  useEffect(() => {
    let cancelled = false
    onboardingEngine.get().then((state) => {
      if (cancelled) return
      const saved = state.draft as Partial<Draft> | undefined
      if (saved && Object.keys(saved).length > 0) {
        setDraft((d) => ({ ...d, ...saved }))
        setMaxSavedStep(typeof state.step === 'number' ? state.step : 0)
        if (startAt >= 1 && typeof state.step === 'number' && state.step > startAt) {
          setStep(state.step)
        }
      }
    }).catch(() => {})
    return () => {
      cancelled = true
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current)
    }
  }, [])

  useEffect(() => {
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(() => {
      onboardingEngine.saveStep(step, draft as unknown as Record<string, unknown>).catch(() => {})
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current)
    }
  }, [draft, step])

  const updateDraft = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const saveNow = async (targetStep: number) => {
    try {
      await onboardingEngine.saveStep(targetStep, draft as unknown as Record<string, unknown>)
      setMaxSavedStep((m) => Math.max(m, targetStep))
    } catch {
      // save failures are surfaced via engine status, not blocking navigation
    }
  }

  const onBlurField = (field: keyof Draft) => {
    if (field === 'organizationName' || field === 'businessEmail') {
      const e = validateStep1(draft)
      setErrors((prev) => ({ ...prev, organizationName: e.organizationName, businessEmail: e.businessEmail }))
    }
    if (field === 'maxInvoiceAmount' || field === 'approvalThreshold') {
      const e = validateStep2(draft)
      setErrors((prev) => ({ ...prev, maxInvoiceAmount: e.maxInvoiceAmount, approvalThreshold: e.approvalThreshold }))
    }
  }

  const handleBack = () => {
    if (step === 0) {
      navigate('/connect')
      return
    }
    setStep(step - 1)
  }

  const goNext = async () => {
    if (step === 0) {
      const e = validateStep1(draft)
      setErrors(e)
      if (e.organizationName || e.businessEmail) return
    }
    if (step === 1) {
      const e = validateStep2(draft)
      setErrors(e)
      if (e.maxInvoiceAmount || e.approvalThreshold) return
      updateDraft({ settlementCluster: cluster, settlementAsset: 'USDC', reportingCurrency: 'USD' })
    }
    if (step === 3) {
      setCompleteState('loading')
      setCompleteError(null)
      try {
        await onboardingEngine.complete()
        onComplete()
      } catch (err) {
        setCompleteState('error')
        const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : (err instanceof Error ? err.message : 'Failed to complete onboarding')
        setCompleteError(message)
      }
      return
    }
    await saveNow(step)
    setStep(step + 1)
  }

  const content: ReactNode[] = [
    <div className="form-content" key="org">
      <h2>Tell us about your organization</h2>
      <p className="lead">This helps us configure your payment environment and reporting.</p>
      <div className="field-stack">
        <label className={`field full${errors.organizationName ? ' invalid' : ''}`}>
          Organization name
          <input value={draft.organizationName} onChange={(e) => updateDraft({ organizationName: e.target.value })} onBlur={() => onBlurField('organizationName')} placeholder="Legal business name" />
          {errors.organizationName && <span className="field-error">{errors.organizationName}</span>}
        </label>
        <label className={`field full${errors.businessEmail ? ' invalid' : ''}`}>
          Business email
          <input value={draft.businessEmail} onChange={(e) => updateDraft({ businessEmail: e.target.value })} onBlur={() => onBlurField('businessEmail')} type="email" placeholder="you@company.com" />
          {errors.businessEmail && <span className="field-error">{errors.businessEmail}</span>}
        </label>
        <label className="field full">
          Industry
          <select value={draft.industry} onChange={(e) => updateDraft({ industry: e.target.value })}>
            <option value="">Select…</option>
            <option>Software</option>
            <option>Financial services</option>
            <option>Professional services</option>
            <option>Retail</option>
          </select>
        </label>
        <label className="field full">
          Organization size
          <select value={draft.size} onChange={(e) => updateDraft({ size: e.target.value })}>
            <option value="">Select…</option>
            <option>1–10</option>
            <option>11–50</option>
            <option>51–200</option>
            <option>201–1,000</option>
          </select>
        </label>
      </div>
    </div>,
    <div className="form-content" key="payment">
      <h2>Configure your payment environment</h2>
      <p className="lead">Set the default network and boundaries Airlock will enforce across agent-initiated requests.</p>
      <div className="payment-readonly">
        <div>Settlement network: <b>Solana · {cluster}</b> <span className="muted">Read-only · Solana network</span></div>
        <div>Reporting currency: <b>USDC</b> <span className="muted">Asset · USDC (6 decimals)</span></div>
      </div>
      <div className="form-grid">
        <label className={`field${errors.maxInvoiceAmount ? ' invalid' : ''}`}>
          Maximum invoice amount
          <div className="input-prefix"><span>$</span><input value={draft.maxInvoiceAmount} onChange={(e) => updateDraft({ maxInvoiceAmount: e.target.value })} onBlur={() => onBlurField('maxInvoiceAmount')} inputMode="decimal" /></div>
          <span className="field-note">Requests above this amount will be blocked.</span>
          {errors.maxInvoiceAmount && <span className="field-error">{errors.maxInvoiceAmount}</span>}
        </label>
        <label className={`field${errors.approvalThreshold ? ' invalid' : ''}`}>
          Human approval threshold
          <div className="input-prefix"><span>$</span><input value={draft.approvalThreshold} onChange={(e) => updateDraft({ approvalThreshold: e.target.value })} onBlur={() => onBlurField('approvalThreshold')} inputMode="decimal" /></div>
          <span className="field-note">Requests above this amount will be held.</span>
          {errors.approvalThreshold && <span className="field-error">{errors.approvalThreshold}</span>}
        </label>
      </div>
    </div>,
    <div className="form-content" key="security">
      <h2>Protection from request to payout</h2>
      <p className="lead">Every agent-initiated payment is checked against your registered records and control policies.</p>
      <div className="control-list">
        {[
          ['invoice', 'Invoice-bound payments', 'Requests must match a registered invoice.'],
          ['users', 'Verified supplier payouts', 'Funds only reach approved supplier wallets.'],
          ['activity', 'Spending limits', 'Control per-request and daily payment value.'],
          ['check', 'Delivery attestation', 'Require delivery confirmation before release.'],
          ['shield', 'Human review', 'Route uncertain requests to an accountable reviewer.'],
        ].map(([icon, title, text]) => (
          <div className="control-row" key={title}>
            <span><Icon name={icon as IconName} /></span>
            <div><b>{title}</b><p>{text}</p></div>
            <Icon name="check" size={16} />
          </div>
        ))}
      </div>
    </div>,
    <div className="complete-content" key="complete">
      <div className="complete-mark"><Icon name="check" size={28} /></div>
      <h2>Your payment environment is ready.</h2>
      <p className="lead">{draft.organizationName || 'Your organization'} is protected by Airlock. You can now register invoices, verify suppliers and authorize AI agents.</p>
      <div className="summary-box">
        {[
          `Wallet identity verified · ${walletName ? `using ${walletName}` : '—'}`,
          `Organization · ${draft.organizationName || '—'} · ${draft.businessEmail || '—'}`,
          `Settlement · Solana (${cluster}) · USDC`,
          `Max invoice · ${draft.maxInvoiceAmount || '—'} · Threshold · ${draft.approvalThreshold || '—'}`,
        ].map(x => <div key={x}><Icon name="check" size={15} /><span>{x}</span></div>)}
      </div>
      {completeState === 'error' && <div className="field-error" role="alert">{completeError}</div>}
      {completeState === 'loading' && <div className="field-note">Completing…</div>}
    </div>,
  ]

  const stepActions = (
    <div className="onboarding-actions">
      <button className="btn quiet" onClick={handleBack}>Back</button>
      <button className="btn primary" onClick={goNext} disabled={step === 3 && completeState === 'loading'}>
        {step === 3 ? (completeState === 'loading' ? 'Completing…' : 'Go to dashboard') : 'Continue'}
        <Icon name="arrow" />
      </button>
    </div>
  )

  return (
    <main className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <Logo />
          </div>
          <div className="step-label"><span className="step-number">Step {step + 1} of 4</span><span className="step-name">{steps[step]}</span></div>
        </div>
        <div className="onboarding-body">
          {content[step]}
          {stepActions}
        </div>
      </div>
    </main>
  )
}