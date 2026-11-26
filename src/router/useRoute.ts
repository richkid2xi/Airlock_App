import { useLocation, useNavigate } from 'react-router'
import { useCallback } from 'react'

/**
 * useRoute shim wrapping React Router v7
 * Keeps the existing `navigate(to, replace?)` signature so callers don't need changes.
 */
export function useRoute() {
  const location = useLocation()
  const routerNavigate = useNavigate()

  const navigate = useCallback(
    (to: string, replace = false) => {
      routerNavigate(to, { replace })
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [routerNavigate]
  )

  return { path: location.pathname, navigate }
}
