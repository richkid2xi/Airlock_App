import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { Metric } from '../ui/Metric'
import { InProgress } from '../ui/InProgress'
import { metricsEngine } from '../engines/metrics'
import { FEATURES } from '../config/features'
import type { DashboardMetrics } from '../engines/metrics/types'

export function TransactionTable({ rows, onOpen }: { rows?: string[][]; onOpen?: (id: string) => void }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state table-empty"><Icon name="activity" /><b>No activity yet</b><p>Payment requests will appear here once registered.</p></div>
  }
  return <div className="table-wrap"><table>
    <thead><tr><th>Reference</th><th>Supplier</th><th>AI agent</th><th>Amount</th><th>Decision</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 ? <button className="text-link" onClick={() => onOpen?.(row[0])}>{cell}</button> : i === 4 ? <Status>{cell}</Status> : cell}</td>)}<td><button className="text-action" onClick={() => onOpen?.(row[0])}>Details <Icon name="chevron" size={12}/></button></td></tr>)}</tbody>
  </table></div>
}

type DueInvoice = {
  invoiceNumber: string
  supplierName: string
  amountMinor: string
  currency: string
  dueDate: string
  status: string
}

export function Dashboard({ setPage }: { setPage: (p: string) => void }) {
  const [query, setQuery] = useState('')
  const [decision, setDecision] = useState<'All' | 'ALLOW' | 'BLOCK' | 'HOLD'>('All')
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dueSoon, setDueSoon] = useState<DueInvoice[]>([])

  const refresh = useCallback(async () => {
    try {
      setMetricsError(null)
      const data = await metricsEngine.getDashboardMetrics()
      setMetrics(data)
    } catch (err) {
      setMetricsError('Dashboard data could not be loaded')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Polling + focus refresh — only while not in error state
  useEffect(() => {
    if (metricsError) return
    const onFocus = () => { refresh() }
    window.addEventListener('focus', onFocus)
    const interval = setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(interval)
    }
  }, [refresh, metricsError])

  // Registry is live; due-soon is real and scoped to invoices only.
  useEffect(() => {
    import('../engines/registry/index').then(({ registryEngine }) => {
      Promise.all([registryEngine.invoices.list(), registryEngine.suppliers.list()])
        .then(([invoices, suppliers]) => {
          const supplierName = new Map<string, string>()
          for (const s of suppliers) supplierName.set(s.id, s.name)
          const openInvoices = invoices.filter(i => i.status === 'open' || i.status === 'attested')
          setDueSoon(
            openInvoices
              .filter(i => new Date(i.dueDate).getTime() <= Date.now() + 14 * 24 * 60 * 60 * 1000)
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .slice(0, 5)
              .map(i => ({
                invoiceNumber: i.invoiceNumber,
                supplierName: supplierName.get(i.supplierId) ?? '—',
                amountMinor: i.amountMinor,
                currency: i.currency,
                dueDate: i.dueDate,
                status: i.status,
              })),
          )
        })
        .catch(() => { /* keep empty; do not show fake data */ })
    })
  }, [])

  const paidCount = metrics?.invoice_counts_by_status?.['paid']?.count ?? 0
  const totalInvoices = Object.values(metrics?.invoice_counts_by_status ?? {}).reduce((acc, v) => acc + (v.count ?? 0), 0)
  const blockedCount = metrics?.blocked_count ?? 0
  const heldCount = metrics?.held_count ?? 0

  const requestsLive = FEATURES.requests === 'live'
  const approvalsLive = FEATURES.approvals === 'live'
  const chainLive = FEATURES.chain === 'live'

  return <>
    <div className="welcome-row"><div><div className="date-label"></div><h1>Dashboard</h1><p>Here's what's happening across your payment environment.</p></div><button className="btn secondary" onClick={() => setPage('/app/attack-lab')}><Icon name="flask"/> Run security test</button></div>
    {metricsError && (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-head"><div><h2>Dashboard</h2></div></div>
        <div style={{ padding: 12, color: '#ef4444' }}>{metricsError}</div>
        <button className="btn primary" onClick={() => refresh()}>Retry</button>
      </div>
    )}
    <div className="metrics-grid">
      {requestsLive ? (
        <Metric icon="shield" label="Funds protected" value={loading ? '--' : String(blockedCount)} note={`${blockedCount} blocked, ${heldCount} held by policy`} />
      ) : <InProgress module="requests" title="Funds protected" whatWillDo={['Blocked/held amounts appear once the requests engine is live']} />}
      <Metric icon="invoice" label="Invoices paid" value={loading ? '--' : String(paidCount)} note={loading ? 'Loading…' : `${paidCount} of ${totalInvoices} registered invoices`} accent="green"/>
      {approvalsLive ? (
        <Metric icon="lock" label="Blocked payments" value={loading ? '--' : String(blockedCount)} note="Blocked by policy" accent="red" />
      ) : <InProgress module="approvals" title="Blocked payments" whatWillDo={['Blocked payment counts appear once the approvals engine is live']} />}
      {approvalsLive ? (
        <Metric icon="clock" label="Awaiting review" value={loading ? '--' : String(heldCount)} note="Human decision required" accent="amber"/>
      ) : <InProgress module="approvals" title="Awaiting review" whatWillDo={['Held items appear once the approvals engine is live']} />}
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
            {(['All', 'ALLOW', 'BLOCK', 'HOLD'] as const).map(d => <button key={d} className={decision === d ? 'active' : ''} onClick={() => setDecision(d)}>{d}</button>)}
          </div>
        </div>
        {loading ? (
          <div className="empty-state"><Icon name="search" /><b>Loading activity</b><p>Fetching latest payment requests…</p></div>
        ) : !requestsLive ? (
          <InProgress module="requests" title="Payment activity" whatWillDo={['Latest 8 evaluations appear once the requests engine is live']} />
        ) : (metrics?.last_evaluations?.length ?? 0) === 0 ? (
          <div className="empty-state"><Icon name="activity" /><b>No activity yet</b><p>Run a payment request to see it here.</p></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Evaluation</th><th>Invoice</th><th>Agent</th><th>Decision</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{metrics!.last_evaluations.map((ev) => <tr key={ev.evaluation_id}>
              <td><button className="text-link" onClick={() => setPage('/app/approvals')}>{ev.evaluation_id.slice(0, 8)}</button></td>
              <td>{ev.invoice_id.slice(0, 8)}</td>
              <td>{ev.agent_id.slice(0, 8)}</td>
              <td><Status>{ev.decision}</Status></td>
              <td>{ev.status}</td>
              <td>{ev.evaluated_at}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
      <section className="panel security-panel">
        <div className="panel-head"><div><h2>Payment security</h2><p>Last 30 days</p></div></div>
        {requestsLive ? (
          <>
            <div className="security-total"><div className="donut"><div><strong>{loading ? '—' : String((metrics?.today_requests_by_decision?.ALLOW ?? 0) + (metrics?.today_requests_by_decision?.HOLD ?? 0) + (metrics?.today_requests_by_decision?.BLOCK ?? 0))}</strong><span>requests</span></div></div></div>
            <div className="legend">
              <div><span><i className="allow"/>Allowed</span><b>{loading ? '—' : String(metrics?.today_requests_by_decision?.ALLOW ?? 0)}</b></div>
              <div><span><i className="hold"/>Held</span><b>{loading ? '—' : String(metrics?.today_requests_by_decision?.HOLD ?? 0)}</b></div>
              <div><span><i className="block"/>Blocked</span><b>{loading ? '—' : String(metrics?.today_requests_by_decision?.BLOCK ?? 0)}</b></div>
            </div>
          </>
        ) : <InProgress module="requests" title="Payment security" whatWillDo={['Decision breakdown appears once the requests engine is live']} />}
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
          {requestsLive ? (
            <div className="empty-state"><Icon name="shield"/><b>No security events</b><p>Policy interventions will appear here.</p></div>
          ) : <InProgress module="requests" title="Security events" whatWillDo={['Policy interventions appear once the requests engine is live']} />}
        </div>
      </section>
    </div>
  </>
}