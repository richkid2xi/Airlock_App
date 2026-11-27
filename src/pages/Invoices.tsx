import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { registryEngine } from '../engines/registry/index'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import { RegistryPortError, type Invoice, type Supplier } from '../engines/registry/types'

function formatMinor(amount: string, currency: string): string {
  try {
    const dec = currency === 'USDC' ? 6 : 2
    const big = BigInt(amount)
    const neg = big < 0
    const abs = neg ? -big : big
    const div = BigInt(10 ** dec)
    const whole = (abs / div).toString()
    const frac = (abs % div).toString().padStart(dec, '0')
    return `${neg ? '-' : ''}${whole}.${frac}`
  } catch {
    return amount
  }
}

export function Invoices({ notify }: { notify: (m: string) => void }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'attested' | 'paid' | 'disputed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [draft, setDraft] = useState<{ invoiceNumber: string; supplierId: string; amountMinor: string; currency: string; mint: string; issueDate: string; dueDate: string; documentRef: string; notes: string }>({
    invoiceNumber: '', supplierId: '', amountMinor: '', currency: 'USDC', mint: '', issueDate: '', dueDate: '', documentRef: '', notes: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invData, supData] = await Promise.all([registryEngine.invoices.list(), registryEngine.suppliers.list()])
      setInvoices(invData)
      setSuppliers(supData)
    } catch (err) {
      if (err instanceof RegistryPortError) setError(`${err.code}: ${err.message}`)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const d = Object.fromEntries(new FormData(form))
    setLoading(true)
    setError(null)
    try {
      const created = await registryEngine.invoices.create({
        invoiceNumber: String(d.invoiceNumber),
        supplierId: String(d.supplierId),
        amountMinor: String(d.amountMinor),
        currency: String(d.currency) as any,
        mint: String(d.mint) || undefined,
        issueDate: String(d.issueDate),
        dueDate: String(d.dueDate),
        documentRef: String(d.documentRef) || undefined,
        notes: String(d.notes) || undefined,
      })
      setInvoices(prev => prev === null ? [created] : [created, ...prev])
      setOpen(false)
      setDraft({ invoiceNumber: '', supplierId: '', amountMinor: '', currency: 'USDC', mint: '', issueDate: '', dueDate: '', documentRef: '', notes: '' })
      notify(`Invoice ${created.invoiceNumber} registered`)
    } catch (err) {
      if (err instanceof RegistryPortError) setError(`${err.code}: ${err.message}`)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'attest' | 'dispute') => {
    setLoading(true)
    setError(null)
    try {
      const updated = action === 'attest' ? await registryEngine.invoices.attest(id) : await registryEngine.invoices.dispute(id)
      setInvoices(prev => prev === null ? [] : prev.map((i) => i.id === id ? updated : i))
      notify(`Invoice ${updated.invoiceNumber} ${action === 'attest' ? 'attested' : 'disputed'}`)
    } catch (err) {
      if (err instanceof RegistryPortError) setError(`${err.code}: ${err.message}`)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (id: string, file: File) => {
    setLoading(true)
    setError(null)
    try {
      const updated = await registryEngine.invoices.uploadDocument(id, file)
      setInvoices(prev => prev === null ? [] : prev.map((i) => i.id === id ? updated : i))
      notify(`Document uploaded for ${updated.invoiceNumber}`)
    } catch (err) {
      if (err instanceof RegistryPortError) setError(`${err.code}: ${err.message}`)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const { url } = await registryEngine.invoices.getDocumentUrl(id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      if (err instanceof RegistryPortError) setError(`${err.code}: ${err.message}`)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const filtered = invoices?.filter((i) => {
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    const sup = suppliers?.find((s) => s.id === i.supplierId)
    const q = searchQuery.toLowerCase()
    const matchesSearch = q === '' || i.invoiceNumber.toLowerCase().includes(q) || (sup?.name.toLowerCase().includes(q) ?? false)
    return matchesStatus && matchesSearch
  })

  const detail = detailId ? invoices?.find((i) => i.id === detailId) ?? null : null

  if (loading && !invoices) return <div className="panel"><div className="panel-head"><div><h1>Invoices</h1><p>Register, attest, and dispute supplier invoices.</p></div></div><div style={{ padding: 24, textAlign: 'center' }}>Loading invoices...</div></div>

  return <>
    <PageHeading title="Invoices" description="Register incoming supplier invoices. Attest when goods or services are confirmed delivered; dispute when something is wrong." action="Register invoice" onAction={() => setOpen(true)} />
    {error && <div style={{ padding: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>}
    <div className="panel">
      <div className="panel-head"><div><h2>Invoice register</h2><p>{filtered?.length ?? 0} invoices</p></div></div>
      <div style={{ padding: '12px 18px' }}>
        <div className="toolbar" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search invoice or supplier" style={{ flex: 1, minWidth: 200, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="attested">Attested</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Invoice #</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Supplier</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Amount</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Due</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Status</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((i) => {
                const sup = suppliers?.find((s) => s.id === i.supplierId)
                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 10, fontSize: 14 }}><button className="linkish" onClick={() => setDetailId(i.id)}><b>{i.invoiceNumber}</b></button></td>
                    <td style={{ padding: 10, fontSize: 14 }}>{sup?.name || '—'}</td>
                    <td style={{ padding: 10, fontSize: 14 }}>{formatMinor(i.amountMinor, i.currency)} {i.currency}</td>
                    <td style={{ padding: 10, fontSize: 14 }}>{i.dueDate}</td>
                    <td style={{ padding: 10, fontSize: 14 }}><Status>{i.status}</Status></td>
                    <td style={{ padding: 10, textAlign: 'right' }}>
                      {i.status === 'open' && <button className="btn primary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => handleAction(i.id, 'attest')}>Attest</button>}
                      {i.status === 'open' && <button className="btn secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => handleAction(i.id, 'dispute')}>Dispute</button>}
                      {i.status !== 'open' && <span style={{ fontSize: 11, color: '#6b7280' }}>{i.status}</span>}
                    </td>
                  </tr>
                )
              })}
              {(!filtered || filtered.length === 0) && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No invoices match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {open && <Modal title="Register invoice" description="Create a new invoice record linked to a verified supplier. Amounts are in minor units (e.g. USDC = 6 decimals)." onClose={() => setOpen(false)}>
      <form onSubmit={handleCreate}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field full">Invoice number<input name="invoiceNumber" required value={draft.invoiceNumber} onChange={e => setDraft({ ...draft, invoiceNumber: e.target.value })} placeholder="INV-2024-001" /></label>
          <label className="field full">Supplier<select name="supplierId" required value={draft.supplierId} onChange={e => setDraft({ ...draft, supplierId: e.target.value })}>
            <option value="">Select a supplier</option>
            {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
          <label className="field full">Amount (minor units)<input name="amountMinor" type="number" min="1" required value={draft.amountMinor} onChange={e => setDraft({ ...draft, amountMinor: e.target.value })} placeholder="1000000" /></label>
          <label className="field full">Currency<select name="currency" value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}>
            <option>USDC</option><option>EUR</option><option>USD</option><option>GBP</option>
          </select></label>
          <label className="field full">Mint address<input name="mint" value={draft.mint} onChange={e => setDraft({ ...draft, mint: e.target.value })} placeholder="USDC mint (optional)" /></label>
          <label className="field full">Issue date<input name="issueDate" type="date" required value={draft.issueDate} onChange={e => setDraft({ ...draft, issueDate: e.target.value })} /></label>
          <label className="field full">Due date<input name="dueDate" type="date" required value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></label>
          <label className="field full">Document ref<input name="documentRef" value={draft.documentRef} onChange={e => setDraft({ ...draft, documentRef: e.target.value })} placeholder="IPFS hash or document ID" /></label>
          <label className="field full">Notes<textarea name="notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional notes" /></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn primary" disabled={loading}>Register invoice</button>
        </div>
      </form>
    </Modal>}

    {detail && <Modal title={`Invoice ${detail.invoiceNumber}`} description={suppliers?.find((s) => s.id === detail.supplierId)?.name} onClose={() => setDetailId(null)} wide>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><small style={{ color: '#6b7280' }}>Amount</small><div><b>{formatMinor(detail.amountMinor, detail.currency)} {detail.currency}</b></div></div>
          <div><small style={{ color: '#6b7280' }}>Status</small><div><Status>{detail.status}</Status></div></div>
          <div><small style={{ color: '#6b7280' }}>Issue date</small><div>{detail.issueDate}</div></div>
          <div><small style={{ color: '#6b7280' }}>Due date</small><div>{detail.dueDate}</div></div>
          <div><small style={{ color: '#6b7280' }}>Mint</small><div style={{ fontSize: 12 }}>{detail.mint || '—'}</div></div>
          <div><small style={{ color: '#6b7280' }}>Document ref</small><div style={{ fontSize: 12 }}>{detail.documentRef || '—'}</div></div>
        </div>

        {detail.notes && <div><small style={{ color: '#6b7280' }}>Notes</small><div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{detail.notes}</div></div>}

        <div>
          <small style={{ color: '#6b7280' }}>Timeline</small>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 6 }}>
            <li style={{ fontSize: 13 }}><b>Registered</b> — {detail.createdAt}</li>
            {detail.attestedAt && <li style={{ fontSize: 13 }}><b>Attested</b> — {detail.attestedAt}</li>}
            {detail.status === 'disputed' && <li style={{ fontSize: 13 }}><b>Disputed</b> — {detail.updatedAt}</li>}
            {detail.status === 'paid' && <li style={{ fontSize: 13 }}><b>Paid</b> — {detail.updatedAt}</li>}
          </ul>
        </div>

        <div>
          <small style={{ color: '#6b7280' }}>Document</small>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {detail.documentPath
              ? <button className="btn secondary" onClick={() => handleViewDocument(detail.id)} disabled={loading}>View document</button>
              : <span style={{ fontSize: 13, color: '#6b7280' }}>No document uploaded</span>}
            <label className="btn secondary" style={{ cursor: 'pointer' }}>
              Upload document
              <input type="file" accept="application/pdf,image/png,image/jpeg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(detail.id, f); e.currentTarget.value = '' }} />
            </label>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>PDF, PNG or JPEG, up to 10MB.</div>
        </div>

        <div className="modal-actions">
          {detail.status === 'open' && <button className="btn primary" onClick={() => handleAction(detail.id, 'attest')} disabled={loading}>Attest delivery</button>}
          {detail.status === 'open' && <button className="btn secondary" onClick={() => handleAction(detail.id, 'dispute')} disabled={loading}>Dispute</button>}
          <button className="btn secondary" onClick={() => setDetailId(null)}>Close</button>
        </div>
      </div>
    </Modal>}
  </>
}