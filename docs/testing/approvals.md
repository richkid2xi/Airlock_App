# Approvals & Receipts Module — Manual Verification Checklist

## Prerequisites
- Local dev server running: `pnpm dev`
- Connected wallet on devnet
- Completed onboarding (org exists)
- Demo data loaded (which seeds held/blocked evaluations and pending approvals)

---

## 1. Approvals page (`/app/approvals`)

### 1.1 Load held requests
- [ ] Navigate to **Approvals** in sidebar (PAYMENTS group)
- [ ] Held payment requests list renders from real evaluation data
- [ ] Each row shows evaluation, agent, invoice, amount, decision status (`HOLD`)

### 1.2 Approve a held evaluation
- [ ] Select a held evaluation → Approvals detail view
- [ ] Click **Approve payment** → confirm dialog
- [ ] On confirm: `approve_evaluation` RPC invoked
- [ ] If policy requires two-person approval → second reviewer required; state stays `held`
- [ ] If one-person approval sufficient → evaluation becomes `approved` and receipt issued

### 1.3 Reject a held evaluation
- [ ] Select a held evaluation → Approvals detail view
- [ ] Click **Reject payment** → confirm dialog
- [ ] On confirm: `reject_evaluation` RPC invoked
- [ ] Evaluation becomes `rejected`

### 1.4 Typed error handling
- [ ] If evaluation cannot be approved in current state → error shows typed code (`validation` etc.) and friendly message
- [ ] Approval of non-held evaluation fails gracefully (no silent success)

---

## 2. Receipts page (`/app/receipts`)

### 2.1 List receipts
- [ ] Navigate to **Receipts** in sidebar (PAYMENTS group)
- [ ] Receipts list loads from real `receipts` table via `listReceipts`
- [ ] Receipt rows show: payee wallet, amount, status, issued timestamp

### 2.2 Verify receipt integrity
- [ ] Click **Verify** on a receipt → `verify_receipt` RPC recomputes content hash
- [ ] Verify returns `true` for a legitimate receipt → confirmation toast
- [ ] Verify returns `false` for tampered snapshot → failure indication

### 2.3 Empty state
- [ ] No receipts yet → clean empty state (no fabricated receipts)

---

## 3. Cross-cutting

- [ ] Feature gate for Approvals flipped to `live` in `src/config/features.ts`
- [ ] Feature gate for Receipts/Approvals live in `src/config/features.ts`
- [ ] No hard-coded business data on Approvals/Receipts pages

---

## Verification

- `npx tsc --noEmit` clean
- `npx vitest run` (root) passes
- `npx vite build` succeeds
- `pnpm verify:approvals` passes (env presence checks)
