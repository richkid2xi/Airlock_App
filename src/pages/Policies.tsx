import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { registryEngine } from '../engines/registry/index'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import { RegistryPortError, type Policy, type Agent } from '../engines/registry/types'

export function Policies({ path, navigate, notify }: { path: string; navigate: (p: string) => void; notify: (m: string) => void }) {
  const [policies, setPolicies] = useState<Policy[] | null>(null)
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; description: string; maxInvoiceMinor: string; dailyCapMinor: string; controls: any; agentIds: string[] }>({
    name: '', description: '', maxInvoiceMinor: '', dailyCapMinor: '', controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false }, agentIds: []
  })
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pols, ags] = await Promise.all([registryEngine.policies.list(), registryEngine.agents.list()])
      setPolicies(pols)
      setAgents(ags)
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
    const max = String(d.maxInvoiceMinor)
    const daily = String(d.dailyCapMinor)
    try {
      BigInt(max)
      BigInt(daily)
    } catch {
      setError('Limits must be valid integer amounts')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const created = await registryEngine.policies.create({
        name: String(d.name),
        description: String(d.description) || undefined,
        maxInvoiceMinor: max,
        dailyCapMinor: daily,
        controls: {
          requireVerifiedSupplier: String(d.requireVerifiedSupplier) === 'on',
          requireDeliveryAttestation: String(d.requireDeliveryAttestation) === 'on',
          requireAgentIntent: String(d.requireAgentIntent) === 'on',
          requireSupportingEvidence: String(d.requireSupportingEvidence) === 'on',
          requireTwoPersonApproval: String(d.requireTwoPersonApproval) === 'on',
        },
        status: 'active',
        agentIds: d.agentIds ? [String(d.agentIds)] : [],
      })
      setPolicies(prev => prev === null ? [created] : [created, ...prev])
      setOpen(false)
      setDraft({ name: '', description: '', maxInvoiceMinor: '', dailyCapMinor: '', controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false }, agentIds: [] })
      notify(`Policy ${created.name} created`)
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
    const max = String(d.maxInvoiceMinor)
    const daily = String(d.dailyCapMinor)
    try {
      BigInt(max)
      BigInt(daily)
    } catch {
      setError('Limits must be valid integer amounts')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const updated = await registryEngine.policies.update(id, {
        name: String(d.name),
        description: String(d.description) || undefined,
        maxInvoiceMinor: max || undefined,
        dailyCapMinor: daily || undefined,
        controls: {
          requireVerifiedSupplier: String(d.requireVerifiedSupplier) === 'on',
          requireDeliveryAttestation: String(d.requireDeliveryAttestation) === 'on',
          requireAgentIntent: String(d.requireAgentIntent) === 'on',
          requireSupportingEvidence: String(d.requireSupportingEvidence) === 'on',
          requireTwoPersonApproval: String(d.requireTwoPersonApproval) === 'on',
        },
      })
      setPolicies(prev => prev === null ? [] : prev.map((p) => p.id === id ? updated : p))
      await registryEngine.policies.assignAgents(id, d.agentIds ? [String(d.agentIds)] : [])
      setEditId(null)
      setDraft({ name: '', description: '', maxInvoiceMinor: '', dailyCapMinor: '', controls: { requireVerifiedSupplier: false, requireDeliveryAttestation: false, requireAgentIntent: false, requireSupportingEvidence: false, requireTwoPersonApproval: false }, agentIds: [] })
      notify(`Policy ${updated.name} updated`)
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

  const filteredPolicies = policies?.filter((p) => {
    const q = searchQuery.toLowerCase()
    return q === '' || p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false)
  })

  const detailPolicy = detailId ? policies?.find((p) => p.id === detailId) ?? null : null

  if (loading && !policies) return <div className="panel"><div className="panel-head"><div><h1>Policies</h1><p>Create and assign the controls every agent-initiated payment must satisfy.</p></div></div><div style={{ padding: 24, textAlign: 'center' }}>Loading policies...</div></div>
  if (error) return <div className="panel"><div className="panel-head"><div><h1>Policies</h1><p>Create and assign the controls every agent-initiated payment must satisfy.</p></div></div><div style={{ padding: 24, color: '#ef4444' }}>{error}</div></div>

  const activeControls = (p: Policy) => Object.values(p.controls).filter(Boolean).length

  return <>
    <PageHeading title="Policies" description="Create and assign the controls every agent-initiated payment must satisfy." action="Create policy" onAction={() => setOpen(true)} />
    {error && <div style={{ padding: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>}
    <div className="panel">
      <div className="panel-head"><div><h2>Policies</h2><p>{filteredPolicies?.length ?? 0} policies</p></div></div>
      <div style={{ padding: '12px 18px' }}>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search policies" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 12 }} />
        <div className="table-scroll">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Name</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Description</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: '#6b7280' }}>Max invoice</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: '#6b7280' }}>Daily cap</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Controls</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies?.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, fontSize: 14 }}><b>{p.name}</b></td>
                  <td style={{ padding: 10, fontSize: 14 }}>{p.description || '—'}</td>
                  <td style={{ padding: 10, fontSize: 14 }}>{p.maxInvoiceMinor}</td>
                  <td style={{ padding: 10, fontSize: 14 }}>{p.dailyCapMinor}</td>
                  <td style={{ padding: 10, fontSize: 14 }}>{activeControls(p)} active</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button className="btn secondary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => { setEditId(p.id); setDraft({ name: p.name, description: p.description || '', maxInvoiceMinor: p.maxInvoiceMinor, dailyCapMinor: p.dailyCapMinor, controls: { ...p.controls }, agentIds: [] }); }}>Edit</button>
                    <button className="btn primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => navigate(`/app/policies/${p.id}`)}>Details</button>
                  </td>
                </tr>
              ))}
              {(!filteredPolicies || filteredPolicies.length === 0) && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No policies yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {detailPolicy && <Modal title={`Policy ${detailPolicy.name}`} description={detailPolicy.description ?? undefined} onClose={() => setDetailId(null)} wide>
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div><b>Status:</b> {detailPolicy.status}</div>
        <div><b>Max invoice:</b> {detailPolicy.maxInvoiceMinor}</div>
        <div><b>Daily cap:</b> {detailPolicy.dailyCapMinor}</div>
        <div><b>Active controls:</b> {Object.values(detailPolicy.controls).filter(Boolean).length}</div>
        <div className="modal-actions"><button className="btn secondary" onClick={() => setDetailId(null)}>Close</button></div>
      </div>
    </Modal>}

    {open && <Modal title="Create policy" description="Define spending limits and controls that agents must follow when initiating payments." onClose={() => setOpen(false)}>
      <form onSubmit={handleCreate}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field">Policy name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Standard spend policy"/></label>
          <label className="field">Description<textarea name="description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Optional description"/></label>
          <label className="field">Max invoice (minor units)<input name="maxInvoiceMinor" type="number" min="1" required value={draft.maxInvoiceMinor} onChange={e => setDraft({ ...draft, maxInvoiceMinor: e.target.value })} placeholder="100000"/></label>
          <label className="field">Daily cap (minor units)<input name="dailyCapMinor" type="number" min="1" required value={draft.dailyCapMinor} onChange={e => setDraft({ ...draft, dailyCapMinor: e.target.value })} placeholder="1000000"/></label>
          <div style={{ gridColumn: 'span 2' }}><small style={{ color: '#6b7280' }}>Amounts in minor units (e.g. USDC = 6 decimals)</small></div>
          <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Controls (each agent payment must satisfy all enabled controls):</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireVerifiedSupplier" type="checkbox" defaultChecked={draft.controls.requireVerifiedSupplier} /> Verified supplier required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireDeliveryAttestation" type="checkbox" defaultChecked={draft.controls.requireDeliveryAttestation} /> Delivery attestation required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireAgentIntent" type="checkbox" defaultChecked={draft.controls.requireAgentIntent} /> Agent intent required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireSupportingEvidence" type="checkbox" defaultChecked={draft.controls.requireSupportingEvidence} /> Supporting evidence required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireTwoPersonApproval" type="checkbox" defaultChecked={draft.controls.requireTwoPersonApproval} /> Two-person approval required</label>
          <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Assign agents:</div>
          <label className="field.full" style={{ gridColumn: 'span 2' }}><select name="agentIds" multiple value={draft.agentIds.join(',')} onChange={e => setDraft({ ...draft, agentIds: Array.from(e.target.selectedOptions, o => o.value) })}>
            {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn primary" disabled={loading}>Create policy</button>
        </div>
      </form>
    </Modal>}

    {editId !== null && <Modal title="Edit policy" description="Update spending limits and controls." onClose={() => setEditId(null)}>
      <form onSubmit={handleEdit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field">Policy name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Standard spend policy"/></label>
          <label className="field">Description<textarea name="description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Optional description"/></label>
          <label className="field">Max invoice (minor units)<input name="maxInvoiceMinor" type="number" min="1" required value={draft.maxInvoiceMinor} onChange={e => setDraft({ ...draft, maxInvoiceMinor: e.target.value })} placeholder="100000"/></label>
          <label className="field">Daily cap (minor units)<input name="dailyCapMinor" type="number" min="1" required value={draft.dailyCapMinor} onChange={e => setDraft({ ...draft, dailyCapMinor: e.target.value })} placeholder="1000000"/></label>
          <div style={{ gridColumn: 'span 2' }}><small style={{ color: '#6b7280' }}>Amounts in minor units (e.g. USDC = 6 decimals)</small></div>
          <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Controls:</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireVerifiedSupplier" type="checkbox" defaultChecked={draft.controls.requireVerifiedSupplier} /> Verified supplier required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireDeliveryAttestation" type="checkbox" defaultChecked={draft.controls.requireDeliveryAttestation} /> Delivery attestation required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireAgentIntent" type="checkbox" defaultChecked={draft.controls.requireAgentIntent} /> Agent intent required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireSupportingEvidence" type="checkbox" defaultChecked={draft.controls.requireSupportingEvidence} /> Supporting evidence required</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><input name="requireTwoPersonApproval" type="checkbox" defaultChecked={draft.controls.requireTwoPersonApproval} /> Two-person approval required</label>
          <div style={{ gridColumn: 'span 2', fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Assign agents:</div>
          <label className="field.full" style={{ gridColumn: 'span 2' }}><select name="agentIds" multiple value={draft.agentIds.join(',')} onChange={e => setDraft({ ...draft, agentIds: Array.from(e.target.selectedOptions, o => o.value) })}>
            {agents?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => setEditId(null)}>Cancel</button>
          <button className="btn primary" disabled={loading}>Update policy</button>
        </div>
      </form>
    </Modal>}
  </>
}