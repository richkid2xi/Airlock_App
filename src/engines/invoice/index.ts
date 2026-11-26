import type { Invoice, InvoiceStatus } from '../../domain/types'
import { withFallback } from '../fallback'
import type { InvoiceEnginePort, CreateInvoiceParams } from './types'
import { mockInvoiceEngine } from './mock'
import { liveInvoiceEngine } from './live'

export * from './types'

class InvoiceEngineProxy implements InvoiceEnginePort {
  async listInvoices(): Promise<Invoice[]> {
    return withFallback('invoice', () => liveInvoiceEngine.listInvoices(), () => mockInvoiceEngine.listInvoices())
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    return withFallback('invoice', () => liveInvoiceEngine.getInvoiceById(id), () => mockInvoiceEngine.getInvoiceById(id))
  }

  async getInvoiceByNumber(number: string): Promise<Invoice | null> {
    return withFallback('invoice', () => liveInvoiceEngine.getInvoiceByNumber(number), () => mockInvoiceEngine.getInvoiceByNumber(number))
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    return withFallback('invoice', () => liveInvoiceEngine.createInvoice(params), () => mockInvoiceEngine.createInvoice(params))
  }

  async updateInvoiceStatus(idOrNumber: string, status: InvoiceStatus): Promise<Invoice> {
    return withFallback('invoice', () => liveInvoiceEngine.updateInvoiceStatus(idOrNumber, status), () => mockInvoiceEngine.updateInvoiceStatus(idOrNumber, status))
  }
}

export const invoiceEngine: InvoiceEnginePort = new InvoiceEngineProxy()
