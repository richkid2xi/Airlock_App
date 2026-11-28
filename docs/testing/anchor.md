# Receipt Anchoring on Solana — Manual Testing Checklist

> **What this tests**: Anchoring a receipt's integrity hash on Solana devnet via the SPL Memo program, and verifying it on-chain. Anchoring does NOT move funds; the receipt stays **authorized** (never "paid" or "settled").

## Prerequisites

- Wallet connected (Phantom / Solflare / compatible). Wallet must have devnet SOL for the memo transaction fee.
- Signed in to Airlock with an account that has an organization.
- At least one receipt issued (from an approved evaluation).
- Feature flag `anchoring` set to `'live'` in `src/config/features.ts`.

## Setup

1. Connect wallet on the Connect screen.
2. Complete onboarding if prompted.
3. Go to **Receipts** page.

## Checklist

### 1. Anchoring is gated when no wallet
- [ ] Open Receipts page with no wallet connected.
- [ ] The "Anchor on Solana" button is disabled and title shows "Connect a wallet to anchor".

### 2. Anchor a receipt
- [ ] With wallet connected, click **Anchor on Solana** on a receipt that is not anchored.
- [ ] A Solana transaction signature toast appears: `Receipt anchored on Solana: <sig>`.
- [ ] The receipt row now shows **Anchored on Solana ↗** (linked to explorer).
- [ ] The receipt status badge is still **authorized** (NOT "paid" or "settled").

### 3. Verify on-chain
- [ ] Click **Verify on-chain** on an anchored receipt.
- [ ] Toast: `Anchor verified on-chain.`
- [ ] If the transaction does not exist or memo differs, toast: `Anchor does not match on-chain data.`

### 4. Error handling
- [ ] If wallet rejected the transaction: error shows `wallet_rejected: ...`.
- [ ] If RPC unreachable: error shows `rpc_failure: ...`.
- [ ] If receipt already anchored: clicking anchor again is prevented (button shows "Anchored").

### 5. Persistence
- [ ] Refresh the page; the anchoring badge persists (it comes from the database).

### 6. Explorer link
- [ ] Click the "Anchored on Solana ↗" link; Solana Explorer opens with the transaction visible.

## Notes
- Anchoring writes `airlock:v1:<receiptId>:<contentHash>` as the memo.
- `record_receipt_anchor` RPC is org-checked (only the owning org can record).
- The memo transaction is signed by the connected wallet (fee payer = approver wallet).
- Receipt status never changes from "authorized" due to anchoring.

## Failure triage
- `wallet_not_connected`: connect a wallet first.
- `insufficient_sol`: get devnet SOL from the faucet at https://faucet.solana.com/.
- `rpc_failure`: check VITE_SOLANA_RPC_URL / network.
- `already_anchored`: receipt already has a signature; verify on-chain instead.