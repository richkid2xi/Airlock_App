# Pipeline Module — Manual Verification Checklist

## Prerequisites
- Local dev server running: `pnpm dev`
- Connected wallet on devnet
- Completed onboarding (org exists)

---

## 1. Pipeline page route

### 1.1 Navigation
- [ ] Navigate to **Overview → Pipeline** in sidebar (trend icon under OVERVIEW)
- [ ] URL resolves to `/app/pipeline` and renders the Payment pipeline page

---

## 2. Pipeline steps render

### 2.1 All seven steps
- [ ] Page renders seven step cards in order: Suppliers, Invoices, Agent request, Decision, Approval, Receipt, On-chain settlement

### 2.2 Step states reflect real data
- [ ] Empty organisation → Suppliers step `Waiting` with **Add supplier** action
- [ ] Suppliers created → step becomes `Done`
- [ ] Invoices registered → step becomes `Done` with `N open · M attested` detail
- [ ] Agent request run → Agent request step `Done`
- [ ] Latest decision `ALLOW` → Decision step `Done`
- [ ] Latest decision `BLOCK` (e.g. `payee_mismatch`) → Decision step `Blocked` with rule detail
- [ ] Held items > 0 → Approval step `Waiting` with **Review held** action
- [ ] No held items → Approval step `Done`
- [ ] Receipts issued > 0 → Receipt step `Done`
- [ ] No receipts yet → Receipt step `Waiting`

### 2.3 Feature gating
- [ ] Each step shows `LIVE` badge when its underlying feature is live, `IN PROGRESS` when not
- [ ] On-chain settlement step always renders `In progress` and never fabricates a signature

---

## 3. Action buttons navigate correctly

- [ ] Step with pending action shows action button (e.g. **Add supplier**, **Run agent**) → navigates to the owning page
- [ ] Blocked decision step does not render a primary action

---

## 4. Cross-cutting

- [ ] Loading state on mount (engines fetch)
- [ ] Error state surfaces typed error message when engines fail
- [ ] Pipeline page shows no hard-coded business data

---

## Verification

- `npx tsc --noEmit` clean
- `npx vitest run` (packages/shared pipeline tests) passes
- `npx vite build` succeeds
- `pnpm verify:pipeline` passes (env presence checks)
