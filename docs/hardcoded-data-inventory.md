# Hard-Coded Data Inventory

Generated: 2026-11-27
Scope: All of `src/` (pages, ui, shell, engines, domain)
Rule (from AGENTS.md DECISIONS #1): Hard-coded business data inside components counts as MOCK DATA and is forbidden.
Allowed: UI labels, headings, explanatory copy. Anything that looks like data must come from an engine or be an in-place `<InProgress/>` placeholder.

Action codes:
- **REPLACE**: Wire to a live engine (data comes from engine/Supabase)
- **GATE**: Replace with `<InProgress/>` behind a feature flag (page/module not yet live)
- **DELETE**: Remove the hard-coded value entirely (e.g. fake wallet, fake amount, fake name)
- **KEEP**: UI label / heading / explanatory copy — not business data

---

## 1. SettingsPage.tsx (`src/pages/SettingsPage.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 11 | `notifications` array `[true,true,true,true,true,true,false]` | Onboarding / settings engine | REPLACE (engine state) |
| 13-21 | `sections` array with names/descriptions (Organization profile, Wallet configuration, Engine status, Team & access, Notifications, Security preferences, Connected identity) | UI labels | KEEP |
| 47 | `defaultValue="Northstar Labs"` | Org profile from onboarding engine | REPLACE |
| 48 | `defaultValue="12 Market Street, Amsterdam, Netherlands"` | Org profile from onboarding engine | REPLACE |
| 49 | `defaultValue="Software"` | Org profile from onboarding engine | REPLACE |
| 50 | `defaultValue="EUR"` | Org profile from onboarding engine | REPLACE |
| 51 | `value="org_nsl_9214"` | Org ID from Supabase | REPLACE |
| 52 | `value="Production"` | Cluster/env from env | REPLACE |
| 61 | `Connected devnet Solana Devnet · Mint 4zMMC9...ncDU` | Wallet/chain engine | REPLACE |
| 85 | `0x71C4...9F2A` wallet address | Connected wallet | REPLACE |
| 86 | `0x42A8...11C0` wallet address | Delegated wallet from engine | REPLACE |
| 93 | Notification types array (Payment approved, Payment blocked, etc.) | UI labels | KEEP |
| 108 | `defaultValue="10000"` approval threshold | Org settings from onboarding engine | REPLACE |
| 120 | `Organization Northstar Labs` | Org profile | REPLACE |
| 121 | `Network Solana Devnet` | Cluster from env | REPLACE |
| 122 | `Settlement Asset USDC (6 decimals)` | Chain config | REPLACE |
| 123 | `Last signature Today, 09:31` | Wallet/signing engine | REPLACE |

---

## 2. Dashboard.tsx (`src/pages/Dashboard.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 13 | `activityRows = [], invoiceData = [], approvalCount = 3` defaults | Activity / invoices / approvals engines | REPLACE (engine data) |
| 18 | `Good morning, Maya` | User identity from auth engine | REPLACE |
| 18 | `MONDAY, MAY 19` | Current date | REPLACE |
| 20 | `€184,620`, `Blocked or held since Jan 1` | Metrics engine | REPLACE |
| 22 | `12`, `3 in the last 30 days` | Metrics engine | REPLACE |
| 23 | `approvalCount` default 3 | Approvals engine | REPLACE |
| 33 | `142 requests` | Metrics engine | REPLACE |
| 35-38 | `127 89%`, `9 6%`, `6 4%` | Metrics engine | REPLACE |
| 39 | `All 7 policies are being enforced` | Policies engine | REPLACE |
| 50-54 | Hardcoded security events array | Activity engine | REPLACE |

---

## 3. EntityDetail.tsx (`src/pages/EntityDetail.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 8-15 | `defaultInvoiceRows` — 6 invoices with names, amounts, dates, statuses | Invoices engine | DELETE (fallback data, not used when real data loads) |
| 17-23 | `defaultTransactions` — 5 transactions with names, amounts, dates, decisions | Activity engine | DELETE (fallback data) |
| 42 | `Currency EUR` | Invoice currency from engine | REPLACE |
| 45 | `Today, 08:16` | Timestamp from engine | REPLACE |
| 46 | `Wallet 0x71C4...9F2A · May 10, 2025` | Wallet from engine | REPLACE |
| 50 | `Attested May 18 by wallet 0x71C4...9F2A` | Attestation data from engine | REPLACE |
| 51 | `0x712F...88D0` supplier wallet | Supplier wallet from engine | REPLACE |
| 56 | `sup_84a9d12` supplier ID | Supplier ID from engine | REPLACE |
| 56 | `Network Ethereum` | Network from engine/env | REPLACE |
| 57 | `defaultInvoiceRows.slice(0,3)` | Invoices engine | DELETE |
| 63 | `Allowed 126`, `Blocked / held 16` | Activity engine | REPLACE |
| 65 | `defaultTransactions.slice(0,3)` | Activity engine | DELETE |

---

## 4. DataWorkspace.tsx (`src/pages/DataWorkspace.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 8 | `rows: string[][]` prop type | Positional row arrays | REPLACE (typed engine data) |
| 13-17 | `configs` with column headers and statuses | UI labels | KEEP |
| 21 | `rows.filter(...row.includes(filter))` | Positional array access | REPLACE |

---

## 5. CreationForm.tsx (`src/pages/CreationForm.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 3 | `suppliers: string[][]`, `invoices: string[][]` props | Positional arrays | REPLACE (typed engine data) |
| 18 | `onSubmit([...])` positional string array | Invoice engine create | REPLACE |
| 24 | `onSubmit([...])` positional string array | Supplier engine create | REPLACE |
| 30 | `onSubmit([...])` positional string array | Agent engine create | REPLACE |

---

## 6. ActivityPage.tsx (`src/pages/ActivityPage.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 8 | `rows: string[][]`, `agents: string[][]` props | Positional arrays | REPLACE |
| 28 | `Payout wallet 0x712F...88D0` | Settlement/wallet engine | REPLACE |
| 40 | `destinationWallet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'` | Settlement engine params | REPLACE |
| 48 | `rejectHoldRequest(selected[0], '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')` | Settlement engine params | REPLACE |

---

## 7. Onboarding.tsx (`src/pages/Onboarding.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 167-170 | `window.setTimeout(() => {...}, 650)` simulating async wallet connect | Wallet adapter | DELETE (use real wallet adapter callback) |
| 180 | `MetaMask` provider name | Wallet adapter | DELETE (wallet adapter provides name) |
| 181 | `Coinbase Wallet` provider name | Wallet adapter | DELETE |
| 182 | `WalletConnect` provider name | Wallet adapter | DELETE |
| 188 | `0x71C4...9F2A` wallet address | Connected wallet | REPLACE |
| 216 | `0x71C4...9F2A` wallet address | Connected wallet | REPLACE |
| 240 | `0x71C4...9F2A` wallet address | Connected wallet | REPLACE |

---

## 8. AttackLab.tsx (`src/pages/AttackLab.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 19-21 | Default form values (amount '12480', wallet, intent) | Form defaults (not business data) | KEEP (input defaults) |
| 135 | `time: 'Just now'` | Timestamp | REPLACE |
| 158 | `TEST-REQ-8821` request code | Request ID from engine | REPLACE |
| 26-37 | `scenarios` array with expected decisions | Evaluation rules | KEEP (scenario definitions, not data) |

---

## 9. Topbar.tsx (`src/shell/Topbar.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 13 | `Northstar Labs` org name | Org profile | REPLACE |
| 13 | `Production` environment | Cluster/env | REPLACE |
| 17 | `devnet`, `Solana · USDC` | Chain config | KEEP (env-driven) |
| 21 | `Northstar Labs`, `Production` | Org profile | REPLACE |
| 23 | `INV-2045 · 2 hours ago`, `INV-2042 · Yesterday` | Activity engine | REPLACE |
| 24 | `4zMMC9...ncDU` mint address | Chain config | REPLACE |
| 24 | `Circle USDC` | Chain config | REPLACE |

---

## 10. Policies.tsx (`src/pages/Policies.tsx`)

| Line range | What is hard-coded | Engine / slice | Action |
|---|---|---|---|
| 24 | `id: \`policy-${Date.now()}\`` | Policy engine creates stable IDs | REPLACE |
| 24 | `controls:[true,true,true,true,false]` | Policy controls from engine | REPLACE |
| 24 | `status:'Active'` | Policy status from engine | REPLACE |
| 39 | `Requests evaluated 284` | Metrics engine | REPLACE |

---

## 11. Dead Code — Legacy Engines (VITE_*_API_URL)

Per AGENTS.md DECISIONS #2: "Legacy engines that depend on `VITE_*_API_URL` variables are dead code and are deleted when their slice replaces them."

| File | API URL variable | Status |
|---|---|---|
| `src/engines/supplier/live.ts` | `VITE_SUPPLIER_API_URL` | DEAD CODE — registry engine replaces it |
| `src/engines/invoice/live.ts` | `VITE_INVOICE_API_URL` | DEAD CODE — registry engine replaces it |
| `src/engines/evaluation/live.ts` | `VITE_EVALUATION_API_URL`, `VITE_POLICY_API_URL` | DEAD CODE — local `evaluate()` replaces it |
| `src/engines/settlement/live.ts` | `VITE_SETTLEMENT_RELAYER_URL` | DEAD CODE — generates fake receipts with `Date.now()` signatures and hardcoded values |

---

## 12. Files Never Imported

No files found that are never imported (all engine index files are imported by DashboardApp or pages).

---

## Inventory Summary

| File | REPLACE | GATE | DELETE | KEEP |
|---|---|---|---|---|
| SettingsPage.tsx | 12 | 0 | 0 | 2 |
| Dashboard.tsx | 7 | 0 | 0 | 0 |
| EntityDetail.tsx | 7 | 0 | 3 | 0 |
| DataWorkspace.tsx | 2 | 0 | 0 | 1 |
| CreationForm.tsx | 3 | 0 | 0 | 0 |
| ActivityPage.tsx | 4 | 0 | 0 | 0 |
| Onboarding.tsx | 3 | 0 | 4 | 0 |
| AttackLab.tsx | 2 | 0 | 0 | 2 |
| Topbar.tsx | 4 | 0 | 0 | 1 |
| Policies.tsx | 3 | 0 | 0 | 0 |
| **Total** | **46** | **0** | **7** | **5** |

Dead engines: 4 (supplier, invoice, evaluation, settlement — all VITE_*_API_URL dependent)
