-- Migration 0003: Registry tables (suppliers, agents, policies, invoices)
-- RLS enabled in this same migration, per Airlock engineering rules.

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  name text NOT NULL,
  business_email text,
  address text,
  category text,
  verification_reference text,
  payout_wallet text NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','review_required','verified')),
  verified_at timestamptz,
  verified_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, payout_wallet),
  CONSTRAINT suppliers_payout_wallet_base58 CHECK (length(payout_wallet) BETWEEN 32 AND 44)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.suppliers TO authenticated;
GRANT INSERT (name, business_email, address, category, verification_reference, payout_wallet, notes) ON public.suppliers TO authenticated;
GRANT UPDATE (name, business_email, address, category, verification_reference, notes) ON public.suppliers TO authenticated;
REVOKE DELETE ON public.suppliers FROM authenticated;

CREATE POLICY suppliers_org_select ON public.suppliers
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY suppliers_org_insert ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY suppliers_org_update ON public.suppliers
  FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER suppliers_set_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger: changing payout_wallet after verification resets to review_required.
CREATE OR REPLACE FUNCTION public.suppliers_payout_wallet_reset() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.payout_wallet IS DISTINCT FROM OLD.payout_wallet
     AND OLD.verification_status = 'verified' THEN
    NEW.verification_status := 'review_required';
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER suppliers_payout_wallet_reset_trigger
BEFORE UPDATE OF payout_wallet ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.suppliers_payout_wallet_reset();

-- RPC verify_supplier(supplier_id): security definer, org-scoped.
CREATE OR REPLACE FUNCTION public.verify_supplier(supplier_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT s.org_id INTO org_id
  FROM public.suppliers s
  WHERE s.id = supplier_id
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  IF org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Supplier not in your organization';
  END IF;

  UPDATE public.suppliers
  SET verification_status = 'verified',
      verified_at = now(),
      verified_by = auth.uid(),
      updated_at = now()
  WHERE id = supplier_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_supplier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_supplier(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  name text NOT NULL,
  identifier text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  per_request_limit_minor bigint NOT NULL CHECK (per_request_limit_minor > 0),
  daily_limit_minor bigint NOT NULL CHECK (daily_limit_minor >= per_request_limit_minor),
  currency text NOT NULL DEFAULT 'USDC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, identifier)
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.agents TO authenticated;
GRANT INSERT (name, identifier, description, status, per_request_limit_minor, daily_limit_minor, currency) ON public.agents TO authenticated;
GRANT UPDATE (name, identifier, description, status, per_request_limit_minor, daily_limit_minor, currency) ON public.agents TO authenticated;
REVOKE DELETE ON public.agents FROM authenticated;

CREATE POLICY agents_org_select ON public.agents
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY agents_org_insert ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY agents_org_update ON public.agents
  FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER agents_set_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- policies
-- ---------------------------------------------------------------------------
CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  name text NOT NULL,
  description text,
  max_invoice_minor bigint NOT NULL CHECK (max_invoice_minor > 0),
  daily_cap_minor bigint NOT NULL CHECK (daily_cap_minor >= max_invoice_minor),
  require_verified_supplier boolean NOT NULL DEFAULT false,
  require_delivery_attestation boolean NOT NULL DEFAULT false,
  require_agent_intent boolean NOT NULL DEFAULT false,
  require_supporting_evidence boolean NOT NULL DEFAULT false,
  require_two_person_approval boolean NOT NULL DEFAULT false,
  approval_threshold_minor bigint,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active','draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.policies TO authenticated;
GRANT INSERT (name, description, max_invoice_minor, daily_cap_minor, require_verified_supplier, require_delivery_attestation, require_agent_intent, require_supporting_evidence, require_two_person_approval, approval_threshold_minor, status) ON public.policies TO authenticated;
GRANT UPDATE (name, description, max_invoice_minor, daily_cap_minor, require_verified_supplier, require_delivery_attestation, require_agent_intent, require_supporting_evidence, require_two_person_approval, approval_threshold_minor, status) ON public.policies TO authenticated;
REVOKE DELETE ON public.policies FROM authenticated;

CREATE POLICY policies_org_select ON public.policies
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY policies_org_insert ON public.policies
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY policies_org_update ON public.policies
  FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER policies_set_updated_at
BEFORE UPDATE ON public.policies
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- policy_agents
-- ---------------------------------------------------------------------------
CREATE TABLE public.policy_agents (
  policy_id uuid NOT NULL REFERENCES public.policies (id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  PRIMARY KEY (policy_id, agent_id)
);

ALTER TABLE public.policy_agents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.policy_agents TO authenticated;
GRANT INSERT (policy_id, agent_id) ON public.policy_agents TO authenticated;
GRANT DELETE ON public.policy_agents TO authenticated;

CREATE POLICY policy_agents_org_select ON public.policy_agents
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY policy_agents_org_insert ON public.policy_agents
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY policy_agents_org_delete ON public.policy_agents
  FOR DELETE TO authenticated
  USING (org_id = public.current_org_id());

-- Trigger: ensure policy and agent belong to same org.
CREATE OR REPLACE FUNCTION public.policy_agents_same_org() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  p_org_id uuid;
  a_org_id uuid;
BEGIN
  SELECT org_id INTO p_org_id FROM public.policies WHERE id = NEW.policy_id LIMIT 1;
  SELECT org_id INTO a_org_id FROM public.agents WHERE id = NEW.agent_id LIMIT 1;

  IF p_org_id IS NULL OR a_org_id IS NULL THEN
    RAISE EXCEPTION 'Policy or agent not found';
  END IF;

  IF p_org_id <> a_org_id THEN
    RAISE EXCEPTION 'Policy and agent must belong to the same organization';
  END IF;

  IF p_org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Not in your organization';
  END IF;

  NEW.org_id := p_org_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER policy_agents_same_org_trigger
BEFORE INSERT ON public.policy_agents
FOR EACH ROW
EXECUTE FUNCTION public.policy_agents_same_org();

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations (id),
  invoice_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id),
  payee_wallet text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('EUR','USD','GBP','USDC')),
  mint text,
  issue_date date NOT NULL,
  due_date date NOT NULL CHECK (due_date >= issue_date),
  document_ref text,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','attested','paid','disputed')),
  attested_at timestamptz,
  attested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, invoice_number),
  CONSTRAINT invoices_payee_wallet_base58 CHECK (length(payee_wallet) BETWEEN 32 AND 44)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.invoices TO authenticated;
GRANT INSERT (invoice_number, supplier_id, amount_minor, currency, mint, issue_date, due_date, document_ref, notes) ON public.invoices TO authenticated;
GRANT UPDATE (status, notes) ON public.invoices TO authenticated;
REVOKE DELETE ON public.invoices FROM authenticated;

CREATE POLICY invoices_org_select ON public.invoices
  FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY invoices_org_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());
CREATE POLICY invoices_org_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE TRIGGER invoices_set_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger: insert sets payee_wallet from supplier's payout_wallet.
CREATE OR REPLACE FUNCTION public.invoices_payee_snapshot() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  SELECT s.payout_wallet INTO NEW.payee_wallet
  FROM public.suppliers s
  WHERE s.id = NEW.supplier_id
  LIMIT 1;

  IF NEW.payee_wallet IS NULL THEN
    RAISE EXCEPTION 'Supplier not found';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_payee_snapshot_trigger
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.invoices_payee_snapshot();

-- Trigger: rejects updates to frozen invoice columns.
CREATE OR REPLACE FUNCTION public.invoices_immutable_columns() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.amount_minor IS DISTINCT FROM OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.mint IS DISTINCT FROM OLD.mint
     OR NEW.supplier_id IS DISTINCT FROM OLD.supplier_id
     OR NEW.payee_wallet IS DISTINCT FROM OLD.payee_wallet
     OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
     OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
     OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    RAISE EXCEPTION 'Invoice amount, currency, mint, supplier, payee, number, issue date and due date are immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_immutable_columns_trigger
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.invoices_immutable_columns();

-- RPC attest_invoice(id): open -> attested.
CREATE OR REPLACE FUNCTION public.attest_invoice(invoice_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  cur_status text;
BEGIN
  SELECT i.org_id, i.status INTO org_id, cur_status
  FROM public.invoices i
  WHERE i.id = invoice_id
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Invoice not in your organization';
  END IF;

  IF cur_status <> 'open' THEN
    RAISE EXCEPTION 'Only open invoices can be attested';
  END IF;

  UPDATE public.invoices
  SET status = 'attested', attested_at = now(), attested_by = auth.uid(), updated_at = now()
  WHERE id = invoice_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attest_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attest_invoice(uuid) TO authenticated;

-- RPC dispute_invoice(id): open|attested -> disputed.
CREATE OR REPLACE FUNCTION public.dispute_invoice(invoice_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  cur_status text;
BEGIN
  SELECT i.org_id, i.status INTO org_id, cur_status
  FROM public.invoices i
  WHERE i.id = invoice_id
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF org_id <> public.current_org_id() THEN
    RAISE EXCEPTION 'Invoice not in your organization';
  END IF;

  IF cur_status = 'paid' THEN
    RAISE EXCEPTION 'Paid invoices cannot be disputed';
  END IF;

  UPDATE public.invoices
  SET status = 'disputed', updated_at = now()
  WHERE id = invoice_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispute_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispute_invoice(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE VIEW public.supplier_summary AS
SELECT s.id, s.org_id, s.name, s.payout_wallet, s.verification_status,
       COUNT(i.id) FILTER (WHERE i.status = 'paid') AS invoice_count,
       MAX(CASE WHEN i.status = 'paid' THEN i.updated_at END) AS last_paid_at
FROM public.suppliers s
LEFT JOIN public.invoices i ON i.supplier_id = s.id AND i.org_id = s.org_id
GROUP BY s.id, s.org_id, s.name, s.payout_wallet, s.verification_status;

ALTER TABLE public.supplier_summary OWNER TO postgres;
GRANT SELECT ON public.supplier_summary TO authenticated;

CREATE VIEW public.agent_summary AS
SELECT a.id, a.org_id, a.name, a.identifier, a.status,
       COALESCE(array_agg(DISTINCT pa.policy_id) FILTER (WHERE pa.policy_id IS NOT NULL), '{}') AS assigned_policy_ids
FROM public.agents a
LEFT JOIN public.policy_agents pa ON pa.agent_id = a.id AND pa.org_id = a.org_id
GROUP BY a.id, a.org_id, a.name, a.identifier, a.status;

ALTER TABLE public.agent_summary OWNER TO postgres;
GRANT SELECT ON public.agent_summary TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC load_demo_data(): security definer, org owner only, refuses if org has suppliers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.load_demo_data() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  supplier_count int;
BEGIN
  SELECT id INTO org_id
  FROM public.organizations
  WHERE owner_id = auth.uid()
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

  -- 4 suppliers (one verified, one unverified, one review_required, one verified)
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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.load_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.load_demo_data() TO authenticated;