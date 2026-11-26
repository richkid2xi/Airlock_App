#!/usr/bin/env bash
set -euo pipefail

# scripts/test.sh: Baseline test count enforcement.
# Runs `pnpm test` (root vitest with JSON report) AND `pnpm -r test`
# (package vitest with JSON reports), sums all passed tests,
# compares to .test-baseline, exits non-zero if lower, raises the baseline
# when the count grows, and exits non-zero if any test is skipped or todo.

BASELINE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.test-baseline')).totalTestsBaseline)")

echo "Running root test suite (pnpm test)..."
set +e
OUTPUT_ROOT=$(pnpm test 2>&1)
TEST_EXIT_ROOT=$?
set -e
echo "$OUTPUT_ROOT"

echo "Running package test suites (pnpm -r test)..."
set +e
OUTPUT_PKGS=$(pnpm -r test 2>&1)
TEST_EXIT_PKGS=$?
set -e
echo "$OUTPUT_PKGS"

if [ $TEST_EXIT_ROOT -ne 0 ] || [ $TEST_EXIT_PKGS -ne 0 ]; then
  echo "FAIL: test command exited non-zero (root=$TEST_EXIT_ROOT, pkgs=$TEST_EXIT_PKGS)."
  exit 1
fi

# Aggregate JSON results from every workspace package report file.
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

echo "Tests passed: $PASSED (Baseline required: $BASELINE)"
echo "Skipped/pending: $PENDING, Todo: $TODO, Failed: $FAILED"

# Clean up report files so they do not pollute the tree.
for f in .test-results.json packages/golden/.test-results.json server/.test-results.json; do
  rm -f "$f"
done

if [ "$FAILED" -gt 0 ]; then
  echo "FAIL: $FAILED test(s) failed."
  exit 1
fi

if [ "$PENDING" -gt 0 ] || [ "$TODO" -gt 0 ]; then
  echo "FAIL: Found $PENDING skipped/pending and $TODO todo test(s). Never skip or todo tests."
  exit 1
fi

if [ "$PASSED" -lt "$BASELINE" ]; then
  echo "FAIL: Test count $PASSED is below baseline $BASELINE! Never delete, skip or comment out a test."
  exit 1
fi

if [ "$PASSED" -gt "$BASELINE" ]; then
  echo "Test count increased from $BASELINE to $PASSED. Raising baseline."
  node -e "
    const fs = require('fs');
    const baseline = JSON.parse(fs.readFileSync('.test-baseline', 'utf8'));
    baseline.totalTestsBaseline = $PASSED;
    baseline.lastVerified = new Date().toISOString().split('T')[0];
    fs.writeFileSync('.test-baseline', JSON.stringify(baseline, null, 2) + '\n');
  "
fi

echo "OK: all tests passed and count meets or exceeds baseline ($PASSED >= $BASELINE)."