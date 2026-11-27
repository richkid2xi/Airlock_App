import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { pageRoutes } from './Sidebar'

export function Topbar({ page, toggleMenu, navigate, onLogout }: { page: string; toggleMenu: () => void; navigate: (p: string) => void; onLogout?: () => void }) {
  const [open, setOpen] = useState<'search' | 'help' | 'notifications' | 'wallet' | null>(null)
  const [search, setSearch] = useState('')
  const searchResults = Object.keys(pageRoutes)
    .filter((x) => x.toLowerCase().includes(search.toLowerCase()) && search)
    .slice(0, 5)

  return (
    <header className="topbar">
      <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={toggleMenu}>
        <Icon name="menu" />
      </button>
      <div className="page-title">
        <span>Workspace</span>
        <Icon name="chevron" size={13} />
        <b>{page}</b>
      </div>
      <div className="top-actions">
        <button className="search-trigger" onClick={() => setOpen('search')}>
          <Icon name="search" />
          <span>Search</span>
        </button>
        <button className="icon-btn" aria-label="Help" onClick={() => setOpen('help')}>
          <Icon name="help" />
        </button>
        <button className="icon-btn notification" aria-label="Notifications" onClick={() => setOpen('notifications')}>
          <Icon name="bell" />
          <i />
        </button>
        <button className="wallet-profile" aria-label="Open connected wallet" onClick={() => setOpen('wallet')}>
          <span className="wallet-identicon tiny">SOL</span>
          <span>
            <b>devnet</b>
            <small>Solana · USDC</small>
          </span>
          <Icon name="chevron" size={12} />
        </button>
      </div>
      {open && (
        <div className={`top-popover ${open}`}>
          {open === 'search' && (
            <div className="popover-search">
              <Icon name="search" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
              {searchResults.length > 0 && (
                <div className="global-results">
                  {searchResults.map((x) => (
                    <button key={x} onClick={() => { navigate(pageRoutes[x]); setOpen(null); setSearch('') }}>
                      <span>{x}</span>
                      <Icon name="arrow" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {open === 'help' && (
            <>
              <b>Airlock support</b>
              <p>Invoice-bound requests are evaluated against supplier identity, amount, evidence and active policies before funds can move.</p>
              <button className="btn secondary" onClick={() => setOpen(null)}>Close</button>
            </>
          )}
          {open === 'notifications' && (
            <>
              <b>Notifications</b>
              <p>No new notifications.</p>
            </>
          )}
          {open === 'wallet' && (
            <>
              <span className="popover-label">CONNECTED SOLANA CLUSTER</span>
              <div className="wallet-pop">
                <span className="wallet-identicon small">SOL</span>
                <span>
                  <b>devnet</b>
                  <small>Mint: — · Circle USDC</small>
                </span>
              </div>
              {onLogout && (
                <div className="wallet-disconnect">
                  <button className="btn secondary" onClick={() => { setOpen(null); onLogout() }}>Disconnect wallet</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </header>
  )
}