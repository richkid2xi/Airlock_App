-- Migration 0001: Organizations (Phase 2 — Auth + Onboarding on Supabase)
-- RLS enabled in this same migration, per Airlock engineering rules.

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text,
  business_email text,
  industry text,
  size text,
  settlement_cluster text,
  settlement_asset text,
  reporting_currency text,
  max_invoice_minor bigint,
  approval_threshold_minor bigint,
  onboarding_step int NOT NULL DEFAULT 1,
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_owner_unique UNIQUE (owner_id),
  CONSTRAINT organizations_onboarding_step_range CHECK (onboarding_step BETWEEN 1 AND 4)
);

-- RLS enabled in the same migration.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Grants: authenticated can only select/insert/update allowed columns.
-- Protected columns (owner_id, id, created_at, onboarded_at) cannot be set by client.
GRANT SELECT ON public.organizations TO authenticated;
GRANT INSERT (name, business_email, industry, size, settlement_cluster, settlement_asset, reporting_currency, max_invoice_minor, approval_threshold_minor, onboarding_step) ON public.organizations TO authenticated;
GRANT UPDATE (name, business_email, industry, size, settlement_cluster, settlement_asset, reporting_currency, max_invoice_minor, approval_threshold_minor, onboarding_step) ON public.organizations TO authenticated;

-- Client must not delete.
REVOKE DELETE ON public.organizations FROM authenticated;

-- CHECKs: both amounts > 0 when not null; approval_threshold <= max_invoice_minor
-- (DB is the last line of validation, not just the form).
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_max_invoice_minor_positive
  CHECK (max_invoice_minor IS NULL OR max_invoice_minor > 0);

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_approval_threshold_positive
  CHECK (approval_threshold_minor IS NULL OR approval_threshold_minor > 0);

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_approval_not_above_max
  CHECK (approval_threshold_minor IS NULL OR max_invoice_minor IS NULL OR approval_threshold_minor <= max_invoice_minor);

-- Trigger: sets updated_at on update.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Helper for later modules' RLS: current user's org id.
CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT o.id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;
$$;

-- complete_onboarding: security definer, search_path pinned; loads caller's org,
-- verifies required fields and amounts, then sets onboarded_at = now().
-- Uses SET LOCAL config to signal this call is authorized to set onboarded_at.
CREATE OR REPLACE FUNCTION public.complete_onboarding() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  org_name text;
  org_email text;
  org_cluster text;
  org_asset text;
  org_currency text;
  org_max bigint;
  org_threshold bigint;
BEGIN
  -- Signal that this call is authorized to set onboarded_at
  PERFORM set_config('airlock.onboarding_complete', 'true', true);

  SELECT o.id, o.name, o.business_email, o.settlement_cluster, o.settlement_asset, o.reporting_currency, o.max_invoice_minor, o.approval_threshold_minor
    INTO org_id, org_name, org_email, org_cluster, org_asset, org_currency, org_max, org_threshold
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  IF org_name IS NULL OR length(btrim(org_name)) = 0 THEN
    RAISE EXCEPTION 'Organization name is required to complete onboarding';
  END IF;

  IF org_email IS NULL OR org_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'A valid business email is required to complete onboarding';
  END IF;

  IF org_cluster IS NULL OR org_asset IS NULL OR org_currency IS NULL THEN
    RAISE EXCEPTION 'Settlement network configuration must be provided before completing onboarding';
  END IF;

  IF org_max IS NULL OR org_threshold IS NULL OR org_threshold > org_max THEN
    RAISE EXCEPTION 'Invalid payment boundaries: max invoice amount must be greater than or equal to the approval threshold';
  END IF;

  UPDATE public.organizations
  SET onboarded_at = now()
  WHERE id = org_id;

  RETURN;
END;
$$;

-- Grant execute to authenticated only; revoke from PUBLIC.
REVOKE EXECUTE ON FUNCTION public.complete_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;

-- Grant execute on current_org_id to authenticated only.
REVOKE EXECUTE ON FUNCTION public.current_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;