import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { validatePayoutWallet } from '@airlock/shared/registry'
import { registryEngine } from '../engines/registry/index'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import { RegistryPortError } from '../engines/registry/types'

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
  } catch { return amount }
}

export function Suppliers({ notify }: { notify: (message: string) => void }) {
  const [suppliers, setSuppliers] = useState<import('../engines/registry/types').Supplier[] | null>(null)
  const [invoices, setInvoices] = useState<import('../engines/registry/types').Invoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; payoutWallet: string; businessEmail: string; category: string; notes: string }>({
    name: '', payoutWallet: '', businessEmail: '', category: '', notes: ''
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'unverified' | 'review_required' | 'verified'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const [data, invData] = await Promise.all([registryEngine.suppliers.list(), registryEngine.invoices.list()])
      setSuppliers(data)
      setInvoices(invData)
    } catch (err) {
      if (err instanceof RegistryPortError) {
        setError(`${err.code}: ${err.message}`)
        notify(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
        notify(String(err))
      }
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const d = Object.fromEntries(new FormData(form))
    const wallet = String(d.payoutWallet)
    if (!validatePayoutWallet(wallet)) {
      setError('Payout wallet must decode to exactly 32 bytes')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const created = await registryEngine.suppliers.create({
        name: String(d.name),
        payoutWallet: wallet,
        businessEmail: String(d.businessEmail) || undefined,
        category: String(d.category) || undefined,
        notes: String(d.notes) || undefined,
      })
      setSuppliers(prev => prev === null ? [created] : [...prev, created])
      setOpen(false)
      setDraft({ name: '', payoutWallet: '', businessEmail: '', category: '', notes: '' })
      notify(`Supplier ${created.name} created`)
    } catch (err) {
      if (err instanceof RegistryPortError) {
        setError(`${err.code}: ${err.message}`)
        notify(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
        notify(String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const id = editId!
    const form = e.currentTarget
    const d = Object.fromEntries(new FormData(form))
    const wallet = String(d.payoutWallet)
    if (!validatePayoutWallet(wallet)) {
      setError('Payout wallet must decode to exactly 32 bytes')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const updated = await registryEngine.suppliers.update(id, {
        name: String(d.name),
        payoutWallet: wallet,
        businessEmail: String(d.businessEmail) || undefined,
        category: String(d.category) || undefined,
        notes: String(d.notes) || undefined,
      })
      setSuppliers(prev => prev === null ? [] : prev.map((s) => s.id === id ? updated : s))
      setEditId(null)
      setDraft({ name: '', payoutWallet: '', businessEmail: '', category: '', notes: '' })
      notify(`Supplier ${updated.name} updated`)
      const prev = suppliers?.find((s) => s.id === id)
      if (prev && prev.verificationStatus === 'verified' && updated.verificationStatus !== 'verified') {
        setNotice('Payout wallet changed: verification reset')
        setTimeout(() => setNotice(null), 5000)
      }
    } catch (err) {
      if (err instanceof RegistryPortError) {
        setError(`${err.code}: ${err.message}`)
        notify(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
        notify(String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const verified = await registryEngine.suppliers.verify(id)
      setSuppliers(prev => prev === null ? [] : prev.map((s) => s.id === id ? verified : s))
      setNotice(null)
      notify(`Supplier ${verified.name} verified`)
    } catch (err) {
      if (err instanceof RegistryPortError) {
        setError(`${err.code}: ${err.message}`)
        notify(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
        notify(String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers?.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.verificationStatus === statusFilter
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.businessEmail?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    return matchesStatus && matchesSearch
  })

  const panels = []
  if (open) panels.push(<Modal key="create" title="Create supplier" description="Add a new verified supplier with payout wallet and contact details." onClose={() => setOpen(false)}><form onSubmit={handleCreate}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label className="field">Supplier name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Acme Logistics Ltd" /></label>
          <label className="field">Payout wallet (Solana)<input name="payoutWallet" required value={draft.payoutWallet} onChange={e => setDraft({ ...draft, payoutWallet: e.target.value })} placeholder="7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9" /><small className="field-note">Must be base58, 32 bytes when decoded, 32-44 chars</small></label>
          <label className="field">Business email<input name="businessEmail" type="email" value={draft.businessEmail} onChange={e => setDraft({ ...draft, businessEmail: e.target.value })} placeholder="billing@acme.example" /></label>
          <label className="field">Category<input name="category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="Freight, SaaS, Marketing" /></label>
          <label className="field full" style={{ gridColumn: 'span 2' }}>Notes<textarea name="notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional notes" /></label>
        </div><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" disabled={loading}>Create supplier</button></div></form></Modal>)
  if (editId !== null) panels.push(<Modal key="edit" title="Edit supplier" description="Update supplier details and payout wallet. Changing the payout wallet resets verification." onClose={() => { setEditId(null); setDraft({ name: '', payoutWallet: '', businessEmail: '', category: '', notes: '' }); }}><form onSubmit={handleEdit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label className="field">Supplier name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Acme Logistics Ltd" /></label>
          <label className="field">Payout wallet (Solana)<input name="payoutWallet" required value={draft.payoutWallet} onChange={e => setDraft({ ...draft, payoutWallet: e.target.value })} placeholder="7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9" /><small className="field-note">Must be base58, 32 bytes when decoded, 32-44 chars</small></label>
          <label className="field">Business email<input name="businessEmail" type="email" value={draft.businessEmail} onChange={e => setDraft({ ...draft, businessEmail: e.target.value })} placeholder="billing@acme.example" /></label>
          <label className="field">Category<input name="category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="Freight, SaaS, Marketing" /></label>
          <label className="field full" style={{ gridColumn: 'span 2' }}>Notes<textarea name="notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional notes" /></label>
        </div><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => { setEditId(null); setDraft({ name: '', payoutWallet: '', businessEmail: '', category: '', notes: '' }); }}>Cancel</button><button className="btn primary" disabled={loading}>Update supplier</button></div></form></Modal>)
  if (notice !== null) panels.push(<div key="notice" style={{ padding: 16, background: '#fff4dd', border: '1px solid #f0d5a5', borderRadius: 8, marginBottom: 16 }}><strong>Notice:</strong> {notice}<div style={{ marginTop: 8, fontSize: 12, color: '#856404' }}>Payout wallet changed: verification reset.</div></div>)
  const detailSupplier = detailId ? suppliers?.find((s) => s.id === detailId) ?? null : null
  const detailInvoices = detailSupplier ? (invoices ?? []).filter((i) => i.supplierId === detailId) : []

  if (detailSupplier !== null) panels.push(<Modal key="detail" title={`Supplier ${detailSupplier.name}`} onClose={() => setDetailId(null)} wide><div style={{ padding: 16, display: 'grid', gap: 12 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div><small style={{ color: '#6b7280' }}>Name</small><div>{detailSupplier.name}</div></div>
      <div><small style={{ color: '#6b7280' }}>Payout wallet</small><div style={{ fontSize: 12, wordBreak: 'break-all' }}>{detailSupplier.payoutWallet}</div></div>
      <div><small style={{ color: '#6b7280' }}>Business email</small><div>{detailSupplier.businessEmail || '—'}</div></div>
      <div><small style={{ color: '#6b7280' }}>Category</small><div>{detailSupplier.category || '—'}</div></div>
      <div><small style={{ color: '#6b7280' }}>Verification</small><div><Status>{detailSupplier.verificationStatus}</Status></div></div>
      <div><small style={{ color: '#6b7280' }}>Notes</small><div style={{ whiteSpace: 'pre-wrap' }}>{detailSupplier.notes || '—'}</div></div>
    </div>
    <div><small style={{ color: '#6b7280' }}>Audit trail</small><ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}><li style={{ fontSize: 13 }}>{detailSupplier.verifiedAt ? `Verified on ${detailSupplier.verifiedAt} by ${detailSupplier.verifiedBy || 'system'}` : 'Not yet verified'}</li><li style={{ fontSize: 13 }}>{detailSupplier.notes ? `Notes: ${detailSupplier.notes}` : 'No notes'}</li></ul></div>
    <div><small style={{ color: '#6b7280' }}>Invoices ({detailInvoices.length})</small>{detailInvoices.length === 0 ? <div style={{ fontSize: 12, color: '#6b7280' }}>No invoices for this supplier.</div> : <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>{detailInvoices.map((i) => <li key={i.id} style={{ fontSize: 12 }}>{i.invoiceNumber} — {formatMinor(i.amountMinor, i.currency)} {i.currency} — {i.status}</li>)}</ul>}</div>
    <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => setDetailId(null)}>Close</button>
  </div></Modal>)

  return <>
    <PageHeading title="Suppliers" description="Manage your verified payment counterparties, payout wallets and verification status." action="Add supplier" onAction={() => setOpen(true)} />
    <div className="panel">
      <div className="panel-head"><div><h2>Supplier directory</h2><p>{filteredSuppliers?.length ?? 0} suppliers</p></div></div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div className="table-scroll">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Name</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Category</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Payout wallet</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Verification</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers?.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, fontSize: 14 }}><b>{s.name}</b><br/><span style={{ fontSize: 12, color: '#6b7280' }}>{s.businessEmail || '—'}</span></td>
                  <td style={{ padding: 10, fontSize: 14 }}>{s.category || '—'}</td>
                  <td style={{ padding: 10, fontSize: 14 }}><code style={{ fontSize: 11, color: '#6b7280' }}>{s.payoutWallet.slice(0, 6)}...{s.payoutWallet.slice(-4)}</code></td>
                  <td style={{ padding: 10, fontSize: 14 }}><Status>{s.verificationStatus}</Status></td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    {s.verificationStatus === 'unverified' && <button className="btn primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleVerify(s.id)}>Verify</button>}
                    {s.verificationStatus === 'unverified' && <button className="btn secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setDetailId(s.id)}>Details</button>}
                    {s.verificationStatus !== 'unverified' && <button className="btn secondary" style={{ fontSize: 12, padding: '4px 10px' }} disabled>Verified</button>}
                    {s.verificationStatus !== 'unverified' && editId !== s.id && <button className="btn secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditId(s.id); setDraft({ name: s.name, payoutWallet: s.payoutWallet, businessEmail: s.businessEmail || '', category: s.category || '', notes: s.notes || '' }); }}>Edit</button>}
                    {editId !== s.id && <button className="btn secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setDetailId(s.id)}>Details</button>}
                    {editId === s.id && <button className="btn danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setEditId(null); setDraft({ name: '', payoutWallet: '', businessEmail: '', category: '', notes: '' }); }}>Cancel</button>}
                  </td>
                </tr>
              ))}
              {(!suppliers || suppliers.length === 0) && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No suppliers yet. Add your first supplier to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    {panels}
  </>
}