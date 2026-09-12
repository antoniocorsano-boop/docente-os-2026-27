import assert from 'node:assert/strict'
import test from 'node:test'
import { buildContentSecurityPolicy, createContentSecurityPolicyNonce } from './content-security-policy'

test('production CSP satisfies the V3.4.3 baseline without unsafe script execution', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'abc123',
    isDevelopment: false,
    supabaseUrl: 'https://example.supabase.co/path',
  })

  assert.match(policy, /object-src 'none'/)
  assert.match(policy, /base-uri 'none'/)
  assert.match(policy, /script-src 'self' 'nonce-abc123' 'strict-dynamic'/)
  assert.match(policy, /script-src-attr 'none'/)
  assert.doesNotMatch(policy, /script-src [^;]*'unsafe-inline'/)
  assert.doesNotMatch(policy, /script-src [^;]*'unsafe-eval'/)
  assert.match(policy, /connect-src 'self' https:\/\/example\.supabase\.co wss:\/\/example\.supabase\.co https:\/\/example\.storage\.supabase\.co/)
  assert.doesNotMatch(policy, /connect-src [^;]*\*\.supabase\.co/)
  assert.match(policy, /img-src 'self' data: blob: https:\/\/example\.supabase\.co/)
  assert.match(policy, /frame-ancestors 'none'/)
})

test('custom Supabase origins do not infer an unrelated storage hostname', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'abc123',
    isDevelopment: false,
    supabaseUrl: 'https://supabase.internal.example/path',
  })

  assert.match(policy, /connect-src 'self' https:\/\/supabase\.internal\.example wss:\/\/supabase\.internal\.example/)
  assert.doesNotMatch(policy, /storage\.supabase\.co/)
})

test('development CSP permits eval only for the local framework runtime', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'devnonce',
    isDevelopment: true,
  })

  assert.match(policy, /script-src 'self' 'nonce-devnonce' 'strict-dynamic' 'unsafe-eval'/)
  assert.doesNotMatch(policy, /script-src [^;]*'unsafe-inline'/)
})

test('invalid Supabase URL does not widen external origins', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'abc123',
    isDevelopment: false,
    supabaseUrl: 'not-a-url',
  })

  assert.match(policy, /connect-src 'self'/)
  assert.doesNotMatch(policy, /connect-src [^;]*https?:\/\//)
})

test('nonce generator returns a fresh URL-safe value for each request', () => {
  const first = createContentSecurityPolicyNonce()
  const second = createContentSecurityPolicyNonce()

  assert.match(first, /^[0-9a-f]{32}$/i)
  assert.match(second, /^[0-9a-f]{32}$/i)
  assert.notEqual(first, second)
})
