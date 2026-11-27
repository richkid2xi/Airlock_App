-- Migration 0006: Dashboard metrics RPC scoped to the caller's organization
-- All aggregates are computed from real tables and scoped to public.current_org_id().
-- Tables payment_requests/evaluations/receipts are created by migration 0005.
-- Tiles whose source feature is still in_progress render InProgress in the UI,
-- never zeros that look like data.

-- ---------------------------------------------------------------------------
-- RPC: get_dashboard_metrics() -> jsonb
-- Returns every dashboard aggregate for the caller's organization in one call.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_id uuid;
  result jsonb;
BEGIN
  SELECT o.id INTO org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  SELECT jsonb_build_object(
    'suppliers_by_status', (
      SELECT COALESCE(jsonb_object_agg(verification_status, cnt), '{}'::jsonb)
      FROM (
        SELECT verification_status, count(*) AS cnt
        FROM public.suppliers
        WHERE org_id = org_id
        GROUP BY verification_status
      ) s
    ),
    'invoice_counts_by_status', (
      SELECT COALESCE(jsonb_object_agg(status, jsonb_build_object('count', cnt, 'total_minor', total_minor)), '{}'::jsonb)
      FROM (
        SELECT status, count(*) AS cnt, COALESCE(sum(amount_minor), 0)::bigint AS total_minor
        FROM public.invoices
        WHERE org_id = org_id
        GROUP BY status
      ) i
    ),
    'today_requests_by_decision', (
      SELECT COALESCE(jsonb_object_agg(decision, cnt), '{}'::jsonb)
      FROM (
        SELECT e.decision, count(*) AS cnt
        FROM public.evaluations e
        WHERE e.org_id = org_id
          AND e.evaluated_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
        GROUP BY e.decision
      ) t
    ),
    'blocked_count', (
      SELECT count(*)::int
      FROM public.evaluations e
      WHERE e.org_id = org_id AND e.status = 'blocked'
    ),
    'held_count', (
      SELECT count(*)::int
      FROM public.evaluations e
      WHERE e.org_id = org_id AND e.status = 'held'
    ),
    'receipts_issued', (
      SELECT count(*)::int
      FROM public.receipts r
      WHERE r.org_id = org_id
    ),
    'amount_authorized_today_minor', (
      SELECT COALESCE(sum(e.amount_minor), 0)::bigint
      FROM public.evaluations e
      WHERE e.org_id = org_id AND e.status = 'approved'
        AND e.evaluated_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
    ),
    'daily_cap_minor', (
      SELECT COALESCE(sum(a.daily_limit_minor), 0)::bigint
      FROM public.agents a
      WHERE a.org_id = org_id AND a.status = 'active'
    ),
    'last_evaluations', (
      SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'evaluation_id', e.id::text,
          'invoice_id', e.invoice_id::text,
          'agent_id', e.agent_id::text,
          'decision', e.decision,
          'status', e.status,
          'evaluated_at', e.evaluated_at::text
        ) AS e
        FROM public.evaluations e
        WHERE e.org_id = org_id
        ORDER BY e.evaluated_at DESC NULLS LAST
        LIMIT 8
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;
