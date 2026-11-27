import type { AuthPort, AuthSession } from "./types";
import { engineRegistry } from "../engineRegistry";
import { mockAuthEngine } from "./mock";
import { LiveAuthEngine, createLiveAuthEngine } from "./live";
import { withPolicyFallback } from "../fallbackPolicy";

export class AuthEngineProxy implements AuthPort {
  private live: LiveAuthEngine | null = null;

  private getLive(): LiveAuthEngine {
    return this.live ?? (this.live = createLiveAuthEngine());
  }

  async connect(walletName: string): Promise<AuthSession> {
    return await withPolicyFallback(
      "auth",
      async () => this.getLive().connect(walletName),
      async () => mockAuthEngine.connect(walletName),
    );
  }

  async signIn(): Promise<AuthSession> {
    return await withPolicyFallback(
      "auth",
      async () => this.getLive().signIn(),
      async () => mockAuthEngine.signIn(),
    );
  }

  async getSession(): Promise<AuthSession | null> {
    return await withPolicyFallback(
      "auth",
      async () => this.getLive().getSession(),
      async () => mockAuthEngine.getSession(),
    );
  }

  async signOut(): Promise<void> {
    return await withPolicyFallback(
      "auth",
      async () => this.getLive().signOut(),
      async () => mockAuthEngine.signOut(),
    );
  }

  async list(): Promise<
    Array<{
      name: string;
      icon: string;
      readyState: "Installed" | "NotDetected" | "Loadable" | "Unsupported";
    }>
  > {
    return this.getLive().list();
  }

  onChange(cb: (session: AuthSession | null) => void): () => void {
    // Subscription is synchronous; resolve the source directly.
    return this.getLive().onChange(cb);
  }
}

export const authEngine: AuthPort = new AuthEngineProxy();
export type { AuthPort, AuthSession } from "./types";
