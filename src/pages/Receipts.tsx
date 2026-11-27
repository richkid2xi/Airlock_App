import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../ui/Icon'
import { Status } from '../ui/Status'
import { PageHeading } from '../ui/PageHeading'
import { receiptsEngine } from '../engines/receipts/index'

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

type ReceiptRow = {
  id: string
  evaluationId: string
  invoiceId: string
  supplierId: string
  agentId: string
  payeeWallet: string
  amountMinor: string
  currency: string
  status: string
  issuedAt: string
  issuedBy: string
}

export function Receipts({ notify }: { notify: (m: string) => void }) {
  const [receipts, setReceipts] = useState<ReceiptRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyId, setVerifyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await receiptsEngine.listReceipts()
      setReceipts((data ?? []) as ReceiptRow[])
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

  const content = (
    <>
      <PageHeading title="Receipts" description="Issued receipts and integrity verification." />
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
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Issued</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, color: '#6c757d' }}>Verify</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{r.payeeWallet.slice(0, 12)}…{r.payeeWallet.slice(-4)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{formatMinor(r.amountMinor, r.currency)} {r.currency}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}><Status>{r.status}</Status></td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#6c757d' }}>{new Date(r.issuedAt).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      <button className="btn secondary" onClick={() => handleVerify(r.id)} disabled={verifyId === r.id} style={{ padding: '4px 8px', fontSize: 11 }}>
                        {verifyId === r.id ? 'Verifying...' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, padding: '12px 16px', fontSize: 12, color: '#6c757d' }}>
            Integrity is verified by recomputing the content hash from the stored snapshot and comparing against the stored content hash.
          </div>
        </div>
      </div>
    </>
  )

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-head"><div><h1>Receipts</h1><p>Issued receipts and integrity verification.</p></div></div>
        <div style={{ padding: 24, textAlign: 'center' }}>Loading receipts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-head"><div><h1>Receipts</h1><p>Issued receipts and integrity verification.</p></div></div>
        <div style={{ padding: 24, color: '#ef4444' }}>{error}</div>
      </div>
    )
  }

  return content
}
