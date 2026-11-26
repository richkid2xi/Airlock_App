import type { Invoice, InvoiceStatus } from '../../domain/types'

export interface CreateInvoiceParams {
  number: string
  supplierName: string
  amountUnits: string // minor units
  currency?: string
  issueDate: string
  dueDate: string
  documentRef?: string
  notes?: string
}

export interface InvoiceEnginePort {
  listInvoices(): Promise<Invoice[]>
  getInvoiceById(id: string): Promise<Invoice | null>
  getInvoiceByNumber(number: string): Promise<Invoice | null>
  createInvoice(params: CreateInvoiceParams): Promise<Invoice>
  updateInvoiceStatus(idOrNumber: string, status: InvoiceStatus): Promise<Invoice>
}
