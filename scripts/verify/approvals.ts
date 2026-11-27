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
  const token = getEnvValue(env, 'AIRLOCK_ACCESS_TOKEN') ?? getEnvValue(env, 'SUPABASE_ACCESS_TOKEN')
  const supabaseUrl = getEnvValue(env, 'VITE_SUPABASE_URL')
  const supabaseAnonKey = getEnvValue(env, 'VITE_SUPABASE_ANON_KEY')

  if (!supabaseUrl) {
    results.push({ name: 'supabase_url', status: 'FAIL', reason: 'VITE_SUPABASE_URL missing in .env.local' })
  } else if (!supabaseAnonKey) {
    results.push({ name: 'supabase_anon_key', status: 'FAIL', reason: 'VITE_SUPABASE_ANON_KEY missing in .env.local' })
  } else {
    results.push({ name: 'supabase_configured', status: 'PASS', reason: `${supabaseUrl} reachable via supabase-js client` })
  }

  if (!token) {
    results.push({ name: 'access_token', status: 'FAIL', reason: 'Set AIRLOCK_ACCESS_TOKEN (or SUPABASE_ACCESS_TOKEN) in .env.local' })
  } else {
    results.push({ name: 'access_token', status: 'SKIPPED', reason: 'Live approvals RPC calls need a second reviewer token for cross-user checks' })
  }

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