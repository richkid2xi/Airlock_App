-- Migration 0004: Invoice documents storage + document_path column + reset_demo_data RPC
-- RLS: bucket policies restrict object access to objects under the caller's own org_id folder.
-- Column grant: document_path added to invoices UPDATE privilege (replaces status, notes grant).

-- ---------------------------------------------------------------------------
-- invoices.document_path (nullable; org-scoped write via column grant)
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN document_path text;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.invoices TO authenticated;
GRANT INSERT (invoice_number, supplier_id, amount_minor, currency, mint, issue_date, due_date, document_ref, notes) ON public.invoices TO authenticated;
GRANT UPDATE (status, notes, document_path) ON public.invoices TO authenticated;
REVOKE DELETE ON public.invoices FROM authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket invoice-documents
-- Objects live under <org_id>/<invoice_id>/<filename>.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoice-documents', 'invoice-documents', false, 10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']);

-- Storage RLS: caller can only read/write/delete objects under their own org folder.
CREATE POLICY invoice_documents_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-documents'
    AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY invoice_documents_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-documents'
    AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY invoice_documents_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-documents'
    AND (storage.foldername(name))[1] = public.current_org_id()::text);

CREATE POLICY invoice_documents_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'invoice-documents'
    AND (storage.foldername(name))[1] = public.current_org_id()::text);

-- ---------------------------------------------------------------------------
-- RPC reset_demo_data(): security definer, org owner only.
-- Deletes suppliers, agents, policies, invoices for the caller's org.
-- Never touches organizations or auth identities.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_demo_data() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT id INTO org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  DELETE FROM public.invoices WHERE org_id = org_id;
  DELETE FROM public.policy_agents WHERE org_id = org_id;
  DELETE FROM public.policies WHERE org_id = org_id;
  DELETE FROM public.agents WHERE org_id = org_id;
  DELETE FROM public.suppliers WHERE org_id = org_id;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;
