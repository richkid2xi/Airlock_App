# Airlock Pipeline Demo Script

**Duration:** ~3 minutes  
**Goal:** Demonstrate the end-to-end payment pipeline evaluation flow using live data.

## Prerequisites
- Local dev server running: `pnpm dev`
- Wallet connected on devnet
- Organisation created via onboarding

## Step-by-step

### 1. Open the dashboard
- Navigate to `/app` → **Overview** page loads with dashboard metrics
- Metrics tiles display live aggregates from `get_dashboard_metrics()` RPC:
  - `Suppliers by Status`, `Invoices by Status`
  - `Requests by Decision`, `Blocked`, `Held`
  - `Receipts Issued`, `Amount Authorized Today`
  - `Daily Cap`, `Last Evaluations`

### 2. Open Pipeline
- Click **Pipeline** in the sidebar (trend icon under **OVERVIEW**)
- URL: `/app/pipeline`
- Page renders seven step cards with live data counts from engines

### 3. View step states
- **Suppliers**: Shows registered count and verified count from `registryEngine.suppliers.list()`
- **Invoices**: Shows total/open/attested counts from `registryEngine.invoices.list()`
- **Agent request**: Shows request count; if >0, displays latest request summary
- **Decision**: Shows latest decision (`ALLOW`/`BLOCK`) with rule detail if applicable
  - Example: Latest decision `BLOCK` via `payee_mismatch` → step shows `Blocked`
- **Approval**: If held items > 0, shows `Waiting` with **Review held** button
- **Receipt**: Shows receipt count; if any, step is `Done`
- **On-chain settlement**: Always `In progress` — never fabricates a signature

### 4. Run the Attack Lab simulation (optional, from Pipeline)
- Click **Run the attack demo** button → navigates to `/app/attack-lab`
- Select an agent + invoice + amount + scenario
- Click **Run simulation** → evaluationEngine evaluates the request using real DB data
- Result shows: decision (`ALLOW`/`BLOCK`/`HOLD`), triggered rule, and recommended next action
- Return to Pipeline via sidebar → Decision step updates to reflect the new decision

### 5. Expected results summary
- Pipeline steps transition from `Waiting` → `Done` as data is registered
- Decision step correctly reports `ALLOW` when all controls pass, or `BLOCK` with specific rule reason when controls fail
- Attack Lab simulation exercises the full 12-rule evaluator (agent, invoice, payee, amount, mint, over_limit, daily_cap, supplier_unverified, needs_attestation, needs_approval, plus invoice_disputed and agent_disabled from the base evaluator)

### What the demo proves
- Real database data flows through engines without mock data
- Evaluation rules are enforced consistently (no fabricated results)
- Pipeline UI reflects live state, not simulated arrays
- Feature gates correctly enable/disable steps based on FEATURES config
- End-to-end flow: wallet → registry → metrics RPC → pipeline page → attack lab → decision