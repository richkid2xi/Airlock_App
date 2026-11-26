import type { Invoice, InvoiceStatus } from '../../domain/types'
import { SEED_INVOICES } from '../../domain/seed'
import type { InvoiceEnginePort, CreateInvoiceParams } from './types'

const STORAGE_KEY = 'airlock-invoices-typed'

export class MockInvoiceEngine implements InvoiceEnginePort {
  private invoices: Invoice[] = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const saved = typeof window !== 'undefined' ? window.sessionStorage?.getItem(STORAGE_KEY) : null
      if (saved) {
        this.invoices = JSON.parse(saved)
        return
      }
    } catch {
      // ignore
    }
    this.invoices = [...SEED_INVOICES]
  }

  private persist() {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(this.invoices))
      }
    } catch {
      // ignore
    }
  }

  async listInvoices(): Promise<Invoice[]> {
    return [...this.invoices]
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const inv = this.invoices.find(i => i.id === id || i.number === id)
    return inv ? { ...inv } : null
  }

  async getInvoiceByNumber(number: string): Promise<Invoice | null> {
    const inv = this.invoices.find(i => i.number.toLowerCase() === number.toLowerCase())
    return inv ? { ...inv } : null
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    const existing = await this.getInvoiceByNumber(params.number)
    if (existing) {
      throw new Error(`Invoice number ${params.number} is already registered`)
    }

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      number: params.number,
      supplierId: `sup-${params.supplierName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      supplierName: params.supplierName,
      amountUnits: params.amountUnits,
      currency: params.currency || 'USDC',
      issueDate: params.issueDate,
      dueDate: params.dueDate,
      status: 'Open',
      documentRef: params.documentRef,
      notes: params.notes,
    }

    this.invoices = [newInvoice, ...this.invoices]
    this.persist()
    return newInvoice
  }

  async updateInvoiceStatus(idOrNumber: string, status: InvoiceStatus): Promise<Invoice> {
    const idx = this.invoices.findIndex(i => i.id === idOrNumber || i.number === idOrNumber)
    if (idx === -1) {
      throw new Error(`Invoice ${idOrNumber} not found`)
    }
    const updated: Invoice = { ...this.invoices[idx], status }
    this.invoices[idx] = updated
    this.persist()
    return updated
  }
}

export const mockInvoiceEngine = new MockInvoiceEngine()
