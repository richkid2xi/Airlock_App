import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LiveAuthEngine, AuthError } from "./live";
import { FakeWalletSource } from "./walletSource";
import { supabase } from "../../lib/supabase";

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
      signInWithWeb3: vi.fn(),
    },
  },
}));

const mockSignInWithWeb3 = vi.mocked(supabase.auth.signInWithWeb3);
const mockSignOut = vi.mocked(supabase.auth.signOut);

describe("connectAndSignIn", () => {
  let engine: LiveAuthEngine;
  let walletSource: FakeWalletSource;

  beforeEach(() => {
    walletSource = new FakeWalletSource({
      solflare: {
        publicKey: "solflare-pub-key",
      },
    });
    engine = new LiveAuthEngine(walletSource);

    mockSignInWithWeb3.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          identities: [
            {
              id: "id-1",
              user_id: "user-1",
              identity_id: "identity-1",
              provider: "web3",
              identity_data: {
                custom_claims: { address: "solflare-pub-key" },
              },
            },
          ],
        },
      },
      error: null,
    } as any);
    mockSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("calls connect, then signInWithWeb3, then returns session on match", async () => {
    const connectSpy = vi.spyOn(walletSource, "connect");

    const session = await engine.connectAndSignIn("solflare");

    expect(connectSpy).toHaveBeenCalledWith("solflare");
    expect(session.publicKey).toBe("solflare-pub-key");
    expect(session.network).toBe("devnet");

    expect(mockSignInWithWeb3).toHaveBeenCalledWith({
      chain: "solana",
      statement: "Sign in to Airlock. This does not move funds.",
      wallet: expect.any(Object),
    });
  });

  it("signs out and throws AuthError with identity_mismatch code on mismatch", async () => {
    walletSource = new FakeWalletSource({
      solflare: {
        publicKey: "different-pub-key",
      },
    });
    engine = new LiveAuthEngine(walletSource);

    await expect(engine.connectAndSignIn("solflare")).rejects.toThrow(
      AuthError
    );

    try {
      await engine.connectAndSignIn("solflare");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("identity_mismatch");
    }
  });

  it("maps network error to typed AuthError", async () => {
    mockSignInWithWeb3.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(engine.connectAndSignIn("solflare")).rejects.toThrow(
      AuthError
    );
  });

  it("throws when Supabase returns no identity", async () => {
    mockSignInWithWeb3.mockResolvedValueOnce({
      data: { user: { id: "user-2", identities: [] } },
      error: null,
    } as any);

    await expect(engine.connectAndSignIn("solflare")).rejects.toThrow(
      "Wallet identity not found on Supabase user"
    );
  });
});
