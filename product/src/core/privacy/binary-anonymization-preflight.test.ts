import assert from 'node:assert/strict'
import test from 'node:test'
import { docxContainsEmbeddedMedia, inspectBinaryForAnonymousPilot } from './binary-anonymization-preflight'

test('blocks images when local visual preflight is unavailable', async () => {
  const result = await inspectBinaryForAnonymousPilot({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_preflight_unavailable')
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
