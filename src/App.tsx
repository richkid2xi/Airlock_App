import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { MockDataBadge } from './engines/MockDataBadge'
import { invoiceEngine } from './engines/invoice'
import { supplierEngine } from './engines/supplier'
import { evaluationEngine, policyEngine } from './engines/evaluation'
import { invoiceToRow, supplierToRow, invoiceFromRow, supplierFromRow, agentFromRow } from './domain/adapters'
import { toMinorUnits } from './domain/money'

type IconName =
  | 'grid' | 'invoice' | 'users' | 'activity' | 'check' | 'bot' | 'shield'
  | 'flask' | 'settings' | 'search' | 'bell' | 'help' | 'chevron' | 'arrow'
  | 'wallet' | 'lock' | 'clock' | 'plus' | 'filter' | 'more' | 'trend'
  | 'menu' | 'close' | 'building' | 'logout' | 'eye'

type PolicyRecord = {
  id: string
  name: string
  description: string
  max: number
  daily: number
  controls: boolean[]
  assigned: string[]
  status: 'Active' | 'Draft'
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    invoice: <><path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    bot: <><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 2v4M8 11h.01M16 11h.01M8 16h8"/></>,
    shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.36.34.7.6 1 .28.28.63.42 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.1 1.9c-1.1.8-1.8 1.2-1.8 2.6M12 17h.01"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    wallet: <><path d="M4 5h15a2 2 0 0 1 2 2v12H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4z"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    filter: <path d="M4 6h16M7 12h10M10 18h4"/>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    trend: <><path d="m3 17 6-6 4 4 7-8"/><path d="M14 7h6v6"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 3v18"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark"><span/><span/></span>{!compact && <b>AIRLOCK</b>}</div>
}

const steps = ['Connect wallet', 'Organization', 'Payment setup', 'Security', 'Complete']

function Onboarding({ onComplete, startAt = 0, onWalletConnected }: { onComplete: () => void; startAt?: number; onWalletConnected?: () => void }) {
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

const nav = [
  { group: 'OVERVIEW', items: [['Dashboard','grid']] },
  { group: 'PAYMENTS', items: [['Invoices','invoice'],['Suppliers','users'],['Activity','activity'],['Approvals','check']] },
  { group: 'CONTROL', items: [['AI Agents','bot'],['Policies','shield'],['Attack Lab','flask']] },
  { group: 'SYSTEM', items: [['Settings','settings']] },
] as const

const pageRoutes: Record<string, string> = {
  Dashboard: '/app',
  Invoices: '/app/invoices',
  Suppliers: '/app/suppliers',
  Activity: '/app/activity',
  Approvals: '/app/approvals',
  'AI Agents': '/app/agents',
  Policies: '/app/policies',
  'Attack Lab': '/app/attack-lab',
  Settings: '/app/settings',
}

const transactions = [
  ['INV-2048','Vercel Inc.','ProcureBot','€12,480.00','ALLOW','Today, 09:42'],
  ['INV-2045','Atlas Freight','AP Assistant','€8,920.00','HOLD','Today, 08:16'],
  ['INV-2042','Neon Systems','ProcureBot','€4,200.00','BLOCK','Yesterday, 16:31'],
  ['INV-2039','Linear Labs','AP Assistant','€1,680.00','ALLOW','Yesterday, 14:08'],
  ['INV-2037','Cloudflare','Ops Agent','€6,340.00','ALLOW','May 18, 11:22'],
]

function Status({ children }: { children: ReactNode }) {
  const value = String(children)
  return <span className={`status ${value.toLowerCase().replaceAll(' ', '-')}`}><i/>{children}</span>
}

function Toast({ message, tone = 'success', onClose }: { message: string; tone?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200)
    return () => window.clearTimeout(timer)
  }, [message])
  return <div className={`toast ${tone}`} role="status"><span><Icon name={tone === 'success' ? 'check' : 'close'}/></span><b>{message}</b><button onClick={onClose} aria-label="Dismiss"><Icon name="close" size={14}/></button></div>
}

function Modal({ title, description, children, onClose, wide = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  return <div className="modal-layer" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close"/></button></header>
      {children}
    </section>
  </div>
}

function ConfirmDialog({ title, description, confirmLabel, danger, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal title={title} description={description} onClose={onCancel}><div className="confirm-icon"><Icon name={danger ? 'lock' : 'shield'}/></div><div className="modal-actions"><button className="btn secondary" onClick={onCancel}>Cancel</button><button className={`btn ${danger ? 'danger-solid' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}

function Topbar({ page, toggleMenu, navigate }: { page: string; toggleMenu: () => void; navigate:(p:string)=>void }) {
  const [open,setOpen] = useState<'org'|'search'|'help'|'notifications'|'wallet'|null>(null)
  const [search,setSearch] = useState('')
  const searchResults = Object.keys(pageRoutes).filter(x=>x.toLowerCase().includes(search.toLowerCase()) && search).slice(0,5)
  return <header className="topbar">
    <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={toggleMenu}><Icon name="menu"/></button>
    <div className="page-title"><span>Workspace</span><Icon name="chevron" size={13}/><b>{page}</b></div>
    <div className="top-actions">
      <button className="org-switch" onClick={()=>setOpen(open==='org'?null:'org')}><span className="avatar org">N</span><b>Northstar Labs</b><Icon name="chevron" size={14}/></button>
      <button className="search-trigger" onClick={()=>setOpen(open==='search'?null:'search')}><Icon name="search"/><span>Search</span><kbd>⌘ K</kbd></button>
      <button className="icon-btn" aria-label="Help" onClick={()=>setOpen(open==='help'?null:'help')}><Icon name="help"/></button>
      <button className="icon-btn notification" aria-label="Notifications" onClick={()=>setOpen(open==='notifications'?null:'notifications')}><Icon name="bell"/><i/></button>
      <button className="wallet-profile" aria-label="Open connected wallet" onClick={()=>setOpen(open==='wallet'?null:'wallet')}><span className="wallet-identicon tiny">0x</span><span><b>0x71C4</b><small>Ethereum</small></span><Icon name="chevron" size={12}/></button>
    </div>
    {open && <div className={`top-popover ${open}`}>
      {open==='search' && <><div className="popover-search"><Icon name="search"/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workspaces…"/></div>{searchResults.length ? <div className="global-results">{searchResults.map(x=><button key={x} onClick={()=>{navigate(pageRoutes[x]);setOpen(null);setSearch('')}}><span>{x}</span><Icon name="arrow"/></button>)}</div> : <p>{search ? 'No matching workspace found.' : 'Search invoices, suppliers, activity, agents and settings.'}</p>}</>}
      {open==='org' && <><span className="popover-label">ACTIVE ORGANIZATION</span><button><span className="avatar org">N</span><span><b>Northstar Labs</b><small>Production</small></span><Icon name="check"/></button></>}
      {open==='help' && <><b>Airlock support</b><p>Invoice-bound requests are evaluated against supplier identity, amount, evidence and active policies before funds can move.</p><button className="btn secondary" onClick={()=>setOpen(null)}>Close help</button></>}
      {open==='notifications' && <><b>Notifications</b><div className="notice-item"><span className="event-symbol hold"><Icon name="clock"/></span><span><b>Payment awaiting review</b><small>INV-2045 · 2 hours ago</small></span></div><div className="notice-item"><span className="event-symbol block"><Icon name="lock"/></span><span><b>Payment blocked</b><small>INV-2042 · Yesterday</small></span></div></>}
      {open==='wallet' && <><span className="popover-label">CONNECTED WALLET</span><div className="wallet-pop"><span className="wallet-identicon small">0x</span><span><b>0x71C4...9F2A</b><small>Ethereum · Owner</small></span></div></>}
    </div>}
  </header>
}

function Sidebar({ page, navigate, open, close, approvalCount = 0 }: { page: string; navigate: (p: string) => void; open: boolean; close: () => void; approvalCount?: number }) {
  return <>
    {open && <button className="scrim" aria-label="Close navigation" onClick={close}/>}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="side-brand"><Logo/><button className="icon-btn side-close" onClick={close}><Icon name="close"/></button></div>
      <nav>{nav.map(section => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.map(([label, icon]) => <button key={label} onClick={() => {navigate(pageRoutes[label]); close()}} className={page === label ? 'active' : ''}><Icon name={icon as IconName}/><span>{label}</span>{label === 'Approvals' && approvalCount > 0 && <em>{approvalCount}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-footer">
        <div className="environment"><span><i/> Protection active</span><small>All systems operational</small></div>
        <button className="profile-card" onClick={()=>navigate('/app/settings')}><span className="wallet-identicon tiny">0x</span><span><b>0x71C4...9F2A</b><small>Owner wallet</small></span><Icon name="chevron"/></button>
      </div>
    </aside>
  </>
}

function Metric({ icon, label, value, note, accent }: {icon: IconName; label: string; value: string; note: string; accent?: string}) {
  return <article className="metric-card">
    <div className={`metric-icon ${accent || ''}`}><Icon name={icon}/></div>
    <span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small>
  </article>
}

function TransactionTable({ rows = transactions, onOpen }: { rows?: string[][]; onOpen?: (id: string) => void }) {
  return <div className="table-wrap"><table>
    <thead><tr><th>Reference</th><th>Supplier</th><th>AI agent</th><th>Amount</th><th>Decision</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 ? <button className="text-link" onClick={() => onOpen?.(row[0])}>{cell}</button> : i === 4 ? <Status>{cell}</Status> : cell}</td>)}<td><button className="text-action" onClick={() => onOpen?.(row[0])}>Details <Icon name="chevron" size={12}/></button></td></tr>)}</tbody>
  </table></div>
}

function Dashboard({ setPage, activityRows = transactions, invoiceData = invoiceRows, approvalCount = 3, onOpenActivity }: { setPage: (p: string) => void; activityRows?: string[][]; invoiceData?: string[][]; approvalCount?: number; onOpenActivity?: (id:string) => void }) {
  const [query,setQuery] = useState('')
  const [decision,setDecision] = useState('All')
  const recent = activityRows.filter(x => x.some(c=>c.toLowerCase().includes(query.toLowerCase())) && (decision==='All'||x[4]===decision)).slice(0,5)
  return <>
    <div className="welcome-row"><div><div className="date-label">MONDAY, MAY 19</div><h1>Good morning, Maya</h1><p>Here’s what’s happening across your payment environment.</p></div><button className="btn secondary" onClick={() => setPage('Attack Lab')}><Icon name="flask"/> Run security test</button></div>
    <div className="metrics-grid">
      <Metric icon="shield" label="Funds protected" value="€184,620" note="Blocked or held since Jan 1" />
      <Metric icon="invoice" label="Invoices paid" value={String(invoiceData.filter(x => x[5] === 'Paid').length)} note={`${invoiceData.length} registered invoices`} accent="green"/>
      <Metric icon="lock" label="Blocked payments" value="12" note="3 in the last 30 days" accent="red"/>
      <Metric icon="clock" label="Awaiting review" value={String(approvalCount)} note={approvalCount ? 'Human decision required' : 'No requests need review'} accent="amber"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel activity-panel">
        <div className="panel-head"><div><h2>Payment activity</h2><p>Latest agent-initiated payment requests</p></div><button className="text-action" onClick={() => setPage('Activity')}>View all <Icon name="arrow" size={15}/></button></div>
        <div className="table-tools"><div className="table-search"><Icon name="search"/><input aria-label="Search activity" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reference or supplier"/></div><label className="select-filter"><Icon name="filter"/><select value={decision} onChange={e=>setDecision(e.target.value)}><option>All</option><option>ALLOW</option><option>BLOCK</option><option>HOLD</option></select></label></div>
        <TransactionTable rows={recent} onOpen={onOpenActivity}/>
      </section>
      <section className="panel security-panel">
        <div className="panel-head"><div><h2>Payment security</h2><p>Last 30 days</p></div></div>
        <div className="security-total"><div className="donut"><div><strong>142</strong><span>requests</span></div></div></div>
        <div className="legend">
          <div><span><i className="allow"/>Allowed</span><b>127 <small>89%</small></b></div>
          <div><span><i className="hold"/>Held</span><b>9 <small>6%</small></b></div>
          <div><span><i className="block"/>Blocked</span><b>6 <small>4%</small></b></div>
        </div>
        <div className="security-note"><Icon name="shield"/><span><b>Protection is active</b><small>All 7 policies are being enforced</small></span></div>
      </section>
      <section className="panel compact-panel">
        <div className="panel-head"><div><h2>Invoices due soon</h2><p>Next 14 days</p></div><button className="text-action" onClick={() => setPage('Invoices')}>View invoices</button></div>
        <div className="due-list">
          {invoiceData.filter(x => x[5] !== 'Paid').slice(0,3).map(x => <div key={x[0]}><span className="doc-icon"><Icon name="invoice"/></span><span><b>{x[0]} · {x[1]}</b><small>Due {x[4]}</small></span><strong>{x[2]}</strong><Status>{x[5]}</Status></div>)}
        </div>
      </section>
      <section className="panel compact-panel events-panel">
        <div className="panel-head"><div><h2>Security events</h2><p>Recent policy interventions</p></div><button className="text-action" onClick={() => setPage('Activity')}>View log</button></div>
        <div className="events-list">
          {[
            ['block','Payee wallet mismatch','Neon Systems · INV-2042','42 min ago'],
            ['hold','Human review required','Atlas Freight · INV-2045','2 hr ago'],
            ['block','Invoice amount exceeded','Figma EMEA · INV-2032','Yesterday'],
          ].map(x => <div key={x[1]}><span className={`event-symbol ${x[0]}`}><Icon name={x[0] === 'hold' ? 'clock' : 'lock'} size={15}/></span><span><b>{x[1]}</b><small>{x[2]}</small></span><time>{x[3]}</time></div>)}
        </div>
      </section>
    </div>
  </>
}

const invoiceRows = [
  ['INV-2057','Amazon Web Services','€14,680.00','May 14, 2025','May 29, 2025','Open'],
  ['INV-2053','Atlas Freight','€8,920.00','May 10, 2025','May 24, 2025','Attested'],
  ['INV-2051','Datadog','€3,240.00','May 7, 2025','May 21, 2025','Open'],
  ['INV-2048','Vercel Inc.','€12,480.00','Apr 28, 2025','May 18, 2025','Paid'],
  ['INV-2042','Neon Systems','€4,200.00','Apr 22, 2025','May 12, 2025','Disputed'],
  ['INV-2039','Linear Labs','€1,680.00','Apr 19, 2025','May 4, 2025','Paid'],
]

function PageHeading({ title, description, action, actionIcon = 'plus', onAction }: { title: string; description: string; action?: string; actionIcon?: IconName; onAction?: () => void }) {
  const engineBadge = title === 'Invoices' ? <MockDataBadge engine="invoice"/> : title === 'Suppliers' ? <MockDataBadge engine="supplier"/> : title === 'Payment policies' ? <MockDataBadge engine="policy"/> : title === 'Attack Lab' ? <MockDataBadge engine="evaluation"/> : null
  return <div className="content-heading"><div><h1>{title}{engineBadge}</h1><p>{description}</p></div>{action && <button className="btn primary" onClick={onAction}><Icon name={actionIcon}/>{action}</button>}</div>
}

function EntityDetail({ type, row, onBack, onUpdate, notify, policies = [] }: { type: 'Invoices' | 'Suppliers' | 'AI Agents'; row: string[]; onBack: () => void; onUpdate: (row:string[]) => void; notify:(m:string)=>void; policies?:PolicyRecord[] }) {
  const isInvoice = type === 'Invoices'
  const isSupplier = type === 'Suppliers'
  const [confirm,setConfirm] = useState<'attest'|'dispute'|'verify'|'disable'|null>(null)
  const [edit,setEdit] = useState(false)
  const title = row[0]
  const subtitle = isInvoice ? `${row[1]} · Due ${row[4]}` : isSupplier ? 'Supplier profile and payout controls' : `${row[1]} · Authorized payment agent`
  return <>
    <button className="back-link" onClick={onBack}><Icon name="arrow" size={14}/> Back to {type.toLowerCase()}</button>
    <div className="detail-heading">
      <div className={`detail-avatar ${isInvoice ? 'invoice' : isSupplier ? 'supplier' : 'agent'}`}><Icon name={isInvoice ? 'invoice' : isSupplier ? 'building' : 'bot'} size={22}/></div>
      <div><div className="detail-title-line"><h1>{title}</h1><Status>{isInvoice ? row[5] : isSupplier ? row[2] : row[2]}</Status></div><p>{subtitle}</p></div>
      <div className="detail-heading-actions">{isInvoice ? <><button className="btn danger" onClick={()=>setConfirm('dispute')}>Dispute invoice</button><button className="btn primary" onClick={()=>setConfirm('attest')}>Attest delivery</button></> : isSupplier ? <><button className="btn secondary" onClick={()=>setEdit(true)}>Edit supplier</button>{row[2] !== 'Verified' && <button className="btn primary" onClick={()=>setConfirm('verify')}>Verify supplier</button>}</> : <><button className="btn secondary" onClick={()=>setEdit(true)}>Edit limits</button><button className="btn danger" onClick={()=>setConfirm('disable')}>{row[2] === 'Active' ? 'Disable agent' : 'Enable agent'}</button></>}</div>
    </div>
    {isInvoice && <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Registered invoice</h2><p>Immutable invoice details used during payment evaluation.</p></div><span className="registry-badge"><Icon name="shield"/> Registered</span></div>
          <div className="property-grid"><div><span>Invoice number</span><b>{row[0]}</b></div><div><span>Supplier</span><b>{row[1]}</b></div><div><span>Invoice amount</span><b>{row[2]}</b></div><div><span>Issue date</span><b>{row[3]}</b></div><div><span>Due date</span><b>{row[4]}</b></div><div><span>Currency</span><b>EUR</b></div></div>
        </section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Payment history</h2><p>Requests evaluated against this invoice.</p></div></div>
          <div className="history-row"><span className="event-symbol hold"><Icon name="clock"/></span><div><b>Payment request evaluated</b><small>AP Assistant · Today, 08:16</small></div><strong>{row[2]}</strong><Status>HOLD</Status></div>
          <div className="history-row"><span className="event-symbol"><Icon name="invoice"/></span><div><b>Invoice registered</b><small>Wallet 0x71C4...9F2A · May 10, 2025</small></div><strong>—</strong><Status>Recorded</Status></div>
        </section>
      </div>
      <aside className="detail-secondary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Delivery attestation</h2><p>Required before payment release.</p></div></div><div className="attestation-state"><span><Icon name="check"/></span><b>Delivery confirmed</b><p>Attested May 18 by wallet 0x71C4...9F2A with supporting evidence.</p><button className="btn secondary" onClick={()=>notify('Evidence reference opened in the prototype.')}>View evidence</button></div></section>
        <section className="panel detail-section payment-summary"><div className="section-title"><h2>Payment information</h2></div><div><span>Requested amount</span><b>{row[2]}</b></div><div><span>Decision</span><Status>HOLD</Status></div><div><span>Supplier wallet</span><b>0x712F...88D0</b></div><div><span>Initiated by</span><b>AP Assistant</b></div></section>
      </aside>
    </div>}
    {isSupplier && <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Supplier information</h2><p>Verified identity and payment destination.</p></div><button className="text-action" onClick={()=>setEdit(true)}>Edit details</button></div><div className="property-grid"><div><span>Legal name</span><b>{row[0]}</b></div><div><span>Supplier ID</span><b>sup_84a9d12</b></div><div><span>Registered wallet</span><b>{row[1]}</b></div><div><span>Verification</span><Status>{row[2]}</Status></div><div><span>Network</span><b>Ethereum</b></div><div><span>Associated invoices</span><b>{row[3]}</b></div></div></section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Related invoices</h2><p>Recent registered invoices for this supplier.</p></div></div>{invoiceRows.slice(0,3).map((x,i) => <div className="history-row" key={x[0]}><span className="doc-icon"><Icon name="invoice"/></span><div><b>{i === 0 ? 'INV-2057' : x[0]}</b><small>Due {x[4]}</small></div><strong>{x[2]}</strong><Status>{x[5]}</Status></div>)}</section>
      </div>
      <aside className="detail-secondary"><section className="panel wallet-detail"><div className="wallet-identicon">0x</div><span>APPROVED PAYOUT WALLET</span><h2>{row[1]}</h2><p>Verified on Ethereum · Last checked May 18</p><div className="security-note"><Icon name="shield"/><span><b>Wallet protection active</b><small>Requests to any other destination will be blocked.</small></span></div></section></aside>
    </div>}
    {!isInvoice && !isSupplier && <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Agent identity</h2><p>Authorization and payment request identity.</p></div><Status>{row[2]}</Status></div><div className="property-grid"><div><span>Agent name</span><b>{row[0]}</b></div><div><span>Agent identifier</span><b>{row[1]}</b></div><div><span>Authorization</span><Status>{row[2]}</Status></div><div><span>Total requests</span><b>{row[5]}</b></div><div><span>Allowed</span><b>126</b></div><div><span>Blocked / held</span><b>16</b></div></div></section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Assigned policies</h2><p>Active controls applied to this agent.</p></div></div>{policies.filter(p=>p.assigned.includes(row[0])).map(p=><div className="history-row" key={p.id}><span className="doc-icon"><Icon name="shield"/></span><div><b>{p.name}</b><small>{p.controls.filter(Boolean).length} active controls</small></div><Status>{p.status}</Status></div>)}{!policies.some(p=>p.assigned.includes(row[0]))&&<div className="empty-state"><b>No assigned policies</b><p>Assign this agent from the Policies workspace.</p></div>}</section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Recent activity</h2><p>Latest requests initiated by this agent.</p></div></div>{transactions.slice(0,3).map(x => <div className="history-row" key={x[0]}><span className="doc-icon"><Icon name="activity"/></span><div><b>{x[0]} · {x[1]}</b><small>{x[5]}</small></div><strong>{x[3]}</strong><Status>{x[4]}</Status></div>)}</section>
      </div>
      <aside className="detail-secondary"><section className="panel detail-section"><div className="section-title"><h2>Permissions & limits</h2></div><div className="limit-display"><span>Per-request limit</span><b>{row[3]}</b><div><i style={{width:'62%'}}/></div></div><div className="limit-display"><span>Daily spending cap</span><b>{row[4]}</b><div><i style={{width:'38%'}}/></div></div><div className="permission-list">{['Initiate invoice payments','Submit payment evidence','Request supplier payouts'].map(x => <div key={x}><Icon name="check"/><span>{x}</span></div>)}</div></section></aside>
    </div>}
    {confirm && <ConfirmDialog title={confirm === 'attest' ? 'Attest delivery?' : confirm === 'dispute' ? 'Dispute this invoice?' : confirm === 'verify' ? 'Verify this supplier?' : row[2] === 'Active' ? 'Disable this agent?' : 'Enable this agent?'} description={confirm === 'attest' ? 'This confirms the contracted goods or services were delivered.' : confirm === 'dispute' ? 'Payment requests for this invoice will be blocked until the dispute is resolved.' : confirm === 'verify' ? 'Confirm that the supplier identity and payout wallet have been reviewed.' : 'This changes whether the agent can initiate new payment requests.'} confirmLabel={confirm === 'attest' ? 'Confirm delivery' : confirm === 'dispute' ? 'Dispute invoice' : confirm === 'verify' ? 'Verify supplier' : row[2] === 'Active' ? 'Disable agent' : 'Enable agent'} danger={confirm === 'dispute' || confirm === 'disable'} onCancel={()=>setConfirm(null)} onConfirm={()=>{const updated=[...row];if(confirm==='attest')updated[5]='Attested';if(confirm==='dispute')updated[5]='Disputed';if(confirm==='verify'){updated[2]='Verified';updated[5]='Active'}if(confirm==='disable')updated[2]=row[2]==='Active'?'Disabled':'Active';onUpdate(updated);notify(confirm==='attest'?'Delivery attested successfully.':confirm==='dispute'?'Invoice marked as disputed.':confirm==='verify'?'Supplier verified successfully.':'Agent status updated.');setConfirm(null)}}/>}
    {edit && <Modal title={isSupplier ? 'Edit supplier' : 'Edit agent limits'} description={isSupplier ? 'Important payout wallet changes require explicit confirmation.' : 'Adjust the payment boundaries assigned to this agent.'} onClose={()=>setEdit(false)}><form onSubmit={e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const updated=[...row];if(isSupplier&&d.wallet)updated[1]=String(d.wallet);if(!isSupplier){updated[3]=`€${Number(d.request).toLocaleString()}`;updated[4]=`€${Number(d.daily).toLocaleString()}`}onUpdate(updated);setEdit(false);notify(isSupplier?'Supplier details updated.':'Agent limits updated successfully.')}}><div className="modal-body form-grid">{isSupplier?<><label className="field full">Supplier name<input name="name" defaultValue={row[0]} required/></label><label className="field full">Payout wallet<input name="wallet" defaultValue={row[1]} required/></label><label className="field full">Change reason<textarea name="reason" required placeholder="Explain why this payout destination is changing."/></label></>:<><label className="field">Per-request limit<input name="request" type="number" defaultValue={row[3].replace(/\D/g,'')} required/></label><label className="field">Daily spending limit<input name="daily" type="number" defaultValue={row[4].replace(/\D/g,'')} required/></label></>}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setEdit(false)}>Cancel</button><button className="btn primary">Save changes</button></div></form></Modal>}
  </>
}

function DataWorkspace({ type, rows, path, navigate, onCreate, onUpdate, notify, policies = [] }: { type: 'Invoices' | 'Suppliers' | 'AI Agents'; rows: string[][]; path: string; navigate: (p: string) => void; onCreate: () => void; onUpdate:(r:string[])=>void; notify:(m:string)=>void; policies?:PolicyRecord[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState(0)
  const [page, setPage] = useState(1)
  const configs = {
    Invoices: {desc:'Register, attest and track invoice-bound payments.', action:'Register invoice', columns:['Invoice number','Supplier','Amount','Issue date','Due date','Status'], statuses:['All','Open','Attested','Paid','Disputed']},
    Suppliers: {desc:'Manage approved suppliers and registered payout destinations.', action:'Add supplier', columns:['Supplier','Payout wallet','Verification','Invoices','Last payment','Status'], statuses:['All','Verified','Unverified','Review required']},
    'AI Agents': {desc:'Control which AI agents can initiate payment requests.', action:'Authorize agent', columns:['Agent','Identifier','Status','Per-request limit','Daily limit','Requests'], statuses:['All','Active','Disabled']},
  }[type]
  const base = type === 'Invoices' ? '/app/invoices/' : type === 'Suppliers' ? '/app/suppliers/' : '/app/agents/'
  const detailId = path.startsWith(base) ? decodeURIComponent(path.slice(base.length)) : ''
  const selected = rows.find(r => r[0] === detailId)
  const filtered = useMemo(() => rows.filter(row => row.some(cell => cell.toLowerCase().includes(query.toLowerCase())) && (filter === 'All' || row.includes(filter))).sort((a,b) => a[sort].localeCompare(b[sort])), [rows, query, filter, sort])
  const pageSize = 5
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  if (selected) return <EntityDetail type={type} row={selected} onUpdate={onUpdate} notify={notify} policies={policies} onBack={() => navigate(type === 'Invoices' ? '/app/invoices' : type === 'Suppliers' ? '/app/suppliers' : '/app/agents')}/>
  return <>
    <PageHeading title={type} description={configs.desc} action={configs.action} onAction={onCreate}/>
    <section className="panel workspace-panel">
      <div className="workspace-tools"><div className="table-search"><Icon name="search"/><input value={query} onChange={e => {setQuery(e.target.value);setPage(1)}} placeholder={`Search ${type.toLowerCase()}…`}/></div><label className="select-filter"><Icon name="filter"/><select value={filter} onChange={e => {setFilter(e.target.value);setPage(1)}}>{configs.statuses.map(x => <option key={x}>{x}</option>)}</select></label></div>
      <div className="table-wrap"><table><thead><tr>{configs.columns.map((c,i) => <th key={c}><button className="sort-button" onClick={() => setSort(i)}>{c}{sort === i && ' ↑'}</button></th>)}<th/></tr></thead><tbody>{pageRows.map(row => <tr key={row[0]}>{row.map((c,i) => <td key={i}>{i === 0 ? <button className="entity-cell" onClick={() => navigate(`${base}${encodeURIComponent(row[0])}`)}>{type === 'Suppliers' && <span>{c[0]}</span>}<b>{c}</b></button> : (i === configs.columns.length - 1 || (type === 'Suppliers' && i === 2) || (type === 'AI Agents' && i === 2)) ? <Status>{c}</Status> : c}</td>)}<td><button className="text-action" onClick={() => navigate(`${base}${encodeURIComponent(row[0])}`)}>Open <Icon name="chevron" size={12}/></button></td></tr>)}</tbody></table>{pageRows.length === 0 && <div className="empty-state"><Icon name="search"/><b>No matching records</b><p>Try changing your search or status filter.</p></div>}</div>
      <div className="pagination"><span>Showing {filtered.length ? (page-1)*pageSize+1 : 0}–{Math.min(page*pageSize,filtered.length)} of {filtered.length}</span><div><button disabled={page === 1} onClick={() => setPage(page-1)}>Previous</button><button disabled={page*pageSize >= filtered.length} onClick={() => setPage(page+1)}>Next</button></div></div>
    </section>
  </>
}

function ActivityPage({ approvals = false, rows, path, navigate, agents, onDecision, notify }: { approvals?: boolean; rows: string[][]; path: string; navigate: (p:string) => void; agents: string[][]; onDecision: (id:string, decision:'ALLOW'|'BLOCK') => void; notify: (m:string) => void }) {
  const [query,setQuery] = useState('')
  const [decision,setDecision] = useState('All')
  const [agent,setAgent] = useState('All')
  const [page,setPage] = useState(1)
  const [confirm,setConfirm] = useState<'ALLOW'|'BLOCK'|null>(null)
  const base = approvals ? '/app/approvals/' : '/app/activity/'
  const id = path.startsWith(base) ? decodeURIComponent(path.slice(base.length)) : ''
  const selected = rows.find(x => x[0] === id)
  const held = rows.filter(x => x[4] === 'HOLD')
  const filtered = rows.filter(x => (!approvals || x[4] === 'HOLD') && x.some(c => c.toLowerCase().includes(query.toLowerCase())) && (decision === 'All' || x[4] === decision) && (agent === 'All' || x[2] === agent))
  const visible = filtered.slice((page-1)*6,page*6)
  const reason = selected?.[4] === 'BLOCK' ? 'The requested payout wallet does not match the supplier’s approved destination.' : selected?.[4] === 'HOLD' ? 'The supplier payout destination requires a human verification decision.' : 'The request matched the invoice, supplier, amount, evidence and active spending policy.'
  if (selected) return <>
    <button className="back-link" onClick={() => navigate(approvals ? '/app/approvals' : '/app/activity')}><Icon name="arrow" size={14}/> Back to {approvals ? 'approvals' : 'activity'}</button>
    <div className="detail-heading"><div className="detail-avatar"><Icon name="activity"/></div><div><div className="detail-title-line"><h1>{selected[0]}</h1><Status>{selected[4]}</Status></div><p>Payment request · {selected[5]}</p></div></div>
    <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Payment request</h2><p>Invoice-bound request information and supporting intent.</p></div><b className="review-amount">{selected[3]}</b></div><div className="property-grid"><div><span>Invoice</span><b>{selected[0]}</b></div><div><span>Supplier</span><b>{selected[1]}</b></div><div><span>Requesting agent</span><b>{selected[2]}</b></div><div><span>Payout wallet</span><b>0x712F...88D0</b></div><div><span>Requested amount</span><b>{selected[3]}</b></div><div><span>Timestamp</span><b>{selected[5]}</b></div></div><div className="intent-block"><span>PAYMENT INTENT</span><p>Settle the registered supplier invoice after delivery of contracted services.</p><span>SUPPORTING EVIDENCE</span><button className="document-link" onClick={()=>notify('Supporting evidence opened in the prototype.')}><Icon name="invoice"/> Invoice document · Delivery receipt</button></div></section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Rule evaluation</h2><p>Controls evaluated at the time of the request.</p></div></div><div className="rule-list standalone">{['Invoice is registered and unpaid','Requested amount matches invoice','Agent is authorized','Supporting evidence is present'].map(x => <div key={x}><Icon name="check"/><span>{x}</span><Status>Passed</Status></div>)}{selected[4] !== 'ALLOW' && <div className={selected[4] === 'HOLD' ? 'rule-warning' : 'rule-failed'}><Icon name={selected[4] === 'HOLD' ? 'clock' : 'lock'}/><span>{selected[4] === 'HOLD' ? 'Payout destination requires review' : 'Payout wallet matches supplier'}</span><Status>{selected[4] === 'HOLD' ? 'Review' : 'Failed'}</Status></div>}</div></section>
      </div>
      <aside className="detail-secondary"><section className="panel decision-card"><Status>{selected[4]}</Status><h2>{selected[4] === 'ALLOW' ? 'Payment allowed' : selected[4] === 'BLOCK' ? 'Payment blocked' : 'Human review required'}</h2><p>{reason}</p><div className="security-note"><Icon name="shield"/><span><b>Evaluation recorded</b><small>This result is retained even if policies later change.</small></span></div></section>{approvals && selected[4] === 'HOLD' && <section className="panel approval-actions-card"><h2>Make a decision</h2><p>Review the invoice and evidence before continuing.</p><button className="btn primary" onClick={() => setConfirm('ALLOW')}>Approve payment</button><button className="btn danger" onClick={() => setConfirm('BLOCK')}>Reject payment</button></section>}</aside>
    </div>
    {confirm && <ConfirmDialog title={confirm === 'ALLOW' ? 'Approve this payment?' : 'Reject this payment?'} description={confirm === 'ALLOW' ? 'This prototype will mark the request as allowed. No blockchain transaction will be submitted.' : 'The request will be blocked and removed from the approval queue.'} confirmLabel={confirm === 'ALLOW' ? 'Approve request' : 'Reject request'} danger={confirm === 'BLOCK'} onCancel={() => setConfirm(null)} onConfirm={() => {onDecision(selected[0],confirm);notify(confirm === 'ALLOW' ? 'Payment request approved.' : 'Payment request rejected.');setConfirm(null);navigate('/app/approvals')}}/>}
  </>
  return <>
    <PageHeading title={approvals ? 'Approvals' : 'Payment activity'} description={approvals ? `${held.length} payment requests require a human decision.` : 'Inspect every AI-agent payment request and rule evaluation.'}/>
    <section className="panel workspace-panel">
      <div className="workspace-tools"><div className="table-search"><Icon name="search"/><input value={query} onChange={e => {setQuery(e.target.value);setPage(1)}} placeholder="Search reference, supplier or agent…"/></div>{!approvals && <label className="select-filter"><Icon name="filter"/><select value={decision} onChange={e => setDecision(e.target.value)}><option>All</option><option>ALLOW</option><option>BLOCK</option><option>HOLD</option></select></label>}<label className="select-filter"><Icon name="bot"/><select value={agent} onChange={e => setAgent(e.target.value)}><option>All</option>{agents.map(x => <option key={x[0]}>{x[0]}</option>)}</select></label></div>
      <TransactionTable rows={visible} onOpen={x => navigate(`${base}${encodeURIComponent(x)}`)}/>
      {!visible.length && <div className="empty-state"><Icon name={approvals ? 'check' : 'search'}/><b>{approvals ? 'Approval queue is clear' : 'No activity found'}</b><p>{approvals ? 'There are no held payment requests awaiting review.' : 'Change your search or filter selection.'}</p></div>}
      <div className="pagination"><span>Showing {filtered.length ? (page-1)*6+1 : 0}–{Math.min(page*6,filtered.length)} of {filtered.length}</span><div><button disabled={page===1} onClick={() => setPage(page-1)}>Previous</button><button disabled={page*6>=filtered.length} onClick={() => setPage(page+1)}>Next</button></div></div>
    </section>
  </>
}

function CreationForm({ type, suppliers, invoices, onCancel, onSubmit, onAddSupplier }: { type: 'invoice' | 'supplier' | 'agent'; suppliers: string[][]; invoices: string[][]; onCancel: () => void; onSubmit: (row: string[]) => void; onAddSupplier?:()=>void }) {
  const [errors, setErrors] = useState<Record<string,string>>({})
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const next: Record<string,string> = {}
    if (type === 'invoice') {
      if (!data.number) next.number = 'Invoice number is required.'
      if (invoices.some(x => x[0].toLowerCase() === String(data.number).toLowerCase())) next.number = 'This invoice number is already registered.'
      if (!data.supplier) next.supplier = 'Select a registered supplier.'
      if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero.'
      if (!data.issue) next.issue = 'Issue date is required.'
      if (!data.due) next.due = 'Due date is required.'
      if (data.issue && data.due && String(data.due) < String(data.issue)) next.due = 'Due date must be after the issue date.'
      if (!data.document) next.document = 'Add a document reference.'
      if (!Object.keys(next).length) onSubmit([String(data.number),String(data.supplier),`${data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : '€'}${Number(data.amount).toLocaleString(undefined,{minimumFractionDigits:2})}`,String(data.issue),String(data.due),'Open'])
    } else if (type === 'supplier') {
      if (!data.name) next.name = 'Business name is required.'
      if (!data.email || !String(data.email).includes('@')) next.email = 'Enter a valid business email.'
      if (!data.address) next.address = 'Business address is required.'
      if (!/^0x[a-fA-F0-9]{40}$/.test(String(data.wallet))) next.wallet = 'Enter a valid 42-character Ethereum address.'
      if (!Object.keys(next).length) onSubmit([String(data.name),`${String(data.wallet).slice(0,6)} •••• ${String(data.wallet).slice(-4)}`,'Unverified','0','Never','Pending'])
    } else {
      if (!data.name) next.name = 'Agent name is required.'
      if (!data.identifier || String(data.identifier).length < 5) next.identifier = 'Enter a unique agent identifier.'
      if (!data.request || Number(data.request) <= 0) next.request = 'Enter a valid per-request limit.'
      if (!data.daily || Number(data.daily) < Number(data.request)) next.daily = 'Daily limit must be at least the per-request limit.'
      if (!Object.keys(next).length) onSubmit([String(data.name),String(data.identifier),String(data.status),`€${Number(data.request).toLocaleString()}`,`€${Number(data.daily).toLocaleString()}`,'0'])
    }
    setErrors(next)
  }
  const field = (name: string, label: string, input: ReactNode) => <label className={`field ${errors[name] ? 'invalid' : ''}`}>{label}{input}{errors[name] && <span className="field-error">{errors[name]}</span>}</label>
  return <form onSubmit={submit}>
    <div className="modal-body form-grid">
      {type === 'invoice' && <>
        {field('number','Invoice number',<input name="number" placeholder="INV-2058"/>)}
        {field('supplier','Supplier',<select name="supplier" defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.map(x => <option key={x[0]}>{x[0]}</option>)}</select>)}
        {field('amount','Invoice amount',<input name="amount" type="number" min="0" step="0.01" placeholder="0.00"/>)}
        {field('currency','Currency',<select name="currency"><option>EUR</option><option>USD</option><option>GBP</option></select>)}
        {field('issue','Issue date',<input name="issue" type="date"/>)}
        {field('due','Due date',<input name="due" type="date"/>)}
        <div className="full">{field('document','Document reference',<input name="document" placeholder="IPFS CID or secure document reference"/>)}</div>
        <label className="field full">Supporting notes<textarea name="notes" placeholder="Describe the goods, services or relevant payment context."/></label>
        <button type="button" className="add-inline full" onClick={onAddSupplier}>Supplier not listed? Add a supplier first.</button>
      </>}
      {type === 'supplier' && <>
        {field('name','Business name',<input name="name" placeholder="Supplier legal name"/>)}
        {field('email','Business email',<input name="email" type="email" placeholder="finance@supplier.com"/>)}
        <div className="full">{field('address','Business address',<input name="address" placeholder="Street, city, country"/>)}</div>
        <label className="field">Supplier category<select name="category"><option>Software</option><option>Professional services</option><option>Logistics</option><option>Infrastructure</option></select></label>
        <label className="field">Verification reference<input name="reference" placeholder="Registration or KYB reference"/></label>
        <div className="full">{field('wallet','Payout wallet address',<input name="wallet" placeholder="0x…" />)}</div>
        <label className="field full">Additional notes<textarea name="notes" placeholder="Optional supplier context"/></label>
      </>}
      {type === 'agent' && <>
        {field('name','Agent name',<input name="name" placeholder="e.g. Treasury Agent"/>)}
        {field('identifier','Agent identifier',<input name="identifier" placeholder="agt_…"/>)}
        <label className="field full">Description<textarea name="description" placeholder="Describe this agent’s payment responsibilities."/></label>
        {field('request','Per-request limit',<input name="request" type="number" min="1" placeholder="10000"/>)}
        {field('daily','Daily spending limit',<input name="daily" type="number" min="1" placeholder="25000"/>)}
        <label className="field">Initial status<select name="status"><option>Active</option><option>Disabled</option></select></label>
        <label className="field">Assigned policy<select name="policy"><option>Standard payment controls</option><option>High-value review</option><option>Supplier restricted</option></select></label>
      </>}
    </div>
    <div className="modal-actions"><button type="button" className="btn secondary" onClick={onCancel}>Cancel</button><button className="btn primary" type="submit">{type === 'invoice' ? 'Register invoice' : type === 'supplier' ? 'Add supplier' : 'Authorize agent'}</button></div>
  </form>
}

function Policies({ policies, setPolicies, agents, path, navigate, notify }: { policies: PolicyRecord[]; setPolicies: (p:PolicyRecord[]) => void; agents:string[][]; path:string; navigate:(p:string)=>void; notify:(m:string)=>void }) {
  const [create,setCreate] = useState(false)
  const id = path.startsWith('/app/policies/') ? path.slice('/app/policies/'.length) : ''
  const policy = policies.find(x => x.id === id)
  const [draft,setDraft] = useState<PolicyRecord | null>(null)
  useEffect(() => setDraft(policy ? {...policy,controls:[...policy.controls],assigned:[...policy.assigned]} : null), [id, policy?.name])
  const labels = [
    ['Verified supplier required','Block payments to suppliers that have not completed verification.'],
    ['Delivery attestation required','Hold payment until goods or services are confirmed delivered.'],
    ['Agent intent required','Require agents to include a structured reason for each request.'],
    ['Supporting evidence required','Require an invoice document and payment evidence.'],
    ['Two-person approval','Require two finance administrators above the threshold.'],
  ]
  if (!policy || !draft) return <>
    <PageHeading title="Payment policies" description="Create and assign the controls every agent-initiated payment must satisfy." action="Create policy" onAction={() => setCreate(true)}/>
    <div className="policy-cards">{policies.map(x => <button className="panel policy-card" key={x.id} onClick={() => navigate(`/app/policies/${x.id}`)}><span className="impact-icon"><Icon name="shield"/></span><div><span className="policy-card-title"><b>{x.name}</b><Status>{x.status}</Status></span><p>{x.description}</p><small>{x.controls.filter(Boolean).length} active controls · {x.assigned.length} assigned agents</small></div><Icon name="chevron"/></button>)}</div>
    {create && <Modal title="Create payment policy" description="Define payment boundaries and assign the policy after creation." onClose={() => setCreate(false)}><form onSubmit={e => {e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const record:PolicyRecord={id:`policy-${Date.now()}`,name:String(d.name),description:String(d.description),max:Number(d.max),daily:Number(d.daily),controls:[true,true,true,true,false],assigned:[],status:'Active'};if(!record.name||record.max<=0||record.daily<record.max)return;setPolicies([...policies,record]);setCreate(false);notify('Policy created successfully.');navigate(`/app/policies/${record.id}`)}}><div className="modal-body form-grid"><label className="field full">Policy name<input name="name" required placeholder="e.g. High-value payments"/></label><label className="field full">Description<textarea name="description" required placeholder="Explain when this policy should apply."/></label><label className="field">Maximum invoice amount<input name="max" type="number" min="1" required/></label><label className="field">Daily spending cap<input name="daily" type="number" min="1" required/></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setCreate(false)}>Cancel</button><button className="btn primary">Create policy</button></div></form></Modal>}
  </>
  const save = () => {
    if (draft.max <= 0 || draft.daily < draft.max) { notify('Daily cap must be greater than the invoice maximum.'); return }
    setPolicies(policies.map(x => x.id === draft.id ? draft : x)); notify('Policy updated successfully.')
  }
  return <>
    <button className="back-link" onClick={() => navigate('/app/policies')}><Icon name="arrow" size={14}/> Back to policies</button>
    <PageHeading title={draft.name} description={draft.description} action="Save changes" actionIcon="check" onAction={save}/>
    <div className="policy-layout">
      <section className="panel policy-main">
        <div className="policy-section"><div><h2>Spending controls</h2><p>Set organization-wide payment boundaries.</p></div><div className="policy-fields"><label>Maximum invoice amount<div className="money-input"><span>€</span><input value={draft.max} type="number" onChange={e => setDraft({...draft,max:Number(e.target.value)})}/></div><small>Requests above this value will be blocked.</small></label><label>Daily spending cap<div className="money-input"><span>€</span><input value={draft.daily} type="number" onChange={e => setDraft({...draft,daily:Number(e.target.value)})}/></div><small>Combined limit across assigned agents.</small></label></div></div>
        <div className="policy-section"><div><h2>Payment requirements</h2><p>Choose the evidence required before payment.</p></div><div className="toggle-list">{labels.map((x,i) => <div key={x[0]}><span><b>{x[0]}</b><small>{x[1]}</small></span><button className={`toggle ${draft.controls[i] ? 'on' : ''}`} onClick={() => setDraft({...draft,controls:draft.controls.map((t,j) => i===j?!t:t)})}><i/></button></div>)}</div></div>
        <div className="policy-section"><div><h2>Assigned agents</h2><p>Apply this policy to authorized agents.</p></div><div className="assignment-list">{agents.map(agent => <label key={agent[0]}><span className="agent-mini"><Icon name="bot"/><span><b>{agent[0]}</b><small>{agent[1]}</small></span></span><input type="checkbox" checked={draft.assigned.includes(agent[0])} onChange={e => setDraft({...draft,assigned:e.target.checked?[...draft.assigned,agent[0]]:draft.assigned.filter(x=>x!==agent[0])})}/></label>)}</div></div>
      </section>
      <aside className="panel impact-panel"><div className="impact-icon"><Icon name="shield"/></div><h2>Policy impact</h2><p>Changes apply to new payment requests after saving.</p><div><span>Active controls</span><b>{draft.controls.filter(Boolean).length}</b></div><div><span>Agents affected</span><b>{draft.assigned.length}</b></div><div><span>Requests evaluated</span><b>284</b></div><div><span>Application status</span><Status>{draft.status}</Status></div><div className="info-callout"><Icon name="help"/><p>Existing held requests retain their original evaluation.</p></div></aside>
    </div>
  </>
}

function AttackLab({ agents, invoices, suppliers, notify }: { agents:string[][]; invoices:string[][]; suppliers:string[][]; notify:(m:string)=>void }) {
  const scenarios = [
    ['Valid payment request','ALLOW','All registered invoice, supplier, evidence and policy controls passed.'],
    ['Payee or payout wallet mismatch','BLOCK','Requested payout wallet does not match the supplier’s approved wallet.'],
    ['Invoice amount manipulation','BLOCK','Requested amount exceeds the registered invoice amount.'],
    ['Unverified supplier','BLOCK','Supplier verification is required by the active policy.'],
    ['Duplicate payment','BLOCK','This invoice already has a completed payment.'],
    ['Missing delivery attestation','HOLD','Delivery evidence is required before payment can be released.'],
    ['Spending limit exceeded','BLOCK','The request exceeds the agent’s per-request spending limit.'],
    ['Missing supporting evidence','HOLD','Required invoice or delivery evidence was not supplied.'],
    ['Intent mismatch','HOLD','The payment intent does not align with the registered invoice description.'],
    ['Frozen or disabled agent','BLOCK','This agent is not authorized to initiate payment requests.'],
  ]
  const [scenario, setScenario] = useState(scenarios[0][0])
  const [result, setResult] = useState<string[] | null>(null)
  const [history,setHistory] = useState<{scenario:string;decision:string;time:string}[]>([])
  const [amount,setAmount] = useState('12480')
  const [wallet,setWallet] = useState('0x20A7000000000000000000000000000000009C3F')
  const [intent,setIntent] = useState('Settle registered software services invoice')
  const [selectedAgentName, setSelectedAgentName] = useState('')
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('')
  const [hasEvidenceInput, setHasEvidenceInput] = useState(true)

  const config = scenarios.find(x => x[0] === scenario)!
  const run = async () => {
    const chosenAgentRow = agents.find(a => (selectedAgentName ? a[0] === selectedAgentName : scenario.includes('disabled') ? a[2] === 'Disabled' : a[0] === agents[0]?.[0])) || agents[0]
    const chosenInvoiceRow = invoices.find(inv => (selectedInvoiceNumber ? inv[0] === selectedInvoiceNumber : inv[0] === invoices[0]?.[0])) || invoices[0]
    const chosenSupplierRow = suppliers.find(s => s[0] === chosenInvoiceRow?.[1]) || suppliers[0]

    let inv = chosenInvoiceRow ? invoiceFromRow(chosenInvoiceRow) : null
    let sup = chosenSupplierRow ? supplierFromRow(chosenSupplierRow) : null
    let agt = chosenAgentRow ? agentFromRow(chosenAgentRow) : null

    // Tailor inputs according to scenario parameters
    if (scenario.includes('amount manipulation') && inv) {
      inv = { ...inv, amountUnits: toMinorUnits(Math.max(1, Number(amount) - 1000)) }
    }
    if (scenario.includes('Duplicate payment') && inv) {
      inv = { ...inv, status: 'Paid' }
    }
    if (scenario.includes('Unverified') && sup) {
      sup = { ...sup, verificationStatus: 'Unverified' }
    }
    if (scenario.includes('Missing delivery') && inv) {
      inv = { ...inv, status: 'Open' }
    }
    if (scenario.includes('Spending limit') && agt) {
      agt = { ...agt, perRequestLimitUnits: toMinorUnits(Math.max(1, Number(amount) - 1000)) }
    }
    if (scenario.includes('disabled') && agt) {
      agt = { ...agt, status: 'Disabled' }
    }

    const evalResult = await evaluationEngine.evaluateRequest({
      invoiceNumber: inv?.number || 'INV-UNKNOWN',
      requestedAmountUnits: toMinorUnits(amount),
      destinationWallet: wallet,
      agentNameOrId: agt?.name || 'Agent',
      intent,
      hasEvidence: scenario.includes('Missing') ? false : hasEvidenceInput,
      registeredInvoice: inv,
      registeredSupplier: sup,
      agent: agt,
    })

    const decisionTuple = [scenario, evalResult.decision, evalResult.reason]
    setResult(decisionTuple)
    setHistory([{scenario,decision:evalResult.decision,time:'Just now'},...history].slice(0,5))
    notify(`Simulation complete: ${evalResult.decision}.`)
  }
  const reset = () => {setResult(null);setAmount('12480');setWallet('0x20A7000000000000000000000000000000009C3F');setIntent('Settle registered software services invoice')}
  return <>
    <PageHeading title="Attack Lab" description="Test how Airlock responds to unsafe agent-initiated payment requests."/>
    <div className="lab-banner"><Icon name="flask"/><div><b>Safe simulation environment</b><p>No funds move and no production records are changed during a simulation.</p></div><Status>SIMULATED</Status></div>
    <div className="lab-layout">
      <section className="panel scenario-panel"><h2>1. Choose a scenario</h2><div className="scenario-list">{scenarios.map((x,i) => <button className={scenario === x[0] ? 'active' : ''} onClick={() => {setScenario(x[0]);setResult(null)}} key={x[0]}><span className="scenario-number">{String(i+1).padStart(2,'0')}</span><span><b>{x[0]}</b><small>Expected decision: {x[1]}</small></span><Icon name="chevron"/></button>)}</div></section>
      <section className="panel simulation-panel">
        <div className="simulation-head"><div><span>PAYMENT REQUEST</span><h2>{scenario}</h2></div><span className="code-label">TEST-REQ-8821</span></div>
        <div className="simulation-form"><label>AI agent<select value={selectedAgentName} onChange={e=>setSelectedAgentName(e.target.value)}>{agents.map(x => <option key={x[0]}>{scenario.includes('disabled') ? agents.find(a=>a[2]==='Disabled')?.[0] || x[0] : x[0]}</option>)}</select></label><label>Invoice<select value={selectedInvoiceNumber} onChange={e=>setSelectedInvoiceNumber(e.target.value)}>{invoices.map(x => <option key={x[0]}>{x[0]} · {x[1]}</option>)}</select></label><label>Requested amount<input value={amount} onChange={e=>setAmount(e.target.value)} type="number"/></label>{scenario.toLowerCase().includes('wallet') && <label>Requested payout wallet<input value={wallet} onChange={e=>setWallet(e.target.value)}/></label>}<label className="full">Payment intent<input value={intent} onChange={e=>setIntent(e.target.value)}/></label>{scenario.includes('evidence') || scenario === 'Valid payment request' ? <label className="full">Supporting evidence<select onChange={e=>setHasEvidenceInput(!e.target.value.includes('No evidence'))}><option>Invoice document + delivery receipt</option><option>No evidence supplied</option></select></label> : null}</div>
        {result ? <div className={`simulation-result ${result[1].toLowerCase()}`}><div className="result-title"><span><Icon name={result[1] === 'ALLOW' ? 'check' : result[1] === 'HOLD' ? 'clock' : 'lock'}/></span><div><small>SIMULATED AIRLOCK DECISION</small><strong>{result[1]}</strong></div></div><p>{result[2]}</p><div className="triggered-rule"><Icon name="shield"/><div><b>{result[1] === 'ALLOW' ? 'All required controls passed' : 'Triggered control'}</b><small>{result[2]}</small></div></div><div className="result-checks"><span><Icon name="check"/> Invoice registered</span><span><Icon name="check"/> Request linked to agent</span><span className={result[1] === 'ALLOW' ? '' : 'failed'}><Icon name={result[1] === 'ALLOW' ? 'check' : 'close'}/> Scenario-specific control</span></div><p className="recommendation"><b>Recommended next action:</b> {result[1] === 'ALLOW' ? 'Proceed through the normal approval workflow.' : result[1] === 'HOLD' ? 'Collect the missing evidence and request human review.' : 'Correct the invalid request before resubmitting.'}</p><button className="btn secondary" onClick={reset}>Reset inputs</button></div> : <button className="btn primary run-button" onClick={run}><Icon name="flask"/>Run simulation</button>}
        {history.length > 0 && <div className="simulation-history"><h3>Simulation history</h3>{history.map((x,i)=><button key={`${x.scenario}-${i}`} onClick={()=>{setScenario(x.scenario);setResult(scenarios.find(s=>s[0]===x.scenario) || null)}}><span><b>{x.scenario}</b><small>{x.time}</small></span><Status>{x.decision}</Status></button>)}</div>}
      </section>
    </div>
  </>
}

function SettingsPage({ notify, onDisconnect }: { notify:(m:string)=>void; onDisconnect:()=>void }) {
  const [section,setSection] = useState('Organization profile')
  const [confirmDisconnect,setConfirmDisconnect] = useState(false)
  const [notifications,setNotifications] = useState([true,true,true,true,true,true,false])
  const sections = [['building','Organization profile','Business details, address and industry'],['wallet','Wallet configuration','Connected wallets and payment networks'],['users','Team & access','Wallet roles and permissions'],['bell','Notifications','Payment and security alert preferences'],['shield','Security preferences','Signatures, sessions and approval controls'],['settings','Connected identity','Wallet identity and delegated access']]
  const save = (e:FormEvent) => {e.preventDefault();notify(`${section} updated successfully.`)}
  return <><PageHeading title="Settings" description="Manage your organization, wallet identity and payment security configuration."/><div className="settings-layout"><aside className="panel settings-nav">{sections.map(x => <button className={section===x[1]?'active':''} key={x[1]} onClick={()=>setSection(x[1])}><span><Icon name={x[0] as IconName}/></span><div><b>{x[1]}</b><small>{x[2]}</small></div><Icon name="chevron"/></button>)}</aside><section className="panel settings-content">
    <div className="section-title"><div><h2>{section}</h2><p>{sections.find(x=>x[1]===section)?.[2]}</p></div></div>
    {section==='Organization profile' && <form onSubmit={save}><div className="settings-form form-grid"><label className="field full">Organization name<input defaultValue="Northstar Labs" required/></label><label className="field full">Business address<input defaultValue="12 Market Street, Amsterdam, Netherlands" required/></label><label className="field">Industry<select defaultValue="Software"><option>Software</option><option>Financial services</option><option>Professional services</option></select></label><label className="field">Default currency<select defaultValue="EUR"><option>EUR</option><option>USD</option><option>GBP</option></select></label><label className="field">Organization identifier<input value="org_nsl_9214" disabled/></label><label className="field">Environment<input value="Production" disabled/></label></div><div className="modal-actions"><button type="reset" className="btn secondary">Cancel</button><button className="btn primary">Save organization</button></div></form>}
    {section==='Wallet configuration' && <div className="settings-pane"><div className="connected-identity"><div className="wallet-identicon">0x</div><div><span className="connection-status"><i/> Connected</span><b>0x71C4...9F2A</b><small>Ethereum · Network verified</small></div></div><div className="settings-note"><Icon name="help"/><p>Airlock currently supports payment controls on Ethereum. Connecting never grants Airlock custody of funds.</p></div><button className="btn danger" onClick={()=>setConfirmDisconnect(true)}>Disconnect wallet</button></div>}
    {section==='Team & access' && <div className="settings-pane"><div className="team-row"><span className="wallet-identicon small">0x</span><div><b>0x71C4...9F2A</b><small>Connected owner wallet</small></div><Status>Administrator</Status></div><div className="team-row"><span className="wallet-identicon small">0x</span><div><b>0x42A8...11C0</b><small>Delegated finance reviewer</small></div><Status>Reviewer</Status></div><button className="btn secondary" onClick={()=>notify('Delegated wallet invitation prepared for signature.')}>Add delegated wallet</button></div>}
    {section==='Notifications' && <form onSubmit={save}><div className="settings-pane toggle-list">{['Payment approved','Payment blocked','Payment held','Invoice due','Supplier verification changes','Security events','Policy changes'].map((x,i)=><div key={x}><span><b>{x}</b><small>Receive an in-product alert when this event occurs.</small></span><button type="button" className={`toggle ${notifications[i]?'on':''}`} onClick={()=>setNotifications(notifications.map((v,j)=>i===j?!v:v))}><i/></button></div>)}</div><div className="modal-actions"><button className="btn primary">Save preferences</button></div></form>}
    {section==='Security preferences' && <form onSubmit={save}><div className="settings-pane toggle-list"><div><span><b>Two-person approval</b><small>Require a second wallet signature for high-value requests.</small></span><button type="button" className="toggle on"><i/></button></div><div><span><b>Re-sign sensitive changes</b><small>Request a wallet signature before policy or payout wallet updates.</small></span><button type="button" className="toggle on"><i/></button></div><label className="field">Approval threshold<input defaultValue="10000" type="number"/></label><label className="field">Wallet session duration<select><option>8 hours</option><option>4 hours</option><option>Until disconnected</option></select></label></div><div className="modal-actions"><button className="btn primary">Save security settings</button></div></form>}
    {section==='Connected identity' && <div className="settings-pane identity-pane"><div className="wallet-identicon">0x</div><h2>0x71C4...9F2A</h2><Status>Owner</Status><div className="property-grid"><div><span>Organization</span><b>Northstar Labs</b></div><div><span>Network</span><b>Ethereum</b></div><div><span>Delegated access</span><b>None</b></div><div><span>Last signature</span><b>Today, 09:31</b></div></div></div>}
  </section></div>{confirmDisconnect&&<ConfirmDialog title="Disconnect wallet?" description="You’ll leave the authenticated workspace. No organization data will be removed." confirmLabel="Disconnect wallet" danger onCancel={()=>setConfirmDisconnect(false)} onConfirm={()=>{setConfirmDisconnect(false);notify('Wallet disconnected.');onDisconnect()}}/>}</>
}

function useSessionState<T>(key: string, initial: T) {
  const [value,setValue] = useState<T>(() => {
    try { const stored = window.sessionStorage.getItem(key); return stored ? JSON.parse(stored) : initial }
    catch { return initial }
  })
  useEffect(() => { window.sessionStorage.setItem(key,JSON.stringify(value)) }, [key,value])
  return [value,setValue] as const
}

function DashboardApp({ onLogout, path, navigate }: { onLogout: () => void; path: string; navigate: (p: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<'invoice' | 'supplier' | 'agent' | null>(null)
  const [toast, setToast] = useState<{message:string;tone?:'success'|'error'} | null>(null)
  const [invoices, setInvoices] = useSessionState<string[][]>('airlock-invoices',invoiceRows)
  const [suppliers, setSuppliers] = useSessionState<string[][]>('airlock-suppliers',[
    ['Amazon Web Services','0x88E1 •••• 41B2','Verified','34','May 12, 2025','Active'],['Vercel Inc.','0x20A7 •••• 9C3F','Verified','12','May 19, 2025','Active'],['Atlas Freight','0x712F •••• 88D0','Review required','8','Apr 28, 2025','Pending'],['Neon Systems','0x991C •••• 23A1','Unverified','3','Mar 14, 2025','Restricted'],['Linear Labs','0x4BA2 •••• 82EE','Verified','9','May 18, 2025','Active']
  ])

  // Sync initial state from typed engines
  useEffect(() => {
    invoiceEngine.listInvoices().then(list => {
      if (list && list.length) {
        setInvoices(list.map(inv => invoiceToRow(inv, '€')))
      }
    })
    supplierEngine.listSuppliers().then(list => {
      if (list && list.length) {
        setSuppliers(list.map(sup => supplierToRow(sup)))
      }
    })
  }, [])
  const [agents, setAgents] = useSessionState<string[][]>('airlock-agents',[
    ['ProcureBot','agt_9x2p•••b71','Active','€25,000','€75,000','142'],['AP Assistant','agt_4m8q•••c20','Active','€15,000','€40,000','86'],['Ops Agent','agt_7k1r•••a93','Active','€10,000','€25,000','41'],['Research Agent','agt_2d6v•••e04','Disabled','€2,500','€5,000','12']
  ])
  const [activityRows, setActivityRows] = useSessionState<string[][]>('airlock-activity',[
    ...transactions,
    ['INV-2034','Figma EMEA','ProcureBot','€6,780.00','HOLD','May 17, 15:04'],
    ['INV-2029','ModelWorks','Ops Agent','€3,040.00','HOLD','May 16, 10:18'],
    ['INV-2026','Datadog','AP Assistant','€2,180.00','ALLOW','May 15, 09:10'],
  ])
  const [policies,setPolicies] = useSessionState<PolicyRecord[]>('airlock-policies',[
    {id:'standard-controls',name:'Standard payment controls',description:'Default invoice, supplier and evidence controls for routine payments.',max:50000,daily:150000,controls:[true,true,true,true,false],assigned:['ProcureBot','AP Assistant'],status:'Active'},
    {id:'high-value-review',name:'High-value review',description:'Adds two-person approval for higher-value supplier payments.',max:100000,daily:250000,controls:[true,true,true,true,true],assigned:['Ops Agent'],status:'Active'},
  ])
  const page = path.startsWith('/app/invoices') ? 'Invoices' : path.startsWith('/app/suppliers') ? 'Suppliers' : path.startsWith('/app/agents') ? 'AI Agents' : path.startsWith('/app/policies') ? 'Policies' : path.startsWith('/app/activity') ? 'Activity' : path.startsWith('/app/approvals') ? 'Approvals' : path.startsWith('/app/attack-lab') ? 'Attack Lab' : path.startsWith('/app/settings') ? 'Settings' : 'Dashboard'
  const created = (type: 'invoice' | 'supplier' | 'agent', row: string[]) => {
    if (type === 'invoice') {
      setInvoices([row,...invoices])
      invoiceEngine.createInvoice({
        number: row[0],
        supplierName: row[1],
        amountUnits: toMinorUnits(row[2]),
        issueDate: row[3],
        dueDate: row[4],
      }).catch(console.error)
    }
    if (type === 'supplier') {
      setSuppliers([row,...suppliers])
      supplierEngine.createSupplier({
        name: row[0],
        payoutWallet: row[1],
      }).catch(console.error)
    }
    if (type === 'agent') setAgents([row,...agents])
    setModal(null)
    setToast({message: type === 'invoice' ? 'Invoice registered successfully.' : type === 'supplier' ? 'Supplier added successfully.' : 'Agent authorized successfully.'})
  }
  let content: ReactNode
  if (page === 'Dashboard') content = <Dashboard setPage={p => navigate(pageRoutes[p])} activityRows={activityRows} invoiceData={invoices} approvalCount={activityRows.filter(x => x[4] === 'HOLD').length} onOpenActivity={id => navigate(`/app/activity/${encodeURIComponent(id)}`)}/>
  else if (page === 'Invoices') content = <DataWorkspace type="Invoices" rows={invoices} path={path} navigate={navigate} onCreate={() => setModal('invoice')} onUpdate={row=>{
    setInvoices(invoices.map(x=>x[0]===row[0]?row:x))
    invoiceEngine.updateInvoiceStatus(row[0], row[5] as any).catch(console.error)
  }} notify={message=>setToast({message})}/>
  else if (page === 'Suppliers') content = <DataWorkspace type="Suppliers" rows={suppliers} path={path} navigate={navigate} onCreate={() => setModal('supplier')} onUpdate={row=>{
    setSuppliers(suppliers.map(x=>x[0]===row[0]?row:x))
    if (row[2] === 'Verified') {
      supplierEngine.verifySupplier(row[0]).catch(console.error)
    }
    supplierEngine.updatePayoutWallet(row[0], row[1]).catch(console.error)
  }} notify={message=>setToast({message})}/>
  else if (page === 'AI Agents') content = <DataWorkspace type="AI Agents" rows={agents} path={path} navigate={navigate} onCreate={() => setModal('agent')} onUpdate={row=>setAgents(agents.map(x=>x[0]===row[0]?row:x))} notify={message=>setToast({message})} policies={policies}/>
  else if (page === 'Activity') content = <ActivityPage rows={activityRows} path={path} navigate={navigate} agents={agents} onDecision={(id,decision) => setActivityRows(activityRows.map(x => x[0] === id ? x.map((v,i) => i === 4 ? decision : v) : x))} notify={message => setToast({message})}/>
  else if (page === 'Approvals') content = <ActivityPage approvals rows={activityRows} path={path} navigate={navigate} agents={agents} onDecision={(id,decision) => setActivityRows(activityRows.map(x => x[0] === id ? x.map((v,i) => i === 4 ? decision : v) : x))} notify={message => setToast({message})}/>
  else if (page === 'Policies') content = <Policies policies={policies} setPolicies={setPolicies} agents={agents} path={path} navigate={navigate} notify={message=>setToast({message})}/>
  else if (page === 'Attack Lab') content = <AttackLab agents={agents} invoices={invoices} suppliers={suppliers} notify={message=>setToast({message})}/>
  else content = <SettingsPage notify={message=>setToast({message})} onDisconnect={onLogout}/>
  return <div className="app-shell">
    <Sidebar page={page} navigate={navigate} open={menuOpen} close={() => setMenuOpen(false)} approvalCount={activityRows.filter(x=>x[4]==='HOLD').length}/>
    <div className="app-main"><Topbar page={page} navigate={navigate} toggleMenu={() => setMenuOpen(true)}/><main className="content">{content}</main></div>
    <button className="logout-demo" onClick={onLogout} title="Return to onboarding"><Icon name="logout"/></button>
    {modal && <Modal wide title={modal === 'invoice' ? 'Register invoice' : modal === 'supplier' ? 'Add supplier' : 'Authorize AI agent'} description={modal === 'invoice' ? 'Register an invoice before an agent can request payment.' : modal === 'supplier' ? 'New suppliers remain unverified until their identity is reviewed.' : 'Authorize an agent and establish its initial payment boundaries.'} onClose={() => setModal(null)}><CreationForm type={modal} suppliers={suppliers} invoices={invoices} onCancel={() => setModal(null)} onAddSupplier={()=>setModal('supplier')} onSubmit={row => created(modal,row)}/></Modal>}
    {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
  </div>
}

function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const navigate = (to: string, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return { path, navigate }
}

export default function App() {
  const { path, navigate } = useRoute()
  useEffect(() => {
    if (path === '/') navigate('/connect', true)
  }, [])
  if (path === '/connect' || path === '/') return <Onboarding startAt={0} onWalletConnected={() => navigate('/onboarding')} onComplete={() => navigate('/app')}/>
  if (path === '/onboarding') return <Onboarding startAt={1} onComplete={() => navigate('/app')}/>
  if (path.startsWith('/app')) return <DashboardApp path={path} navigate={navigate} onLogout={() => navigate('/connect')}/>
  return <div className="route-error"><Logo/><h1>Page not found</h1><p>The Airlock workspace you requested doesn’t exist.</p><button className="btn primary" onClick={() => navigate('/app')}>Return to dashboard</button></div>
}
