import { describe, it, expect } from "vitest";
import { walletAddressFromUser, compareWalletIdentity, type SupabaseUserLike } from "./identity";

describe("identity.ts", () => {
  const mkUser = (identities: SupabaseUserLike["identities"]): SupabaseUserLike => ({
    id: "u1",
    identities,
  });

  it("walletAddressFromUser returns null for null/undefined user", () => {
    expect(walletAddressFromUser(null)).toBeNull();
    expect(walletAddressFromUser(undefined)).toBeNull();
  });

  it("walletAddressFromUser extracts from custom_claims.address (web3 provider)", () => {
    const user = mkUser([
      { provider: "web3", identity_data: { custom_claims: { address: "ABC123" } } },
    ]);
    expect(walletAddressFromUser(user)).toBe("ABC123");
  });

  it("walletAddressFromUser falls back to public_key if custom_claims missing", () => {
    const user = mkUser([{ provider: "web3", identity_data: { public_key: "XYZ789" } }]);
    expect(walletAddressFromUser(user)).toBe("XYZ789");
  });

  it("walletAddressFromUser ignores non-web3 providers", () => {
    const user = mkUser([
      { provider: "solana", identity_data: { public_key: "IGNORING" } },
      { provider: "web3", identity_data: { custom_claims: { address: "REALADDR" } } },
    ]);
    expect(walletAddressFromUser(user)).toBe("REALADDR");
  });

  it("walletAddressFromUser returns null when no web3 identity", () => {
    const user = mkUser([{ provider: "email", identity_data: { public_key: "X" } }]);
    expect(walletAddressFromUser(user)).toBeNull();
  });

  it("compareWalletIdentity returns match when both exist and equal", () => {
    const user = mkUser([
      { provider: "web3", identity_data: { custom_claims: { address: "PK123" } } },
    ]);
    expect(compareWalletIdentity({ user, publicKey: "PK123" })).toBe("match");
  });

  it("compareWalletIdentity returns mismatch when both exist but differ", () => {
    const user = mkUser([
      { provider: "web3", identity_data: { custom_claims: { address: "PK123" } } },
    ]);
    expect(compareWalletIdentity({ user, publicKey: "DIFFERENT" })).toBe("mismatch");
  });

  it("compareWalletIdentity returns no_identity when user missing identity address", () => {
    const user = mkUser([{ provider: "web3", identity_data: { custom_claims: {} } }]);
    expect(compareWalletIdentity({ user, publicKey: "PK123" })).toBe("no_identity");
  });

  it("compareWalletIdentity returns no_wallet when wallet publicKey missing", () => {
    const user = mkUser([
      { provider: "web3", identity_data: { custom_claims: { address: "PK123" } } },
    ]);
    expect(compareWalletIdentity({ user, publicKey: null })).toBe("no_wallet");
    expect(compareWalletIdentity({ user, publicKey: undefined })).toBe("no_wallet");
  });

  it("compareWalletIdentity returns no_identity when user is null", () => {
    expect(compareWalletIdentity({ user: null, publicKey: "PK123" })).toBe("no_identity");
    expect(compareWalletIdentity({ user: undefined, publicKey: "PK123" })).toBe("no_identity");
  });
});
