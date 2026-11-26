import { useRoute } from '../router/useRoute'
import { Logo } from '../ui/Logo'
import './Landing.css'

export function Landing() {
  const { navigate } = useRoute()

  return (
    <div className="landing">
      <header className="landing-header">
        <Logo />
        <button className="landing-btn-secondary" onClick={() => navigate('/connect')}>
          Launch App
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-sky" aria-hidden="true" />
        <div className="landing-hero-content">
          <div className="landing-badge">
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
            Onchain Security for AI Agents on Solana
          </div>
          <h1 className="landing-title">
            Every agent transaction clears the airlock first.
          </h1>
          <p className="landing-sub">
            Pay the invoice, not the prompt. Airlock simulates, checks, and enforces onchain limits on AI agent wallets, so one poisoned prompt can’t drain your funds.
          </p>
          <div className="landing-cta-group">
            <button className="landing-btn-primary" onClick={() => navigate('/connect')}>
              Launch App &rarr;
            </button>
            <a className="landing-btn-secondary" href="#capabilities">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      <section id="capabilities" className="landing-features">
        <h2 className="landing-section-title">
          Agent wallets are rarely hacked. They are tricked.
        </h2>
        <div className="landing-grid">
          <div className="landing-card">
            <div className="landing-card-num">01</div>
            <h3>Tricked Agents</h3>
            <p>A poisoned webpage, token description, or message can rewrite what an agent thinks it was asked to do.</p>
          </div>
          <div className="landing-card">
            <div className="landing-card-num">02</div>
            <h3>Unlimited Keys</h3>
            <p>A wallet key with no spending limit turns one bad decision into a total loss.</p>
          </div>
          <div className="landing-card">
            <div className="landing-card-num">03</div>
            <h3>Server-Only Filters</h3>
            <p>Checks that live only in a backend disappear the moment the backend is compromised.</p>
          </div>
          <div className="landing-card">
            <div className="landing-card-num">04</div>
            <h3>Silent Drains</h3>
            <p>Small transfers and hidden approvals can add up before anyone is watching.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Airlock. Built for AI Agent payment security on Solana.</p>
      </footer>
    </div>
  )
}
