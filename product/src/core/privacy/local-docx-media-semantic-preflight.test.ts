import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import {
  auditDocxPackageMedia,
  MAX_LOCAL_DOCX_MEDIA_ITEMS,
} from './local-docx-media-semantic-preflight'
import { createSemanticDerivativeRevisionGate } from './semantic-derivative-revision-gate'

const MINIMAL_PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

async function zipWithMedia(entries: Array<{ name: string; bytes: Uint8Array }>) {
  const zip = new JSZip()
  for (const entry of entries) zip.file(`word/media/${entry.name}`, entry.bytes)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

test('auditDocxPackageMedia blocca un media non referenziato e non supportato', async () => {
  const bytes = await zipWithMedia([
    { name: 'hidden.gif', bytes: Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) },
  ])

  const result = await auditDocxPackageMedia(bytes)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /non ammesso/i)
})

test('auditDocxPackageMedia conta anche i media non referenziati nel limite package-wide', async () => {
  const entries = Array.from({ length: MAX_LOCAL_DOCX_MEDIA_ITEMS + 1 }, (_, index) => ({
    name: `hidden-${index + 1}.png`,
    bytes: MINIMAL_PNG_SIGNATURE,
  }))

  const result = await auditDocxPackageMedia(await zipWithMedia(entries))

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /più di 8 media/i)
})

test('auditDocxPackageMedia verifica la firma reale del media dichiarato', async () => {
  const bytes = await zipWithMedia([
    { name: 'fake.png', bytes: Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) },
  ])

  const result = await auditDocxPackageMedia(bytes)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /non corrisponde al formato dichiarato/i)
})

test('una mutazione rende obsoleta una composizione già avviata', () => {
  const gate = createSemanticDerivativeRevisionGate()
  gate.confirmCurrentRevision()
  const oldToken = gate.beginComposition()
  assert.ok(oldToken)

  gate.invalidate()

  assert.equal(gate.isCurrent(oldToken), false)
})

test('una composizione più recente non può essere sovrascritta da quella precedente', () => {
  const gate = createSemanticDerivativeRevisionGate()
  gate.confirmCurrentRevision()
  const first = gate.beginComposition()
  const second = gate.beginComposition()
  assert.ok(first)
  assert.ok(second)

  assert.equal(gate.isCurrent(first), false)
  assert.equal(gate.isCurrent(second), true)
})
