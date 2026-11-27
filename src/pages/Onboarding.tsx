import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Status } from '../ui/Status'
import { onboardingEngine } from '../engines/onboarding'
import { OnboardingStep1Schema, OnboardingStep2Schema } from '@airlock/shared'

const steps = ['Connect wallet', 'Organization', 'Payment setup', 'Security', 'Complete']

type Draft = {
  organizationName: string
  businessEmail: string
  industry: string
  size: string
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
  maxInvoiceAmount: '',
  approvalThreshold: '',
}

const AUTOSAVE_DEBOUNCE_MS = 800

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

export function Onboarding({ onComplete, startAt = 0, onWalletConnected }: { onComplete: () => void; startAt?: number; onWalletConnected?: () => void }) {
  const [step, setStep] = useState(startAt)
  const [walletConnected, setWalletConnected] = useState(startAt > 0)
  const [connecting, setConnecting] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [maxSavedStep, setMaxSavedStep] = useState(startAt)
  const [completeState, setCompleteState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [completeError, setCompleteError] = useState<string | null>(null)
  const autosaveTimer = useRef<number | null>(null)

  const cluster = clusterLabel()

  // Resume from saved draft/step on mount.
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
    }).catch(() => {
      // resume is best-effort; ignore engine errors
    })
    return () => {
      cancelled = true
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current)
    }
  }, [])

  // Autosave: debounce 800ms on draft change.
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

  const goNext = async () => {
    if (step === 1) {
      const e = validateStep1(draft)
      setErrors(e)
      if (e.organizationName || e.businessEmail) return
    }
    if (step === 2) {
      const e = validateStep2(draft)
      setErrors(e)
      if (e.maxInvoiceAmount || e.approvalThreshold) return
    }
    if (step === 4) {
      setCompleteState('loading')
      setCompleteError(null)
      try {
        await onboardingEngine.complete()
        onComplete()
      } catch (err) {
        setCompleteState('error')
        setCompleteError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      }
      return
    }
    await saveNow(step)
    setStep(step + 1)
  }

  const connectWallet = () => {
    setConnecting(true)
    setWalletConnected(true)
    onWalletConnected?.()
    goNext()
  }

  const content: ReactNode[] = [
    <div className="wallet-entry" key="wallet-entry">
      <div className="eyebrow"><span className="pulse-dot"/> Wallet-secured access</div>
      <h1>Connect your wallet<br/>to enter Airlock.</h1>
      <p>Your wallet is your secure identity. Airlock will request a signature to verify ownership—no transaction or gas fee is required.</p>
      {!walletConnected ? <>
        <div className="wallet-options">
          <button onClick={connectWallet} disabled={connecting}><span className="wallet-provider fox">M</span><span><b>{connecting ? 'Waiting for wallet…' : 'MetaMask'}</b><small>Browser extension</small></span><Icon name="chevron"/></button>
          <button onClick={connectWallet}><span className="wallet-provider coin">C</span><span><b>Coinbase Wallet</b><small>Browser or mobile</small></span><Icon name="chevron"/></button>
          <button onClick={connectWallet}><span className="wallet-provider connect">W</span><span><b>WalletConnect</b><small>Scan with a mobile wallet</small></span><Icon name="chevron"/></button>
        </div>
        <div className="wallet-safety"><Icon name="shield"/><span><b>Signature only</b><small>Airlock can’t access your funds or move assets by connecting.</small></span></div>
      </> : <>
        <div className="connected-identity">
          <div className="wallet-identicon">0x</div>
          <div><span className="connection-status"><i/> Wallet connected</span><b>—</b><small>Ethereum · Network verified</small></div>
          <button className="btn quiet" onClick={() => setWalletConnected(false)}>Disconnect</button>
        </div>
        <button className="btn primary wallet-continue" onClick={() => { onWalletConnected?.(); goNext() }}>Continue with this wallet <Icon name="arrow"/></button>
      </>}
    </div>,
    <div className="form-content" key="org">
      <div className="step-kicker">Organization setup</div>
      <h2>Tell us about your organization</h2>
      <p className="lead">This helps us configure your payment environment and reporting.</p>
      <div className="form-grid">
        <label className={`field full${errors.organizationName ? ' invalid' : ''}`}>Organization name<input value={draft.organizationName} onChange={(e) => updateDraft({ organizationName: e.target.value })} onBlur={() => onBlurField('organizationName')} placeholder="Legal business name"/>{errors.organizationName && <span className="field-error">{errors.organizationName}</span>}</label>
        <label className={`field full${errors.businessEmail ? ' invalid' : ''}`}>Business email<input value={draft.businessEmail} onChange={(e) => updateDraft({ businessEmail: e.target.value })} onBlur={() => onBlurField('businessEmail')} type="email"/>{errors.businessEmail && <span className="field-error">{errors.businessEmail}</span>}</label>
        <label className="field">Industry<select value={draft.industry} onChange={(e) => updateDraft({ industry: e.target.value })}><option value="">Select…</option><option>Software</option><option>Financial services</option><option>Professional services</option><option>Retail</option></select></label>
        <label className="field">Organization size<select value={draft.size} onChange={(e) => updateDraft({ size: e.target.value })}><option value="">Select…</option><option>1–10</option><option>11–50</option><option>51–200</option><option>201–1,000</option></select></label>
      </div>
    </div>,
    <div className="form-content" key="payment">
      <div className="step-kicker">Payment setup</div>
      <h2>Configure your payment environment</h2>
      <p className="lead">Set the default network and boundaries Airlock will enforce across agent-initiated requests.</p>
      <div className="form-grid">
        <label className="field">Settlement network<div className="input-prefix"><span className="input-static">Solana · {cluster}</span></div><span className="field-note">Read-only · Solana network</span></label>
        <label className="field">Reporting currency<div className="input-prefix"><span className="input-static">USDC</span></div><span className="field-note">Asset · USDC (6 decimals)</span></label>
        <label className={`field${errors.maxInvoiceAmount ? ' invalid' : ''}`}>Maximum invoice amount<div className="input-prefix"><span>$</span><input value={draft.maxInvoiceAmount} onChange={(e) => updateDraft({ maxInvoiceAmount: e.target.value })} onBlur={() => onBlurField('maxInvoiceAmount')} inputMode="decimal"/></div><span className="field-note">Requests above this amount will be blocked.</span>{errors.maxInvoiceAmount && <span className="field-error">{errors.maxInvoiceAmount}</span>}</label>
        <label className={`field${errors.approvalThreshold ? ' invalid' : ''}`}>Human approval threshold<div className="input-prefix"><span>$</span><input value={draft.approvalThreshold} onChange={(e) => updateDraft({ approvalThreshold: e.target.value })} onBlur={() => onBlurField('approvalThreshold')} inputMode="decimal"/></div><span className="field-note">Requests above this amount will be held.</span>{errors.approvalThreshold && <span className="field-error">{errors.approvalThreshold}</span>}</label>
      </div>
        <div className="connected-strip">
        <div className="wallet-identicon small">0x</div><div><b>Organization wallet</b><small>—</small></div><Status>Connected</Status>
      </div>
    </div>,
    <div className="form-content" key="security">
      <div className="step-kicker">Organization security</div>
      <h2>Protection from request to payout</h2>
      <p className="lead">Every agent-initiated payment is checked against your registered records and control policies.</p>
      <div className="control-list">
        {[
          ['invoice','Invoice-bound payments','Requests must match a registered invoice.'],
          ['users','Verified supplier payouts','Funds only reach approved supplier wallets.'],
          ['activity','Spending limits','Control per-request and daily payment value.'],
          ['check','Delivery attestation','Require delivery confirmation before release.'],
          ['shield','Human review','Route uncertain requests to an accountable reviewer.'],
        ].map(([icon,title,text]) => <div className="control-row" key={title}><span><Icon name={icon as IconName}/></span><div><b>{title}</b><p>{text}</p></div><Icon name="check" size={16}/></div>)}
      </div>
    </div>,
    <div className="complete-content" key="complete">
      <div className="complete-mark"><Icon name="check" size={28}/></div>
      <div className="step-kicker">Setup complete</div>
      <h2>Your payment environment is ready.</h2>
      <p className="lead">{draft.organizationName || 'Your organization'} is protected by Airlock. You can now register invoices, verify suppliers and authorize AI agents.</p>
      <div className="summary-box">
        {[
          `Wallet identity verified · —`,
          `Organization · ${draft.organizationName || '—'} · ${draft.businessEmail || '—'}`,
          `Settlement · Solana (${cluster}) · USDC`,
          `Max invoice · ${draft.maxInvoiceAmount || '—'} · Threshold · ${draft.approvalThreshold || '—'}`,
        ].map(x => <div key={x}><Icon name="check" size={15}/><span>{x}</span></div>)}
      </div>
      {completeState === 'error' && <div className="field-error" role="alert">{completeError}</div>}
      {completeState === 'loading' && <div className="field-note">Completing…</div>}
    </div>,
  ]

  return <main className="onboarding">
    <header className="onboarding-header"><Logo/><div className="secure-label"><Icon name="lock" size={15}/> Secure setup</div></header>
    <div className="onboarding-layout">
      <section className="onboarding-main">
        <div className="progress-mobile">Step {step + 1} of 5 <span><i style={{width: `${(step + 1) / 5 * 100}%`}}/></span></div>
        <div className="onboarding-content">{content[step]}</div>
        {step > 0 && <div className="form-actions"><button className="btn quiet" onClick={() => setStep(step - 1)}>Back</button><button className="btn primary" onClick={goNext} disabled={step === 4 && completeState === 'loading'}>{step === 4 ? (completeState === 'loading' ? 'Completing…' : 'Go to dashboard') : 'Continue'} <Icon name="arrow"/></button></div>}
      </section>
      <aside className="onboarding-aside">
        <div className="aside-art" aria-hidden="true">
          <div className="flow-card invoice-flow"><Icon name="invoice"/><span><b>INV-2048</b><small>Registered invoice</small></span></div>
          <div className="flow-line"><i/><i/><i/></div>
          <div className="airlock-core"><span className="logo-mark"><span/><span/></span><div><b>AIRLOCK</b><small>5 controls passed</small></div></div>
          <div className="flow-line"><i/><i/><i/></div>
          <div className="flow-card approved-flow"><span className="status-symbol"><Icon name="check" size={15}/></span><span><b>Payment allowed</b><small>Bound to approved invoice</small></span></div>
        </div>
        <div className="progress-steps">
          {steps.map((s, i) => <button key={s} disabled={i > maxSavedStep} className={`${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} onClick={() => setStep(i)}><span>{i < step ? <Icon name="check" size={13}/> : i + 1}</span><div><b>{s}</b><small>{i === step ? 'In progress' : i < step ? 'Complete' : 'Upcoming'}</small></div></button>)}
        </div>
        <p className="aside-trust"><Icon name="shield" size={15}/> Non-custodial access · Your keys stay in your wallet</p>
      </aside>
    </div>
  </main>
}