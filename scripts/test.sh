#!/usr/bin/env bash
# scripts/test.sh — Airlock test harness.
#
# Runs:
#   1. vitest (JSON reporter) for the root web app + every workspace package
#      that defines a `test` script (currently packages/golden, packages/shared).
#   2. pgTAP against a SEPARATE hosted scratch Supabase project via
#      `supabase test db --remote=<SUPABASE_TEST_PROJECT_REF> --yes`.
#      The scratch project ref is read from .env.local (never committed).
#      It must NOT equal the app project's ref (SUPABASE_APP_PROJECT_REF),
#      which we refuse to test against.
#
# Sums all passed tests, compares to per-package baselines in .test-baseline,
# exits non-zero if ANY package count drops below its baseline, exits
# non-zero if anything is skipped/todo/failed, and raises baselines when
# counts grow. Never deletes or skips a test.
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
  echo "       (or run: npm install -g supabase)"
  exit 1
fi

# --- Load per-package baselines ---
BASELINE_JSON=$(cat .test-baseline)
BASELINE_ROOT=$(echo "$BASELINE_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).rootTestsBaseline)")
BASELINE_SHARED=$(echo "$BASELINE_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).sharedTestsBaseline)")
BASELINE_GOLDEN=$(echo "$BASELINE_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).goldenTestsBaseline)")
BASELINE_PGTAP=$(echo "$BASELINE_JSON" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).pgtapTestsBaseline || 0)")

# --- 1. vitest: root web app ---
echo "Running root test suite (pnpm test)..."
set +e
OUTPUT_ROOT=$(pnpm test 2>&1)
TEST_EXIT_ROOT=$?
set -e
echo "$OUTPUT_ROOT"

# --- 2. vitest: workspace packages ---
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
fi

# --- Parse vitest JSON results per package ---
parse_vitest() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "0|0|0|0"
    return
  fi
  node -e "
    const fs = require('fs');
    try {
      const r = JSON.parse(fs.readFileSync('$file', 'utf8'));
      console.log([r.numPassedTests||0, r.numPendingTests||0, r.numTodoTests||0, r.numFailedTests||0].join('|'));
    } catch (e) {
      console.error('Could not parse $file: ' + e.message);
      console.log('0|0|0|0');
    }
  "
}

ROOT_RESULTS=$(parse_vitest ".test-results.json")
SHARED_RESULTS=$(parse_vitest "packages/shared/.test-results.json")
GOLDEN_RESULTS=$(parse_vitest "packages/golden/.test-results.json")

IFS='|' read -r ROOT_PASSED ROOT_PENDING ROOT_TODO ROOT_FAILED <<< "$ROOT_RESULTS"
IFS='|' read -r SHARED_PASSED SHARED_PENDING SHARED_TODO SHARED_FAILED <<< "$SHARED_RESULTS"
IFS='|' read -r GOLDEN_PASSED GOLDEN_PENDING GOLDEN_TODO GOLDEN_FAILED <<< "$GOLDEN_RESULTS"

# --- pgTAP counts ---
if [ "$RUN_PGTAP" = "1" ]; then
  PGTAP_PASSED=$(echo "$OUTPUT_PGTAP" | grep -cE '^\s*ok\b' || true)
  PGTAP_FAILED=$(echo "$OUTPUT_PGTAP" | grep -cE '^\s*not ok\b' || true)
else
  PGTAP_PASSED=0
  PGTAP_FAILED=0
fi

# --- Aggregate ---
TOTAL_PASSED=$((ROOT_PASSED + SHARED_PASSED + GOLDEN_PASSED + PGTAP_PASSED))
TOTAL_FAILED=$((ROOT_FAILED + SHARED_FAILED + GOLDEN_FAILED + PGTAP_FAILED))
TOTAL_PENDING=$((ROOT_PENDING + SHARED_PENDING + GOLDEN_PENDING))
TOTAL_TODO=$((ROOT_TODO + SHARED_TODO + GOLDEN_TODO))

echo ""
echo "=== Per-package vitest results ==="
echo "root:            passed=$ROOT_PASSED  pending=$ROOT_PENDING  todo=$ROOT_TODO  failed=$ROOT_FAILED  (baseline: $BASELINE_ROOT)"
echo "packages/shared: passed=$SHARED_PASSED  pending=$SHARED_PENDING  todo=$SHARED_TODO  failed=$SHARED_FAILED  (baseline: $BASELINE_SHARED)"
echo "packages/golden: passed=$GOLDEN_PASSED  pending=$GOLDEN_PENDING  todo=$GOLDEN_TODO  failed=$GOLDEN_FAILED  (baseline: $BASELINE_GOLDEN)"
if [ "$RUN_PGTAP" = "1" ]; then
  echo "pgTAP:           passed=$PGTAP_PASSED  failed=$PGTAP_FAILED  (baseline: $BASELINE_PGTAP)"
else
  echo "pgTAP:           skipped (no SUPABASE_TEST_PROJECT_REF)"
fi
echo ""
echo "Total passed: $TOTAL_PASSED"

# Clean up report files so they do not pollute the tree.
for f in .test-results.json packages/shared/.test-results.json packages/golden/.test-results.json; do
  rm -f "$f"
done

# --- Failures ---
if [ "$TOTAL_FAILED" -gt 0 ]; then
  echo "FAIL: $TOTAL_FAILED test(s) failed."
  exit 1
fi

if [ "$TOTAL_PENDING" -gt 0 ] || [ "$TOTAL_TODO" -gt 0 ]; then
  echo "FAIL: Found $TOTAL_PENDING skipped/pending and $TOTAL_TODO todo test(s). Never skip or todo tests."
  exit 1
fi

# --- Per-package baseline checks ---
FAIL=0
if [ "$ROOT_PASSED" -lt "$BASELINE_ROOT" ]; then
  echo "FAIL: root test count $ROOT_PASSED is below baseline $BASELINE_ROOT!"
  FAIL=1
fi
if [ "$SHARED_PASSED" -lt "$BASELINE_SHARED" ]; then
  echo "FAIL: packages/shared test count $SHARED_PASSED is below baseline $BASELINE_SHARED!"
  FAIL=1
fi
if [ "$GOLDEN_PASSED" -lt "$BASELINE_GOLDEN" ]; then
  echo "FAIL: packages/golden test count $GOLDEN_PASSED is below baseline $BASELINE_GOLDEN!"
  FAIL=1
fi
if [ "$RUN_PGTAP" = "1" ] && [ "$PGTAP_PASSED" -lt "$BASELINE_PGTAP" ]; then
  echo "FAIL: pgTAP count $PGTAP_PASSED is below baseline $BASELINE_PGTAP!"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "FAIL: one or more packages are below their test floor baseline."
  exit 1
fi

# --- Raise baselines when counts grow ---
node -e "
  const fs = require('fs');
  const baseline = JSON.parse(fs.readFileSync('.test-baseline', 'utf8'));
  let changed = false;
  if ($ROOT_PASSED > baseline.rootTestsBaseline) { baseline.rootTestsBaseline = $ROOT_PASSED; changed = true; }
  if ($SHARED_PASSED > baseline.sharedTestsBaseline) { baseline.sharedTestsBaseline = $SHARED_PASSED; changed = true; }
  if ($GOLDEN_PASSED > baseline.goldenTestsBaseline) { baseline.goldenTestsBaseline = $GOLDEN_PASSED; changed = true; }
  if ($PGTAP_PASSED > baseline.pgtapTestsBaseline) { baseline.pgtapTestsBaseline = $PGTAP_PASSED; changed = true; }
  if (changed) {
    baseline.lastVerified = new Date().toISOString().split('T')[0];
    fs.writeFileSync('.test-baseline', JSON.stringify(baseline, null, 2) + '\n');
    console.log('Baseline raised to: root='$ROOT_PASSED', shared='$SHARED_PASSED', golden='$GOLDEN_PASSED', pgtap='$PGTAP_PASSED);
  }
"

echo "OK: all tests passed and every package meets or exceeds its test floor baseline."
