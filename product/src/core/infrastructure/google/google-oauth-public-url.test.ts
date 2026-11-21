import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { googleOAuthPublicOrigin, googleOAuthResultUrl, safeGoogleOAuthReturnTo } from './google-oauth-public-url'

const PREVIEW = 'https://docente-os-pr804-arena-private-test.onrender.com'

it('routes the unavailable Google connection back to the public Render app, never 0.0.0.0', () => {
  const origin = googleOAuthPublicOrigin({ renderExternalUrl: PREVIEW, appUrl: 'http://0.0.0.0:10000' })
  assert.equal(origin, PREVIEW)
  assert.equal(
    googleOAuthResultUrl('/classi/3e/curricolo-arena', 'not-configured', 0, origin)?.toString(),
    PREVIEW + '/classi/3e/curricolo-arena?google=not-configured',
  )
})

it('uses the public origin after success and failure, regardless of internal request host', () => {
  const origin = googleOAuthPublicOrigin({ renderExternalUrl: PREVIEW, appUrl: 'https://unrelated.example.test' })
  assert.equal(googleOAuthResultUrl('/classi/3e/curricolo-arena', 'connected', 0, origin)?.origin, PREVIEW)
  assert.equal(googleOAuthResultUrl('/classi/3e/curricolo-arena', 'failed', 0, origin)?.origin, PREVIEW)
  assert.equal(googleOAuthResultUrl('/classi', 'connected', 3, origin)?.searchParams.get('driveSynced'), '3')
})

it('rejects internal, untrusted or malformed public origin choices', () => {
  assert.equal(googleOAuthPublicOrigin({ renderExternalUrl: 'http://0.0.0.0:10000' }), null)
  assert.equal(googleOAuthPublicOrigin({ appUrl: 'http://192.168.1.4:10000' }), null)
  assert.equal(googleOAuthPublicOrigin({ appUrl: 'file:///tmp/file' }), null)
  assert.equal(googleOAuthPublicOrigin({}), null)
  assert.equal(googleOAuthPublicOrigin({ appUrl: 'http://127.0.0.1:3000' }), 'http://127.0.0.1:3000')
  assert.equal(googleOAuthResultUrl('/classi', 'failed', 0, null), null)
})

it('prevents a returnTo parameter from redirecting to an external host', () => {
  for (const candidate of ['//external.example', '/\\external.example', '/\nclasses', 'https://external.example']) {
    assert.equal(safeGoogleOAuthReturnTo(candidate), '/classi')
    assert.equal(googleOAuthResultUrl(candidate, 'failed', 0, PREVIEW)?.origin, PREVIEW)
  }
})

it('connect, callback and exchange use the shared public origin instead of request.url', () => {
  const route = (name: string) => readFileSync(
    fileURLToPath(new URL('../../../app/api/google/drive/' + name + '/route.ts', import.meta.url)), 'utf8',
  )
  const connect = route('connect')
  const callback = route('callback')
  const oauth = readFileSync(fileURLToPath(new URL('./google-oauth.ts', import.meta.url)), 'utf8')
  assert.match(connect, /googleOAuthResultUrl/)
  assert.match(callback, /googleOAuthResultUrl/)
  assert.match(oauth, /googleOAuthPublicOrigin/)
  assert.doesNotMatch(connect, /new URL\([^\n]*request\.url/)
  assert.doesNotMatch(callback, /new URL\([^\n]*request\.url/)
})
