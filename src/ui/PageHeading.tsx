import { Icon, type IconName } from './Icon'
import { MockDataBadge } from '../engines/MockDataBadge'

export function PageHeading({ title, description, action, actionIcon = 'plus', onAction }: { title: string; description: string; action?: string; actionIcon?: IconName; onAction?: () => void }) {
  const engineBadge = title === 'Invoices' ? <MockDataBadge engine="invoice"/> : title === 'Suppliers' ? <MockDataBadge engine="supplier"/> : title === 'Payment policies' ? <MockDataBadge engine="policy"/> : title === 'Attack Lab' ? <MockDataBadge engine="evaluation"/> : title === 'Approvals' ? <MockDataBadge engine="settlement"/> : null
  return <div className="content-heading"><div><h1>{title}{engineBadge}</h1><p>{description}</p></div>{action && <button className="btn primary" onClick={onAction}><Icon name={actionIcon}/>{action}</button>}</div>
}
