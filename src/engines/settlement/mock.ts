import { SOLANA_DEVNET_USDC_MINT } from '../../domain/types'
import type { SettlementEnginePort, SettlementParams, SettlementReceipt } from './types'
import type { Approval } from '../../domain/types'

export class MockSettlementEngine implements SettlementEnginePort {
  getCluster(): 'devnet' {
    return 'devnet'
  }

  getUsdcMint(): string {
    return SOLANA_DEVNET_USDC_MINT
  }

  async executeSettlement(params: SettlementParams): Promise<SettlementReceipt> {
    // Simulated Solana Devnet transaction receipt
    const mockSig = `5K${Math.random().toString(36).slice(2, 12)}Z${Date.now()}X${Math.random().toString(36).slice(2, 12)}`
    return {
      signature: mockSig,
      cluster: 'devnet',
      slot: Math.floor(250000000 + Math.random() * 1000000),
      amountUnits: params.amountUnits,
      destinationWallet: params.destinationWallet,
      mint: SOLANA_DEVNET_USDC_MINT,
      timestamp: new Date().toISOString(),
    }
  }

  async approveHoldRequest(requestId: string, reviewerWallet: string): Promise<Approval> {
    return {
      id: `appr-${Date.now()}`,
      requestId,
      invoiceNumber: requestId,
      agentName: 'AP Assistant',
      supplierName: 'Atlas Freight',
      amountUnits: '8920000000',
      decision: 'ALLOW',
      reviewedBy: reviewerWallet,
      reviewedAt: new Date().toISOString(),
    }
  }

  async rejectHoldRequest(requestId: string, reviewerWallet: string, reason?: string): Promise<Approval> {
    return {
      id: `appr-${Date.now()}`,
      requestId,
      invoiceNumber: requestId,
      agentName: 'AP Assistant',
      supplierName: 'Atlas Freight',
      amountUnits: '8920000000',
      decision: 'BLOCK',
      reviewedBy: reviewerWallet,
      reviewedAt: new Date().toISOString(),
      notes: reason || 'Rejected by authorized reviewer',
    }
  }
}

export const mockSettlementEngine = new MockSettlementEngine()
