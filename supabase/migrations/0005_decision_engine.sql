-- Migration 0005: Decision engine, payment requests, evaluations, receipts
-- RLS org-scoped everywhere. Column grants let the client INSERT requests/evaluations
-- but never UPDATE decision/rules/snapshot/amount; status changes only through RPCs.

-- ---------------------------------------------------------------------------
-- payment_requests
-- ---------------------------------------------------------------------------
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  agent_id uuid NOT NULL REFERENCES public.agents (id),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id),
  claimed_payee text,
  claimed_amount_minor bigint,
  claimed_mint text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('attack_lab','agent_api','agent_console','manual')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.payment_requests TO authenticated;
GRANT INSERT (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source, created_by) ON public.payment_requests TO authenticated;
REVOKE UPDATE ON public.payment_requests FROM authenticated;
REVOKE DELETE ON public.payment_requests FROM authenticated;

CREATE POLICY payment_requests_org_select ON public.payment_requests
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY payment_requests_org_insert ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- evaluations
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.payment_requests (id) ON DELETE CASCADE,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  agent_id uuid NOT NULL REFERENCES public.agents (id),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id),
  amount_minor bigint NOT NULL,
  currency text NOT NULL CHECK (currency IN ('EUR','USD','GBP','USDC')),
  decision text NOT NULL CHECK (decision IN ('allowed','held','blocked')),
  status text NOT NULL DEFAULT 'blocked' CHECK (status IN ('allowed','held','blocked','approved','rejected','paid')),
  failed_rule text,
  reason_code text,
  rules jsonb,
  snapshot jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX evaluations_request_id_unique ON public.evaluations (request_id);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.evaluations TO authenticated;
GRANT INSERT (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot, evaluated_at) ON public.evaluations TO authenticated;
REVOKE UPDATE ON public.evaluations FROM authenticated;
REVOKE DELETE ON public.evaluations FROM authenticated;

CREATE POLICY evaluations_org_select ON public.evaluations
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
-- ---------------------------------------------------------------------------
-- evaluation_decisions (audit log of reviewer decisions)
-- ---------------------------------------------------------------------------
CREATE TABLE public.evaluation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations (id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid(),
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, reviewer_id)
);

ALTER TABLE public.evaluation_decisions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.evaluation_decisions TO authenticated;
REVOKE INSERT ON public.evaluation_decisions FROM authenticated;
REVOKE UPDATE ON public.evaluation_decisions FROM authenticated;
REVOKE DELETE ON public.evaluation_decisions FROM authenticated;

CREATE POLICY evaluation_decisions_org_select ON public.evaluation_decisions
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY evaluation_decisions_org_insert ON public.evaluation_decisions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- receipts (immutable; status changes only through chain slice later)
-- ---------------------------------------------------------------------------
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  evaluation_id uuid NOT NULL UNIQUE REFERENCES public.evaluations (id),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id),
  agent_id uuid NOT NULL REFERENCES public.agents (id),
  payee_wallet text NOT NULL,
  amount_minor bigint NOT NULL,
  currency text NOT NULL CHECK (currency IN ('EUR','USD','GBP','USDC')),
  status text NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized','settled')),
  snapshot jsonb,
  content_hash text,
  settlement_signature text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid NOT NULL DEFAULT auth.uid()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.receipts TO authenticated;
REVOKE INSERT ON public.receipts FROM authenticated;
REVOKE UPDATE ON public.receipts FROM authenticated;
REVOKE DELETE ON public.receipts FROM authenticated;

CREATE POLICY receipts_org_select ON public.receipts
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY receipts_org_insert ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

-- An invoice can have only one receipt (partial unique index on issuable receipts).
CREATE UNIQUE INDEX receipts_one_per_invoice ON public.receipts (invoice_id) WHERE status = 'authorized';

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE VIEW public.spent_today AS
SELECT e.agent_id, e.org_id, SUM(e.amount_minor) AS total_minor
FROM public.evaluations e
WHERE e.status IN ('approved','paid')
  AND e.evaluated_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
GROUP BY e.agent_id, e.org_id;

ALTER TABLE public.spent_today OWNER TO postgres;
GRANT SELECT ON public.spent_today TO authenticated;

CREATE VIEW public.committed_invoices AS
SELECT DISTINCT e.org_id, e.invoice_id
FROM public.evaluations e
WHERE e.status IN ('approved','paid');

ALTER TABLE public.committed_invoices OWNER TO postgres;
GRANT SELECT ON public.committed_invoices TO authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_evaluation(evaluation_id uuid, note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  ev_status text;
  requires_two_person boolean;
  reviewer_count int;
BEGIN
  SELECT e.org_id, e.status INTO org_id, ev_status
  FROM public.evaluations e
  WHERE e.id = evaluation_id
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Evaluation not found';
  END IF;

  IF org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Evaluation not in your organization';
  END IF;

  IF ev_status NOT IN ('held','allowed') THEN
    RAISE EXCEPTION 'Evaluation cannot be approved in current state';
  END IF;

  SELECT (e.snapshot->>'twoPersonApproval')::boolean
  INTO requires_two_person
  FROM public.evaluations e
  WHERE e.id = evaluation_id
  LIMIT 1;

  -- Record this reviewer's approval. UNIQUE(evaluation_id, reviewer_id)
  -- guarantees two DIFFERENT reviewers are required when the snapshot
  -- policy demands two-person approval.
  INSERT INTO public.evaluation_decisions (org_id, evaluation_id, reviewer_id, decision, note)
  VALUES (org_id, evaluation_id, auth.uid(), 'approved', note);

  SELECT COUNT(DISTINCT reviewer_id) INTO reviewer_count
  FROM public.evaluation_decisions
  WHERE evaluation_id = evaluation_id AND decision = 'approved';

  IF requires_two_person AND reviewer_count < 2 THEN
    RETURN; -- first of two required approvals: evaluation stays held
  END IF;

  UPDATE public.evaluations
  SET status = 'approved', evaluated_at = now()
  WHERE id = evaluation_id;

  PERFORM public.issue_receipt(evaluation_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_evaluation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_evaluation(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_evaluation(evaluation_id uuid, note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  ev_status text;
BEGIN
  SELECT e.org_id, e.status INTO org_id, ev_status
  FROM public.evaluations e
  WHERE e.id = evaluation_id
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Evaluation not found';
  END IF;

  IF org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Evaluation not in your organization';
  END IF;

  IF ev_status NOT IN ('held','allowed') THEN
    RAISE EXCEPTION 'Evaluation cannot be rejected in current state';
  END IF;

  INSERT INTO public.evaluation_decisions (org_id, evaluation_id, reviewer_id, decision, note)
  VALUES (org_id, evaluation_id, auth.uid(), 'rejected', note);

  UPDATE public.evaluations
  SET status = 'rejected', evaluated_at = now()
  WHERE id = evaluation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_evaluation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_evaluation(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- issue_receipt(evaluation_id): only for approved evaluation; idempotent;
-- computes content_hash = sha256(snapshot text || invoice id || amount)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_receipt(evaluation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  invoice_id uuid;
  supplier_id uuid;
  agent_id uuid;
  payee_wallet text;
  amount_minor bigint;
  currency text;
  snapshot_ jsonb;
  hash_input text;
  content_hash text;
  existing uuid;
BEGIN
  SELECT e.org_id, e.invoice_id, e.amount_minor, e.currency, e.snapshot,
         i.supplier_id, a.id, s.payout_wallet
  INTO org_id, invoice_id, amount_minor, currency, snapshot_, supplier_id, agent_id, payee_wallet
  FROM public.evaluations e
  JOIN public.invoices i ON i.id = e.invoice_id
  JOIN public.agents a ON a.id = e.agent_id
  JOIN public.suppliers s ON s.id = i.supplier_id
  WHERE e.id = evaluation_id AND e.status = 'approved'
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Evaluation not found or not approved';
  END IF;

  IF org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Evaluation not in your organization';
  END IF;

  SELECT id INTO existing FROM public.receipts WHERE evaluation_id = evaluation_id LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN; -- idempotent
  END IF;

  hash_input := (snapshot_::text) || invoice_id::text || amount_minor::text;
  content_hash := encode(digest(hash_input, 'sha256'), 'hex');

  INSERT INTO public.receipts (org_id, evaluation_id, invoice_id, supplier_id, agent_id, payee_wallet, amount_minor, currency, status, snapshot, content_hash, issued_at, issued_by)
  VALUES (org_id, evaluation_id, invoice_id, supplier_id, agent_id, payee_wallet, amount_minor, currency, 'authorized', snapshot_, content_hash, now(), auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_receipt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_receipt(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- verify_receipt(receipt_id): recompute hash from stored fields; returns true/false
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_receipt(receipt_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  snapshot_ jsonb;
  invoice_id uuid;
  amount_minor bigint;
  content_hash text;
  hash_input text;
  recomputed text;
BEGIN
  SELECT r.snapshot, r.invoice_id, r.amount_minor, r.content_hash
  INTO snapshot_, invoice_id, amount_minor, content_hash
  FROM public.receipts r
  WHERE r.id = receipt_id
  LIMIT 1;

  IF invoice_id IS NULL THEN
    RETURN false;
  END IF;

  hash_input := (snapshot_::text) || invoice_id::text || amount_minor::text;
  recomputed := encode(digest(hash_input, 'sha256'), 'hex');

  RETURN recomputed = content_hash;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_receipt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_receipt(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Replace load_demo_data(): also seeds requests/evaluations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.load_demo_data() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  supplier_count int;
  agt_cap uuid;   -- agent whose daily cap we approach with approved evals
  inv_appr uuid;  -- invoice with an already approved evaluation
  req_allowed uuid;  -- already-approved evaluation
  req_paid uuid;     -- already-paid evaluation
  req_held uuid;     -- held evaluation
  req_blocked uuid;  -- blocked evaluation
BEGIN
  SELECT o.id INTO org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  SELECT COUNT(*) INTO supplier_count
  FROM public.suppliers
  WHERE org_id = org_id;

  IF supplier_count > 0 THEN
    RAISE EXCEPTION 'Demo data already loaded for this organization';
  END IF;

  -- 4 suppliers
  INSERT INTO public.suppliers (org_id, name, business_email, address, category, verification_reference, payout_wallet, verification_status, notes)
  VALUES
    (org_id, 'Accra Trade Co', 'procurement@accra-trade.example', 'Accra, Ghana', 'goods', 'REF-ACCRA-001', '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', 'verified', 'Verified Ghana supplier'),
    (org_id, 'Lagos Parts Ltd', 'sales@lagos-parts.example', 'Lagos, Nigeria', 'hardware', 'REF-LAGOS-001', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', 'unverified', 'New supplier, under review'),
    (org_id, 'Dakar Services', 'contact@dakar-services.example', 'Dakar, Senegal', 'services', 'REF-DAKAR-001', '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', 'review_required', 'Pending additional documentation'),
    (org_id, 'Abidjan Goods', 'orders@abidjan-goods.example', 'Abidjan, Côte d''Ivoire', 'goods', 'REF-ABIDJAN-001', '2vZ9yX1wP3qR5tY7uI9oP0aS2dF4gH6jK8lM1nB3vC5', 'verified', 'Verified supplier of consumer goods');

  -- 3 agents
  INSERT INTO public.agents (org_id, name, identifier, description, status, per_request_limit_minor, daily_limit_minor, currency)
  VALUES
    (org_id, 'Risk Agent', 'risk-001', 'Handles risk assessment for payments', 'active', 100000, 5000000, 'USDC'),
    (org_id, 'Compliance Agent', 'comp-001', 'Ensures regulatory compliance', 'active', 50000, 2000000, 'USDC'),
    (org_id, 'Operations Agent', 'ops-001', 'Manages operational payments', 'disabled', 20000, 1000000, 'USDC');

  -- 2 policies with assignments
  INSERT INTO public.policies (org_id, name, description, max_invoice_minor, daily_cap_minor, require_verified_supplier, require_delivery_attestation, require_agent_intent, require_supporting_evidence, require_two_person_approval, approval_threshold_minor, status)
  VALUES
    (org_id, 'Standard Controls', 'Default invoice, supplier and evidence controls for routine payments.', 50000000, 150000000, true, true, true, false, false, 10000000, 'active'),
    (org_id, 'High Value Review', 'Adds two-person approval for higher-value supplier payments.', 100000000, 250000000, true, true, true, true, true, 25000000, 'active');

  -- About 8 invoices across statuses
  INSERT INTO public.invoices (org_id, invoice_number, supplier_id, amount_minor, currency, issue_date, due_date, document_ref, notes, status)
  VALUES
    (org_id, 'INV-2048', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Accra Trade Co' LIMIT 1), 12480000000, 'USDC', '2026-04-28', '2026-05-18', 'DOC-INV-2048', 'Q1 software services', 'paid'),
    (org_id, 'INV-2057', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Accra Trade Co' LIMIT 1), 14680000000, 'EUR', '2026-05-14', '2026-05-29', 'DOC-INV-2057', 'Office supplies Q2', 'open'),
    (org_id, 'INV-2053', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Lagos Parts Ltd' LIMIT 1), 8920000000, 'EUR', '2026-05-10', '2026-05-24', 'DOC-INV-2053', 'Hardware procurement', 'attested'),
    (org_id, 'INV-2051', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Dakar Services' LIMIT 1), 3240000000, 'USD', '2026-05-07', '2026-05-21', 'DOC-INV-2051', 'Consulting services', 'open'),
    (org_id, 'INV-2042', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Abidjan Goods' LIMIT 1), 4200000000, 'EUR', '2026-04-22', '2026-05-12', 'DOC-INV-2042', 'Quarterly hardware', 'disputed'),
    (org_id, 'INV-2039', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Accra Trade Co' LIMIT 1), 1680000000, 'USDC', '2026-04-19', '2026-05-04', 'DOC-INV-2039', 'Cloud services', 'paid'),
    (org_id, 'INV-2037', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Lagos Parts Ltd' LIMIT 1), 6340000000, 'USD', '2026-05-18', '2026-06-18', 'DOC-INV-2037', 'Edge compute', 'open'),
    (org_id, 'INV-2029', (SELECT id FROM public.suppliers WHERE org_id = org_id AND name = 'Dakar Services' LIMIT 1), 3040000000, 'EUR', '2026-05-16', '2026-06-16', 'DOC-INV-2029', 'Model fine-tuning', 'hold');

  -- Seed payment requests + evaluations for the requests slice
  -- Agent whose daily cap we approach with approved evaluations today (close to cap)
  SELECT id INTO agt_cap FROM public.agents WHERE org_id = org_id AND identifier = 'risk-001' LIMIT 1;

  -- Approved evaluation today close to daily cap (committedToday close to daily cap)
  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2057' LIMIT 1), NULL, 4500000000, NULL, 'manual')
  RETURNING id INTO req_allowed;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (req_allowed, org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2057' LIMIT 1), 4500000000, 'EUR', 'allowed', 'allowed', NULL, NULL, '[]', '{}');

  -- Already paid invoice (a paid evaluation referencing an invoice)
  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2039' LIMIT 1), NULL, 1680000000, NULL, 'manual')
  RETURNING id INTO req_paid;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (req_paid, org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2039' LIMIT 1), 1680000000, 'USDC', 'allowed', 'paid', NULL, NULL, '[]', '{}');

  -- Held evaluation
  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2053' LIMIT 1), NULL, 8920000000, NULL, 'manual')
  RETURNING id INTO req_held;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (req_held, org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2053' LIMIT 1), 8920000000, 'EUR', 'held', 'held', 'needs_attestation', 'needs_attestation', '[]', '{}');

  -- Blocked evaluation
  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2042' LIMIT 1), NULL, 4200000000, NULL, 'manual')
  RETURNING id INTO req_blocked;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (req_blocked, org_id, agt_cap, (SELECT id FROM public.invoices WHERE org_id = org_id AND invoice_number = 'INV-2042' LIMIT 1), 4200000000, 'EUR', 'blocked', 'blocked', 'supplier_unverified', 'supplier_unverified', '[]', '{}');

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.load_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_demo_data() TO authenticated;
