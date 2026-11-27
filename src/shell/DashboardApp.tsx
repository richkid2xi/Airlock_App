import { useState, useEffect, type ReactNode } from 'react'
import { Sidebar, pageRoutes } from './Sidebar'
import { Topbar } from './Topbar'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { Toast } from '../ui/Toast'
import { FeatureGate } from '../ui/FeatureGate'
import { SettingsPage } from '../pages/SettingsPage'
import { FEATURES, type FeatureName, FEATURE_LABELS } from '../config/features'
import { authEngine } from '../engines/auth'
import { onboardingEngine } from '../engines/onboarding'
import { registryEngine } from '../engines/registry'
import { Suppliers } from '../pages/Suppliers'
import { Invoices } from '../pages/Invoices'
import { Agents } from '../pages/Agents'
import { AttackLab } from '../pages/AttackLab'

function shorten(address: string | null): string {
  if (!address) return '—'
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address
}

function clusterLabel(): string {
  const cluster = (import.meta as any).env?.VITE_SOLANA_CLUSTER
  return typeof cluster === 'string' && cluster.length > 0 ? cluster : 'devnet'
}

function WelcomePanel({ orgName, address }: { orgName: string; address: string | null }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>{orgName}</h2>
          <p>Signed in · Solana</p>
        </div>
        <Status>Live</Status>
      </div>
      <div className="settings-pane" style={{ padding: '8px 18px 18px' }}>
        <h3 style={{ fontSize: 13, fontWeight: 650, marginBottom: 8 }}>Ready to build</h3>
        <p>Connect your wallet, configure payment settings, and start registering invoices.</p>
      </div>
    </div>
  )
}

export function DashboardApp({ onLogout, path, navigate }: { onLogout: () => void; path: string; navigate: (p: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' } | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>('Your organization')

  useEffect(() => {
    let cancelled = false
    authEngine.getSession().then((s) => { if (!cancelled) setAddress(s?.publicKey ?? null) }).catch(() => {})
    onboardingEngine.get().then((state) => {
      if (cancelled) return
      const name = (state.draft as Record<string, unknown> | undefined)?.name
      if (typeof name === 'string' && name.length > 0) setOrgName(name)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const page = path.startsWith('/app/invoices') ? 'Invoices' : path.startsWith('/app/suppliers') ? 'Suppliers' : path.startsWith('/app/agents') ? 'AI Agents' : path.startsWith('/app/policies') ? 'Policies' : path.startsWith('/app/activity') ? 'Activity' : path.startsWith('/app/approvals') ? 'Approvals' : path.startsWith('/app/attack-lab') ? 'Attack Lab' : path.startsWith('/app/settings') ? 'Settings' : 'Dashboard'

  let content: ReactNode
  if (page === 'Dashboard') content = <FeatureGate feature="metrics"><WelcomePanel orgName={orgName} address={address} /></FeatureGate>
  else if (page === 'Suppliers') content = <FeatureGate feature="registry"><Suppliers notify={message => setToast({ message })} /></FeatureGate>
  else if (page === 'Invoices') content = <FeatureGate feature="registry"><Invoices notify={message => setToast({ message })} /></FeatureGate>
  else if (page === 'AI Agents') content = <FeatureGate feature="registry"><Agents notify={message => setToast({ message })} /></FeatureGate>
  else if (page === 'Policies') content = <FeatureGate feature="policies" />
  else if (page === 'Activity') content = <FeatureGate feature="requests" />
  else if (page === 'Approvals') content = <FeatureGate feature="approvals" />
  else if (page === 'Attack Lab') content = <FeatureGate feature="evaluation"><AttackLab notify={message => setToast({ message })} /></FeatureGate>
  else content = <SettingsPage notify={message => setToast({ message })} onLogout={onLogout} />

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} open={menuOpen} close={() => setMenuOpen(false)} approvalCount={0} />
      <div className="app-main">
        <Topbar page={page} navigate={navigate} toggleMenu={() => setMenuOpen(true)} onLogout={onLogout} />
        <main className="content">{content}</main>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}