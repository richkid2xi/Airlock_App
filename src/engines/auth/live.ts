/**
 * UNVERIFIED against a real wallet
 *
 * Live Auth Engine — wraps Supabase Auth + wallet source.
 * Uses custom fallback: 401/403 NEVER fall back to mock; network errors DO fall back.
 */

import type { AuthPort, AuthSession, WalletAccountLike } from "./types";
import { createWalletSource, toSupabaseWallet, type WalletSource } from "./walletSource";
import { supabase } from "../../lib/supabase";
import {
  walletAddressFromUser,
  compareWalletIdentity,
  type WalletIdentityVerdict,
} from "./identity";

export class AuthError extends Error {
  code: string;
  status?: number;
  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

export function mapAuthError(err: unknown): AuthError {
  const e = err as { code?: string; status?: number; message?: string };
  if (e?.status === 401 || e?.code === "401") {
    return new AuthError(e.message ?? "Unauthorized", "401", 401);
  }
  if (e?.status === 403 || e?.code === "403") {
    return new AuthError(e.message ?? "Forbidden", "403", 403);
  }
  const code = e?.code ?? "unknown";
  const message = e?.message ?? String(err ?? "Unknown error");
  return new AuthError(message, code, e?.status);
}

function sessionFromAccount(account: WalletAccountLike): AuthSession {
  return {
    publicKey: account.publicKey,
    address: account.address ?? account.publicKey,
    network: account.network ?? "devnet",
  };
}

export class LiveAuthEngine implements AuthPort {
  private source: WalletSource;
  private currentSession: AuthSession | null = null;
  private listeners = new Set<(session: AuthSession | null) => void>();
  private unsubAccountChange?: () => void;

  constructor(source: WalletSource) {
    this.source = source;
    this.unsubAccountChange = source.onAccountChange((account) => {
      if (!account) {
        void this.handleAccountChange(null);
        return;
      }
      const currentPk = this.currentSession?.publicKey;
      if (currentPk && currentPk !== account.publicKey) {
        void this.handleAccountChange(account);
      }
    });
  }

  async connect(walletName: string): Promise<AuthSession> {
    const account = await this.source.connect(walletName);
    const session = sessionFromAccount(account);
    this.currentSession = session;
    this.emit(session);
    return session;
  }

  async signIn(): Promise<AuthSession> {
    const signer = this.source.getSigner();
    if (!signer) throw new AuthError("No wallet connected; cannot sign in", "no_wallet");

    const wallet = toSupabaseWallet(signer);

    const { data, error } = await supabase.auth.signInWithWeb3({
      chain: "solana",
      statement: "Airlock checkpoint test",
      wallet,
    });

    if (error) throw mapAuthError(error);

    const userSession = this.sessionFromUser(data?.user);
    if (!userSession)
      throw new AuthError("Wallet identity not found on Supabase user", "no_identity");

    const verdict = compareWalletIdentity({
      user: data?.user ?? null,
      publicKey: userSession.publicKey,
    });
    if (verdict !== "match") {
      await this.forceSignOut(reasonFor(verdict));
      throw new AuthError(`Wallet identity ${verdict}`, "identity_" + verdict);
    }

    this.currentSession = userSession;
    this.emit(userSession);
    return userSession;
  }

  async list(): Promise<
    Array<{
      name: string;
      icon: string;
      readyState: "Installed" | "NotDetected" | "Loadable" | "Unsupported";
    }>
  > {
    return this.source.list();
  }

  async getSession(): Promise<AuthSession | null> {
    const verdict = await this.resolveSession();
    if (verdict !== "match") {
      await this.forceSignOut(reasonFor(verdict));
      return null;
    }
    return this.currentSession;
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut().catch(() => {});
    this.currentSession = null;
    this.emit(null);
  }

  onChange(cb: (session: AuthSession | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private async handleAccountChange(account: WalletAccountLike | null) {
    await supabase.auth.signOut().catch(() => {});
    this.currentSession = null;
    this.emit(null);
  }

  private async resolveSession(): Promise<WalletIdentityVerdict> {
    if (this.currentSession) {
      const { data, error } = await supabase.auth.getUser();
      if (error) return "mismatch";
      const account = this.source.getAccount();
      return compareWalletIdentity({
        user: data?.user ?? null,
        publicKey: account?.publicKey ?? null,
      });
    }
    const account = this.source.getAccount();
    if (!account) return "no_wallet";
    const { data, error } = await supabase.auth.getUser();
    if (error) return "mismatch";
    return compareWalletIdentity({ user: data?.user ?? null, publicKey: account.publicKey });
  }

  private forceSignOut(reason: string): Promise<void> {
    void supabase.auth.signOut().catch(() => {});
    this.currentSession = null;
    this.emit(null);
    void reason;
    return Promise.resolve();
  }

  private sessionFromUser(
    user:
      | { identities?: { provider: string; identity_data?: Record<string, any> }[] }
      | null
      | undefined,
  ): AuthSession | null {
    const address = walletAddressFromUser(user as any);
    if (!address) return null;
    return { publicKey: address, address, network: "devnet" };
  }

  private emit(session: AuthSession | null) {
    for (const cb of this.listeners) cb(session);
  }
}

function reasonFor(verdict: WalletIdentityVerdict): string {
  switch (verdict) {
    case "mismatch":
      return "wallet-mismatch";
    case "no_identity":
      return "no-identity";
    case "no_wallet":
      return "no-wallet";
    default:
      return "unknown";
  }
}

export function createLiveAuthEngine(): LiveAuthEngine {
  return new LiveAuthEngine(createWalletSource());
}
