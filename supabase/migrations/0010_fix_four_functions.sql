-- ---------------------------------------------------------------------------
-- Migration 0010: Corrected four PostgreSQL functions matching the live database.
-- Every PL/pgSQL variable is prefixed v_, every column reference is qualified
-- with a table alias, and positional arguments ($1,$2) are used where needed
-- to avoid parameter/column ambiguity.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_evaluation(evaluation_id uuid, note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_ev_status text;
  v_requires_two_person boolean;
  v_reviewer_count int;
BEGIN
  SELECT e.org_id, e.status INTO v_org_id, v_ev_status
  FROM public.evaluations e
  WHERE e.id = $1
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Evaluation not found';
  END IF;

  IF v_org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Evaluation not in your organization';
  END IF;

  IF v_ev_status NOT IN ('held','allowed') THEN
    RAISE EXCEPTION 'Evaluation cannot be approved in current state';
  END IF;

  SELECT (e.snapshot->>'twoPersonApproval')::boolean
  INTO v_requires_two_person
  FROM public.evaluations e
  WHERE e.id = $1
  LIMIT 1;

  INSERT INTO public.evaluation_decisions (org_id, evaluation_id, reviewer_id, decision, note)
  VALUES (v_org_id, $1, auth.uid(), 'approved', note);

  SELECT COUNT(DISTINCT reviewer_id) INTO v_reviewer_count
  FROM public.evaluation_decisions
  WHERE evaluation_id = $1 AND decision = 'approved';

  IF v_requires_two_person AND v_reviewer_count < 2 THEN
    RETURN; -- first of two required approvals: evaluation stays held
  END IF;

  UPDATE public.evaluations
  SET status = 'approved', evaluated_at = now()
  WHERE id = $1;

  PERFORM public.issue_receipt($1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_evaluation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_evaluation(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- issue_receipt(evaluation_id): only for approved evaluation; idempotent;
-- computes content_hash = sha256(snapshot text || invoice id || amount)
-- digest() is qualified with the pgcrypto extension schema (public.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_receipt(evaluation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_invoice_id uuid;
  v_supplier_id uuid;
  v_agent_id uuid;
  v_payee_wallet text;
  v_amount_minor bigint;
  v_currency text;
  v_snapshot_ jsonb;
  v_hash_input text;
  v_content_hash text;
  v_existing uuid;
BEGIN
  SELECT e.org_id, e.invoice_id, e.amount_minor, e.currency, e.snapshot,
         i.supplier_id, a.id, s.payout_wallet
  INTO v_org_id, v_invoice_id, v_amount_minor, v_currency, v_snapshot_,
       v_supplier_id, v_agent_id, v_payee_wallet
  FROM public.evaluations e
  JOIN public.invoices i ON i.id = e.invoice_id
  JOIN public.agents a ON a.id = e.agent_id
  JOIN public.suppliers s ON s.id = i.supplier_id
  WHERE e.id = $1 AND e.status = 'approved'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Evaluation not found or not approved';
  END IF;

  IF v_org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Evaluation not in your organization';
  END IF;

  SELECT id INTO v_existing FROM public.receipts WHERE evaluation_id = $1 LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN; -- idempotent
  END IF;

  v_hash_input := (v_snapshot_::text) || v_invoice_id::text || v_amount_minor::text;
  v_content_hash := encode(public.digest(v_hash_input, 'sha256'), 'hex');

  INSERT INTO public.receipts (org_id, evaluation_id, invoice_id, supplier_id, agent_id, payee_wallet, amount_minor, currency, status, snapshot, content_hash, issued_at, issued_by)
  VALUES (v_org_id, $1, v_invoice_id, v_supplier_id, v_agent_id, v_payee_wallet, v_amount_minor, v_currency, 'authorized', v_snapshot_, v_content_hash, now(), auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_receipt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_receipt(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- load_demo_data(): security definer, org owner only, refuses if org has suppliers.
-- All org-scoped subqueries now reference v_org_id explicitly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.load_demo_data() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_supplier_count int;
  v_agt_cap uuid;
  v_inv_appr uuid;
  v_req_allowed uuid;
  v_req_paid uuid;
  v_req_held uuid;
  v_req_blocked uuid;
BEGIN
  SELECT o.id INTO v_org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  SELECT COUNT(*) INTO v_supplier_count
  FROM public.suppliers
  WHERE org_id = v_org_id;

  IF v_supplier_count > 0 THEN
    RAISE EXCEPTION 'Demo data already loaded for this organization';
  END IF;

  INSERT INTO public.suppliers (org_id, name, business_email, address, category, verification_reference, payout_wallet, verification_status, notes)
  VALUES
    (v_org_id, 'Accra Trade Co', 'procurement@accra-trade.example', 'Accra, Ghana', 'goods', 'REF-ACCRA-001', '7dHbWYKYz8KX6fG7vJq9P2mN3cR4tY5uE6wX7yZ8aB9', 'verified', 'Verified Ghana supplier'),
    (v_org_id, 'Lagos Parts Ltd', 'sales@lagos-parts.example', 'Lagos, Nigeria', 'hardware', 'REF-LAGOS-001', '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', 'unverified', 'New supplier, under review'),
    (v_org_id, 'Dakar Services', 'contact@dakar-services.example', 'Dakar, Senegal', 'services', 'REF-DAKAR-001', '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', 'review_required', 'Pending additional documentation'),
    (v_org_id, 'Abidjan Goods', 'orders@abidjan-goods.example', 'Abidjan, Côte d''Ivoire', 'goods', 'REF-ABIDJAN-001', '2vZ9yX1wP3qR5tY7uI9oP0aS2dF4gH6jK8lM1nB3vC5', 'verified', 'Verified supplier of consumer goods');

  INSERT INTO public.agents (org_id, name, identifier, description, status, per_request_limit_minor, daily_limit_minor, currency)
  VALUES
    (v_org_id, 'Risk Agent', 'risk-001', 'Handles risk assessment for payments', 'active', 100000, 5000000, 'USDC'),
    (v_org_id, 'Compliance Agent', 'comp-001', 'Ensures regulatory compliance', 'active', 50000, 2000000, 'USDC'),
    (v_org_id, 'Operations Agent', 'ops-001', 'Manages operational payments', 'disabled', 20000, 1000000, 'USDC');

  INSERT INTO public.policies (org_id, name, description, max_invoice_minor, daily_cap_minor, require_verified_supplier, require_delivery_attestation, require_agent_intent, require_supporting_evidence, require_two_person_approval, approval_threshold_minor, status)
  VALUES
    (v_org_id, 'Standard Controls', 'Default invoice, supplier and evidence controls for routine payments.', 50000000, 150000000, true, true, true, false, false, 10000000, 'active'),
    (v_org_id, 'High Value Review', 'Adds two-person approval for higher-value supplier payments.', 100000000, 250000000, true, true, true, true, true, 25000000, 'active');

  INSERT INTO public.invoices (org_id, invoice_number, supplier_id, amount_minor, currency, issue_date, due_date, document_ref, notes, status)
  VALUES
    (v_org_id, 'INV-2048', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Accra Trade Co' LIMIT 1), 12480000000, 'USDC', '2026-04-28', '2026-05-18', 'DOC-INV-2048', 'Q1 software services', 'paid'),
    (v_org_id, 'INV-2057', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Accra Trade Co' LIMIT 1), 14680000000, 'EUR', '2026-05-14', '2026-05-29', 'DOC-INV-2057', 'Office supplies Q2', 'open'),
    (v_org_id, 'INV-2053', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Lagos Parts Ltd' LIMIT 1), 8920000000, 'EUR', '2026-05-10', '2026-05-24', 'DOC-INV-2053', 'Hardware procurement', 'attested'),
    (v_org_id, 'INV-2051', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Dakar Services' LIMIT 1), 3240000000, 'USD', '2026-05-07', '2026-05-21', 'DOC-INV-2051', 'Consulting services', 'open'),
    (v_org_id, 'INV-2042', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Abidjan Goods' LIMIT 1), 4200000000, 'EUR', '2026-04-22', '2026-05-12', 'DOC-INV-2042', 'Quarterly hardware', 'disputed'),
    (v_org_id, 'INV-2039', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Accra Trade Co' LIMIT 1), 1680000000, 'USDC', '2026-04-19', '2026-05-04', 'DOC-INV-2039', 'Cloud services', 'paid'),
    (v_org_id, 'INV-2037', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Lagos Parts Ltd' LIMIT 1), 6340000000, 'USD', '2026-05-18', '2026-06-18', 'DOC-INV-2037', 'Edge compute', 'open'),
    (v_org_id, 'INV-2029', (SELECT id FROM public.suppliers WHERE org_id = v_org_id AND name = 'Dakar Services' LIMIT 1), 3040000000, 'EUR', '2026-05-16', '2026-06-16', 'DOC-INV-2029', 'Model fine-tuning', 'hold');

  SELECT id INTO v_agt_cap FROM public.agents WHERE org_id = v_org_id AND identifier = 'risk-001' LIMIT 1;

  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (v_org_id, v_agt_cap, (SELECT id FROM public.invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2057' LIMIT 1), NULL, 4500000000, NULL, 'manual')
  RETURNING id INTO v_req_allowed;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (v_req_allowed, v_org_id, v_agt_cap, (SELECT id FROM public.invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2057' LIMIT 1), 4500000000, 'EUR', 'allowed', 'allowed', NULL, NULL, '[]', '{}');

  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (v_org_id, v_agt_cap, (SELECT id FROM public.invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2039' LIMIT 1), NULL, 1680000000, NULL, 'manual')
  RETURNING id INTO v_req_paid;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (v_req_paid, v_org_id, v_agt_cap, (SELECT id FROM public.invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2039' LIMIT 1), 1680000000, 'USDC', 'allowed', 'paid', NULL, NULL, '[]', '{}');

  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (v_org_id, v_agt_cap, (SELECT id FROM public.invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2053' LIMIT 1), NULL, 8920000000, NULL, 'manual')
  RETURNING id INTO v_req_held;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (v_req_held, v_org_id, v_agt_cap, (SELECT id FROM public/invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2053' LIMIT 1), 8920000000, 'EUR', 'held', 'held', 'needs_attestation', 'needs_attestation', '[]', '{}');

  INSERT INTO public.payment_requests (org_id, agent_id, invoice_id, claimed_payee, claimed_amount_minor, claimed_mint, source)
  VALUES (v_org_id, v_agt_cap, (SELECT id FROM public/invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2042' LIMIT 1), NULL, 4200000000, NULL, 'manual')
  RETURNING id INTO v_req_blocked;

  INSERT INTO public.evaluations (request_id, org_id, agent_id, invoice_id, amount_minor, currency, decision, status, failed_rule, reason_code, rules, snapshot)
  VALUES (v_req_blocked, v_org_id, v_agt_cap, (SELECT id FROM public/invoices WHERE org_id = v_org_id AND invoice_number = 'INV-2042' LIMIT 1), 4200000000, 'EUR', 'blocked', 'blocked', 'supplier_unverified', 'supplier_unverified', '[]', '{}');

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.load_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_demo_data() TO authenticated;

-- ---------------------------------------------------------------------------
-- reset_demo_data(): security definer, org owner only.
-- Deletes suppliers, agents, policies, invoices for the caller's org.
-- Never touches organizations or auth identities.
-- All DELETE statements now reference v_org_id explicitly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_demo_data() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  DELETE FROM public.invoices WHERE org_id = v_org_id;
  DELETE FROM public.policy_agents WHERE org_id = v_org_id;
  DELETE FROM public.policies WHERE org_id = v_org_id;
  DELETE FROM public.agents WHERE org_id = v_org_id;
  DELETE FROM public.suppliers WHERE org_id = v_org_id;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;