import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildKnowledgeObjectPath,
  DOCX_MIME,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
  sanitizeKnowledgeFilename,
  validateKnowledgeUploadReference,
} from './upload-policy'

test('normalizes supported mime types from extension when the browser omits them', () => {
  assert.equal(normalizeKnowledgeUploadMime('', 'circolare.pdf'), 'application/pdf')
  assert.equal(normalizeKnowledgeUploadMime('', 'modello.docx'), DOCX_MIME)
  assert.equal(normalizeKnowledgeUploadMime('', 'foto.JPEG'), 'image/jpeg')
})

test('sanitizes filenames before building workspace-scoped storage paths', () => {
  assert.equal(sanitizeKnowledgeFilename('Presa di servizio — à.s. 2026.pdf'), 'Presa_di_servizio_a.s._2026.pdf')
  assert.equal(
    buildKnowledgeObjectPath('workspace-1', 'verbale scuola.pdf', 'object-1'),
    'workspace-1/object-1-verbale_scuola.pdf',
  )
})

test('accepts the documented 20 MB boundary and rejects larger files', () => {
  const base = {
    workspaceId: 'workspace-1',
    objectPath: 'workspace-1/object-1-file.pdf',
    originalName: 'file.pdf',
    mimeType: 'application/pdf',
  }

  assert.deepEqual(validateKnowledgeUploadReference({ ...base, byteSize: MAX_KNOWLEDGE_UPLOAD_BYTES }), { valid: true })
  assert.deepEqual(
    validateKnowledgeUploadReference({ ...base, byteSize: MAX_KNOWLEDGE_UPLOAD_BYTES + 1 }),
    { valid: false, code: 'too_large' },
  )
})

test('fails closed when the uploaded object is not scoped to the current workspace', () => {
  assert.deepEqual(validateKnowledgeUploadReference({
    workspaceId: 'workspace-1',
    objectPath: 'workspace-2/object-1-file.pdf',
    originalName: 'file.pdf',
    mimeType: 'application/pdf',
    byteSize: 100,
  }), { valid: false, code: 'invalid_path' })
})

test('rejects unsupported mime types even when the path is otherwise valid', () => {
  assert.deepEqual(validateKnowledgeUploadReference({
    workspaceId: 'workspace-1',
    objectPath: 'workspace-1/object-1-file.exe',
    originalName: 'file.exe',
    mimeType: 'application/octet-stream',
    byteSize: 100,
  }), { valid: false, code: 'unsupported' })
})
