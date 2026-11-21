import assert from 'node:assert/strict'
import { it } from 'node:test'
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
