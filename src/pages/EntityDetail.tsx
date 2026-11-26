import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { Modal } from '../ui/Modal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import type { PolicyRecord } from '../domain/types'

const defaultInvoiceRows = [
  ['INV-2057','Amazon Web Services','€14,680.00','May 14, 2025','May 29, 2025','Open'],
  ['INV-2053','Atlas Freight','€8,920.00','May 10, 2025','May 24, 2025','Attested'],
  ['INV-2051','Datadog','€3,240.00','May 7, 2025','May 21, 2025','Open'],
  ['INV-2048','Vercel Inc.','€12,480.00','Apr 28, 2025','May 18, 2025','Paid'],
  ['INV-2042','Neon Systems','€4,200.00','Apr 22, 2025','May 12, 2025','Disputed'],
  ['INV-2039','Linear Labs','€1,680.00','Apr 19, 2025','May 4, 2025','Paid'],
]

const defaultTransactions = [
  ['INV-2048','Vercel Inc.','ProcureBot','€12,480.00','ALLOW','Today, 09:42'],
  ['INV-2045','Atlas Freight','AP Assistant','€8,920.00','HOLD','Today, 08:16'],
  ['INV-2042','Neon Systems','ProcureBot','€4,200.00','BLOCK','Yesterday, 16:31'],
  ['INV-2039','Linear Labs','AP Assistant','€1,680.00','ALLOW','Yesterday, 14:08'],
  ['INV-2037','Cloudflare','Ops Agent','€6,340.00','ALLOW','May 18, 11:22'],
]

export function EntityDetail({ type, row, onBack, onUpdate, notify, policies = [] }: { type: 'Invoices' | 'Suppliers' | 'AI Agents'; row: string[]; onBack: () => void; onUpdate: (row:string[]) => void; notify:(m:string)=>void; policies?:PolicyRecord[] }) {
  const isInvoice = type === 'Invoices'
  const isSupplier = type === 'Suppliers'
  const [confirm,setConfirm] = useState<'attest'|'dispute'|'verify'|'disable'|null>(null)
  const [edit,setEdit] = useState(false)
  const title = row[0]
  const subtitle = isInvoice ? `${row[1]} · Due ${row[4]}` : isSupplier ? 'Supplier profile and payout controls' : `${row[1]} · Authorized payment agent`
  return <>
    <button className="back-link" onClick={onBack}><Icon name="arrow" size={14}/> Back to {type.toLowerCase()}</button>
    <div className="detail-heading">
      <div className={`detail-avatar ${isInvoice ? 'invoice' : isSupplier ? 'supplier' : 'agent'}`}><Icon name={isInvoice ? 'invoice' : isSupplier ? 'building' : 'bot'} size={22}/></div>
      <div><div className="detail-title-line"><h1>{title}</h1><Status>{isInvoice ? row[5] : isSupplier ? row[2] : row[2]}</Status></div><p>{subtitle}</p></div>
      <div className="detail-heading-actions">{isInvoice ? <><button className="btn danger" onClick={()=>setConfirm('dispute')}>Dispute invoice</button><button className="btn primary" onClick={()=>setConfirm('attest')}>Attest delivery</button></> : isSupplier ? <><button className="btn secondary" onClick={()=>setEdit(true)}>Edit supplier</button>{row[2] !== 'Verified' && <button className="btn primary" onClick={()=>setConfirm('verify')}>Verify supplier</button>}</> : <><button className="btn secondary" onClick={()=>setEdit(true)}>Edit limits</button><button className="btn danger" onClick={()=>setConfirm('disable')}>{row[2] === 'Active' ? 'Disable agent' : 'Enable agent'}</button></>}</div>
    </div>
    {isInvoice && <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Registered invoice</h2><p>Immutable invoice details used during payment evaluation.</p></div><span className="registry-badge"><Icon name="shield"/> Registered</span></div>
          <div className="property-grid"><div><span>Invoice number</span><b>{row[0]}</b></div><div><span>Supplier</span><b>{row[1]}</b></div><div><span>Invoice amount</span><b>{row[2]}</b></div><div><span>Issue date</span><b>{row[3]}</b></div><div><span>Due date</span><b>{row[4]}</b></div><div><span>Currency</span><b>EUR</b></div></div>
        </section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Payment history</h2><p>Requests evaluated against this invoice.</p></div></div>
          <div className="history-row"><span className="event-symbol hold"><Icon name="clock"/></span><div><b>Payment request evaluated</b><small>AP Assistant · Today, 08:16</small></div><strong>{row[2]}</strong><Status>HOLD</Status></div>
          <div className="history-row"><span className="event-symbol"><Icon name="invoice"/></span><div><b>Invoice registered</b><small>Wallet 0x71C4...9F2A · May 10, 2025</small></div><strong>—</strong><Status>Recorded</Status></div>
        </section>
      </div>
      <aside className="detail-secondary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Delivery attestation</h2><p>Required before payment release.</p></div></div><div className="attestation-state"><span><Icon name="check"/></span><b>Delivery confirmed</b><p>Attested May 18 by wallet 0x71C4...9F2A with supporting evidence.</p><button className="btn secondary" onClick={()=>notify('Evidence reference opened in the prototype.')}>View evidence</button></div></section>
        <section className="panel detail-section payment-summary"><div className="section-title"><h2>Payment information</h2></div><div><span>Requested amount</span><b>{row[2]}</b></div><div><span>Decision</span><Status>HOLD</Status></div><div><span>Supplier wallet</span><b>0x712F...88D0</b></div><div><span>Initiated by</span><b>AP Assistant</b></div></section>
      </aside>
    </div>}
    {isSupplier && <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Supplier information</h2><p>Verified identity and payment destination.</p></div><button className="text-action" onClick={()=>setEdit(true)}>Edit details</button></div><div className="property-grid"><div><span>Legal name</span><b>{row[0]}</b></div><div><span>Supplier ID</span><b>sup_84a9d12</b></div><div><span>Registered wallet</span><b>{row[1]}</b></div><div><span>Verification</span><Status>{row[2]}</Status></div><div><span>Network</span><b>Ethereum</b></div><div><span>Associated invoices</span><b>{row[3]}</b></div></div></section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Related invoices</h2><p>Recent registered invoices for this supplier.</p></div></div>{defaultInvoiceRows.slice(0,3).map((x,i) => <div className="history-row" key={x[0]}><span className="doc-icon"><Icon name="invoice"/></span><div><b>{i === 0 ? 'INV-2057' : x[0]}</b><small>Due {x[4]}</small></div><strong>{x[2]}</strong><Status>{x[5]}</Status></div>)}</section>
      </div>
      <aside className="detail-secondary"><section className="panel wallet-detail"><div className="wallet-identicon">0x</div><span>APPROVED PAYOUT WALLET</span><h2>{row[1]}</h2><p>Verified on Ethereum · Last checked May 18</p><div className="security-note"><Icon name="shield"/><span><b>Wallet protection active</b><small>Requests to any other destination will be blocked.</small></span></div></section></aside>
    </div>}
    {!isInvoice && !isSupplier && <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Agent identity</h2><p>Authorization and payment request identity.</p></div><Status>{row[2]}</Status></div><div className="property-grid"><div><span>Agent name</span><b>{row[0]}</b></div><div><span>Agent identifier</span><b>{row[1]}</b></div><div><span>Authorization</span><Status>{row[2]}</Status></div><div><span>Total requests</span><b>{row[5]}</b></div><div><span>Allowed</span><b>126</b></div><div><span>Blocked / held</span><b>16</b></div></div></section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Assigned policies</h2><p>Active controls applied to this agent.</p></div></div>{policies.filter(p=>p.assigned.includes(row[0])).map(p=><div className="history-row" key={p.id}><span className="doc-icon"><Icon name="shield"/></span><div><b>{p.name}</b><small>{p.controls.filter(Boolean).length} active controls</small></div><Status>{p.status}</Status></div>)}{!policies.some(p=>p.assigned.includes(row[0]))&&<div className="empty-state"><b>No assigned policies</b><p>Assign this agent from the Policies workspace.</p></div>}</section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Recent activity</h2><p>Latest requests initiated by this agent.</p></div></div>{defaultTransactions.slice(0,3).map(x => <div className="history-row" key={x[0]}><span className="doc-icon"><Icon name="activity"/></span><div><b>{x[0]} · {x[1]}</b><small>{x[5]}</small></div><strong>{x[3]}</strong><Status>{x[4]}</Status></div>)}</section>
      </div>
      <aside className="detail-secondary"><section className="panel detail-section"><div className="section-title"><h2>Permissions & limits</h2></div><div className="limit-display"><span>Per-request limit</span><b>{row[3]}</b><div><i style={{width:'62%'}}/></div></div><div className="limit-display"><span>Daily spending cap</span><b>{row[4]}</b><div><i style={{width:'38%'}}/></div></div><div className="permission-list">{['Initiate invoice payments','Submit payment evidence','Request supplier payouts'].map(x => <div key={x}><Icon name="check"/><span>{x}</span></div>)}</div></section></aside>
    </div>}
    {confirm && <ConfirmDialog title={confirm === 'attest' ? 'Attest delivery?' : confirm === 'dispute' ? 'Dispute this invoice?' : confirm === 'verify' ? 'Verify this supplier?' : row[2] === 'Active' ? 'Disable this agent?' : 'Enable this agent?'} description={confirm === 'attest' ? 'This confirms the contracted goods or services were delivered.' : confirm === 'dispute' ? 'Payment requests for this invoice will be blocked until the dispute is resolved.' : confirm === 'verify' ? 'Confirm that the supplier identity and payout wallet have been reviewed.' : 'This changes whether the agent can initiate new payment requests.'} confirmLabel={confirm === 'attest' ? 'Confirm delivery' : confirm === 'dispute' ? 'Dispute invoice' : confirm === 'verify' ? 'Verify supplier' : row[2] === 'Active' ? 'Disable agent' : 'Enable agent'} danger={confirm === 'dispute' || confirm === 'disable'} onCancel={()=>setConfirm(null)} onConfirm={()=>{const updated=[...row];if(confirm==='attest')updated[5]='Attested';if(confirm==='dispute')updated[5]='Disputed';if(confirm==='verify'){updated[2]='Verified';updated[5]='Active'}if(confirm==='disable')updated[2]=row[2]==='Active'?'Disabled':'Active';onUpdate(updated);notify(confirm==='attest'?'Delivery attested successfully.':confirm==='dispute'?'Invoice marked as disputed.':confirm==='verify'?'Supplier verified successfully.':'Agent status updated.');setConfirm(null)}}/>}
    {edit && <Modal title={isSupplier ? 'Edit supplier' : 'Edit agent limits'} description={isSupplier ? 'Important payout wallet changes require explicit confirmation.' : 'Adjust the payment boundaries assigned to this agent.'} onClose={()=>setEdit(false)}><form onSubmit={e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const updated=[...row];if(isSupplier&&d.wallet)updated[1]=String(d.wallet);if(!isSupplier){updated[3]=`€${Number(d.request).toLocaleString()}`;updated[4]=`€${Number(d.daily).toLocaleString()}`}onUpdate(updated);setEdit(false);notify(isSupplier?'Supplier details updated.':'Agent limits updated successfully.')}}><div className="modal-body form-grid">{isSupplier?<><label className="field full">Supplier name<input name="name" defaultValue={row[0]} required/></label><label className="field full">Payout wallet<input name="wallet" defaultValue={row[1]} required/></label><label className="field full">Change reason<textarea name="reason" required placeholder="Explain why this payout destination is changing."/></label></>:<><label className="field">Per-request limit<input name="request" type="number" defaultValue={row[3].replace(/\D/g,'')} required/></label><label className="field">Daily spending limit<input name="daily" type="number" defaultValue={row[4].replace(/\D/g,'')} required/></label></>}</div><div className="modal-actions"><button type="button" className="btn secondary" onClick={()=>setEdit(false)}>Cancel</button><button className="btn primary">Save changes</button></div></form></Modal>}
  </>
}
