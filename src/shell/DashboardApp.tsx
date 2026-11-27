import { useState, useEffect, type ReactNode } from 'react'
import { Sidebar, pageRoutes } from './Sidebar'
import { Topbar } from './Topbar'
import { Toast } from '../ui/Toast'
import { registryEngine } from '../engines/registry/index'
import { Dashboard } from '../pages/Dashboard'
import { Invoices } from '../pages/Invoices'
import { Suppliers } from '../pages/Suppliers'
import { Agents } from '../pages/Agents'
import { AttackLab } from '../pages/AttackLab'
import { Policies } from '../pages/Policies'
import { SettingsPage } from '../pages/SettingsPage'
import { ActivityPage } from '../pages/ActivityPage'

type DueInvoice = {
  invoiceNumber: string
  supplierName: string
  amountMinor: string
  currency: string
  dueDate: string
  status: string
}

type MetricsSummary = {
  totalInvoices: number
  paidCount: number
  openCount: number
  dueSoon: DueInvoice[]
}

type DashboardMetrics = {
  loading: boolean
  error: string | null
  data: MetricsSummary | null
}

export function DashboardApp({ onLogout, path, navigate }: { onLogout: () => void; path: string; navigate: (p: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' } | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics>({ loading: true, error: null, data: null })

  const page = path.startsWith('/app/invoices') ? 'Invoices' : path.startsWith('/app/suppliers') ? 'Suppliers' : path.startsWith('/app/agents') ? 'AI Agents' : path.startsWith('/app/policies') ? 'Policies' : path.startsWith('/app/activity') ? 'Activity' : path.startsWith('/app/approvals') ? 'Approvals' : path.startsWith('/app/attack-lab') ? 'Attack Lab' : path.startsWith('/app/settings') ? 'Settings' : 'Dashboard'

  useEffect(() => {
    async function load() {
      setMetrics({ loading: true, error: null, data: null })
      try {
        const [invoices, suppliers] = await Promise.all([
          registryEngine.invoices.list(),
          registryEngine.suppliers.list(),
        ])
        const supplierName = new Map<string, string>()
        for (const s of suppliers) supplierName.set(s.id, s.name)
        const paid = invoices.filter(i => i.status === 'paid')
        const openInvoices = invoices.filter(i => i.status === 'open' || i.status === 'attested')
        const dueSoon: DueInvoice[] = openInvoices
          .filter(i => new Date(i.dueDate).getTime() <= Date.now() + 14 * 24 * 60 * 60 * 1000)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5)
          .map(i => ({
            invoiceNumber: i.invoiceNumber,
            supplierName: supplierName.get(i.supplierId) ?? '—',
            amountMinor: i.amountMinor,
            currency: i.currency,
            dueDate: i.dueDate,
            status: i.status,
          }))
        setMetrics({
          loading: false,
          error: null,
          data: {
            totalInvoices: invoices.length,
            paidCount: paid.length,
            openCount: openInvoices.length,
            dueSoon,
          },
        })
      } catch (err) {
        setMetrics({ loading: false, error: String(err), data: null })
      }
    }
    load()
  }, [navigate])

  let content: ReactNode
  if (page === 'Dashboard') content = <Dashboard metrics={metrics} setPage={navigate} />
  else if (page === 'Suppliers') content = <Suppliers notify={message => setToast({ message })} />
  else if (page === 'Invoices') content = <Invoices notify={message => setToast({ message })} />
  else if (page === 'AI Agents') content = <Agents notify={message => setToast({ message })} />
  else if (page === 'Policies') content = <Policies policies={[]} setPolicies={() => {}} agents={[]} path={path} navigate={navigate} notify={message => setToast({ message })} />
  else if (page === 'Activity') content = <ActivityPage approvals={false} rows={[]} path={path} navigate={navigate} agents={[]} onDecision={() => {}} notify={message => setToast({ message })} />
  else if (page === 'Approvals') content = <ActivityPage approvals={true} rows={[]} path={path} navigate={navigate} agents={[]} onDecision={() => {}} notify={message => setToast({ message })} />
  else if (page === 'Attack Lab') content = <AttackLab notify={message => setToast({ message })} />
  else content = <SettingsPage notify={message => setToast({ message })} onLogout={onLogout} />

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} open={menuOpen} close={() => setMenuOpen(false)} approvalCount={0} />
      <div className="app-main">
        <Topbar page={page} navigate={navigate} toggleMenu={() => setMenuOpen(true)} onLogout={onLogout} />
        <main className="content scrollbar-none">{content}</main>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}