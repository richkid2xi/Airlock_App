import { useState, useMemo } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { EntityDetail } from './EntityDetail'
import type { PolicyRecord } from '../domain/types'

export function DataWorkspace({ type, rows, path, navigate, onCreate, onUpdate, notify, policies = [] }: { type: 'Invoices' | 'Suppliers' | 'AI Agents'; rows: string[][]; path: string; navigate: (p: string) => void; onCreate: () => void; onUpdate:(r:string[])=>void; notify:(m:string)=>void; policies?:PolicyRecord[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState(0)
  const [page, setPage] = useState(1)
  const configs = {
    Invoices: {desc:'Register, attest and track invoice-bound payments.', action:'Register invoice', columns:['Invoice number','Supplier','Amount','Issue date','Due date','Status'], statuses:['All','Open','Attested','Paid','Disputed']},
    Suppliers: {desc:'Manage approved suppliers and registered payout destinations.', action:'Add supplier', columns:['Supplier','Payout wallet','Verification','Invoices','Last payment','Status'], statuses:['All','Verified','Unverified','Review required']},
    'AI Agents': {desc:'Control which AI agents can initiate payment requests.', action:'Authorize agent', columns:['Agent','Identifier','Status','Per-request limit','Daily limit','Requests'], statuses:['All','Active','Disabled']},
  }[type]
  const base = type === 'Invoices' ? '/app/invoices/' : type === 'Suppliers' ? '/app/suppliers/' : '/app/agents/'
  const detailId = path.startsWith(base) ? decodeURIComponent(path.slice(base.length)) : ''
  const selected = rows.find(r => r[0] === detailId)
  const filtered = useMemo(() => rows.filter(row => row.some(cell => cell.toLowerCase().includes(query.toLowerCase())) && (filter === 'All' || row.includes(filter))).sort((a,b) => a[sort].localeCompare(b[sort])), [rows, query, filter, sort])
  const pageSize = 5
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  if (selected) return <EntityDetail type={type} row={selected} onUpdate={onUpdate} notify={notify} policies={policies} onBack={() => navigate(type === 'Invoices' ? '/app/invoices' : type === 'Suppliers' ? '/app/suppliers' : '/app/agents')}/>
  return <>
    <PageHeading title={type} description={configs.desc} action={configs.action} onAction={onCreate}/>
    <section className="panel workspace-panel">
      <div className="workspace-tools"><div className="table-search"><Icon name="search"/><input value={query} onChange={e => {setQuery(e.target.value);setPage(1)}} placeholder={`Search ${type.toLowerCase()}…`}/></div><label className="select-filter"><Icon name="filter"/><select value={filter} onChange={e => {setFilter(e.target.value);setPage(1)}}>{configs.statuses.map(x => <option key={x}>{x}</option>)}</select></label></div>
      <div className="table-wrap"><table><thead><tr>{configs.columns.map((c,i) => <th key={c}><button className="sort-button" onClick={() => setSort(i)}>{c}{sort === i && ' ↑'}</button></th>)}<th/></tr></thead><tbody>{pageRows.map(row => <tr key={row[0]}>{row.map((c,i) => <td key={i}>{i === 0 ? <button className="entity-cell" onClick={() => navigate(`${base}${encodeURIComponent(row[0])}`)}>{type === 'Suppliers' && <span>{c[0]}</span>}<b>{c}</b></button> : (i === configs.columns.length - 1 || (type === 'Suppliers' && i === 2) || (type === 'AI Agents' && i === 2)) ? <Status>{c}</Status> : c}</td>)}<td><button className="text-action" onClick={() => navigate(`${base}${encodeURIComponent(row[0])}`)}>Open <Icon name="chevron" size={12}/></button></td></tr>)}</tbody></table>{pageRows.length === 0 && <div className="empty-state"><Icon name="search"/><b>No matching records</b><p>Try changing your search or status filter.</p></div>}</div>
      <div className="pagination"><span>Showing {filtered.length ? (page-1)*pageSize+1 : 0}–{Math.min(page*pageSize,filtered.length)} of {filtered.length}</span><div><button disabled={page === 1} onClick={() => setPage(page-1)}>Previous</button><button disabled={page*pageSize >= filtered.length} onClick={() => setPage(page+1)}>Next</button></div></div>
    </section>
  </>
}
