import type { AuthPort, AuthSession } from "./types";
import { LiveAuthEngine, createLiveAuthEngine } from "./live";

export class AuthEngineProxy implements AuthPort {
  private live: LiveAuthEngine | null = null;

  private getLive(): LiveAuthEngine {
    return this.live ?? (this.live = createLiveAuthEngine());
  }

  async connect(walletName: string): Promise<AuthSession> {
    return await this.getLive().connect(walletName);
  }

  async signIn(): Promise<AuthSession> {
    return await this.getLive().signIn();
  }

  async getSession(): Promise<AuthSession | null> {
    return await this.getLive().getSession();
  }

  async signOut(): Promise<void> {
    return await this.getLive().signOut();
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
    return this.getLive().onChange(cb);
  }
}

export const authEngine: AuthPort = new AuthEngineProxy();
export type { AuthPort, AuthSession } from "./types";
