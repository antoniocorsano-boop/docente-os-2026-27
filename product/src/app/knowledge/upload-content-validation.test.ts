import assert from 'node:assert/strict'
import test from 'node:test'
import { DOCX_MIME } from './upload-policy'
import { validateKnowledgeUploadContent } from './upload-content-validation'

const utf8 = (value: string) => new TextEncoder().encode(value)

test('accepts strict UTF-8 text when extension and MIME agree', async () => {
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'nota.txt',
    mimeType: 'text/plain',
    bytes: utf8('Testo professionale valido in UTF-8.'),
  }), { valid: true })
})

test('rejects extension and MIME mismatch before content parsing', async () => {
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'documento.pdf',
    mimeType: 'image/jpeg',
    bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
  }), { valid: false, code: 'extension_mismatch' })
})

test('rejects binary content disguised as plain text', async () => {
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'nota.txt',
    mimeType: 'text/plain',
    bytes: new Uint8Array([0x41, 0x00, 0x42]),
  }), { valid: false, code: 'content_mismatch' })
})

test('rejects a PNG filename/MIME with non-PNG bytes', async () => {
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'foto.png',
    mimeType: 'image/png',
    bytes: utf8('not a png'),
  }), { valid: false, code: 'content_mismatch' })
})

test('accepts canonical PNG signature', async () => {
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'foto.png',
    mimeType: 'image/png',
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  }), { valid: true })
})

test('rejects a fake PDF even when magic header and EOF marker are present', async () => {
  const fakePdf = utf8('%PDF-1.7\nThis is not a valid PDF structure.\n%%EOF')
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'falso.pdf',
    mimeType: 'application/pdf',
    bytes: fakePdf,
  }), { valid: false, code: 'content_mismatch' })
})

test('rejects a fake DOCX that only imitates ZIP and Word entry names', async () => {
  const fakeDocx = new Uint8Array([
    0x50, 0x4b, 0x03, 0x04,
    ...utf8('[Content_Types].xml word/document.xml'),
  ])
  assert.deepEqual(await validateKnowledgeUploadContent({
    filename: 'falso.docx',
    mimeType: DOCX_MIME,
    bytes: fakeDocx,
  }), { valid: false, code: 'content_mismatch' })
})
