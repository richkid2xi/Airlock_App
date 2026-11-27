import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { registryEngine } from '../engines/registry/index'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import { RegistryPortError, type Supplier } from '../engines/registry/types'

export function Suppliers({ notify }: { notify: (m: string) => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<{ name: string; payoutWallet: string; businessEmail: string; category: string; notes: string }>({
    name: '', payoutWallet: '', businessEmail: '', category: '', notes: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await registryEngine.suppliers.list()
      setSuppliers(data)
    } catch (err) {
      if (err instanceof RegistryPortError) {
        setError(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
      }
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
      const created = await registryEngine.suppliers.create({
        name: String(d.name),
        payoutWallet: String(d.payoutWallet),
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
      } else {
        setError(String(err))
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
      setSuppliers(prev => prev === null ? [] : prev.map((s: Supplier) => s.id === id ? verified : s))
      notify(`Supplier ${verified.name} verified`)
    } catch (err) {
      if (err instanceof RegistryPortError) {
        setError(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="panel"><div className="panel-head"><div><h1>Suppliers</h1><p>Manage your verified payment counterparties.</p></div></div><div style={{ padding: 24, textAlign: 'center' }}>Loading suppliers…</div></div>
  if (error) return <div className="panel"><div className="panel-head"><div><h1>Suppliers</h1><p>Manage your verified payment counterparties.</p></div></div><div style={{ padding: 24, color: '#ef4444' }}>{error}</div></div>

  return <>
    <PageHeading title="Suppliers" description="Create and verify the suppliers your agents pay. Payout wallets are snapshotted on creation and cannot be changed without re-verification." action="Add supplier" onAction={() => setOpen(true)}/>
    <div className="panel">
      <div className="panel-head"><div><h2>Supplier directory</h2><p>{suppliers?.length ?? 0} registered suppliers</p></div></div>
      <div style={{ padding: '16px 18px 18px' }}>
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
            {suppliers?.map((s: Supplier) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 10, fontSize: 14 }}><b>{s.name}</b><br/><span style={{ fontSize: 12, color: '#6b7280' }}>{s.businessEmail || '—'}</span></td>
                <td style={{ padding: 10, fontSize: 14 }}>{s.category || '—'}</td>
                <td style={{ padding: 10, fontSize: 14 }}><code style={{ fontSize: 11, color: '#6b7280' }}>{s.payoutWallet.slice(0, 6)}…{s.payoutWallet.slice(-4)}</code></td>
                <td style={{ padding: 10, fontSize: 14 }}><Status>{s.verificationStatus}</Status></td>
                <td style={{ padding: 10, textAlign: 'right' }}>
                  {s.verificationStatus === 'unverified' && <button className="btn primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleVerify(s.id)}>Verify</button>}
                  {s.verificationStatus !== 'unverified' && <button className="btn secondary" style={{ fontSize: 12, padding: '4px 10px' }} disabled>Verified</button>}
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No suppliers yet. Add your first supplier to get started.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
    {open && <Modal title="Create supplier" description="Enter the supplier details and Solana payout wallet. The wallet is snapshotted and pinned on first verification." onClose={() => setOpen(false)}>
      <form onSubmit={handleCreate}>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field full">Supplier name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Acme Logistics Ltd"/></label>
          <label className="field full">Payout wallet (Solana)<input name="payoutWallet" required value={draft.payoutWallet} onChange={e => setDraft({ ...draft, payoutWallet: e.target.value })} placeholder="7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9"/></label>
          <label className="field full">Business email<input name="businessEmail" type="email" value={draft.businessEmail} onChange={e => setDraft({ ...draft, businessEmail: e.target.value })} placeholder="billing@acme.example"/></label>
          <label className="field full">Category<input name="category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="Freight, SaaS, Marketing"/></label>
          <label className="field full">Notes<textarea name="notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional notes about this supplier"/></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn primary" disabled={loading}>Create supplier</button>
        </div>
      </form>
    </Modal>}
  </>
}