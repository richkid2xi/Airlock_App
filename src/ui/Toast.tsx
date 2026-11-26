import { useEffect } from 'react'
import { Icon } from './Icon'

export function Toast({ message, tone = 'success', onClose }: { message: string; tone?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200)
    return () => window.clearTimeout(timer)
  }, [message])
  return <div className={`toast ${tone}`} role="status"><span><Icon name={tone === 'success' ? 'check' : 'close'}/></span><b>{message}</b><button onClick={onClose} aria-label="Dismiss"><Icon name="close" size={14}/></button></div>
}
