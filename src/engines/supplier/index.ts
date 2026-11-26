import type { Supplier } from '../../domain/types'
import { withFallback } from '../fallback'
import type { SupplierEnginePort, CreateSupplierParams } from './types'
import { mockSupplierEngine } from './mock'
import { liveSupplierEngine } from './live'

export * from './types'

class SupplierEngineProxy implements SupplierEnginePort {
  async listSuppliers(): Promise<Supplier[]> {
    return withFallback('supplier', () => liveSupplierEngine.listSuppliers(), () => mockSupplierEngine.listSuppliers())
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    return withFallback('supplier', () => liveSupplierEngine.getSupplierById(id), () => mockSupplierEngine.getSupplierById(id))
  }

  async getSupplierByName(name: string): Promise<Supplier | null> {
    return withFallback('supplier', () => liveSupplierEngine.getSupplierByName(name), () => mockSupplierEngine.getSupplierByName(name))
  }

  async createSupplier(params: CreateSupplierParams): Promise<Supplier> {
    return withFallback('supplier', () => liveSupplierEngine.createSupplier(params), () => mockSupplierEngine.createSupplier(params))
  }

  async verifySupplier(idOrName: string): Promise<Supplier> {
    return withFallback('supplier', () => liveSupplierEngine.verifySupplier(idOrName), () => mockSupplierEngine.verifySupplier(idOrName))
  }

  async updatePayoutWallet(idOrName: string, wallet: string): Promise<Supplier> {
    return withFallback('supplier', () => liveSupplierEngine.updatePayoutWallet(idOrName, wallet), () => mockSupplierEngine.updatePayoutWallet(idOrName, wallet))
  }
}

export const supplierEngine: SupplierEnginePort = new SupplierEngineProxy()
