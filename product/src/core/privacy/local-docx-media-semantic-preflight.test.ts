import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import {
  auditDocxPackageMedia,
  MAX_LOCAL_DOCX_MEDIA_ITEMS,
} from './local-docx-media-semantic-preflight'
import { createSemanticDerivativeRevisionGate } from './semantic-derivative-revision-gate'

const MINIMAL_PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const MINIMAL_JPEG_SIGNATURE = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])

async function zipWithMedia(
  entries: Array<{ name: string; bytes: Uint8Array }>,
  options?: { overrides?: Record<string, string>; defaults?: Record<string, string> },
) {
  const zip = new JSZip()
  for (const entry of entries) zip.file(`word/media/${entry.name}`, entry.bytes)
  const defaults = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ...(options?.defaults ?? {}) }
  const defaultXml = Object.entries(defaults).map(([extension, contentType]) => `<Default Extension="${extension}" ContentType="${contentType}"/>`).join('')
  const overrideXml = Object.entries(options?.overrides ?? {}).map(([partName, contentType]) => `<Override PartName="/${partName}" ContentType="${contentType}"/>`).join('')
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${defaultXml}${overrideXml}</Types>`)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

test('auditDocxPackageMedia blocca un media non referenziato e non supportato', async () => {
  const bytes = await zipWithMedia(
    [{ name: 'hidden.gif', bytes: Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) }],
    { defaults: { gif: 'image/gif' } },
  )

  const result = await auditDocxPackageMedia(bytes)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /tipo OPC non ammesso|non ammesso/i)
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

test('auditDocxPackageMedia verifica la firma reale contro il tipo dichiarato dal manifest OPC', async () => {
  const bytes = await zipWithMedia([
    { name: 'fake.png', bytes: Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) },
  ])

  const result = await auditDocxPackageMedia(bytes)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /non corrisponde al tipo OPC dichiarato/i)
})

test('auditDocxPackageMedia usa Override OPC anche con estensione non standard', async () => {
  const bytes = await zipWithMedia(
    [{ name: 'foto.bin', bytes: MINIMAL_JPEG_SIGNATURE }],
    { overrides: { 'word/media/foto.bin': 'image/jpeg' } },
  )

  const result = await auditDocxPackageMedia(bytes)

  assert.equal(result.allowed, true)
  if (result.allowed) assert.equal(result.media[0]?.contentType, 'image/jpeg')
})

test('auditDocxPackageMedia non si fida dell’estensione se il manifest OPC dichiara un tipo vietato', async () => {
  const bytes = await zipWithMedia(
    [{ name: 'foto.png', bytes: MINIMAL_PNG_SIGNATURE }],
    { overrides: { 'word/media/foto.png': 'image/gif' } },
  )

  const result = await auditDocxPackageMedia(bytes)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /tipo OPC non ammesso/i)
})

test('auditDocxPackageMedia blocca nomi duplicati nella directory centrale prima della vista JSZip', async () => {
  const original = await zipWithMedia([
    { name: 'a.png', bytes: MINIMAL_PNG_SIGNATURE },
    { name: 'b.png', bytes: MINIMAL_PNG_SIGNATURE },
  ])
  const crafted = duplicateSecondMediaCentralDirectoryName(original, 'word/media/a.png', 'word/media/b.png')

  const result = await auditDocxPackageMedia(crafted)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /duplicati o ambigui/i)
})

test('auditDocxPackageMedia blocca nomi ZIP ambigui che differiscono solo per maiuscole', async () => {
  const original = await zipWithMedia([
    { name: 'a.png', bytes: MINIMAL_PNG_SIGNATURE },
    { name: 'b.png', bytes: MINIMAL_PNG_SIGNATURE },
  ])
  const crafted = duplicateSecondMediaCentralDirectoryName(original, 'word/media/A.png', 'word/media/b.png')

  const result = await auditDocxPackageMedia(crafted)

  assert.equal(result.allowed, false)
  if (!result.allowed) assert.match(result.reason, /duplicati o ambigui/i)
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

function duplicateSecondMediaCentralDirectoryName(bytes: Uint8Array, replacement: string, target: string) {
  assert.equal(replacement.length, target.length)
  const result = bytes.slice()
  const replacementBytes = new TextEncoder().encode(replacement)
  const targetBytes = new TextEncoder().encode(target)
  let replacements = 0

  for (let offset = 0; offset <= result.length - targetBytes.length; offset += 1) {
    let matches = true
    for (let index = 0; index < targetBytes.length; index += 1) {
      if (result[offset + index] !== targetBytes[index]) { matches = false; break }
    }
    if (!matches) continue
    const headerOffset = offset - 46
    if (headerOffset >= 0 && readLe32(result, headerOffset) === 0x02014b50) {
      result.set(replacementBytes, offset)
      replacements += 1
    }
  }

  assert.equal(replacements, 1)
  return result
}

function readLe32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}
