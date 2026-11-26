#!/usr/bin/env bash
set -e

# scripts/test.sh: Rule 10 - fails if total test count drops below baseline in .test-baseline
BASELINE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.test-baseline')).totalTestsBaseline)")

echo "Running Vitest test suite..."
OUTPUT=$(npx vitest run --reporter=verbose)
echo "$OUTPUT"

# Extract passed test count
COUNT=$(echo "$OUTPUT" | grep -oE "Tests[ ]+[0-9]+ passed" | grep -oE "[0-9]+" | head -1)

if [ -z "$COUNT" ]; then
  echo "Error: Could not extract passed test count from test runner output."
  exit 1
fi

echo "Tests passed: $COUNT (Baseline required: $BASELINE)"

if [ "$COUNT" -lt "$BASELINE" ]; then
  echo "FAIL: Test count $COUNT is below baseline $BASELINE! Never delete, skip or comment out a test."
  exit 1
fi

echo "All tests passed and test count meets or exceeds baseline ($COUNT >= $BASELINE)."
