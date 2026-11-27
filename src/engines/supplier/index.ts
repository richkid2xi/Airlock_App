import type { Supplier } from '../../domain/types'
import type { SupplierEnginePort, CreateSupplierParams } from './types'
import { liveSupplierEngine } from './live'

export * from './types'

export const supplierEngine: SupplierEnginePort = liveSupplierEngine
