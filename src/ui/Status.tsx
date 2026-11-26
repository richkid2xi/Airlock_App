import type { ReactNode } from 'react'

export function Status({ children }: { children: ReactNode }) {
  const value = String(children)
  return <span className={`status ${value.toLowerCase().replaceAll(' ', '-')}`}><i/>{children}</span>
}
