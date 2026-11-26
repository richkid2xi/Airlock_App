# scripts/test.ps1: Windows PowerShell equivalent for scripts/test.sh
$baselineJson = Get-Content .test-baseline -Raw | ConvertFrom-Json
$baseline = $baselineJson.totalTestsBaseline

Write-Host "Running Vitest test suite..."
$output = npx vitest run --reporter=verbose | Out-String
Write-Host $output

$clean = $output -replace "\x1B\[[0-9;]*[a-zA-Z]", ""
if ($clean -match "Tests\s+([0-9]+)\s+passed") {
    $count = [int]$matches[1]
    Write-Host "Tests passed: $count (Baseline required: $baseline)"
    if ($count -lt $baseline) {
        Write-Error "FAIL: Test count $count is below baseline $baseline! Never delete, skip or comment out a test."
        exit 1
    }
    Write-Host "All tests passed and test count meets or exceeds baseline ($count >= $baseline)."
} else {
    Write-Error "Error: Could not extract passed test count from test runner output."
    exit 1
}
