import { useEngine, type EngineName } from './registry'

export function MockBadge({ engine }: { engine: EngineName }) {
  const state = useEngine(engine)
  if (state.mode === 'live') return null

  const isDegraded = state.mode === 'degraded'
  const title = isDegraded
    ? `Live engine degraded: ${state.error || 'Transport error'}. Running on mock data.`
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
