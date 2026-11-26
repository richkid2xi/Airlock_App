import type { Supplier } from '../../domain/types'
import type { SupplierEnginePort, CreateSupplierParams } from './types'

/**
 * Live Supplier Engine
 * Reaches remote registry or Anchor on-chain destination allowlist.
 */
export class LiveSupplierEngine implements SupplierEnginePort {
  private apiUrl: string

  constructor() {
    this.apiUrl = (import.meta as any).env?.VITE_SUPPLIER_API_URL || ''
  }

  async listSuppliers(): Promise<Supplier[]> {
    if (!this.apiUrl) throw new Error('VITE_SUPPLIER_API_URL is not configured')
    const res = await fetch(`${this.apiUrl}/suppliers`)
    if (!res.ok) throw new Error(`Suppliers fetch failed: ${res.statusText}`)
    return await res.json()
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    if (!this.apiUrl) throw new Error('VITE_SUPPLIER_API_URL is not configured')
    const res = await fetch(`${this.apiUrl}/suppliers/${encodeURIComponent(id)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Supplier lookup failed: ${res.statusText}`)
    return await res.json()
  }

  async getSupplierByName(name: string): Promise<Supplier | null> {
    return this.getSupplierById(name)
  }

  async createSupplier(params: CreateSupplierParams): Promise<Supplier> {
    if (!this.apiUrl) throw new Error('VITE_SUPPLIER_API_URL is not configured')
    const res = await fetch(`${this.apiUrl}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!res.ok) throw new Error(`Supplier creation failed: ${res.statusText}`)
    return await res.json()
  }

  async verifySupplier(idOrName: string): Promise<Supplier> {
    if (!this.apiUrl) throw new Error('VITE_SUPPLIER_API_URL is not configured')
    const res = await fetch(`${this.apiUrl}/suppliers/${encodeURIComponent(idOrName)}/verify`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error(`Supplier verify failed: ${res.statusText}`)
    return await res.json()
  }

  async updatePayoutWallet(idOrName: string, wallet: string): Promise<Supplier> {
    if (!this.apiUrl) throw new Error('VITE_SUPPLIER_API_URL is not configured')
    const res = await fetch(`${this.apiUrl}/suppliers/${encodeURIComponent(idOrName)}/wallet`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    })
    if (!res.ok) throw new Error(`Supplier wallet update failed: ${res.statusText}`)
    return await res.json()
  }
}

export const liveSupplierEngine = new LiveSupplierEngine()
