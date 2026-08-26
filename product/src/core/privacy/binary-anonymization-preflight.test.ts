import assert from 'node:assert/strict'
import test from 'node:test'
import { docxContainsEmbeddedMedia, inspectBinaryForAnonymousPilot } from './binary-anonymization-preflight'
import { classifyPdfPages } from './local-pdf-visual-preflight'

test('blocks images when local visual preflight is unavailable', async () => {
  const result = await inspectBinaryForAnonymousPilot({ bytes: cleanPng(), mimeType: 'image/png' })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_preflight_unavailable')
})

test('allows metadata-free PNG only after local visual review', async () => {
  const result = await inspectBinaryForAnonymousPilot({
    bytes: cleanPng(),
    mimeType: 'image/png',
    localVisualReview: true,
  })
  assert.equal(result.allowed, true)
  if (!result.allowed) return
  assert.equal(result.mode, 'IMAGE_LOCAL_REVIEWED_PNG')
})

test('blocks reviewed PNG when privacy metadata chunks remain', async () => {
  const result = await inspectBinaryForAnonymousPilot({
    bytes: pngWithTextMetadata(),
    mimeType: 'image/png',
    localVisualReview: true,
  })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_blocked')
})

test('rejects non-PNG bytes even with local visual review proof', async () => {
  const result = await inspectBinaryForAnonymousPilot({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/png',
    localVisualReview: true,
  })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_preflight_failed')
})

test('detects DOCX embedded media from ZIP entry names', () => {
  const bytes = new TextEncoder().encode('PK\u0003\u0004word/media/image1.png')
  assert.equal(docxContainsEmbeddedMedia(bytes), true)
})

test('does not flag a text-only DOCX container marker as media', () => {
  const bytes = new TextEncoder().encode('PK\u0003\u0004word/document.xml')
  assert.equal(docxContainsEmbeddedMedia(bytes), false)
})

test('fails closed for unreadable PDF bytes', async () => {
  const result = await inspectBinaryForAnonymousPilot({ bytes: new Uint8Array([1, 2, 3, 4]), mimeType: 'application/pdf' })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_preflight_failed')
})

test('classifies a textual PDF as native-text-only', () => {
  const result = classifyPdfPages(1, ['Documento didattico anonimo con contenuto testuale sufficiente per il controllo locale.'])
  assert.equal(result.state, 'NATIVE_TEXT_ONLY')
  assert.deepEqual(result.missingNativeTextPages, [])
})

test('classifies a single scanned page as locally reviewable', () => {
  const result = classifyPdfPages(1, [''])
  assert.equal(result.state, 'SINGLE_PAGE_VISUAL_REVIEWABLE')
  assert.deepEqual(result.missingNativeTextPages, [1])
})

test('keeps multi-page visual PDF fail-closed', () => {
  const result = classifyPdfPages(3, [
    'Pagina testuale con abbastanza caratteri per essere considerata nativa e controllabile.',
    '',
    'Altra pagina testuale con abbastanza caratteri per superare la soglia locale.',
  ])
  assert.equal(result.state, 'MULTI_PAGE_VISUAL_BLOCKED')
  assert.deepEqual(result.missingNativeTextPages, [2])
})

test('fails closed when page accounting is inconsistent', () => {
  const result = classifyPdfPages(2, ['una sola pagina esposta'])
  assert.equal(result.state, 'FAILED')
  assert.equal(result.totalPages, null)
})

function cleanPng() {
  return png([
    chunk('IHDR', new Uint8Array(13)),
    chunk('IDAT', new Uint8Array([0])),
    chunk('IEND', new Uint8Array()),
  ])
}

function pngWithTextMetadata() {
  return png([
    chunk('IHDR', new Uint8Array(13)),
    chunk('tEXt', new TextEncoder().encode('Author\u0000Mario Rossi')),
    chunk('IDAT', new Uint8Array([0])),
    chunk('IEND', new Uint8Array()),
  ])
}

function png(chunks: Uint8Array[]) {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return concat([signature, ...chunks])
}

function chunk(type: string, data: Uint8Array) {
  const result = new Uint8Array(12 + data.length)
  writeUint32(result, 0, data.length)
  for (let index = 0; index < 4; index += 1) result[4 + index] = type.charCodeAt(index)
  result.set(data, 8)
  // CRC deliberately zeroed: the privacy parser validates container structure, not image decoding.
  return result
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff
  target[offset + 1] = (value >>> 16) & 0xff
  target[offset + 2] = (value >>> 8) & 0xff
  target[offset + 3] = value & 0xff
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}
