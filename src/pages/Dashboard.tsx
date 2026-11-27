import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { Metric } from '../ui/Metric'
import { InProgress } from '../ui/InProgress'

type DueInvoice = {
  invoiceNumber: string
  supplierName: string
  amountMinor: string
  currency: string
  dueDate: string
  status: string
}

type MetricsSummary = {
  totalInvoices: number
  paidCount: number
  openCount: number
  dueSoon: DueInvoice[]
}

type DashboardMetrics = {
  loading: boolean
  error: string | null
  data: MetricsSummary | null
}

export function TransactionTable({ rows, onOpen }: { rows?: string[][]; onOpen?: (id: string) => void }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state table-empty"><Icon name="activity" /><b>No activity yet</b><p>Payment requests will appear here once registered.</p></div>
  }
  return <div className="table-wrap"><table>
    <thead><tr><th>Reference</th><th>Supplier</th><th>AI agent</th><th>Amount</th><th>Decision</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 ? <button className="text-link" onClick={() => onOpen?.(row[0])}>{cell}</button> : i === 4 ? <Status>{cell}</Status> : cell}</td>)}<td><button className="text-action" onClick={() => onOpen?.(row[0])}>Details <Icon name="chevron" size={12}/></button></td></tr>)}</tbody>
  </table></div>
}

export function Dashboard({ setPage, metrics }: { setPage: (p: string) => void; metrics?: DashboardMetrics }) {
  const [query, setQuery] = useState('')
  const [decision, setDecision] = useState<'All' | 'ALLOW' | 'BLOCK' | 'HOLD'>('All')
  const decisions: Array<'All' | 'ALLOW' | 'BLOCK' | 'HOLD'> = ['All', 'ALLOW', 'BLOCK', 'HOLD']
  const metricsData = metrics?.data ?? null
  const metricsLoading = metrics?.loading ?? false

  const paidCount = metricsData?.paidCount ?? 0
  const totalInvoices = metricsData?.totalInvoices ?? 0
  const dueSoon = metricsData?.dueSoon ?? []

  return <>
    <div className="welcome-row"><div><div className="date-label"></div><h1>Dashboard</h1><p>Here's what's happening across your payment environment.</p></div><button className="btn secondary" onClick={() => setPage('/app/attack-lab')}><Icon name="flask"/> Run security test</button></div>
    <div className="metrics-grid">
      <Metric icon="shield" label="Funds protected" value="--" note="Blocked or held by policy" />
      <Metric icon="invoice" label="Invoices paid" value={metricsLoading ? '--' : String(paidCount)} note={metricsLoading ? 'Loading…' : `${paidCount} of ${totalInvoices} registered invoices`} accent="green"/>
      <Metric icon="lock" label="Blocked payments" value="--" note="In the last 30 days" accent="red" />
      <Metric icon="clock" label="Awaiting review" value="--" note="Human decision required" accent="amber"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel activity-panel">
        <div className="panel-head"><div><h2>Payment activity</h2><p>Latest agent-initiated payment requests</p></div><button className="text-action" onClick={() => setPage('/app/activity')}>View all <Icon name="arrow" size={15}/></button></div>
        <div className="table-tools">
          <div className="table-search">
            <Icon name="search"/>
            <input aria-label="Search activity" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reference or supplier"/>
            {query.length > 0 && <button className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={13}/></button>}
          </div>
          <div className="decision-pills" role="group" aria-label="Filter by decision">
            {decisions.map(d => <button key={d} className={decision === d ? 'active' : ''} onClick={() => setDecision(d)}>{d}</button>)}
          </div>
        </div>
        {metricsLoading ? (
          <div className="empty-state"><Icon name="search" /><b>Loading activity</b><p>Fetching latest payment requests…</p></div>
        ) : <InProgress module="requests" title="Payment requests" whatWillDo={['Activity will appear once the payment requests engine is live']} />}
      </section>
      <section className="panel security-panel">
        <div className="panel-head"><div><h2>Payment security</h2><p>Last 30 days</p></div></div>
        <div className="security-total"><div className="donut"><div><strong>0</strong><span>requests</span></div></div></div>
        <div className="legend">
          <div><span><i className="allow"/>Allowed</span><b>0 <small>0%</small></b></div>
          <div><span><i className="hold"/>Held</span><b>0 <small>0%</small></b></div>
          <div><span><i className="block"/>Blocked</span><b>0 <small>0%</small></b></div>
        </div>
      </section>
      <section className="panel compact-panel">
        <div className="panel-head"><div><h2>Invoices due soon</h2><p>Next 14 days</p></div><button className="text-action" onClick={() => setPage('/app/invoices')}>View invoices</button></div>
        <div className="due-list">
          {dueSoon.length > 0 ? dueSoon.map(x => (
            <div key={x.invoiceNumber}>
              <span className="doc-icon"><Icon name="invoice"/></span>
              <span><b>{x.invoiceNumber} · {x.supplierName}</b><small>Due {x.dueDate}</small></span>
              <strong>{x.amountMinor} {x.currency}</strong>
              <Status>{x.status}</Status>
            </div>
          )) : <div className="empty-state"><Icon name="invoice"/><b>No invoices due</b><p>Upcoming invoices will appear here.</p></div>}
        </div>
      </section>
      <section className="panel compact-panel events-panel">
        <div className="panel-head"><div><h2>Security events</h2><p>Recent policy interventions</p></div><button className="text-action" onClick={() => setPage('/app/activity')}>View log</button></div>
        <div className="events-list">
          <div className="empty-state"><Icon name="shield"/><b>No security events</b><p>Policy interventions will appear here once the requests engine is live.</p></div>
        </div>
      </section>
    </div>
  </>
}