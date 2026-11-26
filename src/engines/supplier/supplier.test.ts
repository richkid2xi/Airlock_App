import { describe, it, expect } from 'vitest'
import { supplierEngine } from './index'

describe('Supplier Engine', () => {
  it('lists registered suppliers', async () => {
    const suppliers = await supplierEngine.listSuppliers()
    expect(suppliers.length).toBeGreaterThan(0)
    expect(suppliers.some(s => s.name === 'Vercel Inc.')).toBe(true)
  })

  it('verifies a supplier', async () => {
    const updated = await supplierEngine.verifySupplier('Atlas Freight')
    expect(updated.verificationStatus).toBe('Verified')
    expect(updated.operationalStatus).toBe('Active')

    const reloaded = await supplierEngine.getSupplierByName('Atlas Freight')
    expect(reloaded?.verificationStatus).toBe('Verified')
  })

  it('updates payout destination wallet', async () => {
    const newWallet = 'SolanaDestinationWallet11111111111111111111'
    const updated = await supplierEngine.updatePayoutWallet('Neon Systems', newWallet)
    expect(updated.payoutWallet).toBe(newWallet)
  })

  it('creates a new supplier with initial Unverified status', async () => {
    const name = `New Supplier ${Date.now()}`
    const created = await supplierEngine.createSupplier({
      name,
      payoutWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      email: 'finance@newsupplier.com',
      address: '100 Tech Way',
    })
    expect(created.name).toBe(name)
    expect(created.verificationStatus).toBe('Unverified')
    expect(created.operationalStatus).toBe('Pending')
  })
})
