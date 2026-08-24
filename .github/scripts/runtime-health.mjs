import assert from 'node:assert/strict'

const appUrl = process.env.DOCENTE_OS_BETA_URL ?? 'https://docente-os-2026-27-beta.onrender.com'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD

if (!password) throw new Error('E2E_PASSWORD is required for the runtime health probe')

const receipt = {
  checkedAt: new Date().toISOString(),
  appUrl,
  checks: {},
}

const build = await timedFetch(`${appUrl}/api/build-info`)
assert.equal(build.response.status, 200, `build-info returned ${build.response.status}`)
const buildInfo = await build.response.json()
assert.match(buildInfo.commit ?? '', /^[0-9a-f]{40}$/i, 'build-info must expose a 40-char commit SHA')
receipt.deployedCommit = buildInfo.commit
receipt.checks.buildInfoMs = build.elapsedMs

const loginPage = await timedFetch(`${appUrl}/login`)
assert.equal(loginPage.response.status, 200, `login page returned ${loginPage.response.status}`)
receipt.checks.loginPageMs = loginPage.elapsedMs

const auth = await timedFetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: publishableKey,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
})
assert.equal(auth.response.status, 200, `Supabase authentication returned ${auth.response.status}`)
const authPayload = await auth.response.json()
assert.ok(authPayload.access_token, 'Supabase authentication did not return an access token')
receipt.checks.authMs = auth.elapsedMs

const db = await timedFetch(`${supabaseUrl}/rest/v1/assistant_write_proposals?select=id&limit=1`, {
  headers: {
    apikey: publishableKey,
    authorization: `Bearer ${authPayload.access_token}`,
  },
})
assert.equal(db.response.status, 200, `Authenticated database probe returned ${db.response.status}`)
receipt.checks.databaseMs = db.elapsedMs

console.log(JSON.stringify(receipt, null, 2))

async function timedFetch(url, init) {
  const started = performance.now()
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
  return { response, elapsedMs: Math.round(performance.now() - started) }
}
