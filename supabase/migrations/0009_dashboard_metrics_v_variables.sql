-- ---------------------------------------------------------------------------
-- Migration 0009: Dashboard metrics with v_-prefixed variables.
-- The live database already runs this definition; this migration records the
-- same function in the repo so future deploys stay consistent.
-- Every PL/pgSQL variable is prefixed v_, every column reference is qualified
-- with a table alias, and last_evaluations uses an ordered jsonb_agg.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_today_start timestamptz;
  v_result jsonb;
BEGIN
  SELECT o.id INTO v_org_id
  FROM public.organizations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for the authenticated user';
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'UTC');

  SELECT jsonb_build_object(
    'suppliers_by_status', (
      SELECT COALESCE(jsonb_object_agg(v_sub.verification_status, v_sub.cnt), '{}'::jsonb)
      FROM (
        SELECT s.verification_status, count(*) AS cnt
        FROM public.suppliers s
        WHERE s.org_id = v_org_id
        GROUP BY s.verification_status
      ) v_sub
    ),
    'invoice_counts_by_status', (
      SELECT COALESCE(jsonb_object_agg(v_sub.status, jsonb_build_object('count', v_sub.cnt, 'total_minor', v_sub.total_minor)), '{}'::jsonb)
      FROM (
        SELECT i.status, count(*) AS cnt, COALESCE(sum(i.amount_minor), 0)::bigint AS total_minor
        FROM public.invoices i
        WHERE i.org_id = v_org_id
        GROUP BY i.status
      ) v_sub
    ),
    'today_requests_by_decision', (
      SELECT COALESCE(jsonb_object_agg(v_sub.decision, v_sub.cnt), '{}'::jsonb)
      FROM (
        SELECT e.decision, count(*) AS cnt
        FROM public.evaluations e
        WHERE e.org_id = v_org_id
          AND e.evaluated_at >= v_today_start
        GROUP BY e.decision
      ) v_sub
    ),
    'blocked_count', (
      SELECT count(*)::int
      FROM public.evaluations e
      WHERE e.org_id = v_org_id AND e.status = 'blocked'
    ),
    'held_count', (
      SELECT count(*)::int
      FROM public.evaluations e
      WHERE e.org_id = v_org_id AND e.status = 'held'
    ),
    'receipts_issued', (
      SELECT count(*)::int
      FROM public.receipts r
      WHERE r.org_id = v_org_id
    ),
    'amount_authorized_today_minor', (
      SELECT COALESCE(sum(e.amount_minor), 0)::bigint
      FROM public.evaluations e
      WHERE e.org_id = v_org_id AND e.status = 'approved'
        AND e.evaluated_at >= v_today_start
    ),
    'daily_cap_minor', (
      SELECT COALESCE(sum(a.daily_limit_minor), 0)::bigint
      FROM public.agents a
      WHERE a.org_id = v_org_id AND a.status = 'active'
    ),
    'last_evaluations', (
      SELECT COALESCE(jsonb_agg(v_sub.v_row), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'evaluation_id', e.id::text,
          'invoice_id', e.invoice_id::text,
          'agent_id', e.agent_id::text,
          'decision', e.decision,
          'status', e.status,
          'evaluated_at', e.evaluated_at::text
        ) AS v_row
        FROM public.evaluations e
        WHERE e.org_id = v_org_id
        ORDER BY e.evaluated_at DESC NULLS LAST
        LIMIT 8
      ) v_sub
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics() TO authenticated;