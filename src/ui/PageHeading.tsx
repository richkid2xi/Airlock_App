import { Icon, type IconName } from './Icon'

export function PageHeading({ title, description, action, actionIcon = 'plus', onAction }: { title: string; description: string; action?: string; actionIcon?: IconName; onAction?: () => void }) {
  return <div className="content-heading"><div><h1>{title}</h1><p>{description}</p></div>{action && <button className="btn primary" onClick={onAction}><Icon name={actionIcon}/>{action}</button>}</div>
}
