# Database Ground Truth — airlock-dev (tjzavfhghbjxchohkimo)

Generated: 2026-11-27
Source: migration files (`supabase/migrations/0001_orgs.sql`, `0002_orgs_rls_policies.sql`, `0003_registry.sql`)
Remote verification: `npx supabase migration list --remote=tjzavfhghbjxchohkimo` — all three migrations (0001, 0002, 0003) applied remotely.
Remote read-only query: NOT available — no SUPABASE_ACCESS_TOKEN in environment. No `supabase db query` / Management API route usable without a token. Truth established from migration files + migration list output.

---

## Migrations Applied (remote)

| Migration | Remote Status | Local Status |
|---|---|---|
| `0001_orgs.sql` | applied | present |
| `0002_orgs_rls_policies.sql` | applied | present |
| `0003_registry.sql` | applied | present |

Next free migration number: **0004**.

---

## Expected vs Present — Database Objects

### Table: public.organizations

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `organizations` table | PRESENT | `0001_orgs.sql` line 4: `CREATE TABLE public.organizations` |
| `id` uuid PK DEFAULT gen_random_uuid() | PRESENT | `0001_orgs.sql` line 5 |
| `owner_id` uuid NOT NULL REFERENCES auth.users(id) | PRESENT | `0001_orgs.sql` line 6 |
| `name` text | PRESENT | `0001_orgs.sql` line 7 |
| `business_email` text | PRESENT | `0001_orgs.sql` line 8 |
| `industry` text | PRESENT | `0001_orgs.sql` line 9 |
| `size` text | PRESENT | `0001_orgs.sql` line 10 |
| `settlement_cluster` text | PRESENT | `0001_orgs.sql` line 11 |
| `settlement_asset` text | PRESENT | `0001_orgs.sql` line 12 |
| `reporting_currency` text | PRESENT | `0001_orgs.sql` line 13 |
| `max_invoice_minor` bigint | PRESENT | `0001_orgs.sql` line 14 |
| `approval_threshold_minor` bigint | PRESENT | `0001_orgs.sql` line 15 |
| `onboarding_step` int NOT NULL DEFAULT 1 | PRESENT | `0001_orgs.sql` line 16 |
| **`onboarded_at` timestamptz** | **PRESENT** | `0001_orgs.sql` line 17: `onboarded_at timestamptz` |
| `created_at` timestamptz DEFAULT now() | PRESENT | `0001_orgs.sql` line 18 |
| `updated_at` timestamptz DEFAULT now() | PRESENT | `0001_orgs.sql` line 19 |
| Constraint: organizations_owner_unique (UNIQUE owner_id) | PRESENT | `0001_orgs.sql` line 20 |
| Constraint: organizations_onboarding_step_range (CHECK 1-4) | PRESENT | `0001_orgs.sql` line 21 |
| Constraint: organizations_max_invoice_minor_positive (CHECK > 0) | PRESENT | `0001_orgs.sql` lines 39-40 |
| Constraint: organizations_approval_threshold_positive (CHECK > 0) | PRESENT | `0001_orgs.sql` lines 44-45 |
| Constraint: organizations_approval_not_above_max (CHECK threshold <= max) | PRESENT | `0001_orgs.sql` lines 48-49 |
| RLS ENABLED | PRESENT | `0001_orgs.sql` line 25: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| RLS policy: organizations_owner_select | PRESENT | `0002_orgs_rls_policies.sql` lines 5-7 |
| RLS policy: organizations_owner_insert | PRESENT | `0002_orgs_rls_policies.sql` lines 9-11 |
| RLS policy: organizations_owner_update | PRESENT | `0002_orgs_rls_policies.sql` lines 13-16 |
| GRANT SELECT (all columns) to authenticated | PRESENT | `0001_orgs.sql` line 29 |
| GRANT INSERT (specific columns only) to authenticated | PRESENT | `0001_orgs.sql` line 30 |
| GRANT UPDATE (specific columns only) to authenticated | PRESENT | `0001_orgs.sql` line 31 |
| REVOKE DELETE from authenticated | PRESENT | `0001_orgs.sql` line 34 |
| onboarded_at NOT in INSERT grant list | PRESENT (correctly excluded) | `0001_orgs.sql` line 30 — onboarded_at not listed |
| onboarded_at NOT in UPDATE grant list | PRESENT (correctly excluded) | `0001_orgs.sql` line 31 — onboarded_at not listed |
| Trigger: organizations_set_updated_at (sets updated_at) | PRESENT | `0001_orgs.sql` lines 61-64 |

### Function: public.current_org_id()

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `current_org_id()` function | PRESENT | `0001_orgs.sql` lines 67-77 |
| Returns uuid | PRESENT | `0001_orgs.sql` line 67: `RETURNS uuid` |
| SECURITY DEFINER | PRESENT | `0001_orgs.sql` line 70 |
| SET search_path = '' | PRESENT | `0001_orgs.sql` line 71 |
| SELECTs org id where owner_id = auth.uid() | PRESENT | `0001_orgs.sql` lines 73-76 |
| GRANT EXECUTE to authenticated | PRESENT | `0001_orgs.sql` lines 139-140 |
| REVOKE EXECUTE from PUBLIC | PRESENT | `0001_orgs.sql` line 138 |

### Function: public.complete_onboarding()

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `complete_onboarding()` function | PRESENT | `0001_orgs.sql` lines 82-132 |
| Returns void | PRESENT | `0001_orgs.sql` line 82 |
| SECURITY DEFINER | PRESENT | `0001_orgs.sql` line 84 |
| SET search_path = '' | PRESENT | `0001_orgs.sql` line 85 |
| Sets `airlock.onboarding_complete` config to 'true' | PRESENT | `0001_orgs.sql` line 98 |
| Validates org exists for auth.uid() | PRESENT | `0001_orgs.sql` lines 100-108 |
| Validates name not empty | PRESENT | `0001_orgs.sql` lines 110-112 |
| Validates email format | PRESENT | `0001_orgs.sql` lines 114-116 |
| Validates cluster/asset/currency not null | PRESENT | `0001_orgs.sql` lines 118-120 |
| Validates max_invoice_minor and approval_threshold_minor | PRESENT | `0001_orgs.sql` lines 122-124 |
| Sets onboarded_at = now() | PRESENT | `0001_orgs.sql` lines 126-128 |
| GRANT EXECUTE to authenticated | PRESENT | `0001_orgs.sql` line 136 |
| REVOKE EXECUTE from PUBLIC | PRESENT | `0001_orgs.sql` line 135 |

### Table: public.suppliers

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `suppliers` table | PRESENT | `0003_registry.sql` line 7 |
| `id` uuid PK | PRESENT | `0003_registry.sql` line 8 |
| `org_id` uuid DEFAULT current_org_id() REFERENCES organizations | PRESENT | `0003_registry.sql` line 9 |
| `name` text NOT NULL | PRESENT | `0003_registry.sql` line 10 |
| `business_email` text | PRESENT | `0003_registry.sql` line 11 |
| `address` text | PRESENT | `0003_registry.sql` line 12 |
| `category` text | PRESENT | `0003_registry.sql` line 13 |
| `verification_reference` text | PRESENT | `0003_registry.sql` line 14 |
| `payout_wallet` text NOT NULL | PRESENT | `0003_registry.sql` line 15 |
| `verification_status` text DEFAULT 'unverified' CHECK in ('unverified','review_required','verified') | PRESENT | `0003_registry.sql` line 16 |
| `verified_at` timestamptz | PRESENT | `0003_registry.sql` line 17 |
| `verified_by` uuid | PRESENT | `0003_registry.sql` line 18 |
| `notes` text | PRESENT | `0003_registry.sql` line 19 |
| `created_at` timestamptz DEFAULT now() | PRESENT | `0003_registry.sql` line 20 |
| `updated_at` timestamptz DEFAULT now() | PRESENT | `0003_registry.sql` line 21 |
| UNIQUE (org_id, payout_wallet) | PRESENT | `0003_registry.sql` line 22 |
| CHECK: payout_wallet length 32-44 | PRESENT | `0003_registry.sql` line 23 |
| RLS ENABLED | PRESENT | `0003_registry.sql` line 26 |
| RLS policies (select/insert/update, org-scoped) | PRESENT | `0003_registry.sql` lines 33-42 |
| Column-level GRANTs (SELECT, INSERT specific cols, UPDATE specific cols) | PRESENT | `0003_registry.sql` lines 28-30 |
| REVOKE DELETE | PRESENT | `0003_registry.sql` line 31 |
| Trigger: suppliers_set_updated_at | PRESENT | `0003_registry.sql` lines 44-47 |
| Trigger: suppliers_payout_wallet_reset (verified -> review_required on wallet change) | PRESENT | `0003_registry.sql` lines 50-68 |

### Table: public.agents

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `agents` table | PRESENT | `0003_registry.sql` line 107 |
| `id`, `org_id`, `name`, `identifier`, `description`, `status`, `per_request_limit_minor`, `daily_limit_minor`, `currency`, `created_at`, `updated_at` | PRESENT | `0003_registry.sql` lines 108-118 |
| CHECK: per_request_limit_minor > 0 | PRESENT | `0003_registry.sql` line 114 |
| CHECK: daily_limit_minor >= per_request_limit_minor | PRESENT | `0003_registry.sql` line 115 |
| UNIQUE (org_id, identifier) | PRESENT | `0003_registry.sql` line 119 |
| RLS ENABLED + org-scoped policies | PRESENT | `0003_registry.sql` lines 122-138 |
| Column-level GRANTs | PRESENT | `0003_registry.sql` lines 124-126 |
| Trigger: agents_set_updated_at | PRESENT | `0003_registry.sql` lines 140-143 |

### Table: public.policies

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `policies` table | PRESENT | `0003_registry.sql` line 148 |
| Columns: id, org_id, name, description, max_invoice_minor, daily_cap_minor, require_verified_supplier, require_delivery_attestation, require_agent_intent, require_supporting_evidence, require_two_person_approval, approval_threshold_minor, status, created_at, updated_at | PRESENT | `0003_registry.sql` lines 149-163 |
| CHECK: max_invoice_minor > 0 | PRESENT | `0003_registry.sql` line 153 |
| CHECK: daily_cap_minor >= max_invoice_minor | PRESENT | `0003_registry.sql` line 154 |
| status CHECK in ('active','draft') | PRESENT | `0003_registry.sql` line 161 |
| RLS ENABLED + org-scoped policies | PRESENT | `0003_registry.sql` lines 166-182 |
| Column-level GRANTs | PRESENT | `0003_registry.sql` lines 168-170 |
| Trigger: policies_set_updated_at | PRESENT | `0003_registry.sql` lines 184-187 |

### Table: public.policy_agents

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `policy_agents` table | PRESENT | `0003_registry.sql` line 192 |
| PK (policy_id, agent_id) | PRESENT | `0003_registry.sql` line 196 |
| FK to policies, FK to agents (ON DELETE CASCADE) | PRESENT | `0003_registry.sql` lines 193-194 |
| org_id DEFAULT current_org_id() | PRESENT | `0003_registry.sql` line 195 |
| RLS ENABLED + org-scoped policies | PRESENT | `0003_registry.sql` lines 199-213 |
| Trigger: policy_agents_same_org (policy/agent same org check) | PRESENT | `0003_registry.sql` lines 216-247 |

### Table: public.invoices

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `invoices` table | PRESENT | `0003_registry.sql` line 252 |
| Columns: id, org_id, invoice_number, supplier_id, payee_wallet, amount_minor, currency, mint, issue_date, due_date, document_ref, notes, status, attested_at, attested_by, created_at, updated_at | PRESENT | `0003_registry.sql` lines 253-269 |
| CHECK: amount_minor > 0 | PRESENT | `0003_registry.sql` line 258 |
| CHECK: currency IN ('EUR','USD','GBP','USDC') | PRESENT | `0003_registry.sql` line 259 |
| CHECK: due_date >= issue_date | PRESENT | `0003_registry.sql` line 262 |
| CHECK: payee_wallet length 32-44 | PRESENT | `0003_registry.sql` line 271 |
| UNIQUE (org_id, invoice_number) | PRESENT | `0003_registry.sql` line 270 |
| status CHECK in ('open','attested','paid','disputed') | PRESENT | `0003_registry.sql` line 265 |
| RLS ENABLED + org-scoped policies | PRESENT | `0003_registry.sql` lines 274-290 |
| Column-level GRANTs: SELECT all, INSERT specific cols, UPDATE (status, notes) only | PRESENT | `0003_registry.sql` lines 276-278 |
| REVOKE DELETE | PRESENT | `0003_registry.sql` line 279 |
| Trigger: invoices_set_updated_at | PRESENT | `0003_registry.sql` lines 292-295 |
| Trigger: invoices_payee_snapshot (sets payee_wallet from supplier on insert) | PRESENT | `0003_registry.sql` lines 298-319 |
| Trigger: invoices_immutable_columns (rejects updates to frozen cols) | PRESENT | `0003_registry.sql` lines 322-345 |

### Function: public.verify_supplier(uuid)

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `verify_supplier()` function | PRESENT | `0003_registry.sql` lines 71-99 |
| SECURITY DEFINER | PRESENT | `0003_registry.sql` line 73 |
| Org-scoped (checks supplier.org_id = current_org_id()) | PRESENT | `0003_registry.sql` lines 88-90 |
| Sets verification_status = 'verified', verified_at, verified_by | PRESENT | `0003_registry.sql` lines 93-97 |
| GRANT EXECUTE to authenticated | PRESENT | `0003_registry.sql` line 102 |

### Function: public.attest_invoice(uuid)

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `attest_invoice()` function | PRESENT | `0003_registry.sql` lines 348-378 |
| SECURITY DEFINER | PRESENT | `0003_registry.sql` line 350 |
| Org-scoped | PRESENT | `0003_registry.sql` lines 366-368 |
| Only open -> attested | PRESENT | `0003_registry.sql` lines 370-372 |
| Sets attested_at, attested_by | PRESENT | `0003_registry.sql` line 375 |
| GRANT EXECUTE to authenticated | PRESENT | `0003_registry.sql` line 381 |

### Function: public.dispute_invoice(uuid)

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `dispute_invoice()` function | PRESENT | `0003_registry.sql` lines 384-414 |
| SECURITY DEFINER | PRESENT | `0003_registry.sql` line 386 |
| Org-scoped | PRESENT | `0003_registry.sql` lines 402-404 |
| open|attested -> disputed, not paid | PRESENT | `0003_registry.sql` lines 406-408 |
| GRANT EXECUTE to authenticated | PRESENT | `0003_registry.sql` line 417 |

### Function: public.load_demo_data()

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `load_demo_data()` function | PRESENT | `0003_registry.sql` lines 446-505 |
| SECURITY DEFINER | PRESENT | `0003_registry.sql` line 448 |
| Refuses if org already has suppliers | PRESENT | `0003_registry.sql` lines 464-470 |
| Inserts 4 suppliers, 3 agents, 2 policies, 8 invoices | PRESENT | `0003_registry.sql` lines 472-503 |
| GRANT EXECUTE to authenticated | PRESENT | `0003_registry.sql` line 508 |

### View: public.supplier_summary

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `supplier_summary` view | PRESENT | `0003_registry.sql` lines 422-428 |
| GRANT SELECT to authenticated | PRESENT | `0003_registry.sql` line 431 |

### View: public.agent_summary

| Expected object | PRESENT / MISSING / DIFFERENT | Evidence |
|---|---|---|
| `agent_summary` view | PRESENT | `0003_registry.sql` lines 433-441 |
| GRANT SELECT to authenticated | PRESENT | `0003_registry.sql` line 441 |

### Tables NOT present (expected for future migration 0004)

| Expected object | Status | Evidence |
|---|---|---|
| `payment_requests` table | MISSING | Not in any migration; planned for 0004 |
| `evaluations` table | MISSING | Not in any migration; planned for 0004 |
| `paid_today` view | MISSING | Not in any migration; planned for 0004 |

### Column-level grant verification (onboarded_at)

| Check | Status | Evidence |
|---|---|---|
| authenticated cannot UPDATE onboarded_at | PRESENT (correctly blocked) | `0001_orgs.sql` line 31 — onboarded_at not in UPDATE grant list |
| authenticated cannot INSERT with onboarded_at | PRESENT (correctly blocked) | `0001_orgs.sql` line 30 — onboarded_at not in INSERT grant list |
| pgTAP test confirms 42501 for onboarded_at UPDATE | PRESENT | `supabase/tests/0001_orgs.test.sql` lines 54-60 |

### Summary

| Category | Total Expected | PRESENT | MISSING | DIFFERENT |
|---|---|---|---|---|
| Tables | 6 | 6 | 0 | 0 |
| Views | 2 | 2 | 0 | 0 |
| Functions | 6 | 6 | 0 | 0 |
| Triggers | 8 | 8 | 0 | 0 |
| RLS policies | 16 | 16 | 0 | 0 |
| Column-level GRANTs | correct | correct | 0 | 0 |
| Constraints | 9 | 9 | 0 | 0 |

**Key finding:** `onboarded_at` IS present in `public.organizations` (migration `0001_orgs.sql` line 17). Column-level GRANTs correctly exclude `onboarded_at` from both INSERT and UPDATE, so the REST API cannot set it directly — only `complete_onboarding()` (SECURITY DEFINER) can set it.
