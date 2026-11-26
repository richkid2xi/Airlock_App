import type { Supplier } from '../../domain/types'
import { SEED_SUPPLIERS } from '../../domain/seed'
import type { SupplierEnginePort, CreateSupplierParams } from './types'

const STORAGE_KEY = 'airlock-suppliers-typed'

export class MockSupplierEngine implements SupplierEnginePort {
  private suppliers: Supplier[] = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const saved = typeof window !== 'undefined' ? window.sessionStorage?.getItem(STORAGE_KEY) : null
      if (saved) {
        this.suppliers = JSON.parse(saved)
        return
      }
    } catch {
      // ignore
    }
    this.suppliers = [...SEED_SUPPLIERS]
  }

  private persist() {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(this.suppliers))
      }
    } catch {
      // ignore
    }
  }

  async listSuppliers(): Promise<Supplier[]> {
    return [...this.suppliers]
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    const s = this.suppliers.find(x => x.id === id || x.name === id)
    return s ? { ...s } : null
  }

  async getSupplierByName(name: string): Promise<Supplier | null> {
    const s = this.suppliers.find(x => x.name.toLowerCase() === name.toLowerCase())
    return s ? { ...s } : null
  }

  async createSupplier(params: CreateSupplierParams): Promise<Supplier> {
    const existing = await this.getSupplierByName(params.name)
    if (existing) {
      throw new Error(`Supplier ${params.name} already exists`)
    }

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: params.name,
      payoutWallet: params.payoutWallet,
      verificationStatus: 'Unverified',
      operationalStatus: 'Pending',
      invoiceCount: 0,
      lastPaymentDate: 'Never',
      email: params.email,
      address: params.address,
      category: params.category,
      verificationRef: params.verificationRef,
      notes: params.notes,
    }

    this.suppliers = [newSupplier, ...this.suppliers]
    this.persist()
    return newSupplier
  }

  async verifySupplier(idOrName: string): Promise<Supplier> {
    const idx = this.suppliers.findIndex(s => s.id === idOrName || s.name === idOrName)
    if (idx === -1) throw new Error(`Supplier ${idOrName} not found`)

    const updated: Supplier = {
      ...this.suppliers[idx],
      verificationStatus: 'Verified',
      operationalStatus: 'Active',
    }
    this.suppliers[idx] = updated
    this.persist()
    return updated
  }

  async updatePayoutWallet(idOrName: string, wallet: string): Promise<Supplier> {
    const idx = this.suppliers.findIndex(s => s.id === idOrName || s.name === idOrName)
    if (idx === -1) throw new Error(`Supplier ${idOrName} not found`)

    const updated: Supplier = {
      ...this.suppliers[idx],
      payoutWallet: wallet,
    }
    this.suppliers[idx] = updated
    this.persist()
    return updated
  }
}

export const mockSupplierEngine = new MockSupplierEngine()
