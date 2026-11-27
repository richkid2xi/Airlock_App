# Overnight Log

## Decisions
- Committed Step 2 feature gate (config/features.ts, ui/InProgress.tsx, ui/FeatureGate.tsx) as 382f573 before starting PART 1.

## Needs Elikem
- None yet.

## PART 1: REGISTRY (complete)
- Migration 0003_registry.sql: created, dry-run OK, pushed `--yes` to airlock-dev (tjzavfhghbjxchohkimo).
- src/engines/registry/live.ts: live engine using Supabase (suppliers/agents/policies/invoices CRUD + verify/attest/dispute RPCs).
- src/engines/registry/index.ts: exports liveRegistryEngine as registryEngine only (no mock).
- src/engines/registry/mock.ts: deleted.
- src/engines/registry/registry.contract.test.ts: deleted (33 tests, subject was mock). Baseline lowered 110→77.
- src/engines/registry.ts: renamed to src/engines/engineRegistry.ts (file/dir name shadowing conflict). All imports updated.
- src/pages/Suppliers.tsx, Invoices.tsx, Agents.tsx: new real-data pages using registryEngine with loading/error/empty states.
- src/shell/DashboardApp.tsx: wires registry pages under FeatureGate(feature="registry").
- src/ui/PageHeading.tsx: removed MockBadge usage; MockBadge.tsx deleted (no mock badge rule).
- src/config/features.ts: registry flipped to 'live'.
- Typecheck: passes. Build: passes. Vitest: 83 passed (12 files).

## PART 2: Strip mock/fallback from all engines (complete)
- src/engines/evaluation/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/supplier/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/invoice/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/settlement/index.ts: exports live only, removed withFallback+mock proxy
- src/engines/auth/index.ts: exports live only, removed withPolicyFallback+mock proxy
- src/engines/onboarding/index.ts: exports live only, removed withPolicyFallback+mock proxy
- Deleted: evaluation/mock.ts, supplier/mock.ts, invoice/mock.ts, settlement/mock.ts, auth/mock.ts, onboarding/mock.ts
- Deleted: domain/seed.ts (hardcoded mock data arrays)
- Deleted: engines/fallback.ts, engines/fallbackPolicy.ts (VITE_ENGINE_* + VITE_ALLOW_MOCK_FALLBACK)
- Deleted: engines/MockDataBadge.tsx, engines/status.ts (mock mode, VITE_ENGINE_*)
- Rewrote engines/engineRegistry.ts: EngineMode now 'live'|'degraded' (no 'mock'), all engines init as 'live', removed VITE_ENGINE_*/initFromEnv/withFallback/resolveEngine
- Deleted tests: registry.contract.test.ts (33), domain.test.ts (8), status.test.ts (2), fallbackPolicy.test.ts (23), invoice.test.ts (4), supplier.test.ts (4), registry.test.ts (3) = 77 total
- Baseline: 110 → 40
- Typecheck: passes. Build: passes. Vitest: 40 passed (6 files).

## PART 3: Evaluation engine live (complete)
- src/pages/AttackLab.tsx: rewritten to fetch real suppliers/agents/invoices from registryEngine, map to domain types, call evaluationEngine.evaluateRequest(); removed positional string[] props and domain adapters
- src/shell/DashboardApp.tsx: Attack Lab renders AttackLab under FeatureGate(feature="evaluation")
- src/config/features.ts: evaluation flipped to 'live'
- Typecheck: passes. Build: passes. Vitest: 40 passed (6 files).

## PART 4: UI Polish — Dashboard, Sidebar, Navbar cleanup (0d3230c)
- src/shell/Sidebar.tsx: tighten vertical rhythm — reduce `.side-brand` height 72→64px, `.sidebar nav` padding 8→4px, `.nav-section` margin-bottom 22→14px, button height 39→34px, `.nav-label` padding 7→5px, `.sidebar-footer` padding 12→8px
- src/index.css: add `.logout-btn`/.notification-header/.mark-read/.notification-panel styles; scope `.due-list`/`.events-list` grid to exclude `.empty-state`; add `.decision-pills` button group; add `.search-clear`; add `.search-panel`/`.global-tag` styles
- src/shell/Topbar.tsx: remove Help icon; replace wallet-profile badge + Log out text button with single LogOut icon button (title="Log out", red hover); add outside-click (mousedown) + Escape handlers; redesign notifications popover (right-aligned, crisp borders/shadow, "Mark all as read" header, empty state with bell icon); add real-time search with decision pills, clear button, "No results found" empty state, keyboard navigation (ArrowDown/ArrowUp/Enter); results grouped by label/group with tag, anchor beneath input, z-index 50
- src/pages/Dashboard.tsx: render real Dashboard layout (`welcome-row`, `metrics-grid`, `TransactionTable`, security panel, due-soon with empty state, events panel with empty state); replace FeatureGate+WelcomePanel; strip all hardcoded mock data (`€184,620`→`--`, `12`→`0`, `142`→`0`, `127/89%`→`0`, `All 7 policies`→`No policies configured`, fake events array→derived from activityRows, `Good morning, Maya`→`Dashboard`, `MONDAY, MAY 19`→empty); live-search filter via decision pills + live search input combine in real time; empty lists show clean empty-state messages; action links use navigate('/app/...') paths; Metric cards at `0` or `--` without hardcoded sample data
- Verified by running: tsc --noEmit (clean), vitest run (8 files / 46 tests pass), vite build (succeeds)
- Needs Elikem: none

## PART 5: Comprehensive UI polish, route recovery, modal/scrollbar & responsive pass (uncommitted)
- src/shell/DashboardApp.tsx: fixed route wiring — each route now renders its own dedicated view: /app -> Dashboard, /app/invoices -> Invoices, /app/suppliers -> Suppliers, /app/activity -> ActivityPage(approvals=false), /app/approvals -> ActivityPage(approvals=true), /app/agents -> Agents, /app/policies -> Policies, /app/attack-lab -> AttackLab, /app/settings -> Settings. Removed the bug where Policies/Activity/Approvals all rendered Suppliers. Empty arrays passed (no mock data) so pages show clean empty states. Verified `/app/ai-agents` does not exist in codebase (actual route is `/app/agents`) — left as-is, noted.
- src/ui/Modal.tsx: wrapped children in `.modal-scroll` scroll container (overflow-y:auto, hidden scrollbar) and added `scrollbar-none` to modal section; modal section now `overflow:hidden`.
- src/pages/CreationForm.tsx + src/pages/Policies.tsx: added `fit` utility class (`white-space:nowrap;flex-shrink:0`) to primary action buttons (Add supplier / Register invoice / Authorize agent / Create policy) to prevent awkward inline breaks at narrow widths.
- src/index.css: added `.scrollbar-none` utility (scrollbar-width:none; -ms-overflow-style:none; ::-webkit-scrollbar display:none); `.modal-scroll` (overflow-y:auto; max-height:calc(92vh - 110px)); `.fit`; modal slightly wider & shorter (`.modal` width min(520px,92vw), max-height min(700px,90vh); `.modal.wide` width min(700px,92vw)); header padding 19px->14px; refined `.global-results` rows (flex, label truncate, tag, hover/active outline, outer popover overflow hidden); `.top-popover.search` width min(440px,calc(100vw - 2rem)); desktop scale-down (`.content` padding 30->26px, `.metrics-grid` gap/margin 14->12px, `.panel-head` padding 15->13px & min-height 68->64px, `.metric-card` padding 17->16px, strong 25->23px); responsive `@media(max-width:600px)` adds 2-col metrics grid, tighter gaps/panel-head padding, table-tools/decision-pills flex-wrap.
- Main scroll container: DashboardApp `<main className="content scrollbar-none">` hides the page scrollbar while keeping scroll.
- Verified by running: tsc --noEmit (clean), vitest run (8 files / 46 tests pass), vite build (succeeds)
- Needs Elikem: none

## PART 5: Dashboard real invoice metrics (uncommitted)

- src/shell/DashboardApp.tsx: added useEffect to load invoices + suppliers from registryEngine on mount via supabase; compute paidCount/totalInvoices/dueSoon summary
- src/pages/Dashboard.tsx: rewired to accept metrics prop from engine; render real paidCount/totalInvoices from DB; dueSoon list from open invoices due within 14 days; decision-based metrics (blocked/awaiting review) show -- as data not live yet
- Payment activity/security/events remain InProgress (requests feature = in_progress, no hardcoded mock data)
- Verified: npx tsc --noEmit (clean), npx vitest run 8 files / 46 tests pass, npx vite build succeeds
- Needs Elikem: none

## AUDIT (SUPPLIERS / INVOICES / POLICIES / AGENTS slice)

### Suppliers
- Works against real DB: `registryEngine.suppliers.list()`, `verify(id)` RPC (returns verified row).
- Hard-coded/mock: none in current list.
- Missing: status filter (unverified/review_required/verified), search, detail page, edit form, audit line ("verified by wallet on date"), supplier invoices list.
- Reset notice: payout wallet change resets verification to review_required (DB trigger) but UI does not show it.

### Invoices
- Works against real DB: list(filter), create(), attest(), dispute(), get(); supplier picker uses real suppliers.
- Broken: client sends payeeWallet; DB trigger should snapshot it. Amount entered raw minor units, not decimal->minorUnits helper.
- Missing: status filter UI, search by number, detail page (supplier link, status timeline, actions), document upload/replace/open via signed URL.
- Invoice documents: no bucket, no document_path column, no storage RLS.

### Policies
- Not wired to DB: `Policies.tsx` receives positional `PolicyRecord[]` + gated InProgress with hardcoded arrays.
- Missing: real list/detail/create/edit, five controls, agent assignment via policy_agents.

### Agents
- Works against real DB: list(), create(), setStatus(), policies.list().
- Missing: edit, inline limit validation (positive, daily >= per-request), unique identifier inline error, assigned policies display.

### Legacy
- DataWorkspace.tsx, EntityDetail.tsx, CreationForm.tsx are unused dead code.

### Feature gates
- FEATURES.policies = in_progress (others per config/features.ts).

## PART 6: Registry slice completion — suppliers / invoices / policies / agents / settings (complete)

### Commits
- 37da573 shared: add base58 decode utility and payout wallet validation
- 9126b4e invoices: add filters, detail modal, document upload & signed URL, timeline
- 164e858 registry/engine: add document upload and signed URL methods
- 22c583c policies: full CRUD with search, detail modal, controls, agent assignment
- 60f2bd5 agents: edit modal, limits controls, inline validation, assigned policies
- 7e5db2a settings: demo data Load/Reset wired to registry engine

### Suppliers
- Search (name/email) + verification status filter.
- Create/edit with base58 payout-wallet validation (`validatePayoutWallet`, 32-byte decode).
- Verify via `verify_supplier` RPC; payout-wallet edit resets verification → UI shows reset notice.

### Invoices
- Status filter + search by invoice number/supplier.
- Detail modal: fields, timeline (registered/attested/disputed/paid), notes.
- Document upload to private `invoice-documents` bucket (org-scoped path) + signed-URL viewing.

### Policies
- FEATURES.policies flipped to live.
- Real list/search/create/edit via registryEngine; five controls; agent assignment via `assignAgents`.
- Detail modal showing limits/controls summary.

### Agents
- Edit modal (name/description/limits/status/currency/policies); identifier shown read-only (UpdateAgentInput has no identifier).
- `setLimits` per-request/daily controls; inline validation (integer, per>0, daily>=per).
- Status toggle and policy assignment.

### Settings
- Demo data section: Load demo data (load_demo_data) and Reset demo data (reset_demo_data) with danger confirm.
- resetDemoData()/loadDemoData() added to RegistryEnginePort + live engine.

### Cleanup / docs
- Deleted unused legacy pages: DataWorkspace.tsx, EntityDetail.tsx, CreationForm.tsx.
- docs/testing/registry.md: click-by-click manual checklist.
- scripts/verify/registry.ts + `pnpm verify:registry` (env presence checks; cross-user check SKIPPED without second token).

### Verification (run)
- `npx tsc --noEmit` clean, `npx vitest run` 46 passed (8 files), `npx vite build` succeeds.

### Needs Elikem
- Run `pnpm verify:registry` with `AIRLOCK_ACCESS_TOKEN` (and optionally `AIRLOCK_ACCESS_TOKEN_2`) plus `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local` against the hosted project.
- Manual pass through docs/testing/registry.md (needs wallet + devnet session).
- Confirm `load_demo_data` / `reset_demo_data` RPCs exist on the hosted project (0004 migration added reset_demo_data; load_demo_data must already exist from earlier migration).




