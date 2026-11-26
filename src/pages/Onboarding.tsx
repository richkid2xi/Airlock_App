import { useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Status } from '../ui/Status'

const steps = ['Connect wallet', 'Organization', 'Payment setup', 'Security', 'Complete']

export function Onboarding({ onComplete, startAt = 0, onWalletConnected }: { onComplete: () => void; startAt?: number; onWalletConnected?: () => void }) {
  const [step, setStep] = useState(startAt)
  const [walletConnected, setWalletConnected] = useState(startAt > 0)
  const [connecting, setConnecting] = useState(false)
  const connectWallet = () => {
    setConnecting(true)
    window.setTimeout(() => {
      setConnecting(false)
      setWalletConnected(true)
    }, 650)
  }
  const next = () => step === 4 ? onComplete() : setStep(step + 1)

  const content = [
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
          <div><span className="connection-status"><i/> Wallet connected</span><b>0x71C4...9F2A</b><small>Ethereum · Network verified</small></div>
          <button className="btn quiet" onClick={() => setWalletConnected(false)}>Disconnect</button>
        </div>
        <button className="btn primary wallet-continue" onClick={() => { onWalletConnected?.(); next() }}>Continue with this wallet <Icon name="arrow"/></button>
      </>}
    </div>,
    <div className="form-content" key="org">
      <div className="step-kicker">Organization setup</div>
      <h2>Tell us about your organization</h2>
      <p className="lead">This helps us configure your payment environment and reporting.</p>
      <div className="form-grid">
        <label className="field full">Organization name<input defaultValue="Northstar Labs" placeholder="Legal business name"/></label>
        <label className="field full">Business email<input defaultValue="finance@northstarlabs.com" type="email"/></label>
        <label className="field">Industry<select defaultValue="Software"><option>Software</option><option>Financial services</option><option>Professional services</option><option>Retail</option></select></label>
        <label className="field">Organization size<select defaultValue="51–200"><option>1–10</option><option>11–50</option><option>51–200</option><option>201–1,000</option></select></label>
      </div>
    </div>,
    <div className="form-content" key="payment">
      <div className="step-kicker">Payment setup</div>
      <h2>Configure your payment environment</h2>
      <p className="lead">Set the default network and boundaries Airlock will enforce across agent-initiated requests.</p>
      <div className="form-grid">
        <label className="field">Settlement network<select defaultValue="Ethereum"><option>Ethereum</option><option>Base</option><option>Polygon</option><option>Arbitrum</option></select></label>
        <label className="field">Reporting currency<select defaultValue="EUR"><option>EUR — Euro</option><option>USD — US Dollar</option><option>GBP — Pound Sterling</option></select></label>
        <label className="field">Maximum invoice amount<div className="input-prefix"><span>€</span><input defaultValue="50,000"/></div><span className="field-note">Requests above this amount will be blocked.</span></label>
        <label className="field">Human approval threshold<div className="input-prefix"><span>€</span><input defaultValue="10,000"/></div><span className="field-note">Requests above this amount will be held.</span></label>
      </div>
      <div className="connected-strip">
        <div className="wallet-identicon small">0x</div><div><b>Organization wallet</b><small>0x71C4...9F2A</small></div><Status>Connected</Status>
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
      <p className="lead">Northstar Labs is protected by Airlock. You can now register invoices, verify suppliers and authorize AI agents.</p>
      <div className="summary-box">
        {['Wallet identity verified · 0x71C4...9F2A','Organization profile configured','Payment boundaries established','Default protections enabled'].map(x => <div key={x}><Icon name="check" size={15}/><span>{x}</span></div>)}
      </div>
    </div>
  ]

  return <main className="onboarding">
    <header className="onboarding-header"><Logo/><div className="secure-label"><Icon name="lock" size={15}/> Secure setup</div></header>
    <div className="onboarding-layout">
      <section className="onboarding-main">
        <div className="progress-mobile">Step {step + 1} of 5 <span><i style={{width: `${(step + 1) / 5 * 100}%`}}/></span></div>
        <div className="onboarding-content">{content[step]}</div>
        {step > 0 && <div className="form-actions"><button className="btn quiet" onClick={() => setStep(step - 1)}>Back</button><button className="btn primary" onClick={next}>{step === 4 ? 'Go to dashboard' : 'Continue'} <Icon name="arrow"/></button></div>}
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
          {steps.map((s, i) => <button key={s} disabled={i > step} className={`${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} onClick={() => setStep(i)}><span>{i < step ? <Icon name="check" size={13}/> : i + 1}</span><div><b>{s}</b><small>{i === step ? 'In progress' : i < step ? 'Complete' : 'Upcoming'}</small></div></button>)}
        </div>
        <p className="aside-trust"><Icon name="shield" size={15}/> Non-custodial access · Your keys stay in your wallet</p>
      </aside>
    </div>
  </main>
}
