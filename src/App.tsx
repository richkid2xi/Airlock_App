import { BrowserRouter, Routes, Route, useParams } from 'react-router'
import { useRoute } from './router/useRoute'
import { Landing } from './pages/Landing'
import { Onboarding } from './pages/Onboarding'
import { DashboardApp } from './shell/DashboardApp'
import { Logo } from './ui/Logo'

export function NotFound({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="route-error">
      <Logo />
      <h1>Page not found</h1>
      <p>The Airlock workspace you requested doesn’t exist.</p>
      <button className="btn primary" onClick={onReturn}>
        Return to dashboard
      </button>
    </div>
  )
}

function ConnectRoute() {
  const { navigate } = useRoute()
  return (
    <Onboarding
      startAt={0}
      onWalletConnected={() => navigate('/onboarding')}
      onComplete={() => navigate('/app')}
    />
  )
}

function OnboardingRoute() {
  const { navigate } = useRoute()
  return <Onboarding startAt={1} onComplete={() => navigate('/app')} />
}

function AppShellRoute() {
  const { path, navigate } = useRoute()
  const params = useParams()
  const subpath = params['*'] || ''

  // Known routes under /app
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

function GlobalNotFound() {
  const { navigate } = useRoute()
  return <NotFound onReturn={() => navigate('/app')} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/connect" element={<ConnectRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route path="/app/*" element={<AppShellRoute />} />
        <Route path="*" element={<GlobalNotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
