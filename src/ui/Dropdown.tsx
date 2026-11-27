import { useEffect, useRef, useState } from 'react'
import { Icon, type IconName } from './Icon'

export function Dropdown({ label, icon, options, value, onChange, align = 'left' }: {
  label?: string
  icon?: IconName
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (v: string) => void
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  const selected = options.find(o => o.value === value)
  const Trigger = <button type="button" className={`dropdown-trigger ${open ? 'open' : ''}`} onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}>
    {icon && <Icon name={icon}/>}
    <span>{label ? label : selected?.label ?? value}</span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>

  return <div className={`dropdown ${open ? 'open' : ''}`} ref={ref}>
    {Trigger}
    <div className="dropdown-menu" role="listbox" style={{ [align]: 0 }}>
      {options.map(o => <button key={o.value} type="button" className={`dropdown-option ${o.value === value ? 'active' : ''}`} role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false) }}>{o.label}</button>)}
    </div>
  </div>
}