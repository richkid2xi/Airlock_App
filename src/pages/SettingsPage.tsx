import { useState, type FormEvent } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Status } from '../ui/Status'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FEATURES, type FeatureName, FEATURE_LABELS } from '../config/features'

type SectionDef = { icon: IconName; title: string; subtitle: string; feature: FeatureName }

const sections: SectionDef[] = [
  { icon: 'shield', title: 'Engine status', subtitle: 'Live and degraded engine statuses', feature: 'metrics' },
  { icon: 'wallet', title: 'Wallet configuration', subtitle: 'Connected wallets and payment networks', feature: 'chain' },
  { icon: 'users', title: 'Team & access', subtitle: 'Wallet roles and permissions', feature: 'auth' },
  { icon: 'bell', title: 'Notifications', subtitle: 'Payment and security alert preferences', feature: 'metrics' },
  { icon: 'shield', title: 'Security preferences', subtitle: 'Signatures, sessions and approval controls', feature: 'chain' },
  { icon: 'settings', title: 'Connected identity', subtitle: 'Wallet identity and delegated access', feature: 'chain' },
  { icon: 'building', title: 'Organization profile', subtitle: 'Business details, address and industry', feature: 'onboarding' },
]

export function SettingsPage({ notify, onLogout }: { notify: (m: string) => void; onLogout: () => void }) {
  const [section, setSection] = useState('Engine status')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    'approval-alerts': false,
    'blocked-alerts': false,
    'daily-digest': false,
  })
  const setToggleState = (id: string, value: boolean) => setToggleStates((s) => ({ ...s, [id]: value }))

  const save = (e: FormEvent) => { e.preventDefault(); notify(`${section} updated successfully.`) }

  const isLive = (key: FeatureName) => FEATURES[key] === 'live'
  const active = sections.find((x) => x.title === section)

  const toggles = [
    { id: 'approval-alerts', title: 'Approval alerts', description: 'Notify when a payment is held for review.' },
    { id: 'blocked-alerts', title: 'Blocked payment alerts', description: 'Notify when an agent payment is blocked.' },
    { id: 'daily-digest', title: 'Daily digest', description: 'Summarize settlement activity each day.' },
  ]

  return (
    <>
      <div className="settings-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your organization, wallet identity and payment security configuration.</p>
        </div>
      </div>
      <div className="settings-layout">
        <aside className="panel settings-nav">
          {sections.map((x) => (
            <button key={x.title} className={section === x.title ? 'active' : ''} onClick={() => setSection(x.title)}>
              <span><Icon name={x.icon} /></span>
              <div><b>{x.title}</b><small>{x.subtitle}</small></div>
              <Icon name="chevron" />
            </button>
          ))}
        </aside>
        <section className="panel settings-content">
          <div className="section-title"><div><h2>{section}</h2><p>{active?.subtitle}</p></div></div>
          <div className="settings-body">
            {section === 'Engine status' && (
              <div className="settings-rows">
                {FEATURE_LABELS.map(({ key, label }) => {
                  const live = FEATURES[key] === 'live'
                  return (
                    <div className="setting-row" key={key}>
                      <div className="setting-row-main">
                        <b>{label}</b>
                        <p>{live ? 'Available now' : 'In progress — ready for integration'}</p>
                      </div>
                      <span className={`setting-pill ${live ? 'live' : 'pending'}`}><i/>{live ? 'LIVE' : 'IN PROGRESS'}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {section === 'Wallet configuration' && (
              <div className="settings-body-stack">
                <div className="settings-rows">
                  <div className="setting-row">
                    <div className="setting-row-main"><b>Settlement network</b><p>Current payment network</p></div>
                    <span className="setting-pill neutral">Devnet</span>
                  </div>
                  <div className="setting-row">
                    <div className="setting-row-main"><b>Settlement asset</b><p>Payment asset with the settlement network</p></div>
                    <span className="setting-pill neutral">USDC (6 decimals)</span>
                  </div>
                </div>
                <div className="empty-state"><Icon name="wallet" /><b>No connected wallets yet</b><p>Connected wallet identities will be listed here.</p></div>
              </div>
            )}
            {section === 'Team & access' && (
              <div className="settings-body-stack">
                <div className="setting-row">
                  <div className="setting-row-main"><b>Team members</b><p>Wallet roles and permissions</p></div>
                  <span className="setting-pill pending"><i/>IN PROGRESS</span>
                </div>
                <div className="empty-state"><Icon name="users" /><b>No team members yet</b><p>Wallet roles and permissions will appear here.</p></div>
              </div>
            )}
            {section === 'Notifications' && (
              <div className="settings-body-stack">
                {toggles.map((t) => (
                  <div className="setting-row setting-row-toggle" key={t.id}>
                    <div className="setting-row-main"><b>{t.title}</b><p>{t.description}</p></div>
                    <button type="button" className={`switch ${toggleStates[t.id] ? 'on' : ''}`} aria-label={t.title} onClick={() => setToggleState(t.id, !toggleStates[t.id])}><i/></button>
                  </div>
                ))}
              </div>
            )}
            {section === 'Security preferences' && (
              <div className="settings-rows">
                <div className="setting-row">
                  <div className="setting-row-main"><b>Signature verification</b><p>Cryptographic proof required before settlement</p></div>
                  <span className={`setting-pill ${isLive('auth') ? 'live' : 'pending'}`}><i/>{isLive('auth') ? 'LIVE' : 'IN PROGRESS'}</span>
                </div>
                <div className="setting-row">
                  <div className="setting-row-main"><b>Session approval</b><p>Hold high-value payouts for human approval</p></div>
                  <span className={`setting-pill ${isLive('policies') ? 'live' : 'pending'}`}><i/>{isLive('policies') ? 'LIVE' : 'IN PROGRESS'}</span>
                </div>
                <div className="setting-row">
                  <div className="setting-row-main"><b>Approval threshold</b><p>Human review above the organization limit</p></div>
                  <span className="setting-pill neutral">—</span>
                </div>
              </div>
            )}
            {section === 'Connected identity' && (
              <div className="settings-body-stack">
                <div className="setting-row">
                  <div className="setting-row-main"><b>Wallet identity</b><p>Primary signing wallet</p></div>
                  <span className="setting-pill neutral">Devnet</span>
                </div>
                <div className="setting-row">
                  <div className="setting-row-main"><b>Delegated access</b><p>Agent access tokens and roles</p></div>
                  <span className="setting-pill pending"><i/>IN PROGRESS</span>
                </div>
              </div>
            )}
            {section === 'Organization profile' && (
              <form className="settings-body-stack org-form" onSubmit={save}>
                <div className="org-grid">
                  <label className="field"><span>Organization name</span><input name="orgName" placeholder="Acme Supply Co."/></label>
                  <label className="field"><span>Business email</span><input name="orgEmail" type="email" placeholder="finance@acme.example"/></label>
                  <label className="field"><span>Industry</span><input name="orgIndustry" placeholder="Software"/></label>
                  <label className="field"><span>Settlement cluster</span><input name="orgCluster" placeholder="eu-central"/></label>
                  <label className="field"><span>Settlement asset</span><input name="orgAsset" placeholder="USDC"/></label>
                  <label className="field"><span>Reporting currency</span><input name="orgCurrency" placeholder="USD"/></label>
                  <label className="field"><span>Max invoice amount</span><input name="orgMax" type="number" min="0" placeholder="0"/></label>
                  <label className="field"><span>Approval threshold</span><input name="orgThreshold" type="number" min="0" placeholder="0"/></label>
                </div>
                <div className="settings-actions">
                  <button type="submit" className="btn primary fit">Save changes</button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
      {confirmDisconnect && (
        <ConfirmDialog
          title="Disconnect wallet?"
          description="You'll leave the authenticated workspace. No organization data will be removed."
          confirmLabel="Disconnect wallet"
          danger
          onCancel={() => setConfirmDisconnect(false)}
          onConfirm={() => { setConfirmDisconnect(false); notify('Wallet disconnected.'); onLogout() }}
        />
      )}
    </>
  )
}
