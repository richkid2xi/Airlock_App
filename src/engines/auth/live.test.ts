import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            identities: [
              {
                provider: "web3",
                identity_data: {
                  custom_claims: { address: "phantom-pub-key" },
                },
              },
            ],
          },
        },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithWeb3: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            identities: [
              {
                provider: "web3",
                identity_data: {
                  custom_claims: { address: "phantom-pub-key" },
                },
              },
            ],
          },
        },
        error: null,
      }),
    },
  },
}));

import { LiveAuthEngine, createLiveAuthEngine } from "./live";
import { FakeWalletSource } from "./walletSource";

describe("LiveAuthEngine", () => {
  let engine: LiveAuthEngine;
  let walletSource: FakeWalletSource;

  beforeEach(() => {
    walletSource = new FakeWalletSource({
      phantom: {
        publicKey: "phantom-pub-key",
      },
    });
    engine = new LiveAuthEngine(walletSource);
  });

  afterEach(() => {
    // noop
  });

  it("connect sets session and emits it", async () => {
    const session = await engine.connect("phantom");
    expect(session).not.toBeNull();
    expect(session?.publicKey).toBe("phantom-pub-key");
    expect(session?.network).toBe("devnet");
  });

  it("connect throws for unknown wallet", async () => {
    await expect(engine.connect("solflare")).rejects.toThrow("Fake wallet solflare not configured");
  });

  it("getSession returns active session", async () => {
    await engine.connect("phantom");
    const sess = await engine.getSession();
    expect(sess).not.toBeNull();
    expect(sess?.publicKey).toBe("phantom-pub-key");
  });

  it("getSession returns null before connect", async () => {
    const sess = await engine.getSession();
    expect(sess).toBeNull();
  });

  it("signOut clears session and emits null", async () => {
    await engine.connect("phantom");
    const cb = vi.fn();
    const unsub = engine.onChange(cb);
    await engine.signOut();
    expect(cb).toHaveBeenCalledWith(null);
    const empty = await engine.getSession();
    expect(empty).toBeNull();
    unsub();
  });

  it("onChange registers and unregisters callback", () => {
    const cb = vi.fn();
    const unsub = engine.onChange(cb);
    expect(typeof unsub).toBe("function");
    unsub();
    engine["emit"](null);
    expect(cb).not.toHaveBeenCalled();
  });

  it("createLiveAuthEngine returns LiveAuthEngine", () => {
    const eng = createLiveAuthEngine();
    expect(eng).toBeInstanceOf(LiveAuthEngine);
    expect(typeof eng.connect).toBe("function");
  });
});
