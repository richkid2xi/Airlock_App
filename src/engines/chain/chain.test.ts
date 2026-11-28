import { describe, it, expect } from 'vitest'
import { Connection } from '@solana/web3.js'
import {
  buildMemo,
  expectedMemo,
  MEMO_PREFIX,
  MEMO_PROGRAM_ID,
  LiveChainEngine,
  AnchorError,
} from './index'

describe('Chain Engine: Solana Receipt Anchoring', () => {
  describe('memo string', () => {
    it('builds airlock:v1:<receiptId>:<contentHash>', () => {
      expect(buildMemo('rcpt-123', 'abc123')).toBe('airlock:v1:rcpt-123:abc123')
      expect(expectedMemo('rcpt-123', 'abc123')).toBe('airlock:v1:rcpt-123:abc123')
    })

    it('uses the memo prefix constant', () => {
      expect(MEMO_PREFIX).toBe('airlock:v1')
    })

    it('uses the memo program constant', () => {
      expect(MEMO_PROGRAM_ID).toBe('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
    })
  })

  describe('LiveChainEngine.anchorReceipt', () => {
    it('throws wallet_not_connected when no wallet', async () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      await expect(
        engine.anchorReceipt({ receiptId: 'rcpt-1', contentHash: 'deadbeef' }, null),
      ).rejects.toBeInstanceOf(AnchorError)
    })

    it('rejects wallet rejection with AnchorError code wallet_rejected', async () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      const failingWallet = {
        publicKey: null,
        signTransaction: async () => { throw new Error('user rejected') },
      }
      // wallet without publicKey
      await expect(
        engine.anchorReceipt({ receiptId: 'rcpt-1', contentHash: 'deadbeef' }, failingWallet),
      ).rejects.toThrow()
    })
  })

  describe('LiveChainEngine.verifyAnchor', () => {
    it('returns false when transaction not found', async () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      // @ts-expect-error mock
      engine.connection = {
        getParsedTransaction: async () => null,
      } as any
      expect(await engine.verifyAnchor('rcpt-1', 'sig-1', 'hash-1')).toBe(false)
    })

    it('returns false when transaction meta has error', async () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      // @ts-expect-error mock
      engine.connection = {
        getParsedTransaction: async () => ({ meta: { err: { message: 'fail' } }, transaction: { message: { instructions: [] } } }),
      } as any
      expect(await engine.verifyAnchor('rcpt-1', 'sig-1', 'hash-1')).toBe(false)
    })

    it('returns false when memo does not match', async () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      // @ts-expect-error mock
      engine.connection = {
        getParsedTransaction: async () => ({
          meta: { err: null },
          transaction: { message: { instructions: [{ programId: { toString: () => MEMO_PROGRAM_ID }, parsed: 'different:memo' }] } },
        }),
      } as any
      expect(await engine.verifyAnchor('rcpt-1', 'sig-1', 'hash-1')).toBe(false)
    })

    it('returns true when memo matches', async () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      // @ts-expect-error mock
      engine.connection = {
        getParsedTransaction: async () => ({
          meta: { err: null },
          transaction: { message: { instructions: [{ programId: { toString: () => MEMO_PROGRAM_ID }, parsed: 'airlock:v1:rcpt-1:hash-1' }] } },
        }),
      } as any
      expect(await engine.verifyAnchor('rcpt-1', 'sig-1', 'hash-1')).toBe(true)
    })
  })

  describe('explorerUrl', () => {
    it('builds explorer url for signature', () => {
      const engine = new LiveChainEngine(new Connection('https://api.devnet.solana.com', 'confirmed'))
      const url = engine.explorerUrl('sig-abc')
      expect(url).toContain('sig-abc')
      expect(url).toContain('explorer.solana.com/tx/')
    })
  })
})
