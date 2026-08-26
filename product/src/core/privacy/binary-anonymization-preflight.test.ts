import assert from 'node:assert/strict'
import test from 'node:test'
import { docxContainsEmbeddedMedia, inspectBinaryForAnonymousPilot } from './binary-anonymization-preflight'
import {
  REQUIRED_LOCAL_VISUAL_CAPABILITIES,
  type LocalVisualPrivacyInspector,
} from './local-visual-privacy-preflight'

const cleanVisualInspector: LocalVisualPrivacyInspector = {
  execution: 'LOCAL',
  externalNetworkAccess: false,
  capabilities: REQUIRED_LOCAL_VISUAL_CAPABILITIES,
  async inspect() {
    return { status: 'PASS', extractedText: 'Schema didattico anonimo', inspectedRegions: 3, signals: [] }
  },
}

test('blocks images when local visual preflight engine is not connected', async () => {
  const result = await inspectBinaryForAnonymousPilot({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_preflight_unavailable')
})

test('rejects a local visual inspector with incomplete privacy coverage', async () => {
  const incompleteInspector: LocalVisualPrivacyInspector = {
    execution: 'LOCAL',
    externalNetworkAccess: false,
    capabilities: ['OCR_TEXT'],
    async inspect() {
      return { status: 'PASS', extractedText: '', inspectedRegions: 1, signals: [] }
    },
  }
  const result = await inspectBinaryForAnonymousPilot({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/png',
    visualInspector: incompleteInspector,
  })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_preflight_unavailable')
})

test('accepts only the fully covered local visual preflight contract', async () => {
  const result = await inspectBinaryForAnonymousPilot({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/png',
    visualInspector: cleanVisualInspector,
  })
  assert.equal(result.allowed, true)
  if (!result.allowed) return
  assert.equal(result.mode, 'LOCAL_VISUAL_PREFLIGHT')
  assert.equal(result.inspectedRegions, 3)
})

test('reuses the D0-D1 text guard on text extracted by local visual preflight', async () => {
  const inspector: LocalVisualPrivacyInspector = {
    ...cleanVisualInspector,
    async inspect() {
      return { status: 'PASS', extractedText: 'Contatto: mario.rossi@example.com', inspectedRegions: 2, signals: [] }
    },
  }
  const result = await inspectBinaryForAnonymousPilot({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/jpeg',
    visualInspector: inspector,
  })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_blocked')
})

test('blocks non-text visual privacy signals even when extracted text is anonymous', async () => {
  const inspector: LocalVisualPrivacyInspector = {
    ...cleanVisualInspector,
    async inspect() {
      return { status: 'PASS', extractedText: 'Materiale didattico', inspectedRegions: 4, signals: ['FACE_LIKENESS'] }
    },
  }
  const result = await inspectBinaryForAnonymousPilot({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'image/webp',
    visualInspector: inspector,
  })
  assert.equal(result.allowed, false)
  if (result.allowed) return
  assert.equal(result.code, 'privacy_blocked')
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
