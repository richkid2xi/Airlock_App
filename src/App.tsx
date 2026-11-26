import { useEffect, useState } from 'react'
import { Onboarding } from './pages/Onboarding'
import { DashboardApp } from './shell/DashboardApp'
import { Logo } from './ui/Logo'

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

export default function App() {
  const { path, navigate } = useRoute()

  useEffect(() => {
    if (path === '/') navigate('/connect', true)
  }, [])

  if (path === '/connect' || path === '/') {
    return <Onboarding startAt={0} onWalletConnected={() => navigate('/onboarding')} onComplete={() => navigate('/app')} />
  }

  if (path === '/onboarding') {
    return <Onboarding startAt={1} onComplete={() => navigate('/app')} />
  }

  if (path.startsWith('/app')) {
    return <DashboardApp path={path} navigate={navigate} onLogout={() => navigate('/connect')} />
  }

  return <NotFound onReturn={() => navigate('/app')} />
}
