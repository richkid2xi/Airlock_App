import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { registryEngine } from '../engines/registry/index'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import { RegistryPortError, type Invoice, type Supplier } from '../engines/registry/types'

export function Invoices({ notify }: { notify: (m: string) => void }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<{ invoiceNumber: string; supplierId: string; payeeWallet: string; amountMinor: string; currency: string; mint: string; issueDate: string; dueDate: string; documentRef: string; notes: string }>({
    invoiceNumber: '', supplierId: '', payeeWallet: '', amountMinor: '', currency: 'USDC', mint: '', issueDate: '', dueDate: '', documentRef: '', notes: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invData, supData] = await Promise.all([registryEngine.invoices.list(), registryEngine.suppliers.list()])
      setInvoices(invData)
      setSuppliers(supData)
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
      const created = await registryEngine.invoices.create({
        invoiceNumber: String(d.invoiceNumber),
        supplierId: String(d.supplierId),
        payeeWallet: String(d.payeeWallet),
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
      setDraft({ invoiceNumber: '', supplierId: '', payeeWallet: '', amountMinor: '', currency: 'USDC', mint: '', issueDate: '', dueDate: '', documentRef: '', notes: '' })
      notify(`Invoice ${created.invoiceNumber} registered`)
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

  const handleAction = async (id: string, action: 'attest' | 'dispute') => {
    setLoading(true)
    setError(null)
    try {
      const updated = action === 'attest' ? await registryEngine.invoices.attest(id) : await registryEngine.invoices.dispute(id)
      setInvoices(prev => prev === null ? [] : prev.map((i: Invoice) => i.id === id ? updated : i))
      notify(`Invoice ${updated.invoiceNumber} ${action === 'attest' ? 'attested' : 'disputed'}`)
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

  const formatMinor = (amount: string, currency: string) => {
    try {
      const dec = currency === 'USDC' ? 6 : 2
      const big = BigInt(amount)
      const neg = big < 0
      const abs = neg ? -big : big
      const whole = (abs / BigInt(10 ** dec)).toString()
      const frac = (abs % BigInt(10 ** dec)).toString().padStart(dec, '0')
      return `${neg ? '-' : ''}${whole}.${frac}`
    } catch { return amount }
  }

  if (loading) return <div className="panel"><div className="panel-head"><div><h1>Invoices</h1><p>Register, attest, and dispute supplier invoices.</p></div></div><div style={{ padding: 24, textAlign: 'center' }}>Loading invoices…</div></div>
  if (error) return <div className="panel"><div className="panel-head"><div><h1>Invoices</h1><p>Register, attest, and dispute supplier invoices.</p></div></div><div style={{ padding: 24, color: '#ef4444' }}>{error}</div></div>

  return <>
    <PageHeading title="Invoices" description="Register incoming supplier invoices. Attest when goods or services are confirmed delivered; dispute when something is wrong." action="Register invoice" onAction={() => setOpen(true)}/>
    <div className="panel">
      <div className="panel-head"><div><h2>Invoice register</h2><p>{invoices?.length ?? 0} invoices</p></div></div>
      <div style={{ padding: '16px 18px 18px' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
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
            {invoices?.map((i: Invoice) => {
              const sup = suppliers?.find((s: Supplier) => s.id === i.supplierId)
              return (
                <tr key={i.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, fontSize: 14 }}><b>{i.invoiceNumber}</b></td>
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
            {(!invoices || invoices.length === 0) && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No invoices yet. Register your first invoice.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
    {open && <Modal title="Register invoice" description="Create a new invoice record linked to a verified supplier. Amounts are in minor units (e.g. USDC = 6 decimals)." onClose={() => setOpen(false)}>
      <form onSubmit={handleCreate}>
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field full">Invoice number<input name="invoiceNumber" required value={draft.invoiceNumber} onChange={e => setDraft({ ...draft, invoiceNumber: e.target.value })} placeholder="INV-2024-001"/></label>
          <label className="field full">Supplier<select name="supplierId" required value={draft.supplierId} onChange={e => setDraft({ ...draft, supplierId: e.target.value })}>
            <option value="">Select a supplier</option>
            {suppliers?.map((s: Supplier) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
          <label className="field full">Payee wallet (Solana)<input name="payeeWallet" required value={draft.payeeWallet} onChange={e => setDraft({ ...draft, payeeWallet: e.target.value })} placeholder="4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"/></label>
          <label className="field full">Amount (minor units)<input name="amountMinor" type="number" min="1" required value={draft.amountMinor} onChange={e => setDraft({ ...draft, amountMinor: e.target.value })} placeholder="1000000"/></label>
          <label className="field full">Currency<select name="currency" value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}>
            <option>USDC</option><option>EUR</option><option>USD</option><option>GBP</option>
          </select></label>
          <label className="field full">Mint address<input name="mint" value={draft.mint} onChange={e => setDraft({ ...draft, mint: e.target.value })} placeholder="USDC mint (optional)"/></label>
          <label className="field full">Issue date<input name="issueDate" type="date" required value={draft.issueDate} onChange={e => setDraft({ ...draft, issueDate: e.target.value })}/></label>
          <label className="field full">Due date<input name="dueDate" type="date" required value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })}/></label>
          <label className="field full">Document ref<input name="documentRef" value={draft.documentRef} onChange={e => setDraft({ ...draft, documentRef: e.target.value })} placeholder="IPFS hash or document ID"/></label>
          <label className="field full">Notes<textarea name="notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional notes"/></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn primary" disabled={loading}>Register invoice</button>
        </div>
      </form>
    </Modal>}
  </>
}