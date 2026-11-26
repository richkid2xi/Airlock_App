#!/usr/bin/env bash
# scripts/test.sh — Airlock test harness.
#
# Runs:
#   1. vitest (JSON reporter) for the root web app + every workspace package
#      that defines a `test` script (currently packages/golden and server).
#   2. pgTAP against a SEPARATE hosted scratch Supabase project via
#      `supabase test db --remote=<SUPABASE_TEST_PROJECT_REF> --yes`.
#      The scratch project ref is read from .env.local (never committed).
#      It must NOT equal the app project's ref (SUPABASE_APP_PROJECT_REF),
#      which we refuse to test against.
#
# Sums all passed tests, compares to .test-baseline, exits non-zero if the
# count is lower, exits non-zero if anything is skipped/todo/failed, and
# raises the baseline when the count grows.
#
# Why a separate scratch project: `supabase test db` enables the pgTAP
# extension and drops it again afterwards. Running it against the app project
# would mutate production schema state, so we only ever target a scratch db.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_LOCAL="$ROOT_DIR/.env.local"

# --- Load SUPABASE_TEST_PROJECT_REF from .env.local (never committed) ---
SUPABASE_TEST_PROJECT_REF=""
SUPABASE_APP_PROJECT_REF=""
VITE_SUPABASE_URL=""
if [ -f "$ENV_LOCAL" ]; then
  while IFS='=' read -r key value; do
    # Skip comments / empty lines / lines without '='
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    key="$(echo "$key" | tr -d '[:space:]')"
    value="$(echo "$value" | tr -d '[:space:]' | sed 's/^["'\'']//;s/["'\'']$//')"
    if [ "$key" = "SUPABASE_TEST_PROJECT_REF" ]; then
      SUPABASE_TEST_PROJECT_REF="$value"
    fi
    if [ "$key" = "SUPABASE_APP_PROJECT_REF" ]; then
      SUPABASE_APP_PROJECT_REF="$value"
    fi
    if [ "$key" = "VITE_SUPABASE_URL" ]; then
      VITE_SUPABASE_URL="$value"
    fi
  done < "$ENV_LOCAL"
fi

# Derive the app/dev project ref from VITE_SUPABASE_URL so we can refuse to
# point pgTAP at the real app project even when only the URL is configured.
SUPABASE_DEV_PROJECT_REF=""
if [ -n "${VITE_SUPABASE_URL:-}" ]; then
  SUPABASE_DEV_PROJECT_REF="$(echo "$VITE_SUPABASE_URL" | sed -nE 's#^https?://([a-z0-9]+)\.supabase\.(co|in).*#\1#p')"
fi

# --- Decide whether to run pgTAP ---
RUN_PGTAP=1
if [ -z "${SUPABASE_TEST_PROJECT_REF:-}" ]; then
  if [ "${CI:-}" = "true" ]; then
    echo "ERROR: SUPABASE_TEST_PROJECT_REF is not set (CI requires pgTAP)." >&2
    echo "       Put SUPABASE_TEST_PROJECT_REF=<scratch-project-ref> in .env.local." >&2
    echo "       This must be a SEPARATE scratch Supabase project, not the app project." >&2
    exit 1
  fi
  echo "pgTAP SKIPPED: SUPABASE_TEST_PROJECT_REF is not set in .env.local." >&2
  echo "       Locally we only run the vitest suites. Set SUPABASE_TEST_PROJECT_REF" >&2
  echo "       to a SEPARATE scratch Supabase project to exercise pgTAP." >&2
  RUN_PGTAP=0
fi

if [ "$RUN_PGTAP" = "1" ]; then
  # Never target the app project (explicit ref) or the dev project (from URL).
  if [ -n "${SUPABASE_APP_PROJECT_REF:-}" ] && [ "$SUPABASE_TEST_PROJECT_REF" = "$SUPABASE_APP_PROJECT_REF" ]; then
    echo "ERROR: SUPABASE_TEST_PROJECT_REF equals SUPABASE_APP_PROJECT_REF." >&2
    echo "       pgTAP must run against a SEPARATE scratch project, never the app project." >&2
    exit 1
  fi
  if [ -n "${SUPABASE_DEV_PROJECT_REF:-}" ] && [ "$SUPABASE_TEST_PROJECT_REF" = "$SUPABASE_DEV_PROJECT_REF" ]; then
    echo "ERROR: SUPABASE_TEST_PROJECT_REF equals the dev project ref from VITE_SUPABASE_URL ($SUPABASE_DEV_PROJECT_REF)." >&2
    echo "       pgTAP must run against a SEPARATE scratch project, never the app project." >&2
    exit 1
  fi
fi

# --- Check the Supabase CLI is available ---
if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: 'supabase' CLI not found on PATH." >&2
  echo "       Install it: https://supabase.com/docs/reference/cli/installation" >&2
  echo "       (or run: npm install -g supabase)" >&2
  exit 1
fi

BASELINE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.test-baseline')).totalTestsBaseline)")

# --- 1. vitest: root web app ---
echo "Running root test suite (pnpm test)..."
set +e
OUTPUT_ROOT=$(pnpm test 2>&1)
TEST_EXIT_ROOT=$?
set -e
echo "$OUTPUT_ROOT"

# --- 2. vitest: workspace packages (golden, server until /server is retired) ---
echo "Running package test suites (pnpm -r test)..."
set +e
OUTPUT_PKGS=$(pnpm -r test 2>&1)
TEST_EXIT_PKGS=$?
set -e
echo "$OUTPUT_PKGS"

# --- 3. pgTAP: scratch hosted project ---
if [ "$RUN_PGTAP" = "1" ]; then
  echo "Running pgTAP against scratch project $SUPABASE_TEST_PROJECT_REF..."
  set +e
  OUTPUT_PGTAP=$(supabase test db --remote="$SUPABASE_TEST_PROJECT_REF" --yes 2>&1)
  TEST_EXIT_PGTAP=$?
  set -e
  echo "$OUTPUT_PGTAP"

  if [ $TEST_EXIT_ROOT -ne 0 ] || [ $TEST_EXIT_PKGS -ne 0 ] || [ $TEST_EXIT_PGTAP -ne 0 ]; then
    echo "FAIL: a test command exited non-zero (root=$TEST_EXIT_ROOT, pkgs=$TEST_EXIT_PKGS, pgtap=$TEST_EXIT_PGTAP)."
    exit 1
  fi

  # --- Parse pgTAP TAP output: count ok/not ok lines ---
  PGTAP_PASSED=$(echo "$OUTPUT_PGTAP" | grep -cE '^\s*ok\b' || true)
  PGTAP_FAILED=$(echo "$OUTPUT_PGTAP" | grep -cE '^\s*not ok\b' || true)
else
  PGTAP_PASSED=0
  PGTAP_FAILED=0
fi

# --- Aggregate vitest JSON results ---
RESULT_FILES=$(node -e "
  const fs = require('fs');
  const files = ['.test-results.json', 'packages/golden/.test-results.json', 'server/.test-results.json'];
  console.log(files.filter(f => fs.existsSync(f)).join(','));
")

TOTALS=$(RESULT_FILES="$RESULT_FILES" node -e "
  const fs = require('fs');
  let passed = 0, pending = 0, todo = 0, failed = 0;
  const files = (process.env.RESULT_FILES || '').split(',').filter(Boolean);
  for (const file of files) {
    try {
      const r = JSON.parse(fs.readFileSync(file, 'utf8'));
      passed += r.numPassedTests || 0;
      pending += r.numPendingTests || 0;
      todo += r.numTodoTests || 0;
      failed += r.numFailedTests || 0;
    } catch (e) {
      console.error('Could not parse ' + file + ': ' + e.message);
    }
  }
  console.log([passed, pending, todo, failed].join('|'));
")

IFS='|' read -r PASSED PENDING TODO FAILED <<< "$TOTALS"

TOTAL_PASSED=$((PASSED + PGTAP_PASSED))
TOTAL_FAILED=$((FAILED + PGTAP_FAILED))

echo "vitest passed: $PASSED (pending $PENDING, todo $TODO, failed $FAILED)"
if [ "$RUN_PGTAP" = "1" ]; then
  echo "pgTAP passed:  $PGTAP_PASSED (failed $PGTAP_FAILED)"
else
  echo "pgTAP skipped: no SUPABASE_TEST_PROJECT_REF configured (local dev mode)"
fi
echo "Total passed: $TOTAL_PASSED (Baseline required: $BASELINE)"

# Clean up report files so they do not pollute the tree.
for f in .test-results.json packages/golden/.test-results.json server/.test-results.json; do
  rm -f "$f"
done

if [ "$TOTAL_FAILED" -gt 0 ]; then
  echo "FAIL: $TOTAL_FAILED test(s) failed."
  exit 1
fi

if [ "$PENDING" -gt 0 ] || [ "$TODO" -gt 0 ]; then
  echo "FAIL: Found $PENDING skipped/pending and $TODO todo test(s). Never skip or todo tests."
  exit 1
fi

if [ "$TOTAL_PASSED" -lt "$BASELINE" ]; then
  echo "FAIL: Test count $TOTAL_PASSED is below baseline $BASELINE! Never delete, skip or comment out a test."
  exit 1
fi

if [ "$TOTAL_PASSED" -gt "$BASELINE" ]; then
  echo "Test count increased from $BASELINE to $TOTAL_PASSED. Raising baseline."
  node -e "
    const fs = require('fs');
    const baseline = JSON.parse(fs.readFileSync('.test-baseline', 'utf8'));
    baseline.totalTestsBaseline = $TOTAL_PASSED;
    baseline.lastVerified = new Date().toISOString().split('T')[0];
    fs.writeFileSync('.test-baseline', JSON.stringify(baseline, null, 2) + '\n');
  "
fi

echo "OK: all tests passed and count meets or exceeds baseline ($TOTAL_PASSED >= $BASELINE)."
