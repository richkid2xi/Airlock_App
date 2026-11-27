import { AuthPort, AuthSession, WalletAccountLike } from "./types";
import { engineRegistry } from "../registry";
import { withFallback } from "../registry";

const FIXED_ADDRESS = "0x71C4...9F2A";
const FIXED_NETWORK = "Ethereum";
const CONNECT_DELAY_MS = 650;

function fixedSession(): AuthSession {
  return {
    publicKey: FIXED_ADDRESS,
    address: FIXED_ADDRESS,
    network: FIXED_NETWORK,
  };
}

/**
 * Mock auth engine — preserves the original 650ms timer + fixed identity
 * behaviour so the UI cannot tell the difference when VITE_ENGINE_AUTH=mock.
 */
class MockAuthEngine implements AuthPort {
  private listeners = new Set<(session: AuthSession | null) => void>();
  private currentSession: AuthSession | null = null;

  async connect(_walletName: string): Promise<AuthSession> {
    // Original behaviour: 650 ms simulated connection
    await new Promise((resolve) => window.setTimeout(resolve, CONNECT_DELAY_MS));
    this.currentSession = fixedSession();
    this.emit();
    return this.currentSession;
  }

  async signIn(): Promise<AuthSession> {
    // In mock mode, signIn is a no-op that returns the fixed session
    if (!this.currentSession) {
      this.currentSession = fixedSession();
    }
    return this.currentSession;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.currentSession;
  }

  async signOut(): Promise<void> {
    this.currentSession = null;
    this.emit();
  }

  async list(): Promise<
    Array<{
      name: string;
      icon: string;
      readyState: "Installed" | "NotDetected" | "Loadable" | "Unsupported";
    }>
  > {
    return [
      { name: "MetaMask", icon: "", readyState: "Installed" },
      { name: "Coinbase Wallet", icon: "", readyState: "Installed" },
      { name: "WalletConnect", icon: "", readyState: "NotDetected" },
    ];
  }

  onChange(cb: (session: AuthSession | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const cb of this.listeners) {
      cb(this.currentSession);
    }
  }
}

export const mockAuthEngine = new MockAuthEngine();

// Re-export for consumers that want to wire through withFallback
export async function connectWithFallback(walletName: string): Promise<AuthSession> {
  return withFallback(
    "auth",
    async () => mockAuthEngine.connect(walletName),
    async () => mockAuthEngine.connect(walletName),
  );
}
