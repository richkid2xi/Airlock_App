import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { authEngine } from '../engines/auth'
import { useRoute } from '../router/useRoute'

export function Connect({ onComplete }: { onComplete: () => void }) {
  const { navigate } = useRoute()
  const [wallets, setWallets] = useState<Array<{ name: string; icon: string; readyState: string }>>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authEngine.list().then(setWallets).catch(() => setWallets([]))
  }, [])

  const handleConnect = useCallback(async (walletName: string) => {
    setError(null)
    setConnecting(walletName)
    try {
      await authEngine.connectAndSignIn(walletName)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
      setConnecting(null)
    }
  }, [onComplete])

  if (error) {
    return (
      <main className="connect">
        <div className="connect-card">
          <Logo />
          <h1>Connect your wallet</h1>
          <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>{error}</p>
          <button className="btn secondary" onClick={() => { setError(null) }}>Try again</button>
        </div>
      </main>
    )
  }

  return (
    <main className="connect">
      <div className="connect-card">
        <Logo />
        <h1>Connect your wallet</h1>
        <p>Your wallet is your secure identity. Airlock will request a signature to verify ownership—no transaction or gas fee is required.</p>
        <div className="wallet-list">
          {wallets.length === 0 && <p style={{ fontSize: 14, color: '#6b7280' }}>No wallets detected. Install a Solana wallet and refresh.</p>}
          {wallets.map((w) => (
            <button
              key={w.name}
              className={`wallet-btn${w.readyState !== 'Installed' ? ' disabled' : ''}${connecting === w.name ? ' connecting' : ''}`}
              onClick={() => handleConnect(w.name)}
              disabled={w.readyState !== 'Installed' || connecting !== null}
            >
              <Icon name="wallet" />
              <div>
                <b>{w.name}</b>
                <small>{w.readyState}</small>
              </div>
              {connecting === w.name && <span style={{ fontSize: 12 }}>Connecting…</span>}
              <Icon name="chevron" />
            </button>
          ))}
        </div>
        <div className="wallet-safety">
          <Icon name="shield" /><span><b>Signature only</b><small>Airlock can’t access your funds or move assets by connecting.</small></span>
        </div>
      </div>
    </main>
  )
}
