import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasAal2,
  isApplicationApiPath,
  isMfaExemptPath,
  mfaRedirectPath,
  normalizeMfaNextPath,
  requiresMfa,
  resolveExternalOrigin,
} from './mfa-access-policy'

test('authenticated aal1 sessions are blocked from application surfaces', () => {
  const claims = { sub: 'user-1', aal: 'aal1' }
  assert.equal(requiresMfa('/planner', claims), true)
  assert.equal(requiresMfa('/knowledge', claims), true)
  assert.equal(requiresMfa('/api/knowledge/upload', claims), true)
})

test('aal2 sessions can access application surfaces', () => {
  const claims = { sub: 'user-1', aal: 'aal2' }
  assert.equal(hasAal2(claims), true)
  assert.equal(requiresMfa('/planner', claims), false)
  assert.equal(requiresMfa('/api/assistant/planner-context', claims), false)
})

test('login, MFA, auth callback and password reset remain reachable at aal1', () => {
  const claims = { sub: 'user-1', aal: 'aal1' }
  for (const path of ['/login', '/mfa', '/auth/confirm', '/auth/signout', '/imposta-password']) {
    assert.equal(isMfaExemptPath(path), true)
    assert.equal(requiresMfa(path, claims), false)
  }
})

test('unauthenticated requests are not classified as MFA challenges', () => {
  assert.equal(requiresMfa('/planner', null), false)
  assert.equal(requiresMfa('/planner', { aal: 'aal1' }), false)
})

test('MFA return paths stay same-origin and outside auth/API surfaces', () => {
  assert.equal(normalizeMfaNextPath('/classi/3A?tab=diario'), '/classi/3A?tab=diario')
  assert.equal(normalizeMfaNextPath('https://evil.example/'), '/planner')
  assert.equal(normalizeMfaNextPath('//evil.example/'), '/planner')
  assert.equal(normalizeMfaNextPath('/mfa'), '/planner')
  assert.equal(normalizeMfaNextPath('/auth/confirm?x=1'), '/planner')
  assert.equal(normalizeMfaNextPath('/api/knowledge/upload'), '/planner')
  assert.equal(mfaRedirectPath('/planner', '?day=1'), '/mfa?next=%2Fplanner%3Fday%3D1')
})

test('MFA permits only exact password continuations among exempt paths', () => {
  assert.equal(
    normalizeMfaNextPath('/imposta-password?source=recovery'),
    '/imposta-password?source=recovery',
  )
  assert.equal(
    mfaRedirectPath('/imposta-password', '?source=recovery'),
    '/mfa?next=%2Fimposta-password%3Fsource%3Drecovery',
  )
  assert.equal(
    normalizeMfaNextPath('/imposta-password?source=email'),
    '/imposta-password?source=email',
  )
  assert.equal(
    mfaRedirectPath('/imposta-password', '?source=email'),
    '/mfa?next=%2Fimposta-password%3Fsource%3Demail',
  )
  assert.equal(normalizeMfaNextPath('/imposta-password'), '/planner')
  assert.equal(normalizeMfaNextPath('/imposta-password?source=unknown'), '/planner')
  assert.equal(normalizeMfaNextPath('/imposta-password?source=recovery&next=/planner'), '/planner')
  assert.equal(normalizeMfaNextPath('/imposta-password?source=email&next=/planner'), '/planner')
})

test('application API classification is explicit', () => {
  assert.equal(isApplicationApiPath('/api'), true)
  assert.equal(isApplicationApiPath('/api/knowledge/upload'), true)
  assert.equal(isApplicationApiPath('/planner'), false)
})

test('auth redirects prefer the configured public application origin', () => {
  assert.equal(
    resolveExternalOrigin({
      configuredOrigin: 'https://docente-os-mfa-test.onrender.com/',
      forwardedHost: 'internal.example:10000',
      forwardedProto: 'http',
      requestOrigin: 'http://0.0.0.0:10000',
    }),
    'https://docente-os-mfa-test.onrender.com',
  )
})

test('auth redirects fall back to trusted reverse-proxy headers instead of an internal bind address', () => {
  assert.equal(
    resolveExternalOrigin({
      forwardedHost: 'docente-os-mfa-test.onrender.com',
      forwardedProto: 'https',
      requestOrigin: 'http://0.0.0.0:10000',
    }),
    'https://docente-os-mfa-test.onrender.com',
  )
})

test('auth redirect origin rejects unsupported schemes and requires a usable fallback', () => {
  assert.equal(
    resolveExternalOrigin({
      configuredOrigin: 'javascript:alert(1)',
      requestOrigin: 'http://127.0.0.1:3000',
    }),
    'http://127.0.0.1:3000',
  )
  assert.throws(
    () => resolveExternalOrigin({ configuredOrigin: 'javascript:alert(1)' }),
    /public application origin/i,
  )
})
