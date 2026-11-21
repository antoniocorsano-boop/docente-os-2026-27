import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { arenaGoogleConnectionMessage } from './arena-google-connection-feedback'

const ui = readFileSync(fileURLToPath(new URL('./arena-provisional-grade-preview-client.tsx', import.meta.url)), 'utf8')

// @trama-feedback-test: the OAuth write has explicit, persistent and perceivable status.
it('acknowledges Google connection without promising an unverified Arena source', () => {
  const connected = arenaGoogleConnectionMessage('connected')!
  assert.match(connected, /Account Google collegato/)
  assert.match(connected, /verificato/)
  assert.doesNotMatch(connected, /disponibile|approvato/)
})

it('preserves failure and denial feedback rather than silently changing accounts', () => {
  assert.match(arenaGoogleConnectionMessage('rejected')!, /non concessa/)
  assert.match(arenaGoogleConnectionMessage('failed')!, /non completato/)
  assert.match(arenaGoogleConnectionMessage('context-mismatch')!, /spazio docente/)
  assert.match(arenaGoogleConnectionMessage('not-configured')!, /non è configurato/)
  assert.equal(arenaGoogleConnectionMessage('unknown'), null)
})

it('renders the OAuth outcome in a persistent accessible status area', () => {
  assert.match(ui, /googleFeedback \? \(/)
  assert.match(ui, /role="status" aria-live="polite"/)
  assert.match(ui, /\{googleFeedback\}/)
})
