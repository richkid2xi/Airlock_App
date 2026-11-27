import type { Invoice, InvoiceStatus } from '../../domain/types'
import type { InvoiceEnginePort, CreateInvoiceParams } from './types'

/**
 * Live Invoice Engine
 * Communicates with backend/on-chain registry.
 */
export class LiveInvoiceEngine implements InvoiceEnginePort {
  private apiUrl: string

  constructor() {
    this.apiUrl = (import.meta as any).env?.VITE_INVOICE_API_URL || ''
  }

  async listInvoices(): Promise<Invoice[]> {
    if (!this.apiUrl) {
      throw new Error('VITE_INVOICE_API_URL is not configured; live invoice engine unreachable')
    }
    const res = await fetch(`${this.apiUrl}/invoices`)
    if (!res.ok) throw new Error(`Invoice fetch failed: ${res.statusText}`)
    return await res.json()
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    if (!this.apiUrl) {
      throw new Error('VITE_INVOICE_API_URL is not configured')
    }
    const res = await fetch(`${this.apiUrl}/invoices/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Invoice lookup failed: ${res.statusText}`)
    return await res.json()
  }

  async getInvoiceByNumber(number: string): Promise<Invoice | null> {
    return this.getInvoiceById(number)
  }

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    if (!this.apiUrl) {
      throw new Error('VITE_INVOICE_API_URL is not configured')
    }
    const res = await fetch(`${this.apiUrl}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) throw new Error(`Invoice creation failed: ${res.statusText}`)
    return await res.json()
  }

  async updateInvoiceStatus(idOrNumber: string, status: InvoiceStatus): Promise<Invoice> {
    if (!this.apiUrl) {
      throw new Error('VITE_INVOICE_API_URL is not configured')
    }
    const res = await fetch(`${this.apiUrl}/invoices/${encodeURIComponent(idOrNumber)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error(`Invoice status update failed: ${res.statusText}`)
    return await res.json()
  }
}

export const liveInvoiceEngine = new LiveInvoiceEngine()
