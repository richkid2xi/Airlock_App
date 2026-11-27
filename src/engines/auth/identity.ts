/**
 * Identity verification utilities for Supabase Web3 auth + Solana wallets.
 */

export type SupabaseUserLike = {
  id?: string;
  identities?: Array<{
    provider?: string;
    identity_data?: Record<string, unknown> | null;
  }> | null;
};

export type WalletIdentityVerdict = "match" | "mismatch" | "no_identity" | "no_wallet";

/**
 * Extract the wallet address proven by the Supabase Web3 session.
 * Supabase's signInWithWeb3 stores it at identity_data.custom_claims.address
 * (provider 'web3', id 'web3:solana:<address>'); older payloads may use public_key.
 */
export function walletAddressFromUser(user: SupabaseUserLike | null | undefined): string | null {
  if (!user) return null;
  const web3Identity = user.identities?.find((i) => i.provider === "web3");
  const identityData: Record<string, unknown> = web3Identity?.identity_data ?? {};
  const customClaims: Record<string, unknown> | undefined = identityData.custom_claims as
    | Record<string, unknown>
    | undefined;
  const address = (customClaims?.address as string) ?? (identityData.public_key as string) ?? "";
  return typeof address === "string" && address.length > 0 ? address : null;
}

/**
 * Compare Supabase identity address with the connected wallet public key.
 * Returns:
 *  - 'match' when both exist and are equal
 *  - 'mismatch' when both exist but differ
 *  - 'no_identity' when the user/identity address is missing
 *  - 'no_wallet' when the connected wallet public key is missing
 */
export function compareWalletIdentity(args: {
  user: SupabaseUserLike | null | undefined;
  publicKey: string | null | undefined;
}): WalletIdentityVerdict {
  const identityAddr = walletAddressFromUser(args.user);
  const walletPk = args.publicKey;

  if (!identityAddr) return "no_identity";
  if (!walletPk) return "no_wallet";
  return identityAddr === walletPk ? "match" : "mismatch";
}
