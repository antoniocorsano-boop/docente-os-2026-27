import mammoth from 'mammoth'
import { getDocumentProxy } from 'unpdf'
import { DOCX_MIME, knowledgeUploadMimeFromExtension } from './upload-policy'

export type KnowledgeUploadContentValidation =
  | { valid: true }
  | { valid: false; code: 'extension_mismatch' | 'content_mismatch' }

type Input = {
  filename: string
  mimeType: string
  bytes: Uint8Array
}

export async function validateKnowledgeUploadContent(input: Input): Promise<KnowledgeUploadContentValidation> {
  const extensionMime = knowledgeUploadMimeFromExtension(input.filename)
  if (!extensionMime || extensionMime !== input.mimeType) {
    return { valid: false, code: 'extension_mismatch' }
  }

  try {
    switch (input.mimeType) {
      case 'application/pdf':
        return await validatePdf(input.bytes)
      case DOCX_MIME:
        return await validateDocx(input.bytes)
      case 'image/png':
        return hasPrefix(input.bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
          ? { valid: true }
          : { valid: false, code: 'content_mismatch' }
      case 'image/jpeg':
        return hasPrefix(input.bytes, [0xff, 0xd8, 0xff])
          ? { valid: true }
          : { valid: false, code: 'content_mismatch' }
      case 'image/webp':
        return isWebp(input.bytes)
          ? { valid: true }
          : { valid: false, code: 'content_mismatch' }
      case 'text/plain':
      case 'text/markdown':
        return isStrictUtf8Text(input.bytes)
          ? { valid: true }
          : { valid: false, code: 'content_mismatch' }
      default:
        return { valid: false, code: 'content_mismatch' }
    }
  } catch {
    return { valid: false, code: 'content_mismatch' }
  }
}

async function validatePdf(bytes: Uint8Array): Promise<KnowledgeUploadContentValidation> {
  if (!hasAsciiPrefix(bytes, '%PDF-') || !tailIncludes(bytes, '%%EOF')) {
    return { valid: false, code: 'content_mismatch' }
  }
  const document = await getDocumentProxy(bytes)
  try {
    if (!Number.isInteger(document.numPages) || document.numPages < 1) {
      return { valid: false, code: 'content_mismatch' }
    }
    return { valid: true }
  } finally {
    await document.destroy()
  }
}

async function validateDocx(bytes: Uint8Array): Promise<KnowledgeUploadContentValidation> {
  if (!isZip(bytes) || !asciiIncludes(bytes, '[Content_Types].xml') || !asciiIncludes(bytes, 'word/document.xml')) {
    return { valid: false, code: 'content_mismatch' }
  }
  await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
  return { valid: true }
}

function isStrictUtf8Text(bytes: Uint8Array) {
  if (!bytes.length || bytes.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

function isZip(bytes: Uint8Array) {
  return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])
}

function isWebp(bytes: Uint8Array) {
  return bytes.length >= 12
    && hasAsciiPrefix(bytes, 'RIFF')
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return bytes.length >= prefix.length && prefix.every((value, index) => bytes[index] === value)
}

function hasAsciiPrefix(bytes: Uint8Array, prefix: string) {
  if (bytes.length < prefix.length) return false
  for (let index = 0; index < prefix.length; index += 1) {
    if (bytes[index] !== prefix.charCodeAt(index)) return false
  }
  return true
}

function asciiIncludes(bytes: Uint8Array, needle: string) {
  return Buffer.from(bytes).includes(Buffer.from(needle, 'ascii'))
}

function tailIncludes(bytes: Uint8Array, needle: string) {
  const tail = bytes.slice(Math.max(0, bytes.length - 2048))
  return asciiIncludes(tail, needle)
}
