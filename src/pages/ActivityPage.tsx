import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TransactionTable } from './Dashboard'
import { settlementEngine } from '../engines/settlement'
import { toMinorUnits } from '../domain/money'

export function ActivityPage({ approvals = false, rows, path, navigate, agents, onDecision, notify }: { approvals?: boolean; rows: string[][]; path: string; navigate: (p:string) => void; agents: string[][]; onDecision: (id:string, decision:'ALLOW'|'BLOCK') => void; notify: (m:string) => void }) {
  const [query,setQuery] = useState('')
  const [decision,setDecision] = useState('All')
  const [agent,setAgent] = useState('All')
  const [page,setPage] = useState(1)
  const [confirm,setConfirm] = useState<'ALLOW'|'BLOCK'|null>(null)
  const base = approvals ? '/app/approvals/' : '/app/activity/'
  const id = path.startsWith(base) ? decodeURIComponent(path.slice(base.length)) : ''
  const selected = rows.find(x => x[0] === id)
  const held = rows.filter(x => x[4] === 'HOLD')
  const filtered = rows.filter(x => (!approvals || x[4] === 'HOLD') && x.some(c => c.toLowerCase().includes(query.toLowerCase())) && (decision === 'All' || x[4] === decision) && (agent === 'All' || x[2] === agent))
  const visible = filtered.slice((page-1)*6,page*6)
  const reason = selected?.[4] === 'BLOCK' ? 'The requested payout wallet does not match the supplier’s approved destination.' : selected?.[4] === 'HOLD' ? 'The supplier payout destination requires a human verification decision.' : 'The request matched the invoice, supplier, amount, evidence and active spending policy.'
  if (selected) return <>
    <button className="back-link" onClick={() => navigate(approvals ? '/app/approvals' : '/app/activity')}><Icon name="arrow" size={14}/> Back to {approvals ? 'approvals' : 'activity'}</button>
    <div className="detail-heading"><div className="detail-avatar"><Icon name="activity"/></div><div><div className="detail-title-line"><h1>{selected[0]}</h1><Status>{selected[4]}</Status></div><p>Payment request · {selected[5]}</p></div></div>
    <div className="detail-layout">
      <div className="detail-primary">
        <section className="panel detail-section"><div className="section-title"><div><h2>Payment request</h2><p>Invoice-bound request information and supporting intent.</p></div><b className="review-amount">{selected[3]}</b></div><div className="property-grid"><div><span>Invoice</span><b>{selected[0]}</b></div><div><span>Supplier</span><b>{selected[1]}</b></div><div><span>Requesting agent</span><b>{selected[2]}</b></div><div><span>Payout wallet</span><b>0x712F...88D0</b></div><div><span>Requested amount</span><b>{selected[3]}</b></div><div><span>Timestamp</span><b>{selected[5]}</b></div></div><div className="intent-block"><span>PAYMENT INTENT</span><p>Settle the registered supplier invoice after delivery of contracted services.</p><span>SUPPORTING EVIDENCE</span><button className="document-link" onClick={()=>notify('Supporting evidence opened in the prototype.')}><Icon name="invoice"/> Invoice document · Delivery receipt</button></div></section>
        <section className="panel detail-section"><div className="section-title"><div><h2>Rule evaluation</h2><p>Controls evaluated at the time of the request.</p></div></div><div className="rule-list standalone">{['Invoice is registered and unpaid','Requested amount matches invoice','Agent is authorized','Supporting evidence is present'].map(x => <div key={x}><Icon name="check"/><span>{x}</span><Status>Passed</Status></div>)}{selected[4] !== 'ALLOW' && <div className={selected[4] === 'HOLD' ? 'rule-warning' : 'rule-failed'}><Icon name={selected[4] === 'HOLD' ? 'clock' : 'lock'}/><span>{selected[4] === 'HOLD' ? 'Payout destination requires review' : 'Payout wallet matches supplier'}</span><Status>{selected[4] === 'HOLD' ? 'Review' : 'Failed'}</Status></div>}</div></section>
      </div>
      <aside className="detail-secondary"><section className="panel decision-card"><Status>{selected[4]}</Status><h2>{selected[4] === 'ALLOW' ? 'Payment allowed' : selected[4] === 'BLOCK' ? 'Payment blocked' : 'Human review required'}</h2><p>{reason}</p><div className="security-note"><Icon name="shield"/><span><b>Evaluation recorded</b><small>This result is retained even if policies later change.</small></span></div></section>{approvals && selected[4] === 'HOLD' && <section className="panel approval-actions-card"><h2>Make a decision</h2><p>Review the invoice and evidence before continuing.</p><button className="btn primary" onClick={() => setConfirm('ALLOW')}>Approve payment</button><button className="btn danger" onClick={() => setConfirm('BLOCK')}>Reject payment</button></section>}</aside>
    </div>
    {confirm && <ConfirmDialog title={confirm === 'ALLOW' ? 'Approve this payment?' : 'Reject this payment?'} description={confirm === 'ALLOW' ? 'Settlement will execute on Solana Devnet via USDC SPL token transfer.' : 'The request will be blocked on-chain and removed from the approval queue.'} confirmLabel={confirm === 'ALLOW' ? 'Approve request' : 'Reject request'} danger={confirm === 'BLOCK'} onCancel={() => setConfirm(null)} onConfirm={async () => {
      if (confirm === 'ALLOW') {
        try {
          const receipt = await settlementEngine.executeSettlement({
            requestId: selected[0],
            invoiceNumber: selected[0],
            supplierName: selected[1],
            destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
            amountUnits: toMinorUnits(selected[3]),
          })
          notify(`Payment executed on Solana Devnet! Sig: ${receipt.signature.slice(0, 16)}…`)
        } catch (err: any) {
          notify(`Settlement error: ${err.message}`)
        }
      } else {
        await settlementEngine.rejectHoldRequest(selected[0], '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
        notify('Payment request rejected.')
      }
      onDecision(selected[0],confirm)
      setConfirm(null)
      navigate('/app/approvals')
    }}/>}
  </>
  return <>
    <PageHeading title={approvals ? 'Approvals' : 'Payment activity'} description={approvals ? `${held.length} payment requests require a human decision.` : 'Inspect every AI-agent payment request and rule evaluation.'}/>
    <section className="panel workspace-panel">
      <div className="workspace-tools"><div className="table-search"><Icon name="search"/><input value={query} onChange={e => {setQuery(e.target.value);setPage(1)}} placeholder="Search reference, supplier or agent…"/></div>{!approvals && <label className="select-filter"><Icon name="filter"/><select value={decision} onChange={e => setDecision(e.target.value)}><option>All</option><option>ALLOW</option><option>BLOCK</option><option>HOLD</option></select></label>}<label className="select-filter"><Icon name="bot"/><select value={agent} onChange={e => setAgent(e.target.value)}><option>All</option>{agents.map(x => <option key={x[0]}>{x[0]}</option>)}</select></label></div>
      <TransactionTable rows={visible} onOpen={x => navigate(`${base}${encodeURIComponent(x)}`)}/>
      {!visible.length && <div className="empty-state"><Icon name={approvals ? 'check' : 'search'}/><b>{approvals ? 'Approval queue is clear' : 'No activity found'}</b><p>{approvals ? 'There are no held payment requests awaiting review.' : 'Change your search or filter selection.'}</p></div>}
      <div className="pagination"><span>Showing {filtered.length ? (page-1)*6+1 : 0}–{Math.min(page*6,filtered.length)} of {filtered.length}</span><div><button disabled={page===1} onClick={() => setPage(page-1)}>Previous</button><button disabled={page*6>=filtered.length} onClick={() => setPage(page+1)}>Next</button></div></div>
    </section>
  </>
}
