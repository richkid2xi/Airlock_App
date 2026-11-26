# scripts/test.ps1: Windows PowerShell equivalent for scripts/test.sh
$baselineJson = Get-Content .test-baseline -Raw | ConvertFrom-Json
$baseline = $baselineJson.totalTestsBaseline

Write-Host "Running root test suite (pnpm test)..."
$npx vitest run --reporter=json --outputFile=.test-results.json 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "FAIL: root test exited non-zero."; exit 1 }

Write-Host "Running package test suites (pnpm -r test)..."
pnpm -r test 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "FAIL: package test exited non-zero."; exit 1 }

Write-Host "Running workspace test suite (pnpm -r test)..."

$passed = 0
$pending = 0
$todo = 0
$failed = 0

$reportFiles = @('.test-results.json', 'packages/golden/.test-results.json', 'server/.test-results.json') | Where-Object { Test-Path $_ }

foreach ($f in $reportFiles) {
  $r = Get-Content $f -Raw | ConvertFrom-Json
  $passed += [int]$r.numPassedTests
  $pending += [int]$r.numPendingTests
  $todo += [int]$r.numTodoTests
  $failed += [int]$r.numFailedTests
}

Write-Host "Tests passed: $passed (Baseline required: $baseline)"
Write-Host "Skipped/pending: $pending, Todo: $todo, Failed: $failed"

Remove-Item .test-results.json -ErrorAction SilentlyContinue
Remove-Item packages/golden/.test-results.json -ErrorAction SilentlyContinue
Remove-Item server/.test-results.json -ErrorAction SilentlyContinue

if ($failed -gt 0) { Write-Error "FAIL: $failed test(s) failed."; exit 1 }
if ($pending -gt 0 -or $todo -gt 0) { Write-Error "FAIL: Found $pending skipped/pending and $todo todo test(s). Never skip or todo tests."; exit 1 }
if ($passed -lt $baseline) { Write-Error "FAIL: Test count $passed is below baseline $baseline! Never delete, skip or comment out a test."; exit 1 }

if ($passed -gt $baseline) {
  Write-Host "Test count increased from $baseline to $passed. Raising baseline."
  $baselineObj = Get-Content .test-baseline -Raw | ConvertFrom-Json
  $baselineObj.totalTestsBaseline = $passed
  $baselineObj.lastVerified = (Get-Date).ToString('yyyy-MM-dd')
  Set-Content -Path .test-baseline -Value ($baselineObj | ConvertTo-Json -Depth 5 -Compress) -NoNewline
  Add-Content -Path .test-baseline -Value "`n"
}

Write-Host "OK: all tests passed and count meets or exceeds baseline ($passed >= $baseline)."
