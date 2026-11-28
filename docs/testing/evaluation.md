# Evaluation Module — Manual Verification Checklist

## Prerequisites
- Local dev server running: `npx dev`
- Connected wallet on devnet
- Completed onboarding (org exists)
- Demo data loaded (Settings → Demo data → Load demo data)

---

## 1. Attack Lab — Local Evaluation

### 1.1 Load simulation data
- [ ] Navigate to **Attack Lab** in sidebar
- [ ] Page loads without InProgress panel (evaluation is live)
- [ ] Suppliers, agents, and invoices tables populate from real engine data

### 1.2 Run scenarios
- [ ] Select an agent from dropdown
- [ ] Select an invoice from dropdown
- [ ] Click **Run simulation**
- [ ] Result shows decision: ALLOW / BLOCK / HOLD
- [ ] Result shows triggered rule description

### 1.3 Scenario coverage (via scenario buttons)
- [ ] Valid payment request → ALLOW
- [ ] Payee/payout wallet mismatch → BLOCK
- [ ] Invoice amount manipulation → BLOCK
- [ ] Unverified supplier → BLOCK
- [ ] Duplicate payment → BLOCK
- [ ] Missing delivery attestation → HOLD
- [ ] Spending limit exceeded → BLOCK
- [ ] Missing supporting evidence → HOLD
- [ ] Intent mismatch → HOLD
- [ ] Frozen/disabled agent → BLOCK

### 1.4 Local evaluator verification
- [ ] No `VITE_EVALUATION_API_URL` environment variable is set
- [ ] All decisions come from local `evaluatePaymentRules` / `evaluatePaymentRequest`
- [ ] No external API calls for evaluation decisions

---

## 2. Evaluation engine (unit-level)

### 2.1 Pure evaluator tests
- [ ] `npx vitest run` — all tests pass (includes 29 evaluator unit tests)
- [ ] `npx tsc --noEmit` — no TypeScript errors
- [ ] `npx vite build` — production build succeeds

### 2.2 Golden vectors
- [ ] GV-001 through GV-010 pass through `evaluatePaymentRules`
- [ ] GV-011 through GV-030 defined in `packages/golden/evaluationVectors.ts` (new shape)

### 2.3 Evaluation decision codes
| Decision | Code | Meaning |
|----------|------|---------|
| ALLOW | all controls pass | Request allowed through |
| BLOCK | `agent_disabled` | Agent not authorized |
| BLOCK | `invoice_not_found` | Invoice not registered in org |
| BLOCK | `invoice_already_paid` | Invoice already committed |
| BLOCK | `invoice_disputed` | Invoice is disputed |
| BLOCK | `payee_mismatch` | Payout wallet doesn't match |
| BLOCK | `amount_mismatch` | Requested amount != invoice amount |
| BLOCK | `mint_mismatch` | Requested mint != invoice mint |
| BLOCK | `over_limit` | Exceeds per-request / policy max |
| BLOCK | `daily_cap_exceeded` | Today's committed + request > daily cap |
| BLOCK | `supplier_unverified` | Supplier not verified (policy requires) |
| HOLD | `needs_attestation` | Delivery attestation missing |
| HOLD | `needs_approval` | Two-person approval or threshold exceeded |

---

## 3. Cross-cutting

- [ ] No hard-coded business data anywhere (all from engine or InProgress)
- [ ] Evaluation feature gate is **LIVE** → no InProgress panel on Attack Lab
- [ ] Loading states disable buttons & show spinner
- [ ] Error toasts show `code: message`
- [ ] Attack Lab banner says "No funds move and no production records are changed during a simulation."
- [ ] Migration 0005 applied to remote Supabase
