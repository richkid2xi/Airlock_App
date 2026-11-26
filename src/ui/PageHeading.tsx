import { Icon, type IconName } from './Icon'
import { MockBadge } from '../engines/MockBadge'

export function PageHeading({ title, description, action, actionIcon = 'plus', onAction }: { title: string; description: string; action?: string; actionIcon?: IconName; onAction?: () => void }) {
  const engineBadge = title === 'Invoices' ? <MockBadge engine="registry"/> : title === 'Suppliers' ? <MockBadge engine="registry"/> : title === 'Payment policies' ? <MockBadge engine="registry"/> : title === 'Attack Lab' ? <MockBadge engine="evaluation"/> : title === 'Approvals' ? <MockBadge engine="approvals"/> : title === 'Payment activity' ? <MockBadge engine="requests"/> : null
  return <div className="content-heading"><div><h1>{title}{engineBadge}</h1><p>{description}</p></div>{action && <button className="btn primary" onClick={onAction}><Icon name={actionIcon}/>{action}</button>}</div>
}
