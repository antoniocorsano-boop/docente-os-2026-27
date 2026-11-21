import assert from 'node:assert/strict'
import { it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assessGoogleOAuthConnection, googleOAuthScopesForPurpose } from './google-oauth-purpose'
import {
  ARENA_PRIVATE_DRIVE_SOURCE_URL,
  downloadPinnedArenaFromDrive,
  GOOGLE_ARENA_DRIVE_READ_SCOPE,
} from './arena-provisional-drive-source'

it('requires a Google bearer token rather than public or arbitrary file access', async () => {
  let called = false
  const http = (async () => { called = true; throw new Error('not expected') }) as unknown as typeof fetch
  await assert.rejects(downloadPinnedArenaFromDrive('', http), /token missing/)
  assert.equal(called, false)
  assert.equal(GOOGLE_ARENA_DRIVE_READ_SCOPE, 'https://www.googleapis.com/auth/drive.readonly')
})

it('pins the private Drive file and rejects altered bytes before parsing the source', async () => {
  const payload = new Uint8Array(725968)
  let observed = false
  const http = (async (url: string | URL | Request, init?: RequestInit) => {
    observed = true
    assert.equal(String(url), ARENA_PRIVATE_DRIVE_SOURCE_URL)
    assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer short-lived-test-token')
    assert.equal(init?.redirect, 'error')
    return new Response(payload.buffer, {
      status: 200,
      headers: { 'content-length': String(payload.length), 'content-type': 'application/json' },
    })
  }) as typeof fetch
  await assert.rejects(downloadPinnedArenaFromDrive('short-lived-test-token', http), /SHA-256 differs/)
  assert.equal(observed, true)
})

it('rejects an oversized private Drive response without downloading its body', async () => {
  const http = (async () => new Response(null, {
    status: 200,
    headers: { 'content-length': '2000001' },
  })) as typeof fetch
  await assert.rejects(downloadPinnedArenaFromDrive('token', http), /exceeds the permitted size/)
})

it('fails closed on Google API errors', async () => {
  const http = (async () => new Response('not authorized', { status: 403 })) as typeof fetch
  await assert.rejects(downloadPinnedArenaFromDrive('token', http), /unavailable: 403/)
})

it('requests read-only Drive for Arena, without diary spreadsheet permissions', () => {
  const arena = googleOAuthScopesForPurpose('arena')
  const diary = googleOAuthScopesForPurpose('diary')
  assert.deepEqual(arena, ['openid', 'email', GOOGLE_ARENA_DRIVE_READ_SCOPE])
  assert.ok(!arena.includes('https://www.googleapis.com/auth/spreadsheets'))
  assert.ok(diary.includes('https://www.googleapis.com/auth/spreadsheets'))
  assert.ok(!diary.includes(GOOGLE_ARENA_DRIVE_READ_SCOPE))
})

it('never synchronizes diary on a successful Arena authorization', () => {
  const decision = assessGoogleOAuthConnection({
    purpose: 'arena',
    grantedScopes: googleOAuthScopesForPurpose('arena'),
    accountEmail: 'teacher@example.test',
    signedInEmail: 'teacher@example.test',
    existingAccountEmail: null,
    existingScopes: [],
  })
  assert.deepEqual(decision, { allowed: true, synchronizeDiary: false })
  const callback = readFileSync(fileURLToPath(new URL('../../../app/api/google/drive/callback/route.ts', import.meta.url)), 'utf8')
  assert.match(callback, /if \(!assessment\.synchronizeDiary\) \{/)
  assert.match(callback, /synchronizePendingDriveDiary\(context\.workspace\.id\)/)
  assert.match(callback, /docente_google_oauth_purpose/)
})

it('preserves the existing diary path with the Sheets scope', () => {
  const decision = assessGoogleOAuthConnection({
    purpose: 'diary',
    grantedScopes: googleOAuthScopesForPurpose('diary'),
    accountEmail: null,
    signedInEmail: null,
    existingAccountEmail: null,
    existingScopes: [],
  })
  assert.deepEqual(decision, { allowed: true, synchronizeDiary: true })
})

it('rejects Arena connections with missing Drive authorization', () => {
  const decision = assessGoogleOAuthConnection({
    purpose: 'arena',
    grantedScopes: ['openid', 'email'],
    accountEmail: 'teacher@example.test',
    signedInEmail: 'teacher@example.test',
    existingAccountEmail: null,
    existingScopes: [],
  })
  assert.deepEqual(decision, { allowed: false, reason: 'scope-mismatch' })
})

it('rejects a different Google identity before replacing any saved connection', () => {
  for (const accountEmail of [null, 'another@example.test']) {
    const decision = assessGoogleOAuthConnection({
      purpose: 'arena',
      grantedScopes: googleOAuthScopesForPurpose('arena'),
      accountEmail,
      signedInEmail: 'teacher@example.test',
      existingAccountEmail: 'teacher@example.test',
      existingScopes: [],
    })
    assert.deepEqual(decision, { allowed: false, reason: 'account-mismatch' })
  }
})

it('does not downgrade an existing diary grant when Arena is connected', () => {
  const rejected = assessGoogleOAuthConnection({
    purpose: 'arena',
    grantedScopes: googleOAuthScopesForPurpose('arena'),
    accountEmail: 'teacher@example.test',
    signedInEmail: 'teacher@example.test',
    existingAccountEmail: 'teacher@example.test',
    existingScopes: googleOAuthScopesForPurpose('diary'),
  })
  assert.deepEqual(rejected, { allowed: false, reason: 'scope-mismatch' })
  const permitted = assessGoogleOAuthConnection({
    purpose: 'arena',
    grantedScopes: [...googleOAuthScopesForPurpose('arena'), 'https://www.googleapis.com/auth/spreadsheets'],
    accountEmail: 'teacher@example.test',
    signedInEmail: 'teacher@example.test',
    existingAccountEmail: 'teacher@example.test',
    existingScopes: googleOAuthScopesForPurpose('diary'),
  })
  assert.deepEqual(permitted, { allowed: true, synchronizeDiary: false })
})
