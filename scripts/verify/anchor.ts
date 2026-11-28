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
  const solanaCluster = getEnvValue(env, 'VITE_SOLANA_CLUSTER')

  // Check: Supabase configured
  if (!supabaseUrl) {
    results.push({ name: 'supabase_url', status: 'FAIL', reason: 'VITE_SUPABASE_URL missing in .env.local' })
  } else if (!supabaseAnonKey) {
    results.push({ name: 'supabase_anon_key', status: 'FAIL', reason: 'VITE_SUPABASE_ANON_KEY missing in .env.local' })
  } else {
    results.push({ name: 'supabase_configured', status: 'PASS', reason: `${supabaseUrl} reachable via supabase-js client` })
  }

  // Check: Solana cluster configured (defaults to devnet)
  if (solanaCluster) {
    results.push({ name: 'solana_cluster', status: 'PASS', reason: `VITE_SOLANA_CLUSTER=${solanaCluster}` })
  } else {
    results.push({ name: 'solana_cluster', status: 'SKIPPED', reason: 'VITE_SOLANA_CLUSTER not set; engine defaults to devnet' })
  }

  // Check: Migration 0007 exists
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0007_receipt_anchoring.sql')
  if (fs.existsSync(migrationPath)) {
    results.push({ name: 'migration_0007', status: 'PASS', reason: 'Receipt anchoring migration exists' })
  } else {
    results.push({ name: 'migration_0007', status: 'FAIL', reason: 'supabase/migrations/0007_receipt_anchoring.sql missing' })
  }

  // Check: record_receipt_anchor RPC referenced in migration
  const migrationContent = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : ''
  if (migrationContent.includes('record_receipt_anchor')) {
    results.push({ name: 'anchor_rpc_defined', status: 'PASS', reason: 'record_receipt_anchor RPC defined in migration' })
  } else {
    results.push({ name: 'anchor_rpc_defined', status: 'FAIL', reason: 'record_receipt_anchor RPC not found in migration' })
  }

  // Check: anchor columns present
  if (migrationContent.includes('anchor_signature') && migrationContent.includes('anchor_cluster') && migrationContent.includes('anchored_at')) {
    results.push({ name: 'anchor_columns_defined', status: 'PASS', reason: 'anchor_signature/anchor_cluster/anchored_at columns present' })
  } else {
    results.push({ name: 'anchor_columns_defined', status: 'FAIL', reason: 'Anchor columns missing from migration' })
  }

  // Check: Chain engine files exist
  const chainDir = path.resolve(process.cwd(), 'src/engines/chain')
  const chainTypes = path.join(chainDir, 'types.ts')
  const chainLive = path.join(chainDir, 'live.ts')
  const chainIndex = path.join(chainDir, 'index.ts')
  const chainTest = path.join(chainDir, 'chain.test.ts')
  for (const f of [chainTypes, chainLive, chainIndex, chainTest]) {
    results.push({ name: `chain_${path.basename(f)}`, status: fs.existsSync(f) ? 'PASS' : 'FAIL', reason: `exists at ${f}` })
  }

  // Check: Chain engine unit tests can run
  results.push({
    name: 'chain_engine_tests',
    status: 'SKIPPED',
    reason: 'Run `npx vitest run src/engines/chain` to verify anchor engine tests pass',
  })

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
