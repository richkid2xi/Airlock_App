import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { Toast } from '../ui/Toast'
import { authEngine } from '../engines/auth'
import { useRoute } from '../router/useRoute'

type WalletRow = { name: string; icon: string; readyState: string; installUrl?: string }

export function Connect({ onComplete }: { onComplete: () => void }) {
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' } | null>(null)

  const loadWallets = useCallback(() => {
    setLoading(true)
    setError(null)
    authEngine
      .list()
      .then((list) => setWallets(list as WalletRow[]))
      .catch(() => setWallets([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadWallets()
  }, [loadWallets])

  const handleConnect = useCallback(
    async (walletName: string) => {
      setError(null)
      setConnecting(walletName)
      try {
        await authEngine.connectAndSignIn(walletName)
        setToast({ message: 'Account connected', tone: 'success' })
        setTimeout(() => onComplete(), 1200)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect wallet')
        setConnecting(null)
      }
    },
    [onComplete],
  )

  const openInstallUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  if (loading) {
    return (
      <main className="connect">
        <div className="connect-card">
          <Logo />
          <h1>Connect your wallet</h1>
          <p>Loading wallet providers…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="connect">
        <div className="connect-card">
          <Logo />
          <h1>Connect your wallet</h1>
          <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</p>
          <button className="btn secondary" onClick={loadWallets}>Try again</button>
        </div>
      </main>
    )
  }

  return (
    <main className="connect">
      <div className="connect-card">
        <Logo />
        <h1>Connect your wallet</h1>
        <div className="wallet-list">
          {wallets.length === 0 && <p style={{ fontSize: 13, color: '#6b7280' }}>No wallets detected. Install a Solana wallet and refresh.</p>}
          {wallets.map((w) => {
            const installed = w.readyState === 'Installed'
            const busy = connecting === w.name
            return (
              <button
                key={w.name}
                className={`wallet-btn${!installed ? ' disabled' : ''}${busy ? ' connecting' : ''}`}
                onClick={() => (installed ? handleConnect(w.name) : w.installUrl ? openInstallUrl(w.installUrl) : undefined)}
                disabled={connecting !== null || (!installed && !w.installUrl)}
              >
                <span className="wallet-icon">{w.name.charAt(0)}</span>
                <span className="wallet-copy">
                  <b className="wallet-name">{w.name}</b>
                  <small className="wallet-status">{installed ? 'Installed' : 'Not detected · Install'}</small>
                </span>
                {busy ? <span className="connecting-text">Connecting…</span> : <Icon name={installed ? 'chevron' : 'arrow'} size={16} />}
              </button>
            )
          })}
        </div>
        <p className="connect-disclosure">Airlock only requests a signature to confirm your identity. It cannot access or move your funds.</p>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </main>
  )
}
