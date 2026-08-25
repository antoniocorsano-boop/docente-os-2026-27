const required = [
  'PRODUCTION_BASE_URL',
  'PRODUCTION_SUPABASE_URL',
  'PRODUCTION_SUPABASE_PUBLISHABLE_KEY',
  'PRODUCTION_E2E_EMAIL',
  'PRODUCTION_E2E_PASSWORD',
  'EXPECTED_PRODUCTION_COMMIT',
]
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Production smoke blocked: missing ${key}`)
    process.exit(2)
  }
}

const baseUrl = process.env.PRODUCTION_BASE_URL.replace(/\/$/, '')
const supabaseUrl = process.env.PRODUCTION_SUPABASE_URL.replace(/\/$/, '')
const publishableKey = process.env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY
const expectedCommit = process.env.EXPECTED_PRODUCTION_COMMIT.trim().toLowerCase()

if (!/^[0-9a-f]{40}$/.test(expectedCommit)) {
  throw new Error('EXPECTED_PRODUCTION_COMMIT must be a full 40-character Git SHA')
}
if (baseUrl.includes('docente-os-2026-27-beta')) throw new Error('Production smoke cannot target Beta app URL')
if (supabaseUrl.includes('gnshgapmwyjamhmlikeg')) throw new Error('Production smoke cannot target Beta Supabase')

const page = await fetch(`${baseUrl}/`, { redirect: 'follow' })
if (!page.ok) throw new Error(`Production root returned ${page.status}`)

const buildInfo = await fetch(`${baseUrl}/api/build-info`, { redirect: 'follow' })
if (!buildInfo.ok) throw new Error(`Production build-info returned ${buildInfo.status}`)
const build = await buildInfo.json()
const servedCommit = typeof build.commit === 'string' ? build.commit.trim().toLowerCase() : null
if (!servedCommit || !/^[0-9a-f]{40}$/.test(servedCommit)) {
  throw new Error(`Production build-info returned invalid commit: ${servedCommit ?? 'missing'}`)
}
if (servedCommit !== expectedCommit) {
  throw new Error(`Production build commit mismatch: expected ${expectedCommit}, got ${servedCommit}`)
}

const auth = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: publishableKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: process.env.PRODUCTION_E2E_EMAIL,
    password: process.env.PRODUCTION_E2E_PASSWORD,
  }),
})
if (!auth.ok) throw new Error(`Production technical login failed with ${auth.status}`)
const session = await auth.json()
if (!session.access_token || !session.user?.id) throw new Error('Production technical login returned no session')

const context = await fetch(`${supabaseUrl}/rest/v1/rpc/current_workspace_context`, {
  method: 'POST',
  headers: {
    apikey: publishableKey,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
})
if (!context.ok) throw new Error(`Production authenticated RPC returned ${context.status}`)

console.log(JSON.stringify({
  result: 'PASS',
  baseUrl,
  expectedCommit,
  buildCommit: servedCommit,
  exactCommitVerified: true,
  authenticated: true,
  technicalUserIdPresent: true,
  mutatingActionsPerformed: false,
}, null, 2))
