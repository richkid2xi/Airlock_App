import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { registryEngine } from '../engines/registry/index'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import { RegistryPortError, type Agent, type Policy } from '../engines/registry/types'

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

export function Agents({ notify }: { notify: (m: string) => void }) {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [policies, setPolicies] = useState<Policy[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ name: string; identifier: string; description: string; status: string; perRequestLimitMinor: string; dailyLimitMinor: string; currency: string; policyIds: string[] }>({
    name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: []
  })
  const [limitErrors, setLimitErrors] = useState<{ perRequest?: string; daily?: string }>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agentData, policyData] = await Promise.all([registryEngine.agents.list(), registryEngine.policies.list()])
      setAgents(agentData)
      setPolicies(policyData)
    } catch (err) {
      if (err instanceof RegistryPortError) setError(`${err.code}: ${err.message}`)
      else setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const validateLimits = (perReq: string, daily: string) => {
    const errs: { perRequest?: string; daily?: string } = {}
    try { BigInt(perReq) } catch { errs.perRequest = 'Must be a valid integer' }
    try { BigInt(daily) } catch { errs.daily = 'Must be a valid integer' }
    if (!errs.perRequest && !errs.daily) {
      const per = BigInt(perReq)
      const day = BigInt(daily)
      if (per <= 0n) errs.perRequest = 'Per-request limit must be > 0'
      if (day < per) errs.daily = 'Daily limit must be >= per-request limit'
    }
    setLimitErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const d = Object.fromEntries(new FormData(form))
    const perReq = String(d.perRequestLimitMinor)
    const daily = String(d.dailyLimitMinor)
    if (!validateLimits(perReq, daily)) return
    const policyIds = d.policyIds ? String(d.policyIds).split(',').map(s => s.trim()).filter(Boolean) : []
    setLoading(true)
    setError(null)
    try {
      const created = await registryEngine.agents.create({
        name: String(d.name),
        identifier: String(d.identifier),
        description: String(d.description) || undefined,
        status: String(d.status) as any,
        perRequestLimitMinor: perReq,
        dailyLimitMinor: daily,
        currency: String(d.currency) as any,
        policyIds,
      })
      setAgents(prev => prev === null ? [created] : [...prev, created])
      setOpen(false)
      setDraft({ name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: [] })
      setLimitErrors({})
      notify(`Agent ${created.name} created`)
    } catch (err) {
      if (err instanceof RegistryPortError) { setError(`${err.code}: ${err.message}`); notify(`${err.code}: ${err.message}`) }
      else { setError(String(err)); notify(String(err)) }
    } finally { setLoading(false) }
  }

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const id = editId!
    const form = e.currentTarget
    const d = Object.fromEntries(new FormData(form))
    const perReq = String(d.perRequestLimitMinor)
    const daily = String(d.dailyLimitMinor)
    if (!validateLimits(perReq, daily)) return
    const policyIds = d.policyIds ? String(d.policyIds).split(',').map(s => s.trim()).filter(Boolean) : []
    setLoading(true)
    setError(null)
    try {
      const updated = await registryEngine.agents.update(id, {
        name: String(d.name),
        description: String(d.description) || undefined,
        status: String(d.status) as any,
        perRequestLimitMinor: perReq,
        dailyLimitMinor: daily,
        currency: String(d.currency) as any,
      })
      await registryEngine.policies.assignAgents(id, policyIds)
      setAgents(prev => prev === null ? [] : prev.map((a) => a.id === id ? updated : a))
      setEditId(null)
      setDraft({ name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: [] })
      setLimitErrors({})
      notify(`Agent ${updated.name} updated`)
    } catch (err) {
      if (err instanceof RegistryPortError) { setError(`${err.code}: ${err.message}`); notify(`${err.code}: ${err.message}`) }
      else { setError(String(err)); notify(String(err)) }
    } finally { setLoading(false) }
  }

  const handleSetStatus = async (id: string, status: string) => {
    setLoading(true)
    setError(null)
    try {
      const updated = await registryEngine.agents.setStatus(id, status as any)
      setAgents(prev => prev === null ? [] : prev.map((a) => a.id === id ? updated : a))
      notify(`Agent ${updated.name} ${status}`)
    } catch (err) {
      if (err instanceof RegistryPortError) { setError(`${err.code}: ${err.message}`); notify(`${err.code}: ${err.message}`) }
      else { setError(String(err)); notify(String(err)) }
    } finally { setLoading(false) }
  }

  const handleSetLimits = async (id: string, perRequestLimitMinor: string, dailyLimitMinor: string) => {
    if (!validateLimits(perRequestLimitMinor, dailyLimitMinor)) return
    setLoading(true)
    setError(null)
    try {
      const updated = await registryEngine.agents.setLimits(id, perRequestLimitMinor, dailyLimitMinor)
      setAgents(prev => prev === null ? [] : prev.map((a) => a.id === id ? updated : a))
      notify(`Agent ${updated.name} limits updated`)
    } catch (err) {
      if (err instanceof RegistryPortError) { setError(`${err.code}: ${err.message}`); notify(`${err.code}: ${err.message}`) }
      else { setError(String(err)); notify(String(err)) }
    } finally { setLoading(false) }
  }

  if (loading && !agents) return <div className="panel"><div className="panel-head"><div><h1>AI Agents</h1><p>Create and manage agents that can initiate payments.</p></div></div><div style={{ padding: 24, textAlign: 'center' }}>Loading agents...</div></div>
  if (error) return <div className="panel"><div className="panel-head"><div><h1>AI Agents</h1><p>Create and manage agents that can initiate payments.</p></div></div><div style={{ padding: 24, color: '#ef4444' }}>{error}</div></div>

  return <>
    <PageHeading title="AI Agents" description="Create payment agents with spending limits and assign policies that govern what they can pay." action="Add agent" onAction={() => setOpen(true)} />
    {error && <div style={{ padding: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>}
    <div className="panel">
      <div className="panel-head"><div><h2>Agent directory</h2><p>{agents?.length ?? 0} agents</p></div></div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div className="table-scroll">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Name</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Identifier</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Limits</th>
                <th style={{ textAlign: 'left', padding: 8, fontSize: 12, color: '#6b7280' }}>Status</th>
                <th style={{ textAlign: 'right', padding: 8, fontSize: 12, color: '#6b7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents?.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, fontSize: 14 }}><b>{a.name}</b><br/><span style={{ fontSize: 12, color: '#6b7280' }}>{a.description || '—'}</span></td>
                  <td style={{ padding: 10, fontSize: 14 }}><code style={{ fontSize: 11 }}>{a.identifier}</code></td>
                  <td style={{ padding: 10, fontSize: 14 }}>{formatMinor(a.perRequestLimitMinor, a.currency)} per req · {formatMinor(a.dailyLimitMinor, a.currency)} daily</td>
                  <td style={{ padding: 10, fontSize: 14 }}><Status>{a.status}</Status></td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <button className="btn primary" style={{ fontSize: 11, padding: '3px 8px', marginRight: 4 }} onClick={() => handleSetStatus(a.id, a.status === 'active' ? 'disabled' : 'active')}>
                      {a.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => { setEditId(a.id); setDraft({ name: a.name, identifier: a.identifier, description: a.description || '', status: a.status, perRequestLimitMinor: a.perRequestLimitMinor, dailyLimitMinor: a.dailyLimitMinor, currency: a.currency, policyIds: [] }); }}>Edit</button>
                  </td>
                </tr>
              ))}
              {(!agents || agents.length === 0) && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>No agents yet. Add your first agent.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {open && <Modal title="Create AI agent" description="Set spending limits and assign payment policies. Limits are in minor units (USDC = 6 decimals)." onClose={() => { setOpen(false); setDraft({ name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: [] }); setLimitErrors({}) }}>
      <form onSubmit={handleCreate}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field full">Agent name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="AP Specialist Agent" /></label>
          <label className="field full">Identifier<input name="identifier" required value={draft.identifier} onChange={e => setDraft({ ...draft, identifier: e.target.value })} placeholder="ap-specialist-01" /></label>
          <label className="field full">Description<textarea name="description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="What this agent is authorized to do" /></label>
          <label className="field full">Per-request limit (minor units)<input name="perRequestLimitMinor" type="number" min="1" required value={draft.perRequestLimitMinor} onChange={e => setDraft({ ...draft, perRequestLimitMinor: e.target.value })} placeholder="1000000" />{limitErrors.perRequest && <span style={{ color: '#ef4444', fontSize: 11 }}>{limitErrors.perRequest}</span>}</label>
          <label className="field full">Daily limit (minor units)<input name="dailyLimitMinor" type="number" min="1" required value={draft.dailyLimitMinor} onChange={e => setDraft({ ...draft, dailyLimitMinor: e.target.value })} placeholder="50000000" />{limitErrors.daily && <span style={{ color: '#ef4444', fontSize: 11 }}>{limitErrors.daily}</span>}</label>
          <label className="field full">Currency<select name="currency" value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}><option>USDC</option><option>EUR</option><option>USD</option><option>GBP</option></select></label>
          <label className="field full">Status<select name="status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option>active</option><option>disabled</option></select></label>
          <label className="field full">Assign policies<select name="policyIds" multiple value={draft.policyIds.join(',')} onChange={e => setDraft({ ...draft, policyIds: Array.from(e.target.selectedOptions, (o) => o.value) })}>{policies?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><small style={{ color: '#6b7280' }}>(hold Ctrl/Cmd to select multiple)</small></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => { setOpen(false); setDraft({ name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: [] }); setLimitErrors({}) }}>Cancel</button>
          <button className="btn primary" disabled={loading}>Create agent</button>
        </div>
      </form>
    </Modal>}

    {editId !== null && <Modal title="Edit AI agent" description="Update agent details and spending limits." onClose={() => { setEditId(null); setDraft({ name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: [] }); setLimitErrors({}) }}>
      <form onSubmit={handleEdit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="field full">Agent name<input name="name" required value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="AP Specialist Agent" /></label>
          <label className="field full">Identifier<code style={{ display: 'block', fontSize: 11, marginTop: 4, color: '#6b7280' }}>{draft.identifier}</code></label>
          <label className="field full">Description<textarea name="description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="What this agent is authorized to do" /></label>
          <label className="field full">Per-request limit (minor units)<input name="perRequestLimitMinor" type="number" min="1" required value={draft.perRequestLimitMinor} onChange={e => setDraft({ ...draft, perRequestLimitMinor: e.target.value })} placeholder="1000000" />{limitErrors.perRequest && <span style={{ color: '#ef4444', fontSize: 11 }}>{limitErrors.perRequest}</span>}</label>
          <label className="field full">Daily limit (minor units)<input name="dailyLimitMinor" type="number" min="1" required value={draft.dailyLimitMinor} onChange={e => setDraft({ ...draft, dailyLimitMinor: e.target.value })} placeholder="50000000" />{limitErrors.daily && <span style={{ color: '#ef4444', fontSize: 11 }}>{limitErrors.daily}</span>}</label>
          <label className="field full">Currency<select name="currency" value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}><option>USDC</option><option>EUR</option><option>USD</option><option>GBP</option></select></label>
          <label className="field full">Status<select name="status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option>active</option><option>disabled</option></select></label>
          <label className="field full">Assign policies<select name="policyIds" multiple value={draft.policyIds.join(',')} onChange={e => setDraft({ ...draft, policyIds: Array.from(e.target.selectedOptions, (o) => o.value) })}>{policies?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><small style={{ color: '#6b7280' }}>(hold Ctrl/Cmd to select multiple)</small></label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={() => { setEditId(null); setDraft({ name: '', identifier: '', description: '', status: 'active', perRequestLimitMinor: '', dailyLimitMinor: '', currency: 'USDC', policyIds: [] }); setLimitErrors({}) }}>Cancel</button>
          <button className="btn primary" disabled={loading}>Update agent</button>
        </div>
      </form>
    </Modal>}
  </>
}