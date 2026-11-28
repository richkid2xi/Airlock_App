import { useState, useEffect, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Toast } from '../ui/Toast'
import { Dashboard } from '../pages/Dashboard'
import { Invoices } from '../pages/Invoices'
import { Suppliers } from '../pages/Suppliers'
import { Agents } from '../pages/Agents'
import { AttackLab } from '../pages/AttackLab'
import { Policies } from '../pages/Policies'
import { SettingsPage } from '../pages/SettingsPage'
import { ActivityPage } from '../pages/ActivityPage'
import { Pipeline } from '../pages/Pipeline'
import { Receipts } from '../pages/Receipts'
import { supabase } from '../lib/supabase'

function mapEvaluationRow (ev: any, inv: any, agt: any, sup: any): string[] {
  const decision = ev.status === 'allowed' ? 'ALLOW' : ev.status === 'blocked' ? 'BLOCK' : ev.status === 'held' ? 'HOLD' : String(ev.status)
  const agentName = agt?.name ?? '—'
  const supplierName = sup?.name ?? '—'
  const amount = ev.amount_minor ? String(Math.abs(Number(ev.amount_minor))) : '—'
  const timestamp = ev.evaluated_at ? new Date(ev.evaluated_at).toLocaleString() : ''
  return [ev.id, supplierName, agentName, amount, decision, timestamp]
}

function formatRows (rows: string[][]): string[][] {
  return rows
}

export function DashboardApp({ onLogout, path, navigate }: { onLogout: () => void; path: string; navigate: (p: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' } | null>(null)
  const [activityRows, setActivityRows] = useState<string[][]>([])

  const page = path.startsWith('/app/invoices') ? 'Invoices' : path.startsWith('/app/suppliers') ? 'Suppliers' : path.startsWith('/app/agents') ? 'AI Agents' : path.startsWith('/app/policies') ? 'Policies' : path.startsWith('/app/activity') ? 'Activity' : path.startsWith('/app/approvals') ? 'Approvals' : path.startsWith('/app/attack-lab') ? 'Attack Lab' : path.startsWith('/app/pipeline') ? 'Pipeline' : path.startsWith('/app/receipts') ? 'Receipts' : path.startsWith('/app/settings') ? 'Settings' : 'Dashboard'

  useEffect(() => {
    async function loadActivityRows () {
      if (path.startsWith('/app/activity') || path.startsWith('/app/approvals')) {
        const { data, error } = await supabase
          .from('evaluations')
          .select('*, invoices!inner(supplier_id), agents!inner(name), suppliers!inner(name)')
          .order('evaluated_at', { ascending: false })

        if (error) {
          setToast({ message: `Failed to load activity: ${error.message}`, tone: 'error' })
          setActivityRows([])
          return
        }

        const formatted = (data as any[]).map((ev: any) => {
          const inv = ev.invoices?.[0] || {}
          const agt = ev.agents?.[0] || {}
          const sup = ev.suppliers?.[0] || {}
          return mapEvaluationRow(ev, inv, agt, sup)
        })
        setActivityRows(formatted)
      }
    }
    loadActivityRows()
  }, [path])

  let content: ReactNode
  if (page === 'Dashboard') content = <Dashboard setPage={navigate} />
  else if (page === 'Suppliers') content = <Suppliers notify={message => setToast({ message })} />
  else if (page === 'Invoices') content = <Invoices notify={message => setToast({ message })} />
  else if (page === 'AI Agents') content = <Agents notify={message => setToast({ message })} />
  else if (page === 'Policies') content = <Policies path={path} navigate={navigate} notify={message => setToast({ message })} />
  else if (page === 'Activity') content = <ActivityPage approvals={false} rows={activityRows} path={path} navigate={navigate} agents={[]} onDecision={() => {}} notify={message => setToast({ message })} />
  else if (page === 'Approvals') content = <ActivityPage approvals={true} rows={activityRows} path={path} navigate={navigate} agents={[]} onDecision={() => {}} notify={message => setToast({ message })} />
  else if (page === 'Attack Lab') content = <AttackLab notify={message => setToast({ message })} />
  else if (page === 'Pipeline') content = <Pipeline navigate={navigate} />
  else if (page === 'Receipts') content = <Receipts notify={message => setToast({ message })} />
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