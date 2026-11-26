import { useEngineStatus } from './fallback'
import type { EngineName } from './status'

/**
 * Small "Mock data" badge rendered wherever a degraded/mock engine feeds a screen.
 * Reuses existing class structure to adhere to Frozen UI rules.
 */
export function MockDataBadge({ engine }: { engine: EngineName }) {
  const status = useEngineStatus(engine)
  if (status.mode === 'live') return null

  const isDegraded = status.mode === 'degraded'
  const title = isDegraded
    ? `Live engine degraded: ${status.error || 'Transport error'}. Running on mock data.`
    : `Engine configured to mock.`

  return (
    <span
      className={`status ${isDegraded ? 'review-required' : 'pending'}`}
      title={title}
      style={{ marginLeft: 8, fontSize: '11px', padding: '2px 8px', verticalAlign: 'middle', cursor: 'help' }}
    >
      <i />
      {isDegraded ? 'Mock data (Degraded)' : 'Mock data'}
    </span>
  )
}
