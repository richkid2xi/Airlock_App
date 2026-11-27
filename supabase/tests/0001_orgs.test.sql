-- pgTAP tests for 0001_orgs.sql
-- Tests: RLS protection, column-level GRANTs, CHECK constraints,
-- complete_onboarding function, and EXECUTE permissions.
-- This file is NOT run automatically yet — it requires a scratch Supabase project.

BEGIN;

SELECT plan(16);

-- Set up two users
INSERT INTO auth.users (id, email, aud, role, instance_id, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'usera@test.local', 'authenticated', 'authenticated', '11111111-1111-1111-1111-111111111111', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'userb@test.local', 'authenticated', 'authenticated', '11111111-1111-1111-1111-111111111111', now(), now());

-- Insert one org per user
INSERT INTO public.organizations (owner_id, name, business_email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Org A', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'Org B', 'b@test.local');

-- Test 1: anon role sees zero rows
SELECT set_config('role', 'anon', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT results_eq(
  'SELECT count(*) FROM public.organizations',
  'SELECT 0::bigint',
  'anon role returns zero rows'
);

-- Test 2: authenticated user A sees only their own org (1 row)
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
SELECT results_eq(
  'SELECT count(*) FROM public.organizations',
  'SELECT 1::bigint',
  'User A sees only their own org (1 row)'
);

-- Test 3: User A cannot update User B's org (RLS blocks it silently)
SELECT results_eq(
  $test$UPDATE public.organizations SET name = 'Hacked' WHERE owner_id = '22222222-2222-2222-2222-222222222222' RETURNING id$test$,
  $test$SELECT NULL::uuid$test$,
  'User A UPDATE on B org returns zero rows'
);

-- Test 4: User A cannot see B's org via WHERE filter
SELECT results_eq(
  $test$SELECT count(*) FROM public.organizations WHERE owner_id = '22222222-2222-2222-2222-222222222222'$test$,
  $test$SELECT 0::bigint$test$,
  'User A cannot see B org via filter'
);

-- Test 5: Column-level GRANT: authenticated cannot UPDATE onboarded_at (42501)
SELECT throws_ok(
  $test$UPDATE public.organizations SET onboarded_at = now() WHERE owner_id = '11111111-1111-1111-1111-111111111111'$test$,
  '42501',
  NULL,
  'Column-level GRANT: authenticated cannot UPDATE onboarded_at'
);

-- Test 6: Column-level GRANT: authenticated cannot UPDATE owner_id
SELECT throws_ok(
  $test$UPDATE public.organizations SET owner_id = '22222222-2222-2222-2222-222222222222' WHERE owner_id = '11111111-1111-1111-1111-111111111111'$test$,
  '42501',
  NULL,
  'Column-level GRANT: authenticated cannot UPDATE owner_id'
);

-- Test 7: Column-level GRANT: authenticated cannot UPDATE id
SELECT throws_ok(
  $test$UPDATE public.organizations SET id = '99999999-9999-9999-9999-999999999999' WHERE owner_id = '11111111-1111-1111-1111-111111111111'$test$,
  '42501',
  NULL,
  'Column-level GRANT: authenticated cannot UPDATE id'
);

-- Test 8: Column-level GRANT: authenticated cannot UPDATE created_at
SELECT throws_ok(
  $test$UPDATE public.organizations SET created_at = now() WHERE owner_id = '11111111-1111-1111-1111-111111111111'$test$,
  '42501',
  NULL,
  'Column-level GRANT: authenticated cannot UPDATE created_at'
);

-- Test 9: Column-level GRANT: authenticated cannot INSERT with onboarded_at
SELECT throws_ok(
  $test$INSERT INTO public.organizations (owner_id, name, onboarded_at) VALUES ('11111111-1111-1111-1111-111111111111', 'New Org', now())$test$,
  '42501',
  NULL,
  'Column-level GRANT: authenticated cannot INSERT with onboarded_at'
);

-- Test 10: CHECK: approval_threshold > max_invoice_minor rejected
SELECT throws_ok(
  $test$INSERT INTO public.organizations (owner_id, name, max_invoice_minor, approval_threshold_minor) VALUES ('11111111-1111-1111-1111-111111111111', 'Bad Org', 1000, 2000)$test$,
  '23514',
  NULL,
  'CHECK: approval_threshold <= max_invoice_minor'
);

-- Test 11: CHECK: onboarding_step outside 1..4 rejected
SELECT throws_ok(
  $test$INSERT INTO public.organizations (owner_id, name, onboarding_step) VALUES ('11111111-1111-1111-1111-111111111111', 'Bad Step', 5)$test$,
  '23514',
  NULL,
  'CHECK: onboarding_step must be 1..4'
);

-- Test 12: second org insert for same owner rejected by unique constraint
SELECT throws_ok(
  $test$INSERT INTO public.organizations (owner_id, name, business_email)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Org A Duplicate', 'dup@test.local')$test$,
  '23505',
  NULL,
  'Second org insert for same owner rejected by organizations_owner_unique'
);

-- Test 13: complete_onboarding succeeds on complete org
-- Update user A's org to be complete via allowed columns
SELECT lives_ok(
  $test$UPDATE public.organizations SET name = 'Complete Org', business_email = 'a@test.local', settlement_cluster = 'devnet', settlement_asset = 'USDC', reporting_currency = 'USD', max_invoice_minor = 100000, approval_threshold_minor = 50000 WHERE owner_id = '11111111-1111-1111-1111-111111111111'$test$,
  'authenticated can update allowed columns'
);
SELECT lives_ok(
  $test$SELECT public.complete_onboarding()$test$,
  'complete_onboarding succeeds on complete org'
);

-- Test 14: onboarded_at is set after complete_onboarding
SELECT results_eq(
  $test$SELECT count(*) FROM public.organizations WHERE owner_id = '11111111-1111-1111-1111-111111111111' AND onboarded_at IS NOT NULL$test$,
  $test$SELECT 1::bigint$test$,
  'onboarded_at is set after complete_onboarding'
);

-- Test 15: EXECUTE not granted to anon
SELECT set_config('role', 'anon', true);
SELECT throws_ok(
  $test$SELECT public.complete_onboarding()$test$,
  '42501',
  NULL,
  'EXECUTE on complete_onboarding not granted to anon'
);

-- Test 16: EXECUTE not granted to PUBLIC
SELECT set_config('role', 'public', true);
SELECT throws_ok(
  $test$SELECT public.complete_onboarding()$test$,
  '42501',
  NULL,
  'EXECUTE on complete_onboarding not granted to public'
);

SELECT * FROM finish();

ROLLBACK;