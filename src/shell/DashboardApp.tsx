import { useState, useEffect, type ReactNode } from 'react'
import { Sidebar, pageRoutes } from './Sidebar'
import { Topbar } from './Topbar'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Toast } from '../ui/Toast'
import { Dashboard } from '../pages/Dashboard'
import { DataWorkspace } from '../pages/DataWorkspace'
import { ActivityPage } from '../pages/ActivityPage'
import { Policies } from '../pages/Policies'
import { AttackLab } from '../pages/AttackLab'
import { SettingsPage } from '../pages/SettingsPage'
import { CreationForm } from '../pages/CreationForm'
import { invoiceEngine } from '../engines/invoice'
import { supplierEngine } from '../engines/supplier'
import { invoiceToRow, supplierToRow } from '../domain/adapters'
import { toMinorUnits } from '../domain/money'
import type { PolicyRecord } from '../domain/types'

const defaultInvoiceRows = [
  ['INV-2057','Amazon Web Services','€14,680.00','May 14, 2025','May 29, 2025','Open'],
  ['INV-2053','Atlas Freight','€8,920.00','May 10, 2025','May 24, 2025','Attested'],
  ['INV-2051','Datadog','€3,240.00','May 7, 2025','May 21, 2025','Open'],
  ['INV-2048','Vercel Inc.','€12,480.00','Apr 28, 2025','May 18, 2025','Paid'],
  ['INV-2042','Neon Systems','€4,200.00','Apr 22, 2025','May 12, 2025','Disputed'],
  ['INV-2039','Linear Labs','€1,680.00','Apr 19, 2025','May 4, 2025','Paid'],
]

const defaultTransactions = [
  ['INV-2048','Vercel Inc.','ProcureBot','€12,480.00','ALLOW','Today, 09:42'],
  ['INV-2045','Atlas Freight','AP Assistant','€8,920.00','HOLD','Today, 08:16'],
  ['INV-2042','Neon Systems','ProcureBot','€4,200.00','BLOCK','Yesterday, 16:31'],
  ['INV-2039','Linear Labs','AP Assistant','€1,680.00','ALLOW','Yesterday, 14:08'],
  ['INV-2037','Cloudflare','Ops Agent','€6,340.00','ALLOW','May 18, 11:22'],
]

function useSessionState<T>(key: string, initial: T) {
  const [value,setValue] = useState<T>(() => {
    try { const stored = window.sessionStorage.getItem(key); return stored ? JSON.parse(stored) : initial }
    catch { return initial }
  })
  useEffect(() => { window.sessionStorage.setItem(key,JSON.stringify(value)) }, [key,value])
  return [value,setValue] as const
}

export function DashboardApp({ onLogout, path, navigate }: { onLogout: () => void; path: string; navigate: (p: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<'invoice' | 'supplier' | 'agent' | null>(null)
  const [toast, setToast] = useState<{message:string;tone?:'success'|'error'} | null>(null)
  const [invoices, setInvoices] = useSessionState<string[][]>('airlock-invoices',defaultInvoiceRows)
  const [suppliers, setSuppliers] = useSessionState<string[][]>('airlock-suppliers',[
    ['Amazon Web Services','0x88E1 •••• 41B2','Verified','34','May 12, 2025','Active'],['Vercel Inc.','0x20A7 •••• 9C3F','Verified','12','May 19, 2025','Active'],['Atlas Freight','0x712F •••• 88D0','Review required','8','Apr 28, 2025','Pending'],['Neon Systems','0x991C •••• 23A1','Unverified','3','Mar 14, 2025','Restricted'],['Linear Labs','0x4BA2 •••• 82EE','Verified','9','May 18, 2025','Active']
  ])
  const [agents, setAgents] = useSessionState<string[][]>('airlock-agents',[
    ['ProcureBot','agt_9x2p•••b71','Active','€25,000','€75,000','142'],['AP Assistant','agt_4m8q•••c20','Active','€15,000','€40,000','86'],['Ops Agent','agt_7k1r•••a93','Active','€10,000','€25,000','41'],['Research Agent','agt_2d6v•••e04','Disabled','€2,500','€5,000','12']
  ])
  const [activityRows, setActivityRows] = useSessionState<string[][]>('airlock-activity',[
    ...defaultTransactions,
    ['INV-2034','Figma EMEA','ProcureBot','€6,780.00','HOLD','May 17, 15:04'],
    ['INV-2029','ModelWorks','Ops Agent','€3,040.00','HOLD','May 16, 10:18'],
    ['INV-2026','Datadog','AP Assistant','€2,180.00','ALLOW','May 15, 09:10'],
  ])
  const [policies,setPolicies] = useSessionState<PolicyRecord[]>('airlock-policies',[
    {id:'standard-controls',name:'Standard payment controls',description:'Default invoice, supplier and evidence controls for routine payments.',max:50000,daily:150000,controls:[true,true,true,true,false],assigned:['ProcureBot','AP Assistant'],status:'Active'},
    {id:'high-value-review',name:'High-value review',description:'Adds two-person approval for higher-value supplier payments.',max:100000,daily:250000,controls:[true,true,true,true,true],assigned:['Ops Agent'],status:'Active'},
  ])

  // Sync initial state from typed engines
  useEffect(() => {
    invoiceEngine.listInvoices().then(list => {
      if (list && list.length) {
        setInvoices(list.map(inv => invoiceToRow(inv, '€')))
      }
    })
    supplierEngine.listSuppliers().then(list => {
      if (list && list.length) {
        setSuppliers(list.map(sup => supplierToRow(sup)))
      }
    })
  }, [])

  const page = path.startsWith('/app/invoices') ? 'Invoices' : path.startsWith('/app/suppliers') ? 'Suppliers' : path.startsWith('/app/agents') ? 'AI Agents' : path.startsWith('/app/policies') ? 'Policies' : path.startsWith('/app/activity') ? 'Activity' : path.startsWith('/app/approvals') ? 'Approvals' : path.startsWith('/app/attack-lab') ? 'Attack Lab' : path.startsWith('/app/settings') ? 'Settings' : 'Dashboard'
  const created = (type: 'invoice' | 'supplier' | 'agent', row: string[]) => {
    if (type === 'invoice') {
      setInvoices([row,...invoices])
      invoiceEngine.createInvoice({
        number: row[0],
        supplierName: row[1],
        amountUnits: toMinorUnits(row[2]),
        issueDate: row[3],
        dueDate: row[4],
      }).catch(console.error)
    }
    if (type === 'supplier') {
      setSuppliers([row,...suppliers])
      supplierEngine.createSupplier({
        name: row[0],
        payoutWallet: row[1],
      }).catch(console.error)
    }
    if (type === 'agent') setAgents([row,...agents])
    setModal(null)
    setToast({message: type === 'invoice' ? 'Invoice registered successfully.' : type === 'supplier' ? 'Supplier added successfully.' : 'Agent authorized successfully.'})
  }
  let content: ReactNode
  if (page === 'Dashboard') content = <Dashboard setPage={p => navigate(pageRoutes[p])} activityRows={activityRows} invoiceData={invoices} approvalCount={activityRows.filter(x => x[4] === 'HOLD').length} onOpenActivity={id => navigate(`/app/activity/${encodeURIComponent(id)}`)}/>
  else if (page === 'Invoices') content = <DataWorkspace type="Invoices" rows={invoices} path={path} navigate={navigate} onCreate={() => setModal('invoice')} onUpdate={row=>{
    setInvoices(invoices.map(x=>x[0]===row[0]?row:x))
    invoiceEngine.updateInvoiceStatus(row[0], row[5] as any).catch(console.error)
  }} notify={message=>setToast({message})}/>
  else if (page === 'Suppliers') content = <DataWorkspace type="Suppliers" rows={suppliers} path={path} navigate={navigate} onCreate={() => setModal('supplier')} onUpdate={row=>{
    setSuppliers(suppliers.map(x=>x[0]===row[0]?row:x))
    if (row[2] === 'Verified') {
      supplierEngine.verifySupplier(row[0]).catch(console.error)
    }
    supplierEngine.updatePayoutWallet(row[0], row[1]).catch(console.error)
  }} notify={message=>setToast({message})}/>
  else if (page === 'AI Agents') content = <DataWorkspace type="AI Agents" rows={agents} path={path} navigate={navigate} onCreate={() => setModal('agent')} onUpdate={row=>setAgents(agents.map(x=>x[0]===row[0]?row:x))} notify={message=>setToast({message})} policies={policies}/>
  else if (page === 'Activity') content = <ActivityPage rows={activityRows} path={path} navigate={navigate} agents={agents} onDecision={(id,decision) => setActivityRows(activityRows.map(x => x[0] === id ? x.map((v,i) => i === 4 ? decision : v) : x))} notify={message => setToast({message})}/>
  else if (page === 'Approvals') content = <ActivityPage approvals rows={activityRows} path={path} navigate={navigate} agents={agents} onDecision={(id,decision) => setActivityRows(activityRows.map(x => x[0] === id ? x.map((v,i) => i === 4 ? decision : v) : x))} notify={message => setToast({message})}/>
  else if (page === 'Policies') content = <Policies policies={policies} setPolicies={setPolicies} agents={agents} path={path} navigate={navigate} notify={message=>setToast({message})}/>
  else if (page === 'Attack Lab') content = <AttackLab agents={agents} invoices={invoices} suppliers={suppliers} notify={message=>setToast({message})}/>
  else content = <SettingsPage notify={message=>setToast({message})} onDisconnect={onLogout}/>
  return <div className="app-shell">
    <Sidebar page={page} navigate={navigate} open={menuOpen} close={() => setMenuOpen(false)} approvalCount={activityRows.filter(x=>x[4]==='HOLD').length}/>
    <div className="app-main"><Topbar page={page} navigate={navigate} toggleMenu={() => setMenuOpen(true)}/><main className="content">{content}</main></div>
    <button className="logout-demo" onClick={onLogout} title="Return to onboarding"><Icon name="logout"/></button>
    {modal && <Modal wide title={modal === 'invoice' ? 'Register invoice' : modal === 'supplier' ? 'Add supplier' : 'Authorize AI agent'} description={modal === 'invoice' ? 'Register an invoice before an agent can request payment.' : modal === 'supplier' ? 'New suppliers remain unverified until their identity is reviewed.' : 'Authorize an agent and establish its initial payment boundaries.'} onClose={() => setModal(null)}><CreationForm type={modal} suppliers={suppliers} invoices={invoices} onCancel={() => setModal(null)} onAddSupplier={()=>setModal('supplier')} onSubmit={row => created(modal,row)}/></Modal>}
    {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
  </div>
}
