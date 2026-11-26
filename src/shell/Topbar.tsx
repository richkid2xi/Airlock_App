import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { pageRoutes } from './Sidebar'

export function Topbar({ page, toggleMenu, navigate }: { page: string; toggleMenu: () => void; navigate:(p:string)=>void }) {
  const [open,setOpen] = useState<'org'|'search'|'help'|'notifications'|'wallet'|null>(null)
  const [search,setSearch] = useState('')
  const searchResults = Object.keys(pageRoutes).filter(x=>x.toLowerCase().includes(search.toLowerCase()) && search).slice(0,5)
  return <header className="topbar">
    <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={toggleMenu}><Icon name="menu"/></button>
    <div className="page-title"><span>Workspace</span><Icon name="chevron" size={13}/><b>{page}</b></div>
    <div className="top-actions">
      <button className="org-switch" onClick={()=>setOpen(open==='org'?null:'org')}><span className="avatar org">N</span><b>Northstar Labs</b><Icon name="chevron" size={14}/></button>
      <button className="search-trigger" onClick={()=>setOpen(open==='search'?null:'search')}><Icon name="search"/><span>Search</span><kbd>⌘ K</kbd></button>
      <button className="icon-btn" aria-label="Help" onClick={()=>setOpen(open==='help'?null:'help')}><Icon name="help"/></button>
      <button className="icon-btn notification" aria-label="Notifications" onClick={()=>setOpen(open==='notifications'?null:'notifications')}><Icon name="bell"/><i/></button>
      <button className="wallet-profile" aria-label="Open connected wallet" onClick={()=>setOpen(open==='wallet'?null:'wallet')}><span className="wallet-identicon tiny">SOL</span><span><b>devnet</b><small>Solana · USDC</small></span><Icon name="chevron" size={12}/></button>
    </div>
    {open && <div className={`top-popover ${open}`}>
      {open==='search' && <><div className="popover-search"><Icon name="search"/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workspaces…"/></div>{searchResults.length ? <div className="global-results">{searchResults.map(x=><button key={x} onClick={()=>{navigate(pageRoutes[x]);setOpen(null);setSearch('')}}><span>{x}</span><Icon name="arrow"/></button>)}</div> : <p>{search ? 'No matching workspace found.' : 'Search invoices, suppliers, activity, agents and settings.'}</p>}</>}
      {open==='org' && <><span className="popover-label">ACTIVE ORGANIZATION</span><button><span className="avatar org">N</span><span><b>Northstar Labs</b><small>Production</small></span><Icon name="check"/></button></>}
      {open==='help' && <><b>Airlock support</b><p>Invoice-bound requests are evaluated against supplier identity, amount, evidence and active policies before funds can move.</p><button className="btn secondary" onClick={()=>setOpen(null)}>Close help</button></>}
      {open==='notifications' && <><b>Notifications</b><div className="notice-item"><span className="event-symbol hold"><Icon name="clock"/></span><span><b>Payment awaiting review</b><small>INV-2045 · 2 hours ago</small></span></div><div className="notice-item"><span className="event-symbol block"><Icon name="lock"/></span><span><b>Payment blocked</b><small>INV-2042 · Yesterday</small></span></div></>}
      {open==='wallet' && <><span className="popover-label">CONNECTED SOLANA CLUSTER</span><div className="wallet-pop"><span className="wallet-identicon small">SOL</span><span><b>devnet</b><small>Mint: 4zMMC9...ncDU · Circle USDC</small></span></div></>}
    </div>}
  </header>
}
