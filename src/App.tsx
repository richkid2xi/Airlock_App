import { BrowserRouter, Routes, Route } from 'react-router'
import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { ConnectRoute } from './shell/Routes'
import { OnboardingRoute } from './shell/Routes'
import { AppShellRoute } from './shell/Routes'
import { GlobalNotFound } from './shell/Routes'
import { CheckpointPage } from './pages/Checkpoint'

function getRpcUrl(): string {
  const url = import.meta.env.VITE_SOLANA_RPC_URL
  if (typeof url === 'string' && url.length > 0) return url
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER
  if (cluster === 'mainnet-beta') return clusterApiUrl('mainnet-beta')
  if (cluster === 'testnet') return clusterApiUrl('testnet')
  return clusterApiUrl('devnet')
}

export default function App() {
  const endpoint = getRpcUrl()
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ConnectRoute />} />
            <Route path="/connect" element={<ConnectRoute />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/checkpoint" element={<CheckpointPage />} />
            <Route path="/app/*" element={<AppShellRoute />} />
            <Route path="*" element={<GlobalNotFound />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </ConnectionProvider>
  )
}
