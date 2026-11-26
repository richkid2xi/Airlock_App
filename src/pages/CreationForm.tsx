import { useState, type FormEvent, type ReactNode } from 'react'

export function CreationForm({ type, suppliers, invoices, onCancel, onSubmit, onAddSupplier }: { type: 'invoice' | 'supplier' | 'agent'; suppliers: string[][]; invoices: string[][]; onCancel: () => void; onSubmit: (row: string[]) => void; onAddSupplier?:()=>void }) {
  const [errors, setErrors] = useState<Record<string,string>>({})
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const next: Record<string,string> = {}
    if (type === 'invoice') {
      if (!data.number) next.number = 'Invoice number is required.'
      if (invoices.some(x => x[0].toLowerCase() === String(data.number).toLowerCase())) next.number = 'This invoice number is already registered.'
      if (!data.supplier) next.supplier = 'Select a registered supplier.'
      if (!data.amount || Number(data.amount) <= 0) next.amount = 'Enter an amount greater than zero.'
      if (!data.issue) next.issue = 'Issue date is required.'
      if (!data.due) next.due = 'Due date is required.'
      if (data.issue && data.due && String(data.due) < String(data.issue)) next.due = 'Due date must be after the issue date.'
      if (!data.document) next.document = 'Add a document reference.'
      if (!Object.keys(next).length) onSubmit([String(data.number),String(data.supplier),`${data.currency === 'USD' ? '$' : data.currency === 'GBP' ? '£' : '€'}${Number(data.amount).toLocaleString(undefined,{minimumFractionDigits:2})}`,String(data.issue),String(data.due),'Open'])
    } else if (type === 'supplier') {
      if (!data.name) next.name = 'Business name is required.'
      if (!data.email || !String(data.email).includes('@')) next.email = 'Enter a valid business email.'
      if (!data.address) next.address = 'Business address is required.'
      if (!/^0x[a-fA-F0-9]{40}$/.test(String(data.wallet)) && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(data.wallet))) next.wallet = 'Enter a valid Solana or Ethereum address.'
      if (!Object.keys(next).length) onSubmit([String(data.name),`${String(data.wallet).slice(0,6)} •••• ${String(data.wallet).slice(-4)}`,'Unverified','0','Never','Pending'])
    } else {
      if (!data.name) next.name = 'Agent name is required.'
      if (!data.identifier || String(data.identifier).length < 5) next.identifier = 'Enter a unique agent identifier.'
      if (!data.request || Number(data.request) <= 0) next.request = 'Enter a valid per-request limit.'
      if (!data.daily || Number(data.daily) < Number(data.request)) next.daily = 'Daily limit must be at least the per-request limit.'
      if (!Object.keys(next).length) onSubmit([String(data.name),String(data.identifier),String(data.status),`€${Number(data.request).toLocaleString()}`,`€${Number(data.daily).toLocaleString()}`,'0'])
    }
    setErrors(next)
  }
  const field = (name: string, label: string, input: ReactNode) => <label className={`field ${errors[name] ? 'invalid' : ''}`}>{label}{input}{errors[name] && <span className="field-error">{errors[name]}</span>}</label>
  return <form onSubmit={submit}>
    <div className="modal-body form-grid">
      {type === 'invoice' && <>
        {field('number','Invoice number',<input name="number" placeholder="INV-2058"/>)}
        {field('supplier','Supplier',<select name="supplier" defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.map(x => <option key={x[0]}>{x[0]}</option>)}</select>)}
        {field('amount','Invoice amount',<input name="amount" type="number" min="0" step="0.01" placeholder="0.00"/>)}
        {field('currency','Currency',<select name="currency"><option>EUR</option><option>USD</option><option>GBP</option></select>)}
        {field('issue','Issue date',<input name="issue" type="date"/>)}
        {field('due','Due date',<input name="due" type="date"/>)}
        <div className="full">{field('document','Document reference',<input name="document" placeholder="IPFS CID or secure document reference"/>)}</div>
        <label className="field full">Supporting notes<textarea name="notes" placeholder="Describe the goods, services or relevant payment context."/></label>
        <button type="button" className="add-inline full" onClick={onAddSupplier}>Supplier not listed? Add a supplier first.</button>
      </>}
      {type === 'supplier' && <>
        {field('name','Business name',<input name="name" placeholder="Supplier legal name"/>)}
        {field('email','Business email',<input name="email" type="email" placeholder="finance@supplier.com"/>)}
        <div className="full">{field('address','Business address',<input name="address" placeholder="Street, city, country"/>)}</div>
        <label className="field">Supplier category<select name="category"><option>Software</option><option>Professional services</option><option>Logistics</option><option>Infrastructure</option></select></label>
        <label className="field">Verification reference<input name="reference" placeholder="Registration or KYB reference"/></label>
        <div className="full">{field('wallet','Payout wallet address',<input name="wallet" placeholder="Solana base58 address" />)}</div>
        <label className="field full">Additional notes<textarea name="notes" placeholder="Optional supplier context"/></label>
      </>}
      {type === 'agent' && <>
        {field('name','Agent name',<input name="name" placeholder="e.g. Treasury Agent"/>)}
        {field('identifier','Agent identifier',<input name="identifier" placeholder="agt_…"/>)}
        <label className="field full">Description<textarea name="description" placeholder="Describe this agent’s payment responsibilities."/></label>
        {field('request','Per-request limit',<input name="request" type="number" min="1" placeholder="10000"/>)}
        {field('daily','Daily spending limit',<input name="daily" type="number" min="1" placeholder="25000"/>)}
        <label className="field">Initial status<select name="status"><option>Active</option><option>Disabled</option></select></label>
        <label className="field">Assigned policy<select name="policy"><option>Standard payment controls</option><option>High-value review</option><option>Supplier restricted</option></select></label>
      </>}
    </div>
    <div className="modal-actions"><button type="button" className="btn secondary" onClick={onCancel}>Cancel</button><button className="btn primary" type="submit">{type === 'invoice' ? 'Register invoice' : type === 'supplier' ? 'Add supplier' : 'Authorize agent'}</button></div>
  </form>
}
