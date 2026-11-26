import { describe, it, expect } from 'vitest'
import { invoiceEngine } from './index'
import { toMinorUnits } from '../../domain/money'

describe('Invoice Engine', () => {
  it('lists registered invoices with seed data', async () => {
    const list = await invoiceEngine.listInvoices()
    expect(list.length).toBeGreaterThan(0)
    expect(list.some(inv => inv.number === 'INV-2048')).toBe(true)
  })

  it('retrieves an invoice by number', async () => {
    const inv = await invoiceEngine.getInvoiceByNumber('INV-2048')
    expect(inv).not.toBeNull()
    expect(inv?.number).toBe('INV-2048')
    expect(inv?.amountUnits).toBe('12480000000')
  })

  it('creates a new invoice and prevents duplicate invoice numbers', async () => {
    const newNumber = `INV-${Date.now()}`
    const created = await invoiceEngine.createInvoice({
      number: newNumber,
      supplierName: 'Amazon Web Services',
      amountUnits: toMinorUnits('5000.00'),
      issueDate: 'May 20, 2025',
      dueDate: 'June 04, 2025',
      documentRef: 'ipfs://bafytest',
    })
    expect(created.number).toBe(newNumber)
    expect(created.status).toBe('Open')

    await expect(
      invoiceEngine.createInvoice({
        number: newNumber,
        supplierName: 'Amazon Web Services',
        amountUnits: toMinorUnits('5000.00'),
        issueDate: 'May 20, 2025',
        dueDate: 'June 04, 2025',
      })
    ).rejects.toThrow(/already registered/)
  })

  it('updates invoice status (e.g. Attested, Disputed)', async () => {
    const inv = await invoiceEngine.updateInvoiceStatus('INV-2051', 'Attested')
    expect(inv.status).toBe('Attested')

    const reloaded = await invoiceEngine.getInvoiceByNumber('INV-2051')
    expect(reloaded?.status).toBe('Attested')
  })
})
