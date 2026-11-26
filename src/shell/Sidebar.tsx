import { Icon, type IconName } from '../ui/Icon'
import { Logo } from '../ui/Logo'

const nav = [
  { group: 'OVERVIEW', items: [['Dashboard','grid']] },
  { group: 'PAYMENTS', items: [['Invoices','invoice'],['Suppliers','users'],['Activity','activity'],['Approvals','check']] },
  { group: 'CONTROL', items: [['AI Agents','bot'],['Policies','shield'],['Attack Lab','flask']] },
  { group: 'SYSTEM', items: [['Settings','settings']] },
] as const

export const pageRoutes: Record<string, string> = {
  Dashboard: '/app',
  Invoices: '/app/invoices',
  Suppliers: '/app/suppliers',
  Activity: '/app/activity',
  Approvals: '/app/approvals',
  'AI Agents': '/app/agents',
  Policies: '/app/policies',
  'Attack Lab': '/app/attack-lab',
  Settings: '/app/settings',
}

export function Sidebar({ page, navigate, open, close, approvalCount = 0 }: { page: string; navigate: (p: string) => void; open: boolean; close: () => void; approvalCount?: number }) {
  return <>
    {open && <button className="scrim" aria-label="Close navigation" onClick={close}/>}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="side-brand"><Logo/><button className="icon-btn side-close" onClick={close}><Icon name="close"/></button></div>
      <nav>{nav.map(section => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.map(([label, icon]) => <button key={label} onClick={() => {navigate(pageRoutes[label]); close()}} className={page === label ? 'active' : ''}><Icon name={icon as IconName}/><span>{label}</span>{label === 'Approvals' && approvalCount > 0 && <em>{approvalCount}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-footer">
        <div className="environment"><span><i/> Protection active</span><small>All systems operational</small></div>
        <button className="profile-card" onClick={()=>navigate('/app/settings')}><span className="wallet-identicon tiny">SOL</span><span><b>devnet</b><small>Owner wallet</small></span><Icon name="chevron"/></button>
      </div>
    </aside>
  </>
}
