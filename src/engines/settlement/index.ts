import type { SettlementEnginePort, SettlementParams, SettlementReceipt, Approval } from './types'
import { liveSettlementEngine } from './live'

export * from './types'

export const settlementEngine: SettlementEnginePort = liveSettlementEngine
