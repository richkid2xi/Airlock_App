import { useState, useEffect } from 'react'
import { registryEngine } from '../engines/registry/index'
import { receiptsEngine } from '../engines/receipts/index'
import { Status } from '../ui/Status'
import { InProgress } from '../ui/InProgress'
import { FEATURES, type FeatureName } from '../config/features'
import { derivePipeline, type PipelineFeatureFlags } from '@airlock/shared/pipeline'
import { PageHeading } from '../ui/PageHeading'
import { Icon } from '../ui/Icon'

type PipelineCounts = {
  supplierCount: number
  verifiedSupplierCount: number
  invoiceCount: number
  openInvoiceCount: number
  attestedInvoiceCount: number
  requestCount: number
  heldCount: number
  receiptCount: number
  latestDecision?: string | null
  latestDecisionRule?: string | null
}

export function Pipeline({ navigate }: { navigate: (p: string) => void }) {
  const [counts, setCounts] = useState<PipelineCounts>({
    supplierCount: 0,
    verifiedSupplierCount: 0,
    invoiceCount: 0,
    openInvoiceCount: 0,
    attestedInvoiceCount: 0,
    requestCount: 0,
    heldCount: 0,
    receiptCount: 0,
    latestDecision: null,
    latestDecisionRule: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [anchoredCount, setAnchoredCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const [suppliers, invoices, receipts] = await Promise.all([
          registryEngine.suppliers.list(),
          registryEngine.invoices.list(),
          receiptsEngine.listReceipts(),
        ])
        const verifiedSupplierCount = suppliers.filter((s) => s.verificationStatus === 'verified').length
        const openInvoiceCount = invoices.filter((i) => i.status === 'open').length
        const attestedInvoiceCount = invoices.filter((i) => i.status === 'attested').length
        setAnchoredCount(receipts.filter((r) => r.anchorSignature).length)
        setCounts({
          supplierCount: suppliers.length,
          verifiedSupplierCount,
          invoiceCount: invoices.length,
          openInvoiceCount,
          attestedInvoiceCount,
          requestCount: 0,
          heldCount: 0,
          receiptCount: receipts.length,
          latestDecision: null,
          latestDecisionRule: null,
        })
      } catch (err) {
        setError(String(err))
      }
    }
    load()
  }, [])

  const flags: PipelineFeatureFlags = {
    registry: FEATURES.registry === 'live',
    requests: FEATURES.requests === 'live',
    evaluation: FEATURES.evaluation === 'live',
    approvals: FEATURES.approvals === 'live',
    chain: FEATURES.chain === 'live',
  }

  const steps = derivePipeline({ features: flags, ...counts })

  return <>
    <PageHeading title="Payment pipeline" description="Vertical sequence showing live status from real data across the payment flow." />
    <div className="panel">
      <div className="panel-head"><div><h2>Pipeline overview</h2><p>Each card reflects live data through the engines. In-progress steps describe what they will do.</p></div></div>
      <div style={{ padding: '16px 18px' }}>
        {steps.map((step) => (
          <div key={step.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{step.title}</span>
              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: '4px', background: step.live ? '#d1e7dd' : '#fff3cd', color: step.live ? '#0f5132' : '#856404' }}>
                {step.live ? 'LIVE' : 'IN PROGRESS'}
              </span>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <p style={{ fontSize: 13, color: '#525f7b', marginBottom: '8px' }}>{getSubtitle(step.id)}</p>
              <p style={{ fontSize: 12, color: '#343a40', marginBottom: '8px' }}>{step.detail}</p>
              {step.actionLabel && step.actionTo ? (
                <button className="btn primary" style={{ width: '100%', padding: '6px 10px', fontSize: 11 }} onClick={() => navigate(step.actionTo as string)}>
                  {step.actionLabel}
                </button>
              ) : null}
              {!step.actionLabel && step.status === 'Blocked' ? (
                <p style={{ fontSize: 11, color: '#dc2626' }}>{step.status}</p>
              ) : null}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: '12px 16px', fontSize: 12, color: '#6c757d' }}>
          Anchoring: <strong>{anchoredCount} anchored on Solana</strong>
          {anchoredCount > 0 ? (
            <div style={{ marginTop: 4 }}>
              On-chain settlement shows <strong>In progress</strong> until the chain feature is live; it never fabricates a transaction signature.
            </div>
          ) : null}
        </div>
      </div>
    </div>
    {error && <div style={{ padding: '12px 18px', color: '#ef4444' }}>{error}</div>}
    <div style={{ padding: '12px 18px' }}>
      <button className="btn primary" onClick={() => navigate('/app/attack-lab')} style={{ width: '100%', padding: '8px 14px' }}>
        <Icon name="flask" size={14} />{' '}
        Run the attack demo
      </button>
      <p style={{ fontSize: 12, color: '#6c757d', marginTop: 6 }}>Opens the Attack Lab where a simulated payment request is run through real evaluation controls.</p>
    </div>
  </>
}

function getSubtitle(id: string): string {
  switch (id) {
    case 'suppliers':
      return 'Verified payment counterparties'
    case 'invoices':
      return 'Open, attested and paid records'
    case 'agent-request':
      return 'Latest agent-initiated payment request'
    case 'decision':
      return 'Rule evaluation result for latest request'
    case 'approval':
      return 'Held items awaiting human decision'
    case 'receipt':
      return 'Issued receipts and integrity verification'
    case 'on-chain':
      return 'Solana Devnet USDC settlement status'
    default:
      return ''
  }
}

export function PipelineStatus({ module }: { module: FeatureName }): null {
  return null
}
