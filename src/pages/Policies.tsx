import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { Modal } from '../ui/Modal'
import type { PolicyRecord } from '../domain/types'

export function Policies({ policies, setPolicies, agents, path, navigate, notify }: { policies: PolicyRecord[]; setPolicies: (p:PolicyRecord[]) => void; agents:string[][]; path:string; navigate:(p:string)=>void; notify:(m:string)=>void }) {
  const [create,setCreate] = useState(false)
  const id = path.startsWith('/app/policies/') ? path.slice('/app/policies/'.length) : ''
  const policy = policies.find(x => x.id === id)
  const [draft,setDraft] = useState<PolicyRecord | null>(null)
  useEffect(() => setDraft(policy ? {...policy,controls:[...policy.controls],assigned:[...policy.assigned]} : null), [id, policy?.name])
  const labels = [
    ['Verified supplier required','Block payments to suppliers that have not completed verification.'],
    ['Delivery attestation required','Hold payment until goods or services are confirmed delivered.'],
    ['Agent intent required','Require agents to include a structured reason for each request.'],
    ['Supporting evidence required','Require an invoice document and payment evidence.'],
    ['Two-person approval','Require two finance administrators above the threshold.'],
  ]
  if (!policy || !draft) return <>
    <PageHeading title="Payment policies" description="Create and assign the controls every agent-initiated payment must satisfy." action="Create policy" onAction={() => setCreate(true)}/>
    <div className="policy-cards">{policies.map(x => <button className="panel policy-card" key={x.id} onClick={() => navigate(`/app/policies/${x.id}`)}><span className="impact-icon"><Icon name="shield"/></span><div><span className="policy-card-title"><b>{x.name}</b><Status>{x.status}</Status></span><p>{x.description}</p><small>{x.controls.filter(Boolean).length} active controls · {x.assigned.length} assigned agents</small></div><Icon name="chevron"/></button>)}</div>
    {create && <Modal title="Create payment policy" description="Define payment boundaries and assign the policy after creation." onClose={() => setCreate(false)}><form onSubmit={e => {e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const record:PolicyRecord={id:`policy-${Date.now()}`,name:String(d.name),description:String(d.description),max:Number(d.max),daily:Number(d.daily),controls:[true,true,true,true,false],assigned:[],status:'Active'};if(!record.name||record.max<=0||record.daily<record.max)return;setPolicies([...policies,record]);setCreate(false);notify('Policy created successfully.');navigate(`/app/policies/${record.id}`)}}><div className="modal-body form-grid"><label className="field full">Policy name<input name="name" required placeholder="e.g. High-value payments"/></label><label className="field full">Description<textarea name="description" required placeholder="Explain when this policy should apply."/></label><label className="field">Maximum invoice amount<input name="max" type="number" min="1" required/></label><label className="field">Daily spending cap<input name="daily" type="number" min="1" required/></label></div><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setCreate(false)}>Cancel</button><button className="btn primary">Create policy</button></div></form></Modal>}
  </>
  const save = () => {
    if (draft.max <= 0 || draft.daily < draft.max) { notify('Daily cap must be greater than the invoice maximum.'); return }
    setPolicies(policies.map(x => x.id === draft.id ? draft : x)); notify('Policy updated successfully.')
  }
  return <>
    <button className="back-link" onClick={() => navigate('/app/policies')}><Icon name="arrow" size={14}/> Back to policies</button>
    <PageHeading title={draft.name} description={draft.description} action="Save changes" actionIcon="check" onAction={save}/>
    <div className="policy-layout">
      <section className="panel policy-main">
        <div className="policy-section"><div><h2>Spending controls</h2><p>Set organization-wide payment boundaries.</p></div><div className="policy-fields"><label>Maximum invoice amount<div className="money-input"><span>€</span><input value={draft.max} type="number" onChange={e => setDraft({...draft,max:Number(e.target.value)})}/></div><small>Requests above this value will be blocked.</small></label><label>Daily spending cap<div className="money-input"><span>€</span><input value={draft.daily} type="number" onChange={e => setDraft({...draft,daily:Number(e.target.value)})}/></div><small>Combined limit across assigned agents.</small></label></div></div>
        <div className="policy-section"><div><h2>Payment requirements</h2><p>Choose the evidence required before payment.</p></div><div className="toggle-list">{labels.map((x,i) => <div key={x[0]}><span><b>{x[0]}</b><small>{x[1]}</small></span><button className={`toggle ${draft.controls[i] ? 'on' : ''}`} onClick={() => setDraft({...draft,controls:draft.controls.map((t: boolean, j: number) => i===j?!t:t)})}><i/></button></div>)}</div></div>
        <div className="policy-section"><div><h2>Assigned agents</h2><p>Apply this policy to authorized agents.</p></div><div className="assignment-list">{agents.map(agent => <label key={agent[0]}><span className="agent-mini"><Icon name="bot"/><span><b>{agent[0]}</b><small>{agent[1]}</small></span></span><input type="checkbox" checked={draft.assigned.includes(agent[0])} onChange={e => setDraft({...draft,assigned:e.target.checked?[...draft.assigned,agent[0]]:draft.assigned.filter((x: string)=>x!==agent[0])})}/></label>)}</div></div>
      </section>
      <aside className="panel impact-panel"><div className="impact-icon"><Icon name="shield"/></div><h2>Policy impact</h2><p>Changes apply to new payment requests after saving.</p><div><span>Active controls</span><b>{draft.controls.filter(Boolean).length}</b></div><div><span>Agents affected</span><b>{draft.assigned.length}</b></div><div><span>Requests evaluated</span><b>284</b></div><div><span>Application status</span><Status>{draft.status}</Status></div><div className="info-callout"><Icon name="help"/><p>Existing held requests retain their original evaluation.</p></div></aside>
    </div>
  </>
}
