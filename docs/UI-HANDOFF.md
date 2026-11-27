# UI Handoff — Restyle Guide for Airlock App

**Branch:** `ui-polish` (created from `foundation`)
**Document:** `docs/UI-HANDOFF.md`
**CSS report:** `docs/ui/css-usage.md` (regenerate with `node scripts/css-usage.mjs`)

---

## 1. PURPOSE AND GOLDEN RULE

**Restyle freely. Do not change what the data does.**

You are a visual designer. Your job is to make the app look polished, on-brand, and easy to use. You may change colors, spacing, typography, layout, borders, shadows, and component arrangement. You may NOT change data flow, remove data-bound elements, delete handlers, hard-code values, or replace real data with placeholders. If an element prints a value from the engine (a name, amount, status, wallet address, count, date, or decision), it stays — restyled, moved, or resized, but never deleted or faked.

| # | DO | DON'T |
|---|---|---|
| 1 | Restyle colors, fonts, spacing, borders, shadows | Delete data-bound text, numbers, or statuses |
| 2 | Move and wrap elements within a page | Hard-code placeholder values instead of real data |
| 3 | Change button styles (color, size, shape) | Remove onClick handlers, disabled state, or loading state |
| 4 | Restyle loading, empty, and error panels | Remove any of the four states (loading/empty/error/in-progress) |
| 5 | Reword and restyle copy, confirmations, warnings | Remove confirm dialogs, destructive warnings, or cluster labels |
| 6 | Change layout grid and breakpoints | Do arithmetic or parsing of money/addresses in the UI |
| 7 | Add new CSS classes (new meanings only) | Rename or delete SHARED classes from `docs/ui/css-usage.md` |
| 8 | Keep FeatureGate and InProgress wrappers | Remove feature gates around in-progress pages |
| 9 | Preserve aria attributes, focus states, keyboard access | Add inline styles that override component behavior |
| 10 | Verify at 1440px and 390px with no horizontal scroll | Add new network calls, localStorage, or dependencies |

---

## 2. SETUP FOR THE DESIGNER

### Prerequisites

- Node.js (see `.mise.toml` for the pinned version)
- pnpm (`corepack enable` then `corepack install pnpm@latest`)
- A Solflare wallet installed in your browser (for devnet sign-in)

### Install and run

```powershell
cd C:\Users\lenovo\Desktop\Projects\Airlock_App
pnpm install
pnpm dev
```

The Vite dev server is already configured. The app is available at the preview URL shown in the terminal (typically `http://localhost:8443` or the Figma Make preview panel). Hot reload is active — CSS and JSX changes reflect immediately.

### Environment variables

The owner must supply `.env.local` with real Supabase credentials (anon key + URL) and any engine API URLs. `.env.example` contains placeholder values. Never commit `.env.local` and never paste service-role keys into chat or code.

### Sign in

1. Open the app at the dev server URL.
2. Click "Connect wallet" — Solflare on Solana Devnet.
3. Sign the authentication message.
4. The app creates/loads your organization and redirects to the dashboard.

### Sample data

After signing in, use the **"Load demo data"** action (available in the registry area) to populate suppliers, agents, policies, and invoices via the `load_demo_data()` RPC on the Supabase backend. This is real data in your organization — not mock data.

### Commands that must pass before every merge

```powershell
# Typecheck
cd src
npx tsc --noEmit

# Build
cd ..
npm run build

# Tests (root)
npx vitest run

# Tests (all packages)
pnpm -r test
```

---

## 3. WORKING AGREEMENT

### Branch

Create `ui-polish` from `foundation`. All restyle work happens on `ui-polish`. Merge `foundation` into `ui-polish` at least once a day — the developer is changing page logic in parallel.

### Pages still being wired by the developer (restyle LAST)

From `src/config/features.ts` and the code, these are `'in_progress'` and will change soon:

| Page | Feature | Status | Will change soon? |
|---|---|---|---|
| Dashboard | `metrics` | in_progress | Yes — metrics not yet wired |
| Policies | `requests` | in_progress | Yes — page is gated, not yet built |
| Activity | `requests` | in_progress | Yes — page is gated, ActivityPage.tsx exists but unused |
| Approvals | `approvals` | in_progress | Yes — page is gated, not yet built |
| Settings vault areas | n/a | live | Partially — SettingsPage.tsx has hardcoded identity values |

**Restyle these LAST** because the developer will replace the gated content with real pages.

### Pull request process

1. Push `ui-polish` to origin.
2. Open a PR against `foundation`.
3. The **owner** reviews and merges.
4. Before merge: `npm run build`, `npx tsc --noEmit`, `npx vitest run` must all pass.

### Merge conflicts on pages with logic

If a conflict touches a page the developer is wiring:

1. Take the **developer's logic** (handlers, data fetching, state, hooks).
2. Keep **your styling** (classes, layout, colors).
3. Resolve by combining: your JSX structure + their data attributes/handlers.
4. Ask the owner if unsure which version of a handler to keep.

---

## 4. FILE MAP

### SAFE TO EDIT — restyle, rearrange, remove decorative parts

| Folder/file | Contains | Why safe |
|---|---|---|
| `src/index.css` | All CSS variables, component classes, breakpoints | Pure presentation; classes documented in `docs/ui/css-usage.md` |
| `src/ui/*` | Shared UI components (Icon, Status, Modal, PageHeading, ConfirmDialog, Toast, InProgress, FeatureGate) | Presentational wrappers; no data logic |
| `src/shell/*` | App shell (DashboardApp, Sidebar, Topbar, Routes) | Layout and routing; page composition |
| `public/` / `assets/` | Static assets, fonts, images | Decorative only |

### EDIT WITH CARE — page JSX (move and wrap freely, but see Section 6 rules)

| File | Page | Wiring status |
|---|---|---|
| `src/pages/Suppliers.tsx` | Suppliers list/create | Live — registry engine |
| `src/pages/Invoices.tsx` | Invoices list/create/attest/dispute | Live — registry engine |
| `src/pages/Agents.tsx` | Agents list/create | Live — registry engine |
| `src/pages/AttackLab.tsx` | Attack Lab simulation | Live — evaluation engine |
| `src/pages/SettingsPage.tsx` | Settings (org, wallet, engine status, identity) | Live — partially hardcoded |
| `src/pages/Onboarding.tsx` | Onboarding steps 1-4 | Live — onboarding engine |
| `src/pages/Landing.tsx` | Landing page | Live |
| `src/pages/ActivityPage.tsx` | Activity (exists, gated) | In progress — not yet routed |
| `src/pages/EntityDetail.tsx` | Entity detail view | Live — used by detail pages |
| `src/pages/CreationForm.tsx` | Generic creation form | Live |
| `src/pages/Checkpoint.tsx` | Checkpoint step | Live |
| `src/pages/DataWorkspace.tsx` | Data workspace | Live |
| `src/pages/Policies.tsx` | Policies (exists, gated) | In progress — not yet routed |
| `src/pages/Dashboard.tsx` | Dashboard | In progress — metrics gated |

### DO NOT TOUCH — protected

| Folder/file | Contains | Why protected |
|---|---|---|
| `src/engines/**` | All engine implementations (live only) | Data layer; no mock data allowed |
| `src/domain/**` | Domain types (Invoice, Supplier, Agent, Policy, Evaluation, etc.) | Type safety; shared across client and functions |
| `src/config/features.ts` | FEATURES map, isFeatureLive, FEATURE_LABELS | Controls which pages are live vs in-progress |
| `src/lib/**` | Supabase client, utilities | Infrastructure; auth and DB connection |
| `src/shell/Routes.tsx`, `src/shell/DashboardApp.tsx` | Routing and page composition | Changing routes breaks navigation |
| `packages/**` | `@airlock/shared`, `@airlock/golden` | Shared logic; used by client and server |
| `supabase/**` | Migrations, SQL, RLS policies | Database schema and security |
| `programs/**` | On-chain Anchor programs (Solana) | Blockchain layer |
| `scripts/**` | Build and utility scripts | Automation; css-usage.mjs is here |
| `*.test.*` files | All test files | Test integrity; baseline enforced |
| `vite.config.ts`, `tsconfig.json` | Build configuration | Toolchain; changing breaks builds |
| `.env*`, `package.json` | Env vars and dependencies | Credentials and dependency manifest |

---

## 5. THE CONTRACT

Rules that apply on every page. Each rule has a "why" and a repo example.

### a) Data-bound elements

**Rule:** Anything that prints a value from the data (names, amounts, statuses, addresses, counts, dates, decisions) may be restyled or moved but not deleted, hard-coded, or replaced with placeholder text.

**Why:** The app has a strict no-mock-data policy. Every value must come from a real engine or the Supabase backend.

**How to recognize:** An expression in braces reading from props or hooks, e.g. `{s.name}`, `{i.amountMinor}`, `{supplier.verificationStatus}`, `{agents.length}`.

**Repo example:** `src/pages/Suppliers.tsx` line with `{s.name}` — prints the real supplier name from `registryEngine.suppliers.list()`.

### b) Actions

**Rule:** Buttons, links, and form controls that call something (create, save, verify, attest, dispute, approve, connect, disconnect, load demo data) must keep their handlers, their type, and their disabled/loading behaviour.

**Why:** Removing a handler makes the button a visual lie — it looks clickable but does nothing.

**Repo example:** `src/pages/Invoices.tsx` — the "Attest" button calls `registryEngine.invoices.attest(id)` and is disabled when `loading` is true.

### c) The four states

**Rule:** Every data page has loading, empty, error, and "in progress" states. Keep and style all four. Never remove one because it is "not visible in the demo."

**Why:** Users need to know what's happening. Removing states makes the app appear broken during network delays or errors.

**Repo example:** `src/pages/Suppliers.tsx` — `if (loading)` shows a loading panel, `if (error)` shows an error panel, `suppliers.length === 0` shows an empty state, and `FeatureGate(feature="registry")` wraps the live content.

### d) Forms

**Rule:** Keep `name`, `id`, and `htmlFor` pairs, every validation message, inline error slots, and autosave/resume behavior on onboarding. Do not turn controlled inputs into uncontrolled ones.

**Why:** Form accessibility and validation depend on these associations. Controlled inputs ensure the engine always has the current value.

**Repo example:** `src/pages/Onboarding.tsx` — controlled inputs with `value` and `onChange` tied to onboarding engine state.

### e) Security-relevant copy and confirmations

**Rule:** Never remove confirm dialogs, destructive action warnings, wallet-signing explanations, the cluster label (devnet), or "not audited"/"in progress" notices. You may reword and restyle them.

**Why:** These are compliance and safety-critical. Removing them could lead to accidental fund loss or user confusion.

**Repo example:** `src/pages/SettingsPage.tsx` — `ConfirmDialog` for "Disconnect wallet?" with danger styling.

### f) Money and addresses

**Rule:** Never do arithmetic or parsing in the UI. Use the existing formatters. Wallet addresses stay shortened with a copy action and the full value available on hover or in the detail view.

**Why:** Money formatting (minor units, USDC = 6 decimals) must be consistent. The UI must never parse or calculate monetary values.

**Repo example:** `src/pages/Suppliers.tsx` — `{s.payoutWallet.slice(0, 6)}…{s.payoutWallet.slice(-4)}` shortens the wallet; `formatMinor()` converts minor units to display format.

### g) Routes and IDs

**Rule:** Do not change href values, navigate calls, or route paths. IDs in links are UUIDs.

**Why:** Routes are wired to feature gates and engine data. Changing a route path breaks navigation and feature gating.

**Repo example:** `src/shell/DashboardApp.tsx` — routes map page names to components via `if/else` chains.

### h) Shared CSS

**Rule:** Classes in `src/index.css` are global and shared. Before renaming or deleting a class, check `docs/ui/css-usage.md`; classes flagged SHARED must not be deleted or have their meaning changed — add a new class instead and switch pages one at a time.

**Why:** SHARED classes are used by multiple pages. Changing one affects all of them.

**Repo example:** `.btn` is SHARED (used by 15 files including ConfirmDialog, PageHeading, Modal, and 11 page files).

### i) FeatureGate and InProgress wrappers

**Rule:** FeatureGate and InProgress wrappers must stay around their pages.

**Why:** They enforce the no-mock-data policy — in-progress modules show a placeholder panel, never simulated data.

**Repo example:** `src/shell/DashboardApp.tsx` — `<FeatureGate feature="requests"><Policies /></FeatureGate>` for in-progress pages.

### j) Accessibility and responsiveness

**Rule:** Keep aria attributes, focus states, and keyboard access. Verify at 1440px and 390px with no horizontal scroll.

**Why:** The app must be usable by everyone, including keyboard-only and screen-reader users.

**Repo example:** `src/index.css` has `:focus-visible` styles at line 34 and breakpoints at 1100px, 820px, and 600px.

### k) No new network calls, storage, or dependencies

**Rule:** No new network calls, no localStorage or sessionStorage, no new dependencies without asking, no inline secrets.

**Why:** All data flows through engines and Supabase. Adding side channels breaks the architecture and security model.

**Repo example:** `src/engines/registry/live.ts` — all data access goes through the Supabase client (`supabase.from(...)` or `rpc(...)`).

---

## 6. PAGE-BY-PAGE GUIDE

### Connect

**Route and file:** `/app/connect` — `src/pages/Onboarding.tsx` (onboarding includes connect step)  
**Wiring status:** live (onboarding feature = 'live')  
**Data it shows:** Wallet provider list from `authEngine.list()`, connection status from `authEngine.getSession()`  
**MUST KEEP:** Wallet provider buttons with `onClick` calling `authEngine.connect()`, "Connect wallet" button, connection status indicator, devnet cluster label  
**CAN RESTYLE OR MOVE:** Button styles, provider icons, layout of the wallet selection grid  
**CAN REMOVE:** Nothing — all elements are data-bound or action-critical  
**WATCH OUT:** The connect flow calls `authEngine.connect(walletName)` which throws on unknown wallets — keep error handling visible

### Onboarding steps 1 to 4

**Route and file:** `/app/onboarding` — `src/pages/Onboarding.tsx`  
**Wiring status:** live (onboarding feature = 'live')  
**Data it shows:** Onboarding step state from `onboardingEngine.get()`, step data from `onboardingEngine.saveStep()`, completion from `onboardingEngine.complete()`  
**MUST KEEP:** Step navigation (progress-steps), form fields with `name`/`id`/`htmlFor`, validation messages, inline error slots, "Save"/"Continue" buttons with handlers, autosave behavior  
**CAN RESTYLE OR MOVE:** Field layout, button styles, progress indicator appearance  
**CAN REMOVE:** Nothing — every field is tied to engine state  
**WATCH OUT:** Controlled inputs — do not convert to uncontrolled. The `form-grid` class is SHARED (used by 5 pages).

### Dashboard

**Route and file:** `/app` — `src/pages/Dashboard.tsx`  
**Wiring status:** in progress (metrics feature = 'in_progress') — shows InProgress panel  
**Data it shows:** Currently nothing real — FeatureGate wraps WelcomePanel; metrics not yet wired  
**MUST KEEP:** FeatureGate wrapper, WelcomePanel component  
**CAN RESTYLE OR MOVE:** Everything inside the InProgress panel  
**CAN REMOVE:** Nothing inside the panel  
**WATCH OUT:** This page will change when metrics go live. Restyle LAST.

### Suppliers list/detail/create

**Route and file:** `/app/suppliers` — `src/pages/Suppliers.tsx`  
**Wiring status:** live (registry feature = 'live')  
**Data it shows:** `registryEngine.suppliers.list()` — supplier name, category, payout wallet (shortened), verification status  
**MUST KEEP:** Supplier table with name, category, wallet, verification status columns; "Add supplier" button opening modal; "Verify" button for unverified suppliers; create modal with name, payout wallet, business email, category, notes fields; loading/empty/error states  
**CAN RESTYLE OR MOVE:** Table styling, modal layout, button styles, field arrangement  
**CAN REMOVE:** Nothing — all fields are data-bound or action-critical  
**WATCH OUT:** Payout wallet is shortened with `slice(0, 6)` and `slice(-4)` — don't change to full display. The `verify` action transitions status from 'unverified' to 'verified'. `field` class is SHARED (used by 8 pages).

### Agents list/detail/create

**Route and file:** `/app/agents` — `src/pages/Agents.tsx`  
**Wiring status:** live (registry feature = 'live')  
**Data it shows:** `registryEngine.agents.list()` — agent name, identifier, per-request limit, daily limit, status; `registryEngine.policies.list()` for policy assignment  
**MUST KEEP:** Agent table with name, identifier, limits, status columns; "Add agent" button; create modal with name, identifier, description, limits, currency, status, policy assignment fields; Enable/Disable button per agent; loading/empty/error states  
**CAN RESTYLE OR MOVE:** Table styling, modal layout, button styles  
**CAN REMOVE:** Nothing — all fields are data-bound  
**WATCH OUT:** Limits are in minor units (USDC = 6 decimals) — use `formatMinor()` for display. The `field` class is SHARED.

### Policies list/detail/create

**Route and file:** `/app/policies` — `src/pages/Policies.tsx`  
**Wiring status:** in progress (requests feature = 'in_progress') — shows InProgress panel  
**Data it shows:** None yet — gated behind FeatureGate  
**MUST KEEP:** FeatureGate wrapper  
**CAN RESTYLE OR MOVE:** Everything inside the InProgress panel  
**CAN REMOVE:** Nothing  
**WATCH OUT:** This page will be replaced with a real policies page. Restyle LAST.

### Invoices list/detail/create

**Route and file:** `/app/invoices` — `src/pages/Invoices.tsx`  
**Wiring status:** live (registry feature = 'live')  
**Data it shows:** `registryEngine.invoices.list()` — invoice number, supplier name, amount (minor units), due date, status; `registryEngine.suppliers.list()` for supplier lookup  
**MUST KEEP:** Invoice table with number, supplier, amount, due date, status columns; "Register invoice" button; create modal with invoice number, supplier select, payee wallet, amount, currency, mint, issue date, due date, document ref, notes; Attest/Dispute buttons per open invoice; loading/empty/error states  
**CAN RESTYLE OR MOVE:** Table styling, modal layout, button styles  
**CAN REMOVE:** Nothing — all fields are data-bound  
**WATCH OUT:** Amounts use `formatMinor()` for display. Invoice columns are immutable after creation (enforced by DB trigger). Attest/Dispute only work on 'open' invoices.

### Activity

**Route and file:** `/app/activity` — `src/pages/ActivityPage.tsx` (exists but gated)  
**Wiring status:** in progress (requests feature = 'in_progress') — shows InProgress panel  
**Data it shows:** None yet — gated behind FeatureGate  
**MUST KEEP:** FeatureGate wrapper  
**CAN RESTYLE OR MOVE:** Everything inside the InProgress panel  
**CAN REMOVE:** Nothing  
**WATCH OUT:** `ActivityPage.tsx` imports `settlementEngine` and uses positional `string[][]` rows — this will be replaced when the page goes live. Restyle LAST.

### Approvals

**Route and file:** `/app/approvals` — gated behind FeatureGate feature="approvals"  
**Wiring status:** in progress (approvals feature = 'in_progress') — shows InProgress panel  
**Data it shows:** None yet  
**MUST KEEP:** FeatureGate wrapper  
**CAN RESTYLE OR MOVE:** Everything inside the InProgress panel  
**CAN REMOVE:** Nothing  
**WATCH OUT:** No real page exists yet. Restyle LAST.

### Attack Lab

**Route and file:** `/app/attack-lab` — `src/pages/AttackLab.tsx`  
**Wiring status:** live (evaluation feature = 'live')  
**Data it shows:** `registryEngine.suppliers.list()`, `registryEngine.agents.list()`, `registryEngine.invoices.list()` — mapped to domain types and passed to `evaluationEngine.evaluateRequest()`  
**MUST KEEP:** Scenario list (10 scenarios with expected decisions), agent select, invoice select, amount input, payout wallet input, intent input, evidence select, "Run simulation" button, simulation result display with decision (ALLOW/BLOCK/HOLD), simulation history, reset button  
**CAN RESTYLE OR MOVE:** Scenario card styling, simulation panel layout, result card colors, button styles  
**CAN REMOVE:** Nothing — all scenario buttons and inputs are data-bound  
**WATCH OUT:** The simulation calls `evaluationEngine.evaluateRequest()` which requires `VITE_EVALUATION_API_URL`. If unset, it throws. The lab-banner and simulation-result classes are specific to this page.

### Settings

**Route and file:** `/app/settings` — `src/pages/SettingsPage.tsx`  
**Wiring status:** live (no feature gate)  
**Data it shows:** Feature statuses from `FEATURES` map, org profile (hardcoded), wallet configuration (hardcoded), connected identity (hardcoded)  
**MUST KEEP:** Settings nav with all sections, Engine status section showing `FEATURE_LABELS` with live/in-progress badges, wallet disconnect confirm dialog, identity section  
**CAN RESTYLE OR MOVE:** Section layout, card styles, toggle styles, form field arrangement  
**CAN REMOVE:** Nothing — all sections are part of the settings contract  
**WATCH OUT:** Some values are hardcoded (Northstar Labs, devnet, USDC, Last signature Today 09:31) — the developer plans to wire these to real engine data. The `settings-layout`, `settings-nav`, `settings-content`, `settings-form`, `settings-pane` classes are Settings-specific.

### NotFound

**Route and file:** Not found in current routes — likely handled by `Routes.tsx` fallback  
**Wiring status:** Not explicitly in code  
**MUST KEEP:** Error message, link back to dashboard  
**CAN RESTYLE OR MOVE:** Layout, styling  
**CAN REMOVE:** Nothing  
**WATCH OUT:** Verify in `Routes.tsx` if this page exists

### InProgress panel

**Route and file:** `src/ui/InProgress.tsx` (component, not a page)  
**Wiring status:** Shared component  
**Data it shows:** Feature name and "whatWillDo" description  
**MUST KEEP:** The InProgress component itself — it's the visual signal that a module is not yet live  
**CAN RESTYLE OR MOVE:** Panel styling, icon, text  
**CAN REMOVE:** Nothing — it's the required placeholder for in-progress features  
**WATCH OUT:** Never replace an InProgress panel with simulated data. That violates the no-mock-data policy.

---

## 7. SHARED COMPONENTS TABLE

| Component | File | Pages that use it | Props it needs | Designer may change | Must stay |
|---|---|---|---|---|---|
| PageHeading | `src/ui/PageHeading.tsx` | All pages | `title`, `description`, `action`, `actionIcon`, `onAction` | Heading styles, description text, action button style | Title text, action button handler, icon |
| Status | `src/ui/Status.tsx` | Suppliers, Invoices, Agents, AttackLab, Settings | `children` (status string) | Status badge colors, size | Status text content |
| Modal | `src/ui/Modal.tsx` | Suppliers (create), Invoices (create), Agents (create) | `title`, `description`, `onClose`, children | Modal sizing, header style, action button styles | Close behavior, title, description |
| Icon | `src/ui/Icon.tsx` | All pages | `name` (IconName) | Icon colors, sizes | Icon name mapping |
| FeatureGate | `src/ui/FeatureGate.tsx` | All gated pages | `feature`, `children` | InProgress panel styling inside gate | The gate itself, feature check logic |
| InProgress | `src/ui/InProgress.tsx` | All in-progress pages | `module`, `title`, `whatWillDo` | Panel styling, icon, text | The component exists (never replaced with mock data) |
| ConfirmDialog | `src/ui/ConfirmDialog.tsx` | Settings (disconnect) | `title`, `description`, `confirmLabel`, `danger`, `onCancel`, `onConfirm` | Dialog styling, button colors | Confirm/Cancel handlers, danger flag |
| Toast | `src/ui/Toast.tsx` | All pages (via notify callback) | `message`, `error` | Toast styling, position, auto-dismiss | Toast display, error variant |

---

## 8. CSS GUIDE

### Tokens and variables

CSS custom properties live in `:root` in `src/index.css` (lines 4-26):

| Variable | Value | Used for |
|---|---|---|
| `--brand` | `#087f98` | Primary buttons, active states, links |
| `--brand-dark` | `#05667b` | Button hover, dark text |
| `--brand-light` | `#e8f5f7` | Button backgrounds, light accents |
| `--ink` | `#10232b` | Primary text |
| `--ink-2` | `#334951` | Secondary text |
| `--muted` | `#6c7d83` | Muted/secondary text |
| `--line` | `#dfe7e9` | Borders, dividers |
| `--line-soft` | `#eaf0f1` | Soft borders |
| `--surface` | `#ffffff` | Card backgrounds |
| `--subtle` | `#f5f8f8` | Subtle backgrounds |
| `--canvas` | `#f1f5f5` | Page background |
| `--green` | `#187a55` | Success, allowed, verified |
| `--green-bg` | `#e9f6ef` | Success backgrounds |
| `--amber` | `#a56509` | Warning, hold, review |
| `--amber-bg` | `#fff4dd` | Warning backgrounds |
| `--red` | `#b83a45` | Error, blocked, disputed |
| `--red-bg` | `#fcecee` | Error backgrounds |
| `--radius-sm` | `8px` | Small border radius |
| `--radius-md` | `12px` | Medium border radius |
| `--radius-lg` | `16px` | Large border radius |
| `--shadow` | `0 1px 2px ..., 0 8px 22px ...` | Card shadows |

**No CSS tokens exist beyond these variables.** Recommend adding new variables for any new color or spacing you introduce, without removing existing ones.

### Naming convention

Classes use BEM-like naming with descriptive names:
- Component: `.btn`, `.panel`, `.modal`, `.field`, `.status`
- Modifier: `.btn.primary`, `.btn.secondary`, `.btn.danger`, `.status.hold`, `.status.block`
- Element: `.field input`, `.field select`, `.field-note`, `.field-error`
- Page-specific prefix: `.onboarding-`, `.wallet-`, `.lab-`, `.settings-`, `.detail-`, `.approval-`, `.policy-`, `.simulation-`

### Breakpoints actually used

| Breakpoint | Max width | Affected areas |
|---|---|---|
| 1100px | `(max-width: 1100px)` | Onboarding layout, metrics grid, dashboard grid, settings grid |
| 820px | `(max-width: 820px)` | Onboarding becomes single column, sidebar becomes drawer, approval/policy/lab/detail layouts become single column |
| 600px | `(max-width: 600px)` | Further stacking: form grid becomes 1 column, wallet card full width, settings grid 1 column |

### CSS sections and their areas

| Section | Lines | Area |
|---|---|---|
| Variables + base | 4-36 | Colors, typography, resets, focus states |
| Generic UI | 38-52 | `.sr-only`, `.logo`, `.btn`, `.icon-btn` |
| Onboarding | 54-143 | All onboarding-related classes |
| Application shell | 145-313 | Sidebar, topbar, panels, tables, metrics, detail views, wallet, lab, settings |
| Functional interactions | 367-381 | Danger buttons, field validation, popovers, empty states, decision cards |

### Pointer to CSS usage report

See `docs/ui/css-usage.md` for the full list of 186 used classes, 58 unused classes, and which classes are flagged SHARED (used by multiple pages). Regenerate with:

```powershell
node scripts/css-usage.mjs
```

---

## 9. DESIGNER'S PRE-MERGE CHECKLIST

### Per-page click-through

**Suppliers:**
- [ ] Click "Add supplier" → modal opens
- [ ] Fill all fields → "Create supplier" creates supplier, appears in table
- [ ] Click "Verify" on unverified supplier → status changes to Verified
- [ ] Verify loading state appears during save
- [ ] Verify empty state when no suppliers exist

**Invoices:**
- [ ] Click "Register invoice" → modal opens
- [ ] Select supplier, enter amount → invoice created
- [ ] Click "Attest" on open invoice → status changes to Attested
- [ ] Click "Dispute" on open invoice → status changes to Disputed

**Agents:**
- [ ] Click "Add agent" → modal opens
- [ ] Fill limits and select policies → agent created
- [ ] Click "Disable" on active agent → status changes to Disabled
- [ ] Click "Enable" on disabled agent → status changes to Active

**Attack Lab:**
- [ ] Select a scenario from the list
- [ ] Select agent and invoice
- [ ] Click "Run simulation" → result shows ALLOW/BLOCK/HOLD
- [ ] Verify result matches expected decision for the scenario

**Settings:**
- [ ] Click each nav section → content switches
- [ ] Click "Disconnect wallet" → confirm dialog appears
- [ ] Engine status section shows Live/In progress badges matching `FEATURES` map

**Dashboard / Policies / Activity / Approvals (in-progress pages):**
- [ ] InProgress panel shows instead of real content
- [ ] No simulated data visible

### Visual QA

- [ ] Screenshot at 1440px width — no horizontal scroll
- [ ] Screenshot at 390px width — no horizontal scroll
- [ ] No console errors in browser dev tools
- [ ] Focus states visible on all interactive elements
- [ ] ARIA attributes intact on buttons and form fields

### Commands

```powershell
# Typecheck
cd src && npx tsc --noEmit

# Build
cd .. && npm run build

# Test
npx vitest run
```

---

## 10. FAQ

**Q: Can I rename a component?**

A: Yes, but only the visual component (e.g., rename `PageHeading` to `PageHeader`). Do not rename props that carry data. Update all imports. Check `docs/ui/css-usage.md` if the component uses shared CSS classes.

**Q: Can I split a page into smaller components?**

A: Yes, as long as you don't remove data-bound elements, handlers, or state. Keep all props and handlers passing through to the sub-components.

**Q: Can I remove a column from a table?**

A: Only if the column is purely decorative (no data-bound value). Columns showing names, amounts, statuses, wallets, dates, or decisions must stay — restyle or hide visually, but don't delete the data cell.

**Q: Can I change copy?**

A: Yes. Reword labels, descriptions, button text, and help text freely. Do not remove security warnings, confirm dialogs, or cluster labels.

**Q: What if a field looks useless?**

A: Ask the owner before removing it. It may be wired to backend validation or RLS policy that isn't visible in the UI.

**Q: What if I need a new piece of data?**

A: Ask the owner. Do not add it yourself — new data requires engine changes, backend endpoints, and possibly migration changes.

---

## Message to send the designer

This document is at `docs/UI-HANDOFF.md`. Work on branch `ui-polish` (from `foundation`). Before merging, run: `npx tsc --noEmit`, `npm run build`, `npx vitest run`. Ask the owner for review and merge decisions.
