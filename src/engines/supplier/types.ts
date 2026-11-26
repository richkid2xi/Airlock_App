import type { Supplier, SupplierVerificationStatus } from '../../domain/types'

export interface CreateSupplierParams {
  name: string
  payoutWallet: string
  email?: string
  address?: string
  category?: string
  verificationRef?: string
  notes?: string
}

export interface SupplierEnginePort {
  listSuppliers(): Promise<Supplier[]>
  getSupplierById(id: string): Promise<Supplier | null>
  getSupplierByName(name: string): Promise<Supplier | null>
  createSupplier(params: CreateSupplierParams): Promise<Supplier>
  verifySupplier(idOrName: string): Promise<Supplier>
  updatePayoutWallet(idOrName: string, wallet: string): Promise<Supplier>
}
