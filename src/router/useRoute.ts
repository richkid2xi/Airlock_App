import { useLocation, useNavigate } from 'react-router'
import { useCallback } from 'react'

/**
 * useRoute shim wrapping React Router v7
 * Keeps the existing `navigate(to, replace?)` signature so callers don't need changes.
 * Also supports `navigate(to, { replace, state })` for passing data between routes.
 */
export function useRoute() {
  const location = useLocation()
  const routerNavigate = useNavigate()

  const navigate = useCallback(
    (to: string, options?: boolean | { replace?: boolean; state?: unknown }) => {
      const replace = typeof options === 'boolean' ? options : Boolean(options?.replace)
      const state = typeof options === 'object' ? options?.state : undefined
      routerNavigate(to, { replace, state: state !== undefined ? { state } : undefined })
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [routerNavigate]
  )

  return { path: location.pathname, navigate, location }
}
