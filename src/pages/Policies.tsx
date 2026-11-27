import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { InProgress } from '../ui/InProgress'
import type { PolicyRecord } from '../domain/types'

export function Policies({ policies, setPolicies, agents, path, navigate, notify }: {
  policies: PolicyRecord[]
  setPolicies: (p: PolicyRecord[]) => void
  agents: string[][]
  path: string
  navigate: (p: string) => void
  notify: (m: string) => void
}) {
  const id = path.startsWith('/app/policies/') ? path.slice('/app/policies/'.length) : ''
  const policy = policies.find(x => x.id === id)
  const [draft, setDraft] = useState<PolicyRecord | null>(null)
  useEffect(() => setDraft(policy ? {...policy, controls: [...policy.controls], assigned: [...policy.assigned]} : null), [id, policy?.name])

  if (!policy || !draft) return <>
    <PageHeading title="Payment policies" description="Create and assign the controls every agent-initiated payment must satisfy." action="Create policy" onAction={() => notify('Policy creation is in progress.')}/>
    <InProgress module="policies" title="Create payment policy" whatWillDo={['Define payment boundaries', 'Assign policy to agents', 'Set spending controls']} />
    <div className="policy-cards">{policies.map(x => <button className="panel policy-card" key={x.id} onClick={() => navigate(`/app/policies/${x.id}`)}><span className="impact-icon"><Icon name="shield"/></span><div><span className="policy-card-title"><b>{x.name}</b><Status>{x.status}</Status></span><p>{x.description}</p><small>{x.controls.filter(Boolean).length} active controls · {x.assigned.length} assigned agents</small></div><Icon name="chevron"/></button>)}</div>
  </>

  const save = () => {
    if (draft.max <= 0 || draft.daily < draft.max) { notify('Daily cap must be greater than the invoice maximum.'); return }
    setPolicies(policies.map(x => x.id === draft.id ? draft : x)); notify('Policy updated successfully.')
  }
  return <>
    <button className="back-link" onClick={() => navigate('/app/policies')}><Icon name="arrow" size={14}/> Back to policies</button>
    <PageHeading title={draft.name} description={draft.description} action="Save changes" actionIcon="check" onAction={save}/>
    <InProgress module="policies" title="Policy details" whatWillDo={['Edit spending controls', 'Configure payment requirements', 'Manage assigned agents']} />
    <div className="impact-panel"><div className="impact-icon"><Icon name="shield"/></div><h2>Policy impact</h2><p>Changes apply to new payment requests after saving.</p><div><span>Active controls</span><b>{draft.controls.filter(Boolean).length}</b></div><div><span>Agents affected</span><b>{draft.assigned.length}</b></div><div className="info-callout"><Icon name="help"/><p>Existing held requests retain their original evaluation.</p></div></div>
  </>
}