import { useRoute } from '../router/useRoute'
import { Onboarding } from '../pages/Onboarding'
import { Connect } from '../pages/Connect'
import { DashboardApp } from './DashboardApp'
import { Logo } from '../ui/Logo'
import { useParams } from 'react-router'

function ConnectRoute() {
  const { navigate } = useRoute()
  return <Connect onComplete={() => navigate('/onboarding')} />
}

function OnboardingRoute() {
  const { navigate } = useRoute()
  return <Onboarding startAt={0} onComplete={() => navigate('/app')} />
}

function AppShellRoute() {
  const { path, navigate } = useRoute()
  const params = useParams()
  const subpath = params['*'] || ''
  const knownPrefixes = [
    '',
    'invoices',
    'suppliers',
    'agents',
    'policies',
    'activity',
    'approvals',
    'attack-lab',
    'settings',
  ]
  const topSegment = subpath.split('/')[0]

  if (!knownPrefixes.includes(topSegment)) {
    return <NotFound onReturn={() => navigate('/app')} />
  }

  return <DashboardApp path={path} navigate={navigate} onLogout={() => navigate('/connect')} />
}

function NotFound({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="route-error">
      <Logo />
      <h1>Page not found</h1>
      <p>The Airlock workspace you requested doesn't exist.</p>
      <button className="btn primary" onClick={onReturn}>
        Return to dashboard
      </button>
    </div>
  )
}

function GlobalNotFound() {
  const { navigate } = useRoute()
  return <NotFound onReturn={() => navigate('/app')} />
}

export { ConnectRoute, OnboardingRoute, AppShellRoute, NotFound, GlobalNotFound }