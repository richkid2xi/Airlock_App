-- Migration 0002: RLS policies for public.organizations (Phase 2 — Auth + Onboarding on Supabase)
-- Adds row-level policies tying rows to the signed-in user's organization (engineering rule #11).

-- Row-level policies tie every row to the signed-in user's organization.
CREATE POLICY organizations_owner_select ON public.organizations
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY organizations_owner_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY organizations_owner_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());