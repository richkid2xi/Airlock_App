import { useState, useRef, useEffect, useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { pageRoutes, searchablePages } from './Sidebar'

export function Topbar({ page, toggleMenu, navigate, onLogout }: { page: string; toggleMenu: () => void; navigate: (p: string) => void; onLogout?: () => void }) {
  const [open, setOpen] = useState<'search' | 'notifications' | null>(null)
  const [search, setSearch] = useState('')
  const notifications: string[] = []
  const popoverRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? searchablePages.filter((x) => x.label.toLowerCase().includes(q) || x.group.toLowerCase().includes(q))
      : searchablePages
    return list.slice(0, 6)
  }, [search])

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

  // Keyboard navigation within the search popover
  useEffect(() => {
    if (open !== 'search') return
    function handleKeyNav(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const target = results[activeIndex]
        if (target) {
          navigate(target.path)
          setOpen(null)
          setSearch('')
        }
      }
    }
    document.addEventListener('keydown', handleKeyNav)
    return () => document.removeEventListener('keydown', handleKeyNav)
  }, [open, results, activeIndex, navigate])

  const navigateTo = (path: string) => {
    navigate(path)
    setOpen(null)
    setSearch('')
    setActiveIndex(-1)
  }

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
        <button className="search-trigger" aria-label="Search" onClick={() => setOpen('search')}>
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
            <div className="search-panel">
              <div className="popover-search">
                <Icon name="search" />
                <input autoFocus value={search} onChange={(e) => { setSearch(e.target.value); setActiveIndex(-1) }} placeholder="Search pages…" />
                {search.length > 0 && <button className="search-clear" aria-label="Clear search" onClick={() => { setSearch(''); setActiveIndex(-1) }}><Icon name="close" size={13}/></button>}
              </div>
              {results.length > 0 ? (
                <div className="global-results">
                  {results.map((r, i) => (
                    <button key={r.path} className={i === activeIndex ? 'active' : ''} onMouseEnter={() => setActiveIndex(i)} onClick={() => navigateTo(r.path)}>
                      <span>
                        <b>{r.label}</b>
                        <small>{r.group}</small>
                      </span>
                      <span className="global-tag">{r.group}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><Icon name="search" /><b>No results found</b><p>No pages match your search.</p></div>
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