import { BrowserRouter, Routes, Route } from 'react-router'
import { ConnectRoute } from './shell/Routes'
import { OnboardingRoute } from './shell/Routes'
import { AppShellRoute } from './shell/Routes'
import { GlobalNotFound } from './shell/Routes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ConnectRoute />} />
        <Route path="/connect" element={<ConnectRoute />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />
        <Route path="/app/*" element={<AppShellRoute />} />
        <Route path="*" element={<GlobalNotFound />} />
      </Routes>
    </BrowserRouter>
  )
}