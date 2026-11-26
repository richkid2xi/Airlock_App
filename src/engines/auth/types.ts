/**
 * Auth engine port.
 * Real implementation will call wallet + backend auth endpoints; mock keeps the
 * current simulated 650ms timer + fixed identity behaviour.
 */
export type AuthSession = {
  publicKey: string;
  address: string;
  network: string;
}

export interface AuthPort {
  /** Connect with a wallet. Returns the (mock or real) session identity. */
  connect(walletName: string): Promise<AuthSession>;
  /** Sign in / prove wallet ownership. */
  signIn(): Promise<AuthSession>;
  /** Current session or null. */
  getSession(): Promise<AuthSession | null>;
  /** Sign out. */
  signOut(): Promise<void>;
  /** Subscribe to wallet disconnect / account switch. */
  onChange(cb: (session: AuthSession | null) => void): () => void;
}

export interface WalletAccountLike {
  publicKey: string;
  address?: string;
  network?: string;
}
