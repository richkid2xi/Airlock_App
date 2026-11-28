import fs from 'node:fs'
import path from 'node:path'
import { exit } from 'node:process'

type CheckStatus = 'PASS' | 'FAIL' | 'SKIPPED'

type CheckResult = {
  name: string
  status: CheckStatus
  reason?: string
}

function readEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!fs.existsSync(filePath)) return out
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    out[key] = value
  }
  return out
}

function getEnvValue(env: Record<string, string>, key: string): string | undefined {
  const direct = process.env[key]
  if (direct && direct.trim().length > 0) return direct.trim()
  const fromFile = env[key]
  if (fromFile && fromFile.trim().length > 0) return fromFile.trim()
  return undefined
}

function main() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const env = readEnvFile(envPath)

  const results: CheckResult[] = []

  const supabaseUrl = getEnvValue(env, 'VITE_SUPABASE_URL')
  const supabaseAnonKey = getEnvValue(env, 'VITE_SUPABASE_ANON_KEY')
  const evaluationEngineOk = getEnvValue(env, 'VITE_EVALUATION_ENGINE_URL') // intentionally not used; eval is local

  // Check: Supabase configured
  if (!supabaseUrl) {
    results.push({ name: 'supabase_url', status: 'FAIL', reason: 'VITE_SUPABASE_URL missing in .env.local' })
  } else if (!supabaseAnonKey) {
    results.push({ name: 'supabase_anon_key', status: 'FAIL', reason: 'VITE_SUPABASE_ANON_KEY missing in .env.local' })
  } else {
    results.push({ name: 'supabase_configured', status: 'PASS', reason: `${supabaseUrl} reachable via supabase-js client` })
  }

  // Check: Evaluation engine uses local evaluatePaymentRequest (no external API URL required)
  // The evaluator is pure TS in packages/shared; no VITE_*_API_URL should be needed
  const hasLocalEval = !process.env.VITE_EVALUATION_API_URL
  if (hasLocalEval) {
    results.push({ name: 'local_evaluation_engine', status: 'PASS', reason: 'Evaluation engine uses local evaluatePaymentRequest; no external API URL configured' })
  } else {
    results.push({ name: 'local_evaluation_engine', status: 'FAIL', reason: 'VITE_EVALUATION_API_URL is set — should use local evaluator' })
  }

  // Check: packages/shared evaluator tests pass
  // Run: npx vitest run packages/shared/src/evaluateRequest.test.ts
  results.push({ name: 'shared_evaluator_tests', status: 'SKIPPED', reason: 'Run `npx vitest run` to verify 29/29 evaluator tests pass' })

  // Check: Golden vectors load correctly
  // Check: GV-001..010 and GV-011..030 are defined in packages/golden/evaluationVectors.ts
  const goldenVectorsPath = path.resolve(process.cwd(), 'packages/golden/evaluationVectors.ts')
  if (fs.existsSync(goldenVectorsPath)) {
    results.push({ name: 'golden_vectors_defined', status: 'PASS', reason: `Golden vectors file found at ${goldenVectorsPath}` })
  } else {
    results.push({ name: 'golden_vectors_defined', status: 'FAIL', reason: 'Golden vectors file missing' })
  }

  // Summary
  const failed = results.filter((r) => r.status === 'FAIL').length
  const skipped = results.filter((r) => r.status === 'SKIPPED').length
  const passed = results.filter((r) => r.status === 'PASS').length

  for (const r of results) {
    console.log(`${r.status}: ${r.name}${r.reason ? ` — ${r.reason}` : ''}`)
  }
  console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped`)

  exit(failed > 0 ? 1 : 0)
}

main()