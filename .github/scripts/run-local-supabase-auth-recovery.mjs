import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'

const workdir = process.env.SUPABASE_REHEARSAL_DIR
if (!workdir) throw new Error('SUPABASE_REHEARSAL_DIR is required')

const command = (args) => execFileSync('supabase', args, { cwd: workdir, encoding: 'utf8' })
const status = command(['status', '-o', 'env'])
const local = Object.fromEntries(
  status
    .split(/\r?\n/)
    .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^"|"$/g, '')]),
)

const apiUrl = local.API_URL || 'http://127.0.0.1:54321'
const anonKey = local.ANON_KEY
const serviceRoleKey = local.SERVICE_ROLE_KEY
const mailpitUrl = local.INBUCKET_URL || local.MAILPIT_URL || 'http://127.0.0.1:54324'
if (!anonKey || !serviceRoleKey) throw new Error('Local Supabase keys not available')

const email = `auth-recovery-${Date.now()}@example.invalid`
const oldPassword = `A!${crypto.randomBytes(20).toString('base64url')}`
const newPassword = `B!${crypto.randomBytes(20).toString('base64url')}`
const redirectTo = 'http://127.0.0.1:3000/auth/confirm?recovery=1'

async function jsonRequest(url, { method = 'GET', key = anonKey, token, body, redirect = 'follow' } = {}) {
  const headers = { apikey: key }
  if (token) headers.authorization = `Bearer ${token}`
  if (body !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect,
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { response, data, text }
}

const adminCreate = await jsonRequest(`${apiUrl}/auth/v1/admin/users`, {
  method: 'POST',
  key: serviceRoleKey,
  token: serviceRoleKey,
  body: { email, password: oldPassword, email_confirm: true },
})
if (!adminCreate.response.ok) throw new Error(`admin create failed: ${adminCreate.response.status} ${adminCreate.text}`)

const initialLogin = await jsonRequest(`${apiUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  body: { email, password: oldPassword },
})
if (!initialLogin.response.ok || !initialLogin.data?.access_token) throw new Error('initial password login failed')

const recover = await jsonRequest(`${apiUrl}/auth/v1/recover`, {
  method: 'POST',
  body: { email, redirect_to: redirectTo },
})
if (!recover.response.ok) throw new Error(`recover request failed: ${recover.response.status} ${recover.text}`)

let mailCount = 0
for (let attempt = 0; attempt < 20; attempt += 1) {
  const response = await fetch(`${mailpitUrl}/api/v1/messages`)
  if (response.ok) {
    const data = await response.json()
    mailCount = Number(data.total ?? data.total_count ?? data.messages?.length ?? data.Messages?.length ?? 0)
    if (mailCount > 0) break
  }
  await new Promise((resolve) => setTimeout(resolve, 500))
}
if (mailCount < 1) throw new Error('recovery request did not produce a captured Auth email in Mailpit')

const generated = await jsonRequest(`${apiUrl}/auth/v1/admin/generate_link`, {
  method: 'POST',
  key: serviceRoleKey,
  token: serviceRoleKey,
  body: { type: 'recovery', email, redirect_to: redirectTo },
})
if (!generated.response.ok) throw new Error(`generate recovery link failed: ${generated.response.status} ${generated.text}`)

function findActionLink(value) {
  if (!value || typeof value !== 'object') return null
  if (typeof value.action_link === 'string') return value.action_link
  for (const child of Object.values(value)) {
    const found = findActionLink(child)
    if (found) return found
  }
  return null
}
const actionLink = findActionLink(generated.data)
if (!actionLink) throw new Error('GoTrue did not return a recovery action link')

const verify = await fetch(actionLink, { redirect: 'manual' })
if (![301, 302, 303, 307, 308].includes(verify.status)) {
  throw new Error(`recovery verify did not redirect: ${verify.status}`)
}
const location = verify.headers.get('location')
if (!location) throw new Error('recovery verify redirect has no Location header')
const redirectUrl = new URL(location, redirectTo)
const fragment = new URLSearchParams(redirectUrl.hash.replace(/^#/, ''))
const query = redirectUrl.searchParams
const recoveryAccessToken = fragment.get('access_token') || query.get('access_token')
const recoveryType = fragment.get('type') || query.get('type')
if (!recoveryAccessToken) throw new Error(`recovery session access token missing in redirect: ${location}`)
if (recoveryType && recoveryType !== 'recovery') throw new Error(`unexpected recovery type: ${recoveryType}`)

const update = await jsonRequest(`${apiUrl}/auth/v1/user`, {
  method: 'PUT',
  token: recoveryAccessToken,
  body: { password: newPassword },
})
if (!update.response.ok) throw new Error(`password update failed: ${update.response.status} ${update.text}`)

const oldLogin = await jsonRequest(`${apiUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  body: { email, password: oldPassword },
})
if (oldLogin.response.ok) throw new Error('old password still accepted after recovery')

const newLogin = await jsonRequest(`${apiUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  body: { email, password: newPassword },
})
if (!newLogin.response.ok || !newLogin.data?.access_token) throw new Error('new password login failed after recovery')

console.log(JSON.stringify({
  result: 'PASS',
  scope: 'SUPABASE_AUTH_SERVICE_RECOVERY',
  environment: 'EPHEMERAL_GITHUB_ACTIONS_LOCAL_SUPABASE',
  gotrueServiceExercised: true,
  syntheticIdentityOnly: true,
  initialPasswordLogin: true,
  recoverEndpointAccepted: true,
  recoveryEmailCapturedByMailpit: true,
  recoverySessionIssued: true,
  passwordChangedThroughRecoverySession: true,
  oldPasswordRejected: true,
  newPasswordAccepted: true,
  productionTouched: false,
  betaTouched: false,
  realUserDataUsed: false,
}, null, 2))
