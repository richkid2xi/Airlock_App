import { describe, it, expect } from 'vitest'
import { settlementEngine } from './index'
import { SOLANA_DEVNET_USDC_MINT } from '../../domain/types'

describe('Settlement Engine: Solana Devnet & USDC SPL integration', () => {
  it('reports devnet cluster and verified Circle USDC mint', () => {
    expect(settlementEngine.getCluster()).toBe('devnet')
    expect(settlementEngine.getUsdcMint()).toBe(SOLANA_DEVNET_USDC_MINT)
    expect(SOLANA_DEVNET_USDC_MINT).toBe('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
  })

  it('executes mock settlement and returns receipt', async () => {
    const receipt = await settlementEngine.executeSettlement({
      requestId: 'req-2048',
      invoiceNumber: 'INV-2048',
      supplierName: 'Vercel Inc.',
      destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amountUnits: '12480000000',
    })

    expect(receipt.cluster).toBe('devnet')
    expect(receipt.signature).toBeDefined()
    expect(receipt.mint).toBe(SOLANA_DEVNET_USDC_MINT)
    expect(receipt.amountUnits).toBe('12480000000')
  })

  it('records human approval on HOLD payment', async () => {
    const approval = await settlementEngine.approveHoldRequest(
      'INV-2045',
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    )
    expect(approval.decision).toBe('ALLOW')
    expect(approval.reviewedBy).toBe('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
  })

  it('records human rejection on HOLD payment', async () => {
    const rejection = await settlementEngine.rejectHoldRequest(
      'INV-2045',
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      'Disputed delivery quantity'
    )
    expect(rejection.decision).toBe('BLOCK')
    expect(rejection.notes).toContain('Disputed')
  })
})
