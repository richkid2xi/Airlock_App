import { Icon, type IconName } from './Icon'

export function Metric({ icon, label, value, note, accent }: {icon: IconName; label: string; value: string; note: string; accent?: string}) {
  return <article className="metric-card">
    <div className={`metric-icon ${accent || ''}`}><Icon name={icon}/></div>
    <span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small>
  </article>
}
