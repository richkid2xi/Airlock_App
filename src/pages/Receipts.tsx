import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { receiptsEngine } from '../engines/receipts/index'
import { chainEngine } from '../engines/chain/index'
import type { Receipt } from '../engines/receipts/types'
import { AnchorError } from '../engines/chain/types'

function formatMinor(amount: string, currency: string): string {
  try {
    const dec = currency === 'USDC' ? 6 : 2
    const big = BigInt(amount)
    const neg = big < 0
    const abs = neg ? -big : big
    const div = BigInt(10 ** dec)
    const whole = (abs / div).toString()
    const frac = (abs % div).toString().padStart(dec, '0')
    return `${neg ? '-' : ''}${whole}.${frac}`
  } catch {
    return amount
  }
}

function shorten(sig: string): string {
  return sig.length > 16 ? `${sig.slice(0, 8)}…${sig.slice(-6)}` : sig
}

export function Receipts({ notify }: { notify: (m: string) => void }) {
  const [receipts, setReceipts] = useState<Receipt[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyId, setVerifyId] = useState<string | null>(null)
  const [anchorId, setAnchorId] = useState<string | null>(null)
  const [onchainChecking, setOnchainChecking] = useState<string | null>(null)
  const { wallet, connected, publicKey } = useWallet()
  const { connection } = useConnection()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await receiptsEngine.listReceipts()
      setReceipts(data ?? [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleVerify = async (id: string) => {
    setVerifyId(id)
    setError(null)
    try {
      const ok = await receiptsEngine.verifyReceipt(id)
      notify(ok ? 'Receipt verified.' : 'Receipt failed integrity check.')
    } catch (err) {
      setError(String(err))
    } finally {
      setVerifyId(null)
    }
  }

  const handleAnchor = async (r: Receipt) => {
    if (!r.contentHash) {
      setError('Receipt has no content hash to anchor.')
      return
    }
    if (!wallet || !connected || !publicKey) {
      setError('Connect a wallet to anchor this receipt on Solana.')
      return
    }
    setAnchorId(r.id)
    setError(null)
    try {
      const adapter = wallet.adapter as any
      const anchorWallet: any = {
        publicKey,
        signTransaction: async (tx: any) => {
          if (!adapter.signTransaction) throw new Error('Wallet cannot sign transactions')
          return adapter.signTransaction(tx)
        },
      }
      const result = await chainEngine.anchorReceipt(
        { receiptId: r.id, contentHash: r.contentHash },
        anchorWallet,
      )
      notify(`Receipt anchored on Solana: ${shorten(result.signature)}`)
      await load()
    } catch (err) {
      if (err instanceof AnchorError) {
        setError(`${err.code}: ${err.message}`)
      } else {
        setError(String(err))
      }
    } finally {
      setAnchorId(null)
    }
  }

  const handleVerifyOnchain = async (r: Receipt) => {
    if (!r.anchorSignature || !r.contentHash) return
    setOnchainChecking(r.id)
    setError(null)
    try {
      const ok = await chainEngine.verifyAnchor(r.id, r.anchorSignature, r.contentHash)
      notify(ok ? 'Anchor verified on-chain.' : 'Anchor does not match on-chain data.')
    } catch (err) {
      setError(err instanceof AnchorError ? `${err.code}: ${err.message}` : String(err))
    } finally {
      setOnchainChecking(null)
    }
  }

  const content = (
    <>
      <PageHeading title="Receipts" description="Issued receipts, integrity verification, and Solana anchoring." />
      <div className="panel">
        <div className="panel-head"><div><h2>Issued receipts</h2><p>Receipts are issued when an approved evaluation triggers settlement.</p></div></div>
        <div style={{ padding: '16px 18px' }}>
          {(!receipts || receipts.length === 0) ? (
            <div className="empty-state"><Icon name="check" /><b>No receipts yet.</b><p>Receipts are issued when an approved evaluation triggers settlement.</p></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Payee</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Amount</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Status</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Anchoring</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Issued</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.payeeWallet.slice(0, 12)}…{r.payeeWallet.slice(-4)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{formatMinor(r.amountMinor, r.currency)} {r.currency}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}><Status>{r.status}</Status></td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {r.anchorSignature ? (
                        <a
                          href={chainEngine.explorerUrl(r.anchorSignature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#087f98', fontSize: 12, textDecoration: 'none' }}
                          title={r.anchorSignature}
                        >
                          Anchored on Solana ↗
                        </a>
                      ) : (
                        <span style={{ color: '#6c757d', fontSize: 12 }}>Not anchored</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#6c757d' }}>{new Date(r.issuedAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn secondary" onClick={() => handleVerify(r.id)} disabled={verifyId === r.id} style={{ padding: '4px 8px', fontSize: 11 }}>
                        {verifyId === r.id ? 'Verifying...' : 'Verify'}
                      </button>
                      {!r.anchorSignature ? (
                        <button
                          className="btn primary"
                          onClick={() => handleAnchor(r)}
                          disabled={anchorId === r.id || !connected || !r.contentHash}
                          title={!connected ? 'Connect a wallet to anchor' : undefined}
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          {anchorId === r.id ? 'Anchoring...' : 'Anchor on Solana'}
                        </button>
                      ) : (
                        <button className="btn secondary" onClick={() => handleVerifyOnchain(r)} disabled={onchainChecking === r.id} style={{ padding: '4px 8px', fontSize: 11 }}>
                          {onchainChecking === r.id ? 'Checking...' : 'Verify on-chain'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, padding: '12px 16px', fontSize: 12, color: '#6c757d' }}>
            Integrity is verified by recomputing the content hash from the stored snapshot and comparing against the stored content hash.
            Anchoring writes that hash to Solana devnet via the SPL Memo program. Anchoring does not move funds; the receipt stays authorized.
          </div>
        </div>
      </div>
    </>
  )

  if (loading && !receipts) {
    return (
      <div className="panel">
        <div className="panel-head"><div><h1>Receipts</h1><p>Issued receipts and integrity verification.</p></div></div>
        <div style={{ padding: 24, textAlign: 'center' }}>Loading receipts...</div>
      </div>
    )
  }

  if (error && !receipts) {
    return (
      <div className="panel">
        <div className="panel-head"><div><h1>Receipts</h1><p>Issued receipts and integrity verification.</p></div></div>
        <div style={{ padding: 24, color: '#ef4444' }}>{error}</div>
      </div>
    )
  }

  return content
}
