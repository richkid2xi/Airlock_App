/**
 * Wallet Source Abstraction
 *
 * Isolates wallet provider logic so the live auth engine depends only on this
 * interface. Swapping sources (wallet-standard vs direct window.phantom) needs
 * no engine or UI changes.
 *
 * Selection via env: VITE_WALLET_SOURCE=standard|direct
 */

export interface WalletInfo {
  name: string;
  icon: string;
  readyState: 'Installed' | 'NotDetected' | 'Loadable' | 'Unsupported';
}

export interface WalletAccount {
  publicKey: string;
  address?: string;
  network?: string;
}

export interface WalletSigner {
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  publicKey: { toBase58(): string } | null;
  signIn?(input: unknown): Promise<unknown>;
}

export interface WalletSource {
  list(): WalletInfo[];
  connect(name: string): Promise<WalletAccount>;
  disconnect(): Promise<void>;
  getAccount(): WalletAccount | null;
  getSigner(): WalletSigner | null;
  onAccountChange(cb: (account: WalletAccount | null) => void): () => void;
}

function envSource(): 'standard' | 'direct' {
  const v = (import.meta as any).env?.VITE_WALLET_SOURCE?.toLowerCase()
  return v === 'direct' ? 'direct' : 'standard'
}

function installedProviderNames(): string[] {
  if (typeof window === 'undefined') return []
  const names: string[] = []
  if ((window as any).phantom?.solana) names.push('Phantom')
  if ((window as any).solflare?.isSolflare) names.push('Solflare')
  if ((window as any).backpack?.isBackpack) names.push('Backpack')
  return names
}

function getDirectProvider(name: string) {
  if (typeof window === 'undefined') return null
  const w = window as any
  switch (name.toLowerCase()) {
    case 'phantom':
      return w.phantom?.solana ?? w.solana
    case 'solflare':
      return w.solflare
    case 'backpack':
      return w.backpack
    default:
      return null
  }
}

export class StandardWalletSource implements WalletSource {
  private listeners = new Set<(account: WalletAccount | null) => void>()
  private currentAccount: WalletAccount | null = null
  private currentSigner: WalletSigner | null = null
  private selectedName: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncFromWindow()
    }
  }

  private syncFromWindow() {
    const names = installedProviderNames()
    if (names.length > 0 && !this.selectedName) {
      this.selectedName = names[0]
    }
  }

  list(): WalletInfo[] {
    if (typeof window === 'undefined') return []
    const names = installedProviderNames()
    return names.map((name) => ({
      name,
      icon: '',
      readyState: 'Installed' as const,
    }))
  }

  async connect(name: string): Promise<WalletAccount> {
    const provider = getDirectProvider(name)
    if (!provider) throw new Error(`Wallet ${name} not found`)

    this.selectedName = name

    if (provider.connect) {
      await provider.connect()
    } else if (provider.request) {
      await provider.request({ method: 'connect' })
    }

    const publicKey = provider.publicKey?.toBase58?.()
    if (!publicKey) throw new Error('Wallet did not return a public key')

    const account: WalletAccount = {
      publicKey,
      address: publicKey,
      network: 'devnet',
    }
    this.currentAccount = account
    this.currentSigner = {
      signMessage: async (msg: Uint8Array) => {
        const sig = await provider.signMessage(msg, 'utf8')
        return sig
      },
      publicKey: provider.publicKey,
      signIn: provider.signIn ? async (input: unknown) => provider.signIn(input) : undefined,
    }
    this.emit()
    return account
  }

  async disconnect(): Promise<void> {
    if (this.selectedName) {
      const provider = getDirectProvider(this.selectedName)
      if (provider?.disconnect) {
        await provider.disconnect()
      }
    }
    this.currentAccount = null
    this.currentSigner = null
    this.selectedName = null
    this.emit()
  }

  getAccount(): WalletAccount | null {
    return this.currentAccount
  }

  getSigner(): WalletSigner | null {
    return this.currentSigner
  }

  onAccountChange(cb: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit() {
    for (const cb of this.listeners) cb(this.currentAccount)
  }
}

export class DirectWalletSource implements WalletSource {
  private listeners = new Set<(account: WalletAccount | null) => void>()
  private currentAccount: WalletAccount | null = null
  private currentSigner: WalletSigner | null = null
  private selectedName: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      const names = installedProviderNames()
      if (names.length > 0) this.selectedName = names[0]
    }
  }

  list(): WalletInfo[] {
    if (typeof window === 'undefined') return []
    return installedProviderNames().map((name) => ({
      name,
      icon: '',
      readyState: 'Installed' as const,
    }))
  }

  async connect(name: string): Promise<WalletAccount> {
    const provider = getDirectProvider(name)
    if (!provider) throw new Error(`Wallet ${name} not found`)

    this.selectedName = name

    if (provider.connect) {
      await provider.connect()
    } else if (provider.request) {
      await provider.request({ method: 'connect' })
    }

    const publicKey = provider.publicKey?.toBase58?.()
    if (!publicKey) throw new Error('Wallet did not return a public key')

    const account: WalletAccount = {
      publicKey,
      address: publicKey,
      network: 'devnet',
    }
    this.currentAccount = account
    this.currentSigner = {
      signMessage: async (msg: Uint8Array) => {
        const sig = await provider.signMessage(msg, 'utf8')
        return sig
      },
      publicKey: provider.publicKey,
      signIn: provider.signIn ? async (input: unknown) => provider.signIn(input) : undefined,
    }
    this.emit()
    return account
  }

  async disconnect(): Promise<void> {
    if (this.selectedName) {
      const provider = getDirectProvider(this.selectedName)
      if (provider?.disconnect) {
        await provider.disconnect()
      }
    }
    this.currentAccount = null
    this.currentSigner = null
    this.selectedName = null
    this.emit()
  }

  getAccount(): WalletAccount | null {
    return this.currentAccount
  }

  getSigner(): WalletSigner | null {
    return this.currentSigner
  }

  onAccountChange(cb: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit() {
    for (const cb of this.listeners) cb(this.currentAccount)
  }
}

export function createWalletSource(): WalletSource {
  return envSource() === 'direct' ? new DirectWalletSource() : new StandardWalletSource()
}

export class FakeWalletSource implements WalletSource {
  private listeners = new Set<(account: WalletAccount | null) => void>()
  private accounts = new Map<string, WalletAccount>()
  private signers = new Map<string, WalletSigner>()
  private connectedName: string | null = null

  constructor(accounts: Record<string, WalletAccount> = {}) {
    for (const [name, acc] of Object.entries(accounts)) {
      this.accounts.set(name, acc)
      this.signers.set(name, {
        signMessage: async (msg: Uint8Array) => new Uint8Array(64),
        publicKey: { toBase58: () => acc.publicKey },
      })
    }
  }

  list(): WalletInfo[] {
    return Array.from(this.accounts.keys()).map((name) => ({
      name,
      icon: '',
      readyState: 'Installed' as const,
    }))
  }

  async connect(name: string): Promise<WalletAccount> {
    const acc = this.accounts.get(name)
    if (!acc) throw new Error(`Fake wallet ${name} not configured`)
    this.connectedName = name
    this.emit()
    return acc
  }

  async disconnect(): Promise<void> {
    this.connectedName = null
    this.emit()
  }

  getAccount(): WalletAccount | null {
    return this.connectedName ? this.accounts.get(this.connectedName) ?? null : null
  }

  getSigner(): WalletSigner | null {
    return this.connectedName ? this.signers.get(this.connectedName) ?? null : null
  }

  onAccountChange(cb: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit() {
    const acc = this.getAccount()
    for (const cb of this.listeners) cb(acc)
  }
}