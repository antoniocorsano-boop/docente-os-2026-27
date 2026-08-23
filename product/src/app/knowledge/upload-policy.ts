export const KNOWLEDGE_BUCKET = 'knowledge-assets'
export const MAX_KNOWLEDGE_UPLOAD_BYTES = 20 * 1024 * 1024
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const ALLOWED_KNOWLEDGE_UPLOAD_MIMES = [
  'application/pdf',
  DOCX_MIME,
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

const ALLOWED_MIMES = new Set<string>(ALLOWED_KNOWLEDGE_UPLOAD_MIMES)

export type KnowledgeUploadReference = {
  workspaceId: string
  objectPath: string
  originalName: string
  mimeType: string
  byteSize: number
}

export type KnowledgeUploadReferenceValidation =
  | { valid: true }
  | { valid: false; code: 'missing' | 'too_large' | 'unsupported' | 'invalid_path' }

export function normalizeKnowledgeUploadMime(rawMime: string, filename: string) {
  if (rawMime && ALLOWED_MIMES.has(rawMime)) return rawMime

  const extension = filename.toLowerCase().split('.').pop()
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'docx') return DOCX_MIME
  if (extension === 'md' || extension === 'markdown') return 'text/markdown'
  if (extension === 'txt') return 'text/plain'
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'webp') return 'image/webp'
  return rawMime || 'application/octet-stream'
}

export function sanitizeKnowledgeFilename(filename: string) {
  const normalized = filename.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const safe = normalized.replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '')
  return (safe || 'asset').slice(-160)
}

export function buildKnowledgeObjectPath(workspaceId: string, filename: string, objectId: string) {
  const cleanWorkspaceId = workspaceId.trim()
  const cleanObjectId = objectId.trim()
  if (!cleanWorkspaceId || !cleanObjectId) throw new Error('Workspace and object id are required')
  return `${cleanWorkspaceId}/${cleanObjectId}-${sanitizeKnowledgeFilename(filename)}`
}

export function validateKnowledgeUploadReference(input: KnowledgeUploadReference): KnowledgeUploadReferenceValidation {
  if (!input.originalName.trim() || !Number.isInteger(input.byteSize) || input.byteSize <= 0) {
    return { valid: false, code: 'missing' }
  }
  if (input.byteSize > MAX_KNOWLEDGE_UPLOAD_BYTES) return { valid: false, code: 'too_large' }
  if (!ALLOWED_MIMES.has(input.mimeType)) return { valid: false, code: 'unsupported' }

  const expectedPrefix = `${input.workspaceId.trim()}/`
  if (!input.workspaceId.trim() || !input.objectPath.startsWith(expectedPrefix)) {
    return { valid: false, code: 'invalid_path' }
  }

  const remainder = input.objectPath.slice(expectedPrefix.length)
  if (!remainder || remainder.includes('/') || remainder.includes('..')) {
    return { valid: false, code: 'invalid_path' }
  }

  return { valid: true }
}
