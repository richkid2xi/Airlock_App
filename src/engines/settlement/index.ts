import type { SettlementEnginePort, SettlementParams, SettlementReceipt, Approval } from './types'
import { withFallback } from '../fallback'
import { mockSettlementEngine } from './mock'
import { liveSettlementEngine } from './live'

export * from './types'

class SettlementEngineProxy implements SettlementEnginePort {
  getCluster(): 'devnet' {
    return 'devnet'
  }

  getUsdcMint(): string {
    return liveSettlementEngine.getUsdcMint()
  }

  async executeSettlement(params: SettlementParams): Promise<SettlementReceipt> {
    return withFallback(
      'settlement',
      () => liveSettlementEngine.executeSettlement(params),
      () => mockSettlementEngine.executeSettlement(params)
    )
  }

  async approveHoldRequest(requestId: string, reviewerWallet: string): Promise<Approval> {
    return withFallback(
      'settlement',
      () => liveSettlementEngine.approveHoldRequest(requestId, reviewerWallet),
      () => mockSettlementEngine.approveHoldRequest(requestId, reviewerWallet)
    )
  }

  async rejectHoldRequest(requestId: string, reviewerWallet: string, reason?: string): Promise<Approval> {
    return withFallback(
      'settlement',
      () => liveSettlementEngine.rejectHoldRequest(requestId, reviewerWallet, reason),
      () => mockSettlementEngine.rejectHoldRequest(requestId, reviewerWallet, reason)
    )
  }
}

export const settlementEngine: SettlementEnginePort = new SettlementEngineProxy()
