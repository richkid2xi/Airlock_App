import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { evaluationEngine } from '../engines/evaluation'
import { invoiceFromRow, supplierFromRow, agentFromRow } from '../domain/adapters'
import { toMinorUnits } from '../domain/money'

export function AttackLab({ agents, invoices, suppliers, notify }: { agents:string[][]; invoices:string[][]; suppliers:string[][]; notify:(m:string)=>void }) {
  const scenarios = [
    ['Valid payment request','ALLOW','All registered invoice, supplier, evidence and policy controls passed.'],
    ['Payee or payout wallet mismatch','BLOCK','Requested payout wallet does not match the supplier’s approved wallet.'],
    ['Invoice amount manipulation','BLOCK','Requested amount exceeds the registered invoice amount.'],
    ['Unverified supplier','BLOCK','Supplier verification is required by the active policy.'],
    ['Duplicate payment','BLOCK','This invoice already has a completed payment.'],
    ['Missing delivery attestation','HOLD','Delivery evidence is required before payment can be released.'],
    ['Spending limit exceeded','BLOCK','The request exceeds the agent’s per-request spending limit.'],
    ['Missing supporting evidence','HOLD','Required invoice or delivery evidence was not supplied.'],
    ['Intent mismatch','HOLD','The payment intent does not align with the registered invoice description.'],
    ['Frozen or disabled agent','BLOCK','This agent is not authorized to initiate payment requests.'],
  ]
  const [scenario, setScenario] = useState(scenarios[0][0])
  const [result, setResult] = useState<string[] | null>(null)
  const [history,setHistory] = useState<{scenario:string;decision:string;time:string}[]>([])
  const [amount,setAmount] = useState('12480')
  const [wallet,setWallet] = useState('0x20A7000000000000000000000000000000009C3F')
  const [intent,setIntent] = useState('Settle registered software services invoice')
  const [selectedAgentName, setSelectedAgentName] = useState('')
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('')
  const [hasEvidenceInput, setHasEvidenceInput] = useState(true)

  const run = async () => {
    const chosenAgentRow = agents.find(a => (selectedAgentName ? a[0] === selectedAgentName : scenario.includes('disabled') ? a[2] === 'Disabled' : a[0] === agents[0]?.[0])) || agents[0]
    const chosenInvoiceRow = invoices.find(inv => (selectedInvoiceNumber ? inv[0] === selectedInvoiceNumber : inv[0] === invoices[0]?.[0])) || invoices[0]
    const chosenSupplierRow = suppliers.find(s => s[0] === chosenInvoiceRow?.[1]) || suppliers[0]

    let inv = chosenInvoiceRow ? invoiceFromRow(chosenInvoiceRow) : null
    let sup = chosenSupplierRow ? supplierFromRow(chosenSupplierRow) : null
    let agt = chosenAgentRow ? agentFromRow(chosenAgentRow) : null

    // Tailor inputs according to scenario parameters
    if (scenario.includes('amount manipulation') && inv) {
      inv = { ...inv, amountUnits: toMinorUnits(Math.max(1, Number(amount) - 1000)) }
    }
    if (scenario.includes('Duplicate payment') && inv) {
      inv = { ...inv, status: 'Paid' }
    }
    if (scenario.includes('Unverified') && sup) {
      sup = { ...sup, verificationStatus: 'Unverified' }
    }
    if (scenario.includes('Missing delivery') && inv) {
      inv = { ...inv, status: 'Open' }
    }
    if (scenario.includes('Spending limit') && agt) {
      agt = { ...agt, perRequestLimitUnits: toMinorUnits(Math.max(1, Number(amount) - 1000)) }
    }
    if (scenario.includes('disabled') && agt) {
      agt = { ...agt, status: 'Disabled' }
    }

    const evalResult = await evaluationEngine.evaluateRequest({
      invoiceNumber: inv?.number || 'INV-UNKNOWN',
      requestedAmountUnits: toMinorUnits(amount),
      destinationWallet: wallet,
      agentNameOrId: agt?.name || 'Agent',
      intent,
      hasEvidence: scenario.includes('Missing') ? false : hasEvidenceInput,
      registeredInvoice: inv,
      registeredSupplier: sup,
      agent: agt,
    })

    const decisionTuple = [scenario, evalResult.decision, evalResult.reason]
    setResult(decisionTuple)
    setHistory([{scenario,decision:evalResult.decision,time:'Just now'},...history].slice(0,5))
    notify(`Simulation complete: ${evalResult.decision}.`)
  }
  const reset = () => {setResult(null);setAmount('12480');setWallet('0x20A7000000000000000000000000000000009C3F');setIntent('Settle registered software services invoice')}
  return <>
    <PageHeading title="Attack Lab" description="Test how Airlock responds to unsafe agent-initiated payment requests."/>
    <div className="lab-banner"><Icon name="flask"/><div><b>Safe simulation environment</b><p>No funds move and no production records are changed during a simulation.</p></div><Status>SIMULATED</Status></div>
    <div className="lab-layout">
      <section className="panel scenario-panel"><h2>1. Choose a scenario</h2><div className="scenario-list">{scenarios.map((x,i) => <button className={scenario === x[0] ? 'active' : ''} onClick={() => {setScenario(x[0]);setResult(null)}} key={x[0]}><span className="scenario-number">{String(i+1).padStart(2,'0')}</span><span><b>{x[0]}</b><small>Expected decision: {x[1]}</small></span><Icon name="chevron"/></button>)}</div></section>
      <section className="panel simulation-panel">
        <div className="simulation-head"><div><span>PAYMENT REQUEST</span><h2>{scenario}</h2></div><span className="code-label">TEST-REQ-8821</span></div>
        <div className="simulation-form"><label>AI agent<select value={selectedAgentName} onChange={e=>setSelectedAgentName(e.target.value)}>{agents.map(x => <option key={x[0]}>{scenario.includes('disabled') ? agents.find(a=>a[2]==='Disabled')?.[0] || x[0] : x[0]}</option>)}</select></label><label>Invoice<select value={selectedInvoiceNumber} onChange={e=>setSelectedInvoiceNumber(e.target.value)}>{invoices.map(x => <option key={x[0]}>{x[0]} · {x[1]}</option>)}</select></label><label>Requested amount<input value={amount} onChange={e=>setAmount(e.target.value)} type="number"/></label>{scenario.toLowerCase().includes('wallet') && <label>Requested payout wallet<input value={wallet} onChange={e=>setWallet(e.target.value)}/></label>}<label className="full">Payment intent<input value={intent} onChange={e=>setIntent(e.target.value)}/></label>{scenario.includes('evidence') || scenario === 'Valid payment request' ? <label className="full">Supporting evidence<select onChange={e=>setHasEvidenceInput(!e.target.value.includes('No evidence'))}><option>Invoice document + delivery receipt</option><option>No evidence supplied</option></select></label> : null}</div>
        {result ? <div className={`simulation-result ${result[1].toLowerCase()}`}><div className="result-title"><span><Icon name={result[1] === 'ALLOW' ? 'check' : result[1] === 'HOLD' ? 'clock' : 'lock'}/></span><div><small>SIMULATED AIRLOCK DECISION</small><strong>{result[1]}</strong></div></div><p>{result[2]}</p><div className="triggered-rule"><Icon name="shield"/><div><b>{result[1] === 'ALLOW' ? 'All required controls passed' : 'Triggered control'}</b><small>{result[2]}</small></div></div><div className="result-checks"><span><Icon name="check"/> Invoice registered</span><span><Icon name="check"/> Request linked to agent</span><span className={result[1] === 'ALLOW' ? '' : 'failed'}><Icon name={result[1] === 'ALLOW' ? 'check' : 'close'}/> Scenario-specific control</span></div><p className="recommendation"><b>Recommended next action:</b> {result[1] === 'ALLOW' ? 'Proceed through the normal approval workflow.' : result[1] === 'HOLD' ? 'Collect the missing evidence and request human review.' : 'Correct the invalid request before resubmitting.'}</p><button className="btn secondary" onClick={reset}>Reset inputs</button></div> : <button className="btn primary run-button" onClick={run}><Icon name="flask"/>Run simulation</button>}
        {history.length > 0 && <div className="simulation-history"><h3>Simulation history</h3>{history.map((x,i)=><button key={`${x.scenario}-${i}`} onClick={()=>{setScenario(x.scenario);setResult(scenarios.find(s=>s[0]===x.scenario) || null)}}><span><b>{x.scenario}</b><small>{x.time}</small></span><Status>{x.decision}</Status></button>)}</div>}
      </section>
    </div>
  </>
}
