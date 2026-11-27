import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FakeWalletSource, toSupabaseWallet } from './walletSource'

describe('FakeWalletSource', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('lists configured wallets', () => {
    const source = new FakeWalletSource({
      Phantom: { publicKey: 'FPK', network: 'devnet' },
      Solflare: { publicKey: 'SPK', network: 'devnet' },
    })
    const names = source.list().map((w) => w.name).sort()
    expect(names).toEqual(['Phantom', 'Solflare'])
  })

  it('connect returns the configured account and emits', async () => {
    const source = new FakeWalletSource({ Phantom: { publicKey: 'FPK', network: 'devnet' } })
    const calls: any[] = []
    source.onAccountChange((acc) => calls.push(acc))

    const acc = await source.connect('Phantom')
    expect(acc.publicKey).toBe('FPK')
    expect(source.getAccount()?.publicKey).toBe('FPK')
    expect(source.getSigner()).not.toBeNull()
    expect(calls[calls.length - 1]?.publicKey).toBe('FPK')
  })

  it('signer signMessage returns a signature', async () => {
    const source = new FakeWalletSource({ Phantom: { publicKey: 'FPK' } })
    await source.connect('Phantom')
    const sig = await source.getSigner()!.signMessage(new Uint8Array([1, 2, 3]))
    expect(sig.length).toBe(64)
  })

  it('disconnect clears account', async () => {
    const source = new FakeWalletSource({ Phantom: { publicKey: 'FPK' } })
    await source.connect('Phantom')
    await source.disconnect()
    expect(source.getAccount()).toBeNull()
    expect(source.getSigner()).toBeNull()
  })

  it('connect rejects unknown wallet', async () => {
    const source = new FakeWalletSource({ Phantom: { publicKey: 'FPK' } })
    await expect(source.connect('Solflare')).rejects.toThrow(/not configured/)
  })
})

describe('toSupabaseWallet', () => {
  it('binds signMessage and signIn so they work when called detached', async () => {
    const adapter = {
      publicKey: { toBase58: () => 'PUBKEY_BASE58' },
      signMessage: async function (this: unknown, _msg: Uint8Array) {
        if (this !== adapter) throw new Error('signMessage: this lost')
        return new Uint8Array(64).fill(1)
      },
      signIn: async function (this: unknown, _input: unknown) {
        if (this !== adapter) throw new Error('signIn: this lost')
        return { signedMessage: new Uint8Array([1, 2, 3]), signature: new Uint8Array(64).fill(2) }
      },
    }

    const wallet = toSupabaseWallet(adapter)

    const sig = await wallet.signMessage!(new Uint8Array([9]))
    expect(sig).toBeInstanceOf(Uint8Array)

    const out = await wallet.signIn!({ statement: 'x' })
    expect(out).toBeDefined()

    expect(wallet.publicKey!.toBase58()).toBe('PUBKEY_BASE58')
  })

  it('omits keys the adapter does not define', () => {
    const wallet = toSupabaseWallet({ publicKey: { toBase58: () => 'PK' } })
    expect('signIn' in wallet).toBe(false)
    expect('signMessage' in wallet).toBe(false)
    expect(wallet.publicKey!.toBase58()).toBe('PK')
  })
})
