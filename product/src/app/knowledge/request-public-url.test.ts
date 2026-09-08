import assert from 'node:assert/strict'
import test from 'node:test'
import { publicRequestUrl, resolvePublicRequestOrigin } from './request-public-url'

test('uses forwarded public origin instead of Render internal localhost URL', () => {
  const request = new Request('http://localhost:10000/knowledge/from-textbook/book-1', {
    headers: {
      'x-forwarded-host': 'docente-os-2026-27-beta.onrender.com',
      'x-forwarded-proto': 'https',
    },
  })

  assert.equal(
    resolvePublicRequestOrigin(request, null),
    'https://docente-os-2026-27-beta.onrender.com',
  )
  assert.equal(
    publicRequestUrl('/knowledge?capture=file', request).toString(),
    'https://docente-os-2026-27-beta.onrender.com/knowledge?capture=file',
  )
})

test('uses configured public origin before an internal Host fallback', () => {
  const request = new Request('http://localhost:10000/knowledge/from-textbook/book-1', {
    headers: { host: 'localhost:10000' },
  })

  assert.equal(
    resolvePublicRequestOrigin(request, 'https://beta.example.test/'),
    'https://beta.example.test',
  )
})

test('keeps direct local development working when no proxy or configured origin exists', () => {
  const request = new Request('http://localhost:10000/knowledge/from-textbook/book-1')
  assert.equal(resolvePublicRequestOrigin(request, null), 'http://localhost:10000')
})

test('uses the first forwarded value when a proxy chain is present', () => {
  const request = new Request('http://localhost:10000/knowledge/from-textbook/book-1', {
    headers: {
      'x-forwarded-host': 'beta.example.test, internal.proxy',
      'x-forwarded-proto': 'https, http',
    },
  })

  assert.equal(resolvePublicRequestOrigin(request, null), 'https://beta.example.test')
})
