import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { Metric } from '../ui/Metric'

export function TransactionTable({ rows, onOpen }: { rows?: string[][]; onOpen?: (id: string) => void }) {
  return <div className="table-wrap"><table>
    <thead><tr><th>Reference</th><th>Supplier</th><th>AI agent</th><th>Amount</th><th>Decision</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{rows?.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 ? <button className="text-link" onClick={() => onOpen?.(row[0])}>{cell}</button> : i === 4 ? <Status>{cell}</Status> : cell}</td>)}<td><button className="text-action" onClick={() => onOpen?.(row[0])}>Details <Icon name="chevron" size={12}/></button></td></tr>)}</tbody>
  </table></div>
}

export function Dashboard({ setPage, activityRows = [], invoiceData = [], approvalCount = 0, onOpenActivity }: { setPage: (p: string) => void; activityRows?: string[][]; invoiceData?: string[][]; approvalCount?: number; onOpenActivity?: (id:string) => void }) {
  const [query,setQuery] = useState('')
  const [decision,setDecision] = useState('All')
  const recent = activityRows.filter(x => x.some(c=>c.toLowerCase().includes(query.toLowerCase())) && (decision==='All'||x[4]===decision)).slice(0,5)
  const paidCount = invoiceData.filter(x => x[5] === 'Paid').length
  return <>
    <div className="welcome-row"><div><div className="date-label"></div><h1>Dashboard</h1><p>Here's what's happening across your payment environment.</p></div><button className="btn secondary" onClick={() => setPage('Attack Lab')}><Icon name="flask"/> Run security test</button></div>
    <div className="metrics-grid">
      <Metric icon="shield" label="Funds protected" value="--" note="Blocked or held" />
      <Metric icon="invoice" label="Invoices paid" value={String(paidCount)} note={`${invoiceData.length} registered invoices`} accent="green"/>
      <Metric icon="lock" label="Blocked payments" value="0" note="In the last 30 days" accent="red"/>
      <Metric icon="clock" label="Awaiting review" value={String(approvalCount)} note={approvalCount ? 'Human decision required' : 'No requests need review'} accent="amber"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel activity-panel">
        <div className="panel-head"><div><h2>Payment activity</h2><p>Latest agent-initiated payment requests</p></div><button className="text-action" onClick={() => setPage('Activity')}>View all <Icon name="arrow" size={15}/></button></div>
        <div className="table-tools"><div className="table-search"><Icon name="search"/><input aria-label="Search activity" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reference or supplier"/></div><label className="select-filter"><Icon name="filter"/><select value={decision} onChange={e=>setDecision(e.target.value)}><option>All</option><option>ALLOW</option><option>BLOCK</option><option>HOLD</option></select></label></div>
        <TransactionTable rows={recent} onOpen={onOpenActivity}/>
      </section>
      <section className="panel security-panel">
        <div className="panel-head"><div><h2>Payment security</h2><p>Last 30 days</p></div></div>
        <div className="security-total"><div className="donut"><div><strong>0</strong><span>requests</span></div></div></div>
        <div className="legend">
          <div><span><i className="allow"/>Allowed</span><b>0 <small>0%</small></b></div>
          <div><span><i className="hold"/>Held</span><b>0 <small>0%</small></b></div>
          <div><span><i className="block"/>Blocked</span><b>0 <small>0%</small></b></div>
        </div>
        <div className="security-note"><Icon name="shield"/><span><b>Protection active</b><small>No policies configured</small></span></div>
      </section>
      <section className="panel compact-panel">
        <div className="panel-head"><div><h2>Invoices due soon</h2><p>Next 14 days</p></div><button className="text-action" onClick={() => setPage('Invoices')}>View invoices</button></div>
        <div className="due-list">
          {invoiceData.filter(x => x[5] !== 'Paid').slice(0,3).map(x => <div key={x[0]}><span className="doc-icon"><Icon name="invoice"/></span><span><b>{x[0]} · {x[1]}</b><small>Due {x[4]}</small></span><strong>{x[2]}</strong><Status>{x[5]}</Status></div>)}
        </div>
      </section>
      <section className="panel compact-panel events-panel">
        <div className="panel-head"><div><h2>Security events</h2><p>Recent policy interventions</p></div><button className="text-action" onClick={() => setPage('Activity')}>View log</button></div>
        <div className="events-list">
          {activityRows.filter(x => x[4] === 'BLOCK' || x[4] === 'HOLD').slice(0,3).map((x, i) => <div key={i}><span className={`event-symbol ${x[4] === 'HOLD' ? 'hold' : 'block'}`}><Icon name={x[4] === 'HOLD' ? 'clock' : 'lock'} size={15}/></span><span><b>{x[0]} · {x[1]}</b><small>{x[2]}</small></span></div>)}
        </div>
      </section>
    </div>
  </>
}