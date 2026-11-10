import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const passwordAction = readFileSync(new URL('../../imposta-password/actions.ts', import.meta.url), 'utf8')
const loginAction = readFileSync(new URL('../../login/actions.ts', import.meta.url), 'utf8')
const loginPage = readFileSync(new URL('../../login/page.tsx', import.meta.url), 'utf8')
const passwordPage = readFileSync(new URL('../../imposta-password/page.tsx', import.meta.url), 'utf8')
const mfaPage = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const mfaUi = readFileSync(new URL('./mfa-access.tsx', import.meta.url), 'utf8')

test('account password mutation checks second-factor assurance BEFORE writing', () => {
  const guard = passwordAction.indexOf('auth.mfa.getAuthenticatorAssuranceLevel()')
  const mutation = passwordAction.indexOf('auth.updateUser({ password })')
  assert.ok(guard > 0, 'missing MFA assurance guard')
  assert.ok(mutation > guard, 'password changed before MFA assurance was evaluated')
  assert.ok(
    passwordAction.slice(guard, mutation).includes("redirect('/sicurezza/mfa?return=password')"),
    'missing fail-closed redirect before password update',
  )
})

test('a pending TOTP secret is not shown in the initial render', () => {
  assert.ok(mfaUi.includes('const [secretRevealed, setSecretRevealed] = useState(false)'))
  assert.ok(mfaUi.includes('{secretRevealed ? ('))
  assert.ok(mfaUi.includes('setSecretRevealed(false)'))
})

test('interrupted factors are rechecked before user-initiated cleanup', () => {
  assert.ok(mfaUi.includes("if (busy || view !== 'recover') return"))
  const fresh = mfaUi.indexOf('const latest = await supabase.auth.mfa.listFactors()')
  const verified = mfaUi.indexOf("latest.data.totp.filter((factor) => factor.status === 'verified')", fresh)
  const guard = mfaUi.indexOf('if (verified.length)', verified)
  const selection = mfaUi.indexOf('recoverableDocenteDrafts(latest.data.all)', guard)
  const removal = mfaUi.indexOf('supabase.auth.mfa.unenroll({ factorId: draft.id })', selection)
  assert.ok(fresh >= 0 && verified > fresh && guard > verified && selection > guard && removal > selection)
})

test('verified backup factors can be chosen without removing the original', () => {
  assert.ok(mfaUi.includes('verifiedFactors.length > 1'))
  assert.ok(mfaUi.includes('setFactorId(event.target.value)'))
  assert.ok(mfaUi.includes('Aggiungi un secondo fattore di recupero'))
  assert.ok(mfaUi.includes("(view !== 'setup' && view !== 'ready')"))
  assert.equal(mfaUi.includes("supabase.auth.mfa.unenroll({ factorId: factorId"), false)
})

test('MFA UI never writes or downloads teacher materials', () => {
  for (const unsafeCall of ['.storage.', 'GetObject', 'PutObject', 'DeleteObject', 'service_role']) {
    assert.equal(mfaUi.includes(unsafeCall), false, `unexpected Storage or privileged operation: ${unsafeCall}`)
  }
})

test('RB-04 MFA is deliberately limited to elevated operations, not a fake workspace gate', () => {
  assert.equal(loginAction.includes('auth.mfa.getAuthenticatorAssuranceLevel()'), false)
  assert.equal(loginPage.includes('auth.mfa.getAuthenticatorAssuranceLevel()'), false)
  assert.ok(passwordAction.includes('auth.mfa.getAuthenticatorAssuranceLevel()'))
  assert.ok(mfaUi.includes("level.data?.currentLevel"))
})

test('MFA cancel never deletes a factor that might already be verified', () => {
  const start = mfaUi.indexOf('async function cancelEnrollment()')
  const end = mfaUi.indexOf('async function discardInterruptedDraft()', start)
  assert.ok(start >= 0 && end > start)
  const cancel = mfaUi.slice(start, end)
  assert.equal(cancel.includes('auth.mfa.unenroll('), false)
  assert.ok(cancel.includes('auth.mfa.listFactors()'))
  assert.ok(cancel.includes('Interrompi') === false)
})

test('MFA session changes clear secrets and stale request state', () => {
  assert.ok(mfaUi.includes('auth.onAuthStateChange('))
  assert.ok(mfaUi.includes("event === 'SIGNED_OUT'"))
  assert.ok(mfaUi.includes("event === 'TOKEN_REFRESHED'"))
  assert.ok(mfaUi.includes('authEpoch.current += 1'))
  assert.ok(mfaUi.includes('setPending(null)'))
  assert.ok(mfaUi.includes('setSecretRevealed(false)'))
  assert.ok(mfaUi.includes('sameSession(epoch, userId)'))
})

test('backup enrollment uses a collision-free factor name instead of a fixed label', () => {
  assert.ok(mfaUi.includes('nextDocenteFactorName(latest.data.all)'))
  assert.ok(mfaUi.includes('friendlyName,'))
  assert.equal(mfaUi.includes("friendlyName: 'Docente OS'"), false)
})

test('password recovery return intent is whitelisted and requires password resubmission', () => {
  assert.ok(passwordAction.includes("redirect('/sicurezza/mfa?return=password')"))
  assert.ok(mfaPage.includes("params.return === 'password'"))
  assert.ok(mfaPage.includes("'/imposta-password?source=mfa'"))
  assert.ok(mfaPage.includes("'/workspace'"))
  assert.ok(mfaPage.includes('return <MfaAccess returnTo={returnTo} isTestPreview={isIsolatedMfaPreview()} />'))
  assert.ok(mfaUi.includes('<Link href={returnTo}'))
  assert.ok(mfaUi.includes('Torna a impostare la password'))
  assert.ok(mfaUi.includes('La password non è stata ancora modificata.'))
  assert.ok(passwordPage.includes("params.source === 'mfa'"))
  assert.ok(passwordPage.includes('La password non è stata ancora salvata'))
  assert.equal(mfaPage.includes("params.return ||"), false)
})

test('same-user new SIGNED_IN session invalidates local secret and aal2 state', () => {
  assert.ok(mfaUi.includes("event === 'SIGNED_IN'"))
  assert.ok(mfaUi.includes('currentSessionId.current'))
  assert.ok(mfaUi.includes('incomingSessionId !== currentSessionId.current'))
  assert.ok(mfaUi.includes('resetSensitiveState()'))
  assert.ok(mfaUi.includes('localSessionId(session.access_token)'))
  assert.ok(mfaUi.includes("const session = await supabase.auth.getSession()"))
  assert.ok(mfaUi.includes('currentSessionId.current = id'))
  assert.ok(mfaUi.includes('authEpoch.current += 1'))
})

test('isolated MFA preview does not link to unavailable workspace settings', () => {
  const guard = mfaUi.lastIndexOf('{!isTestPreview ? (')
  const link = mfaUi.lastIndexOf('href="/impostazioni"')
  const close = mfaUi.indexOf(') : null}', link)
  assert.ok(guard >= 0 && link > guard && close > link)
})
