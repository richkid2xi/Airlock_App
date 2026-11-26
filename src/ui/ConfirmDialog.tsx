import { Icon } from './Icon'
import { Modal } from './Modal'

export function ConfirmDialog({ title, description, confirmLabel, danger, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Modal title={title} description={description} onClose={onCancel}><div className="confirm-icon"><Icon name={danger ? 'lock' : 'shield'}/></div><div className="modal-actions"><button className="btn secondary" onClick={onCancel}>Cancel</button><button className={`btn ${danger ? 'danger-solid' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button></div></Modal>
}
