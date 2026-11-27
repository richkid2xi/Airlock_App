# Airlock

**Onchain security for AI agents on Solana.**

Every agent transaction clears the airlock first. Airlock simulates, checks, and enforces onchain limits on AI agent wallets, so one poisoned prompt can’t drain your funds.

Agent wallets are rarely hacked — they’re tricked. A poisoned webpage, token description, or message can rewrite what an agent thinks it was asked to do. A wallet key with no spending limit turns one bad decision into a total loss. Airlock puts hard caps, destination allowlists, and destination/program allowlists on-chain, enforced once only in the program. Off-chain evaluators are a second layer for UX and early rejection — never the only layer.

---

## What Airlock does

| Capability | How |
|---|---|
| **Hard spending caps** | Per-transaction and daily limits enforced on-chain in USDC minor units |
| **Destination allowlists** | Only approved payee wallets can receive funds |
| **Two-person approval** | Require a second wallet signature for high-value requests |
| **Engine status** | Live / mock / degraded engine modes with honest fallback — never present mock as live |
| **Onboarding** | Organization setup with threshold validation and step-by-step onboarding |
| **Dashboard** | Payment activity, security events, invoices due, pending approvals |

---

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v4** styling
- **Phantom** wallet adapter on **Solana Devnet**, settled in **USDC (6 decimals)**
- **Supabase** (Postgres + RLS + Auth + Edge Functions + Realtime)
- **Anchor** smart contracts (planned)

---

## Project Structure

```
src/
├── App.tsx           # Providers + routes
├── main.tsx          # Entry point
├── index.css         # Tailwind import + global styles
├── lib/supabase.ts   # Supabase client (anon key only)
├── engines/          # Engine pattern: port + mock + live + index
│   ├── onboarding/   # OnboardingPort, mock, types
│   ├── evaluation/   # Evaluation engine
│   ├── invoice/      # Invoice engine
│   ├── settlement/   # Settlement engine
│   ├── supplier/     # Supplier engine
│   └── auth/         # Auth engine (in progress)
├── pages/
│   ├── Landing.tsx   # Marketing page
│   ├── Dashboard.tsx # Payment activity, security, invoices
│   ├── Onboarding.tsx# 4-step org setup + Complete
│   ├── SettingsPage.tsx # Org profile, wallet, engine status, team
│   └── Checkpoint.tsx# Scratch: Phantom sign-in test
└── components/       # Reusable UI (Metric, Status, Icon, MockBadge, ...)

packages/
├── shared/           # Canonical domain types + zod + minor-unit helpers
└── golden/           # Golden test vectors (JSON + schema)

supabase/
├── migrations/0001_orgs.sql   # organizations table + RLS + GRANTs + SECURITY DEFINER fns
├── tests/0001_orgs.test.sql   # pgTAP assertions
└── seed.sql                # (planned)

scripts/test.sh             # vitest + pgTAP harness (CI)
scripts/test.ps1            # vitest only (Windows)
docs/supabase-cli.md        # Supabase CLI v3.4.0 reference
AGENTS.md                   # Engineering rules (type safety, stable IDs, honest fallback, etc.)
SOLANA.md                   # Solana runtime & security rules
```

---

## Quick Start

### Prerequisites

- Node.js 22 (see `.mise.toml`)
- pnpm 9
- Phantom browser extension
- A hosted Supabase project

### Install

```bash
pnpm install
```

### Environment

Create `.env.local` (never committed):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Scratch project for pgTAP (must NOT be your dev project)
SUPABASE_TEST_PROJECT_REF=<scratch-ref>

VITE_SOLANA_CLUSTER=devnet
# Optional: allow mock fallback when live engine fails
VITE_ALLOW_MOCK_FALLBACK=true
```

> The service-role key never goes in client code or `.env.local`. It lives only inside Edge Functions' built-in env.

### Run

```bash
pnpm dev        # Vite dev server on port 8443 (Figma Make)
pnpm build      # Production build
```

### Test

```bash
pnpm test                    # vitest (root)
cd packages/shared && pnpm vitest run
./scripts/test.sh            # full harness: vitest + pgTAP (CI)
.\scripts\test.ps1           # Windows variant (vitest only)
```

Baseline: **42 tests passing**. pgTAP runs against a separate scratch Supabase project — never against your dev project.

---

## Engineering Rules

1. **Type safety first** — Named TS types, not `string[]`
2. **Stable IDs** — UUIDs/business keys, never display names
3. **Honest fallback** — Live→mock only on transport/RPC errors + `VITE_ALLOW_MOCK_FALLBACK=true`; marks engine `degraded`; shows "Mock data" badge
4. **Typed domain** — Core entities live in `packages/shared`
5. **Minor units** — Integer minor units (USDC = 6 decimals) as strings/`bigint`; format only at the display edge
6. **Solana rules** — Read `SOLANA.md` before any on-chain/off-chain code
7. **Test first** — Golden vectors in `packages/golden` before logic
8. **Two layers** — On-chain = hard caps; off-chain evaluator = UX only
9. **CU benchmarks** — Every instruction path in `docs/cu-budget.md`
10. **Review claims** — Verify exploitability on Solana runtime before changing code
11. **Supabase** — RLS from first migration; anon key only in client; service-role only in Edge Functions
12. **Shared logic** — zod/schemas/helpers in `packages/shared`; never copy-paste between client and functions
13. **Honest result** — Correctness first; optimize only against measured benchmarks

---

## Repo

`https://github.com/richkid2xi/Airlock_App.git`

Development happens on branch `foundation`.