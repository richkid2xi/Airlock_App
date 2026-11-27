import { useState, useRef, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { pageRoutes } from './Sidebar'

export function Topbar({ page, toggleMenu, navigate, onLogout }: { page: string; toggleMenu: () => void; navigate: (p: string) => void; onLogout?: () => void }) {
  const [open, setOpen] = useState<'search' | 'notifications' | null>(null)
  const [search, setSearch] = useState('')
  const notifications: string[] = []
  const popoverRef = useRef<HTMLDivElement>(null)

  const searchResults = Object.keys(pageRoutes)
    .filter((x) => search.length > 0 && x.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5)

  // Outside click to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(null)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

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
        <button className="icon-btn notification" aria-label="Notifications" onClick={() => setOpen(open === 'notifications' ? null : 'notifications')}>
          <Icon name="bell" />
          {notifications.length > 0 && <i />}
        </button>
        {onLogout && (
          <button className="icon-btn logout-btn" title="Log out" aria-label="Log out" onClick={onLogout}>
            <Icon name="logout" />
          </button>
        )}
      </div>
      {open != null && (
        <div ref={popoverRef} className={`top-popover ${open}`}>
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
          {open === 'notifications' && (
            <div className="notification-panel">
              <div className="notification-header">
                <span className="popover-label">NOTIFICATIONS</span>
                {notifications.length > 0 && <button className="text-action mark-read">Mark all as read</button>}
              </div>
              {notifications.length > 0 ? (
                <ul>
                  {notifications.map((n, i) => (
                    <li key={i} style={{ fontSize: 12, lineHeight: 1.4, paddingBottom: 6 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <Icon name="bell" /> No new notifications
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  )
}