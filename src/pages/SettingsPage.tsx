import { useState, type FormEvent } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FEATURES, type FeatureName, FEATURE_LABELS } from '../config/features'

export function SettingsPage({ notify, onLogout }: { notify: (m: string) => void; onLogout: () => void }) {
  const [section, setSection] = useState('Organization profile')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [notifications, setNotifications] = useState([true, true, true, true, true, true, false])

  const sections = [
    ['building', 'Organization profile', 'Business details, address and industry'],
    ['wallet', 'Wallet configuration', 'Connected wallets and payment networks'],
    ['shield', 'Engine status', 'Live and degraded engine statuses'],
    ['users', 'Team & access', 'Wallet roles and permissions'],
    ['bell', 'Notifications', 'Payment and security alert preferences'],
    ['shield', 'Security preferences', 'Signatures, sessions and approval controls'],
    ['settings', 'Connected identity', 'Wallet identity and delegated access'],
  ] as const

  const save = (e: FormEvent) => { e.preventDefault(); notify(`${section} updated successfully.`) }

  return (
    <>
      <PageHeading title="Settings" description="Manage your organization, wallet identity and payment security configuration." />
      <div className="settings-layout">
        <aside className="panel settings-nav">
          {sections.map(x => (
            <button
              className={section === x[1] ? 'active' : ''}
              key={x[1]}
              onClick={() => setSection(x[1])}
            >
              <span><Icon name={x[0] as IconName} /></span>
              <div><b>{x[1]}</b><small>{x[2]}</small></div>
              <Icon name="chevron" />
            </button>
          ))}
        </aside>
        <section className="panel settings-content">
          <div className="section-title"><div><h2>{section}</h2><p>{sections.find(x => x[1] === section)?.[2]}</p></div></div>
          {section === 'Organization profile' && (
            <form onSubmit={save}>
              <div className="settings-form form-grid">
                <label className="field full">Organization name<input defaultValue="Northstar Labs" required /></label>
                <label className="field full">Business address<input defaultValue="12 Market Street, Amsterdam, Netherlands" required /></label>
                <label className="field">Industry<select defaultValue="Software"><option>Software</option><option>Financial services</option><option>Professional services</option></select></label>
                <label className="field">Default currency<select defaultValue="EUR"><option>EUR</option><option>USD</option><option>GBP</option></select></label>
                <label className="field">Organization identifier<input value="org_nsl_9214" disabled /></label>
                <label className="field">Environment<input value="Production" disabled /></label>
              </div>
              <div className="modal-actions"><button type="reset" className="btn secondary">Cancel</button><button className="btn primary">Save organization</button></div>
            </form>
          )}
          {section === 'Wallet configuration' && (
            <div className="settings-pane">
              <div className="connected-identity">
                <div className="wallet-identicon">SOL</div>
                <div><span className="connection-status"><i /> Connected</span><b>devnet</b><small>Solana Devnet · Mint 4zMMC9...ncDU</small></div>
              </div>
              <div className="settings-note"><Icon name="help" /><p>Airlock enforces on-chain settlement controls on Solana Devnet via USDC SPL token transfer.</p></div>
              <button className="btn danger" onClick={() => setConfirmDisconnect(true)}>Disconnect wallet</button>
            </div>
          )}
          {section === 'Engine status' && (
            <div className="settings-pane">
              <div className="control-list">
                {FEATURE_LABELS.map(({ key, label }) => (
                  <div className="control-row" key={key}>
                    <span><Icon name="shield" /></span>
                    <div>
                      <b>{label}</b>
                      <p>{FEATURES[key] === 'live' ? 'Available now' : 'This module is being built. It is not showing sample data.'}</p>
                    </div>
                    <Status>{FEATURES[key] === 'live' ? 'Live' : 'In progress'}</Status>
                  </div>
                ))}
              </div>
            </div>
          )}
          {section === 'Team & access' && (
            <div className="settings-pane">
              <div className="team-row"><span className="wallet-identicon small">0x</span><div><b>0x71C4...9F2A</b><small>Connected owner wallet</small></div><Status>Administrator</Status></div>
              <div className="team-row"><span className="wallet-identicon small">0x</span><div><b>0x42A8...11C0</b><small>Delegated finance reviewer</small></div><Status>Reviewer</Status></div>
              <button className="btn secondary" onClick={() => notify('Delegated wallet invitation prepared for signature.')}>Add delegated wallet</button>
            </div>
          )}
          {section === 'Notifications' && (
            <form onSubmit={save}>
              <div className="settings-pane toggle-list">
                {['Payment approved', 'Payment blocked', 'Payment held', 'Invoice due', 'Supplier verification changes', 'Security events', 'Policy changes'].map((x, i) => (
                  <div key={x}>
                    <span><b>{x}</b><small>Receive an in-product alert when this event occurs.</small></span>
                    <button type="button" className={`toggle ${notifications[i] ? 'on' : ''}`} onClick={() => setNotifications(notifications.map((v, j) => i === j ? !v : v))}><i /></button>
                  </div>
                ))}
              </div>
              <div className="modal-actions"><button className="btn primary">Save preferences</button></div>
            </form>
          )}
          {section === 'Security preferences' && (
            <form onSubmit={save}>
              <div className="settings-pane toggle-list">
                <div><span><b>Two-person approval</b><small>Require a second wallet signature for high-value requests.</small></span><button type="button" className="toggle on"><i /></button></div>
                <div><span><b>Re-sign sensitive changes</b><small>Request a wallet signature before policy or payout wallet updates.</small></span><button type="button" className="toggle on"><i /></button></div>
                <label className="field">Approval threshold<input defaultValue="10000" type="number" /></label>
                <label className="field">Wallet session duration<select><option>8 hours</option><option>4 hours</option><option>Until disconnected</option></select></label>
              </div>
              <div className="modal-actions"><button className="btn primary">Save security settings</button></div>
            </form>
          )}
          {section === 'Connected identity' && (
            <div className="settings-pane identity-pane">
              <div className="wallet-identicon">SOL</div>
              <h2>devnet</h2>
              <Status>Owner</Status>
              <div className="property-grid">
                <div><span>Organization</span><b>Northstar Labs</b></div>
                <div><span>Network</span><b>Solana Devnet</b></div>
                <div><span>Settlement Asset</span><b>USDC (6 decimals)</b></div>
                <div><span>Last signature</span><b>Today, 09:31</b></div>
              </div>
            </div>
          )}
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