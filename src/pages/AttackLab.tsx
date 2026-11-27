import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { registryEngine } from '../engines/registry/index'
import { evaluationEngine } from '../engines/evaluation'
import type { Supplier, Agent, Invoice } from '../engines/registry/types'
import type { Invoice as DomainInvoice, Supplier as DomainSupplier, Agent as DomainAgent } from '../domain/types'

export function AttackLab({ notify }: { notify: (m: string) => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null)
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scenario, setScenario] = useState('Valid payment request')
  const [result, setResult] = useState<[string, string, string] | null>(null)
  const [history, setHistory] = useState<{ scenario: string; decision: string; time: string }[]>([])
  const [amount, setAmount] = useState('12480')
  const [wallet, setWallet] = useState('0x20A7000000000000000000000000000000009C3F')
  const [intent, setIntent] = useState('Settle registered software services invoice')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [hasEvidenceInput, setHasEvidenceInput] = useState(true)

  const scenarios: [string, string, string][] = [
    ['Valid payment request', 'ALLOW', 'All registered invoice, supplier, evidence and policy controls passed.'],
    ['Payee or payout wallet mismatch', 'BLOCK', "Requested payout wallet doesn't match the supplier's approved wallet."],
    ['Invoice amount manipulation', 'BLOCK', 'Requested amount exceeds the registered invoice amount.'],
    ['Unverified supplier', 'BLOCK', 'Supplier verification is required by the active policy.'],
    ['Duplicate payment', 'BLOCK', "This invoice already has a completed payment."],
    ['Missing delivery attestation', 'HOLD', 'Delivery evidence is required before payment can be released.'],
    ['Spending limit exceeded', 'BLOCK', "The request exceeds the agent's per-request spending limit."],
    ['Missing supporting evidence', 'HOLD', 'Required invoice or delivery evidence was not supplied.'],
    ['Intent mismatch', 'HOLD', "The payment intent doesn't align with the registered invoice description."],
    ['Frozen or disabled agent', 'BLOCK', 'This agent is not authorized to initiate payment requests.'],
  ]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [supData, agtData, invData] = await Promise.all([
        registryEngine.suppliers.list(),
        registryEngine.agents.list(),
        registryEngine.invoices.list(),
      ])
      setSuppliers(supData)
      setAgents(agtData)
      setInvoices(invData)
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toDomainSupplier = (s: Supplier): DomainSupplier => ({
    id: s.id,
    name: s.name,
    payoutWallet: s.payoutWallet,
    verificationStatus: s.verificationStatus as DomainSupplier['verificationStatus'],
    operationalStatus: (s.verificationStatus === 'verified' ? 'Active' : s.verificationStatus === 'unverified' ? 'Restricted' : 'Pending') as DomainSupplier['operationalStatus'],
    invoiceCount: 0,
  })

  const toDomainAgent = (a: Agent): DomainAgent => ({
    id: a.id,
    name: a.name,
    identifier: a.identifier,
    status: a.status as DomainAgent['status'],
    perRequestLimitUnits: a.perRequestLimitMinor,
    dailyLimitUnits: a.dailyLimitMinor,
    requestCount: 0,
    assignedPolicyIds: [],
  })

  const toDomainInvoice = (i: Invoice): DomainInvoice => ({
    id: i.id,
    number: i.invoiceNumber,
    supplierId: i.supplierId,
    supplierName: '',
    amountUnits: i.amountMinor,
    currency: i.currency,
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    status: i.status as DomainInvoice['status'],
  })

  const run = async () => {
    if (!suppliers || !agents || !invoices) return
    const chosenAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : agents[0]
    const chosenInvoice = selectedInvoiceId ? invoices.find(inv => inv.id === selectedInvoiceId) : invoices[0]
    const chosenSupplier = chosenInvoice ? suppliers.find(s => s.id === chosenInvoice.supplierId) : suppliers[0]
    if (!chosenAgent || !chosenInvoice || !chosenSupplier) return

    let inv = toDomainInvoice(chosenInvoice)
    let sup = toDomainSupplier(chosenSupplier)
    let agt = toDomainAgent(chosenAgent)

    if (scenario.includes('amount manipulation') && inv) {
      inv = { ...inv, amountUnits: String(Math.max(1, Number(amount) - 1000)) }
    }
    if (scenario.includes('Duplicate payment') && inv) {
      inv = { ...inv, status: 'Paid' as DomainInvoice['status'] }
    }
    if (scenario.includes('Unverified') && sup) {
      sup = { ...sup, verificationStatus: 'Unverified' as DomainSupplier['verificationStatus'] }
    }
    if (scenario.includes('Missing delivery') && inv) {
      inv = { ...inv, status: 'Open' as DomainInvoice['status'] }
    }
    if (scenario.includes('Spending limit') && agt) {
      agt = { ...agt, perRequestLimitUnits: String(Math.max(1, Number(amount) - 1000)) }
    }
    if (scenario.includes('disabled') && agt) {
      agt = { ...agt, status: 'Disabled' as DomainAgent['status'] }
    }

    try {
      const evalResult = await evaluationEngine.evaluateRequest({
        invoiceNumber: inv.number,
        requestedAmountUnits: inv.amountUnits,
        destinationWallet: wallet,
        agentNameOrId: agt.name,
        intent,
        hasEvidence: scenario.includes('Missing') ? false : hasEvidenceInput,
        registeredInvoice: inv,
        registeredSupplier: sup,
        agent: agt,
      })
      setResult([scenario, evalResult.decision, evalResult.reason])
      setHistory([{ scenario, decision: evalResult.decision, time: 'Just now' }, ...history].slice(0, 5))
      notify(`Simulation complete: ${evalResult.decision}.`)
    } catch (err: any) {
      setError(err?.message ?? String(err))
    }
  }

  const reset = () => {
    setResult(null)
    setAmount('12480')
    setWallet('0x20A7000000000000000000000000000000009C3F')
    setIntent('Settle registered software services invoice')
  }

  if (loading) return <div className="panel"><div className="panel-head"><div><h1>Attack Lab</h1><p>Test how Airlock responds to unsafe agent-initiated payment requests.</p></div></div><div style={{ padding: 24, textAlign: 'center' }}>Loading simulation data…</div></div>
  if (error) return <div className="panel"><div className="panel-head"><div><h1>Attack Lab</h1><p>Test how Airlock responds to unsafe agent-initiated payment requests.</p></div></div><div style={{ padding: 24, color: '#ef4444' }}>{error}</div></div>

  return <>
    <PageHeading title="Attack Lab" description="Test how Airlock responds to unsafe agent-initiated payment requests."/>
    <div className="lab-banner"><Icon name="flask"/><div><b>Safe simulation environment</b><p>No funds move and no production records are changed during a simulation.</p></div><Status>SIMULATED</Status></div>
    <div className="lab-layout">
      <section className="panel scenario-panel"><h2>1. Choose a scenario</h2><div className="scenario-list">{scenarios.map((x, i) => <button className={scenario === x[0] ? 'active' : ''} onClick={() => { setScenario(x[0]); setResult(null) }} key={x[0]}><span className="scenario-number">{String(i + 1).padStart(2, '0')}</span><span><b>{x[0]}</b><small>Expected decision: {x[1]}</small></span><Icon name="chevron"/></button>)}</div></section>
      <section className="panel simulation-panel">
        <div className="simulation-head"><div><span>PAYMENT REQUEST</span><h2>{scenario}</h2></div><span className="code-label">TEST-REQ-8821</span></div>
        <div className="simulation-form">
          <label>AI agent<select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)}>
            <option value="">Select an agent</option>
            {agents?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></label>
          <label>Invoice<select value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)}>
            <option value="">Select an invoice</option>
            {invoices?.map(inv => <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>)}
          </select></label>
          <label>Requested amount<input value={amount} onChange={e => setAmount(e.target.value)} type="number"/></label>
          {scenario.toLowerCase().includes('wallet') && <label>Requested payout wallet<input value={wallet} onChange={e => setWallet(e.target.value)}/></label>}
          <label className="full">Payment intent<input value={intent} onChange={e => setIntent(e.target.value)}/></label>
          {scenario.includes('evidence') || scenario === 'Valid payment request' ? <label className="full">Supporting evidence<select onChange={e => setHasEvidenceInput(!e.target.value.includes('No evidence'))}><option>Invoice document + delivery receipt</option><option>No evidence supplied</option></select></label> : null}
        </div>
        {result ? <div className={`simulation-result ${result[1].toLowerCase()}`}><div className="result-title"><span><Icon name={result[1] === 'ALLOW' ? 'check' : result[1] === 'HOLD' ? 'clock' : 'lock'}/></span><div><small>SIMULATED AIRLOCK DECISION</small><strong>{result[1]}</strong></div></div><p>{result[2]}</p><div className="triggered-rule"><Icon name="shield"/><div><b>{result[1] === 'ALLOW' ? 'All required controls passed' : 'Triggered control'}</b><small>{result[2]}</small></div></div><div className="result-checks"><span><Icon name="check"/> Invoice registered</span><span><Icon name="check"/> Request linked to agent</span><span className={result[1] === 'ALLOW' ? '' : 'failed'}><Icon name={result[1] === 'ALLOW' ? 'check' : 'close'}/> Scenario-specific control</span></div><p className="recommendation"><b>Recommended next action:</b> {result[1] === 'ALLOW' ? 'Proceed through the normal approval workflow.' : result[1] === 'HOLD' ? 'Collect the missing evidence and request human review.' : 'Correct the invalid request before resubmitting.'}</p><button className="btn secondary" onClick={reset}>Reset inputs</button></div> : <button className="btn primary run-button" onClick={run}><Icon name="flask"/>Run simulation</button>}
        {history.length > 0 && <div className="simulation-history"><h3>Simulation history</h3>{history.map((x, i) => <button key={`${x.scenario}-${i}`} onClick={() => { setScenario(x.scenario); setResult(scenarios.find(s => s[0] === x.scenario) || null) }}><span><b>{x.scenario}</b><small>{x.time}</small></span><Status>{x.decision}</Status></button>)}</div>}
      </section>
    </div>
  </>
}
