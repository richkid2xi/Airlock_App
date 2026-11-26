import { useRoute } from '../router/useRoute'

export function Landing() {
  const { navigate } = useRoute()

  return (
    <div className="landing-placeholder" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h1>Airlock</h1>
      <p style={{ maxWidth: '600px', margin: '1rem auto' }}>
        Security layer for invoice-bound payments initiated by AI agents, on Solana.
        Pay the invoice, not the prompt.
      </p>
      <div style={{ marginTop: '2rem' }}>
        <button className="btn primary" onClick={() => navigate('/connect')}>
          Launch App / Connect
        </button>
      </div>
    </div>
  )
}
