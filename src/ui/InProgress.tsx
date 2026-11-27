import { type FeatureName } from '../config/features'

interface InProgressProps {
  module: FeatureName
  title?: string
  whatWillDo?: string[]
}

export function InProgress({ module, title, whatWillDo }: InProgressProps) {
  const displayTitle = title || `${module.charAt(0).toUpperCase() + module.slice(1)} is being built`
  const items = whatWillDo || []

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{displayTitle}</h2>
        <p>This module is being built. It is not showing sample data.</p>
      </div>
      {items.length > 0 && (
        <ul style={{ paddingLeft: 16, marginTop: 8 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}