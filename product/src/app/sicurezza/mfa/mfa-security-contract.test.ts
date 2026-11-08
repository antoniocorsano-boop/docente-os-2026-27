import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const passwordAction = readFileSync(new URL('../../imposta-password/actions.ts', import.meta.url), 'utf8')
const mfaUi = readFileSync(new URL('./mfa-access.tsx', import.meta.url), 'utf8')

test('account password mutation checks second-factor assurance BEFORE writing', () => {
  const guard = passwordAction.indexOf('auth.mfa.getAuthenticatorAssuranceLevel()')
  const mutation = passwordAction.indexOf('auth.updateUser({ password })')
  assert.ok(guard > 0, 'missing MFA assurance guard')
  assert.ok(mutation > guard, 'password changed before MFA assurance was evaluated')
  assert.ok(
    passwordAction.slice(guard, mutation).includes("redirect('/sicurezza/mfa')"),
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
