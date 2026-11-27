import { useState, type FormEvent } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { InProgress } from '../ui/InProgress'
import { FEATURES, type FeatureName, FEATURE_LABELS } from '../config/features'

export function SettingsPage({ notify, onLogout }: { notify: (m: string) => void; onLogout: () => void }) {
  const [section, setSection] = useState('Engine status')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const sections = [
    ['shield', 'Engine status', 'Live and degraded engine statuses'],
    ['wallet', 'Wallet configuration', 'Connected wallets and payment networks'],
    ['users', 'Team & access', 'Wallet roles and permissions'],
    ['bell', 'Notifications', 'Payment and security alert preferences'],
    ['shield', 'Security preferences', 'Signatures, sessions and approval controls'],
    ['settings', 'Connected identity', 'Wallet identity and delegated access'],
    ['building', 'Organization profile', 'Business details, address and industry'],
  ] as const

  const save = (e: FormEvent) => { e.preventDefault(); notify(`${section} updated successfully.`) }

  const isLive = (key: FeatureName) => FEATURES[key] === 'live'

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
          {section === 'Wallet configuration' && <InProgress module="chain" title="Wallet configuration" whatWillDo={["Connected wallet identity, payout destinations and settlement network settings will be wired by the login and chain slices."]} />}
          {section === 'Team & access' && <InProgress module="requests" title="Team & access" whatWillDo={["Wallet roles, delegated access and permissions will be wired by the login slice."]} />}
          {section === 'Notifications' && <InProgress module="metrics" title="Notifications" whatWillDo={["Payment and security alert preferences will be wired by the settings slice."]} />}
          {section === 'Security preferences' && <InProgress module="chain" title="Security preferences" whatWillDo={["Signatures, sessions and approval controls will be wired by the settings slice."]} />}
          {section === 'Connected identity' && <InProgress module="chain" title="Connected identity" whatWillDo={["Wallet identity and delegated access will be wired by the login slice."]} />}
          {section === 'Organization profile' && <InProgress module="chain" title="Organization profile" whatWillDo={["Business details, address and industry will be wired by the login slice."]} />}
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
