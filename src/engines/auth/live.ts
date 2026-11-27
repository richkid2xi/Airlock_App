/**
 * UNVERIFIED against a real wallet
 *
 * Live Auth Engine — wraps Supabase Auth + wallet source.
 * Uses custom fallback: 401/403 NEVER fall back to mock; network errors DO fall back.
 */

import type { AuthPort, AuthSession, WalletAccountLike } from './types'
import { createWalletSource, type WalletSource } from './walletSource'
import { supabase } from '../../lib/supabase'

export class AuthError extends Error {
  code: string
  status?: number
  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.status = status
  }
}

export function mapAuthError(err: unknown): AuthError {
  const e = err as { code?: string; status?: number; message?: string }
  if (e?.status === 401 || e?.code === '401') {
    return new AuthError(e.message ?? 'Unauthorized', '401', 401)
  }
  if (e?.status === 403 || e?.code === '403') {
    return new AuthError(e.message ?? 'Forbidden', '403', 403)
  }
  const code = e?.code ?? 'unknown'
  const message = e?.message ?? String(err ?? 'Unknown error')
  return new AuthError(message, code, e?.status)
}

function sessionFromAccount(account: WalletAccountLike): AuthSession {
  return {
    publicKey: account.publicKey,
    address: account.address ?? account.publicKey,
    network: account.network ?? 'devnet',
  }
}

export class LiveAuthEngine implements AuthPort {
  private source: WalletSource
  private currentSession: AuthSession | null = null
  private listeners = new Set<(session: AuthSession | null) => void>()
  private unsubAccountChange?: () => void

  constructor(source: WalletSource) {
    this.source = source
    this.unsubAccountChange = source.onAccountChange((account) => {
      if (!account) {
        this.currentSession = null
        this.emit(null)
        return
      }
      const currentPk = this.currentSession?.publicKey
      if (currentPk && currentPk !== account.publicKey) {
        void this.handleAccountChange(account)
      }
    })
  }

  async connect(walletName: string): Promise<AuthSession> {
    const account = await this.source.connect(walletName)
    const session = sessionFromAccount(account)
    this.currentSession = session
    this.emit(session)
    return session
  }

  async signIn(): Promise<AuthSession> {
    const signer = this.source.getSigner()
    if (!signer) throw new AuthError('No wallet connected; cannot sign in', 'no_wallet')

    const wallet = {
      publicKey: signer.publicKey,
      signMessage: signer.signMessage,
    }

    const { data, error } = await supabase.auth.signInWithWeb3({
      chain: 'solana',
      statement: 'Airlock checkpoint test',
      wallet,
    } as any)

    if (error) throw mapAuthError(error)

    const userSession = this.sessionFromUser(data?.user)
    if (!userSession) throw new AuthError('Wallet identity not found on Supabase user', 'no_identity')
    this.currentSession = userSession
    this.emit(userSession)
    return userSession
  }

  async getSession(): Promise<AuthSession | null> {
    if (this.currentSession) return this.currentSession
    const { data, error } = await supabase.auth.getUser()
    if (error) throw mapAuthError(error)
    return this.sessionFromUser(data?.user)
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut()
    this.currentSession = null
    this.emit(null)
  }

  onChange(cb: (session: AuthSession | null) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private async handleAccountChange(account: WalletAccountLike) {
    await supabase.auth.signOut().catch(() => {})
    this.currentSession = null
    this.emit(null)
  }

  private sessionFromUser(user: { identities?: { provider: string; identity_data?: { public_key?: string } & Record<string, any> }[] } | null | undefined): AuthSession | null {
    if (!user) return null
    const solanaIdentity = user.identities?.find((i) => i.provider === 'solana')
    const publicKey = solanaIdentity?.identity_data?.public_key ?? ''
    if (!publicKey) return null
    return { publicKey, address: publicKey, network: 'devnet' }
  }

  private emit(session: AuthSession | null) {
    for (const cb of this.listeners) cb(session)
  }
}

export function createLiveAuthEngine(): LiveAuthEngine {
  return new LiveAuthEngine(createWalletSource())
}