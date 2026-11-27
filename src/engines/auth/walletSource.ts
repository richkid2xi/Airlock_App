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
  installUrl?: string;
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

/**
 * Convert any wallet-like object (a wallet-standard adapter or a WalletSigner)
 * into a Supabase-compatible SolanaWallet with all methods bound so `this`
 * is preserved when supabase-js calls them detached.
 *
 * Only keys that exist on the adapter are included, because supabase may
 * feature-detect on them.
 */
export interface SupabaseSolanaWallet {
  publicKey?: { toBase58: () => string } | null;
  signMessage?: (message: Uint8Array, encoding?: string) => Promise<Uint8Array> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn?: (...inputs: any[]) => Promise<any>;
}

export function toSupabaseWallet(adapter: {
  publicKey?: { toBase58: () => string } | null;
  signMessage?: (message: Uint8Array, encoding?: string) => Promise<Uint8Array>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn?: (...inputs: any[]) => Promise<any>;
}): SupabaseSolanaWallet {
  const wallet: SupabaseSolanaWallet = {};
  const pk = adapter.publicKey;
  if (pk && typeof pk.toBase58 === 'function') {
    wallet.publicKey = { toBase58: () => pk.toBase58() };
  }
  if (typeof adapter.signMessage === 'function') {
    wallet.signMessage = adapter.signMessage.bind(adapter);
  }
  if (typeof adapter.signIn === 'function') {
    wallet.signIn = adapter.signIn.bind(adapter);
  }
  return wallet;
}

const SUPPORTED_WALLETS = [
  { name: 'Phantom', detect: (w: any) => !!w.phantom?.solana || w.solana?.isPhantom, installUrl: 'https://phantom.app/' },
  { name: 'Solflare', detect: (w: any) => !!w.solflare, installUrl: 'https://solflare.com/' },
  { name: 'Backpack', detect: (w: any) => !!w.backpack, installUrl: 'https://backpack.app/' },
];

function getWalletInfos(): WalletInfo[] {
  if (typeof window === 'undefined') {
    return SUPPORTED_WALLETS.map((wallet) => ({
      name: wallet.name,
      icon: '',
      readyState: 'NotDetected' as const,
      installUrl: wallet.installUrl,
    }));
  }
  const w = window as any;
  return SUPPORTED_WALLETS.map((wallet) => ({
    name: wallet.name,
    icon: '',
    readyState: wallet.detect(w) ? ('Installed' as const) : ('NotDetected' as const),
    installUrl: wallet.installUrl,
  }));
}

function getDirectProvider(name: string) {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  const lower = name.toLowerCase();
  if (lower === 'solflare') return w.solflare;
  if (lower === 'backpack') return w.backpack;
  if (lower === 'phantom') return w.phantom?.solana ?? w.solana;
  if (lower === 'solana') return w.solana;
  for (const key of ['solflare', 'backpack', 'phantom', 'solana']) {
    if (w[key]) return w[key];
  }
  return null;
}

export class StandardWalletSource implements WalletSource {
  private listeners = new Set<(account: WalletAccount | null) => void>();
  private currentAccount: WalletAccount | null = null;
  private currentSigner: WalletSigner | null = null;
  private selectedName: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncFromWindow();
    }
  }

  private syncFromWindow() {
    const infos = getWalletInfos();
    const installed = infos.find((i) => i.readyState === 'Installed');
    if (installed && !this.selectedName) {
      this.selectedName = installed.name;
    }
  }

  list(): WalletInfo[] {
    return getWalletInfos();
  }

  async connect(name: string): Promise<WalletAccount> {
    const provider = getDirectProvider(name);
    if (!provider) throw new Error(`Wallet ${name} not found`);

    this.selectedName = name;

    if (provider.connect) {
      await provider.connect();
    } else if (provider.request) {
      await provider.request({ method: 'connect' });
    }

    const publicKey = provider.publicKey?.toBase58?.();
    if (!publicKey) throw new Error('Wallet did not return a public key');

    const account: WalletAccount = {
      publicKey,
      address: publicKey,
      network: 'devnet',
    };
    this.currentAccount = account;
    this.currentSigner = {
      signMessage: async (msg: Uint8Array) => {
        const sig = await provider.signMessage(msg, 'utf8');
        return sig;
      },
      publicKey: provider.publicKey,
      signIn: provider.signIn ? async (input: unknown) => provider.signIn(input) : undefined,
    };
    this.emit();
    return account;
  }

  async disconnect(): Promise<void> {
    if (this.selectedName) {
      const provider = getDirectProvider(this.selectedName);
      if (provider?.disconnect) {
        await provider.disconnect();
      }
    }
    this.currentAccount = null;
    this.currentSigner = null;
    this.selectedName = null;
    this.emit();
  }

  getAccount(): WalletAccount | null {
    return this.currentAccount;
  }

  getSigner(): WalletSigner | null {
    return this.currentSigner;
  }

  onAccountChange(cb: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb(this.currentAccount);
  }
}

export class DirectWalletSource implements WalletSource {
  private listeners = new Set<(account: WalletAccount | null) => void>();
  private currentAccount: WalletAccount | null = null;
  private currentSigner: WalletSigner | null = null;
  private selectedName: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const infos = getWalletInfos();
      const installed = infos.find((i) => i.readyState === 'Installed');
      if (installed) this.selectedName = installed.name;
    }
  }

  list(): WalletInfo[] {
    return getWalletInfos();
  }

  async connect(name: string): Promise<WalletAccount> {
    const provider = getDirectProvider(name);
    if (!provider) throw new Error(`Wallet ${name} not found`);

    this.selectedName = name;

    if (provider.connect) {
      await provider.connect();
    } else if (provider.request) {
      await provider.request({ method: 'connect' });
    }

    const publicKey = provider.publicKey?.toBase58?.();
    if (!publicKey) throw new Error('Wallet did not return a public key');

    const account: WalletAccount = {
      publicKey,
      address: publicKey,
      network: 'devnet',
    };
    this.currentAccount = account;
    this.currentSigner = {
      signMessage: async (msg: Uint8Array) => {
        const sig = await provider.signMessage(msg, 'utf8');
        return sig;
      },
      publicKey: provider.publicKey,
      signIn: provider.signIn ? async (input: unknown) => provider.signIn(input) : undefined,
    };
    this.emit();
    return account;
  }

  async disconnect(): Promise<void> {
    if (this.selectedName) {
      const provider = getDirectProvider(this.selectedName);
      if (provider?.disconnect) {
        await provider.disconnect();
      }
    }
    this.currentAccount = null;
    this.currentSigner = null;
    this.selectedName = null;
    this.emit();
  }

  getAccount(): WalletAccount | null {
    return this.currentAccount;
  }

  getSigner(): WalletSigner | null {
    return this.currentSigner;
  }

  onAccountChange(cb: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of this.listeners) cb(this.currentAccount);
  }
}

export function createWalletSource(): WalletSource {
  return envSource() === 'direct' ? new DirectWalletSource() : new StandardWalletSource();
}

function envSource(): 'standard' | 'direct' {
  const v = (import.meta as any).env?.VITE_WALLET_SOURCE?.toLowerCase();
  return v === 'direct' ? 'direct' : 'standard';
}

export class FakeWalletSource implements WalletSource {
  private listeners = new Set<(account: WalletAccount | null) => void>();
  private accounts = new Map<string, WalletAccount>();
  private signers = new Map<string, WalletSigner>();
  private connectedName: string | null = null;

  constructor(accounts: Record<string, WalletAccount> = {}) {
    for (const [name, acc] of Object.entries(accounts)) {
      this.accounts.set(name, acc);
      this.signers.set(name, {
        signMessage: async (msg: Uint8Array) => new Uint8Array(64),
        publicKey: { toBase58: () => acc.publicKey },
      });
    }
  }

  list(): WalletInfo[] {
    return Array.from(this.accounts.keys()).map((name) => ({
      name,
      icon: '',
      readyState: 'Installed' as const,
    }));
  }

  async connect(name: string): Promise<WalletAccount> {
    const acc = this.accounts.get(name);
    if (!acc) throw new Error(`Fake wallet ${name} not configured`);
    this.connectedName = name;
    this.emit();
    return acc;
  }

  async disconnect(): Promise<void> {
    this.connectedName = null;
    this.emit();
  }

  getAccount(): WalletAccount | null {
    return this.connectedName ? this.accounts.get(this.connectedName) ?? null : null;
  }

  getSigner(): WalletSigner | null {
    return this.connectedName ? this.signers.get(this.connectedName) ?? null : null;
  }

  onAccountChange(cb: (account: WalletAccount | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    const acc = this.getAccount();
    for (const cb of this.listeners) cb(acc);
  }
}