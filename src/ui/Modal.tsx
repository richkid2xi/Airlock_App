import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, description, children, onClose, wide = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  return <div className="modal-layer" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className={`modal scrollbar-none ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close"/></button></header>
      <div className="modal-scroll">{children}</div>
    </section>
  </div>
}