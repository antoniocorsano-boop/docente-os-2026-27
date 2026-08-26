import mammoth from 'mammoth'
import { inspectFreeTextForPilot } from './anonymization-guard'

export const MAX_LOCAL_DOCX_MEDIA_ITEMS = 8
export const MAX_LOCAL_DOCX_MEDIA_BYTES = 8 * 1024 * 1024
export const MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES = 4 * 1024 * 1024

const ALLOWED_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MEDIA_MARKER = new TextEncoder().encode('word/media/')

export type LocalDocxMediaPart = {
  index: number
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
  bytes: ArrayBuffer
}

export type LocalDocxSemanticPreflightResult =
  | {
      allowed: true
      mode: 'DOCX_TEXT_ONLY' | 'DOCX_REFERENCED_MEDIA_SEMANTIC_REVIEWABLE'
      text: string
      textRequiresPrivacyReview: boolean
      media: LocalDocxMediaPart[]
      totalMediaBytes: number
      messages: string[]
    }
  | {
      allowed: false
      code: 'privacy_preflight_unavailable' | 'privacy_preflight_failed'
      reason: string
    }

export async function inspectDocxForLocalSemanticDerivative(bytes: Uint8Array): Promise<LocalDocxSemanticPreflightResult> {
  if (!bytes.length) return failed('DOCX vuoto o illeggibile.')

  const arrayBuffer = bytes.slice().buffer
  const containsMedia = containsSequence(bytes, MEDIA_MARKER)
  const media: LocalDocxMediaPart[] = []
  let totalMediaBytes = 0
  let blockedReason: string | null = null

  try {
    const textResult = await mammoth.extractRawText({ arrayBuffer })
    const text = normalizeText(textResult.value)

    const imageConverter = mammoth.images.imgElement(async (image) => {
      if (blockedReason) return { src: 'about:blank' }

      const contentType = image.contentType.toLowerCase()
      if (!ALLOWED_MEDIA_TYPES.has(contentType)) {
        blockedReason = `Il DOCX contiene un media non ammesso nel derivato locale: ${contentType || 'tipo sconosciuto'}.`
        return { src: 'about:blank' }
      }

      const raw = await image.readAsArrayBuffer()
      if (raw.byteLength > MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES) {
        blockedReason = 'Una delle immagini incorporate supera il limite locale di 4 MB.'
        return { src: 'about:blank' }
      }
      if (media.length >= MAX_LOCAL_DOCX_MEDIA_ITEMS) {
        blockedReason = `Il DOCX contiene più di ${MAX_LOCAL_DOCX_MEDIA_ITEMS} immagini referenziate.`
        return { src: 'about:blank' }
      }
      if (totalMediaBytes + raw.byteLength > MAX_LOCAL_DOCX_MEDIA_BYTES) {
        blockedReason = 'Le immagini incorporate superano il budget locale complessivo di 8 MB.'
        return { src: 'about:blank' }
      }

      const itemBytes = raw.slice(0)
      totalMediaBytes += itemBytes.byteLength
      const index = media.length
      media.push({
        index,
        contentType: contentType as LocalDocxMediaPart['contentType'],
        bytes: itemBytes,
      })

      return { src: `docente-local-media:${index}` }
    })

    const htmlResult = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: imageConverter,
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
      },
    )

    if (blockedReason) return unavailable(blockedReason)
    if (htmlResult.messages.some((message) => message.type === 'error')) {
      return failed('Mammoth ha segnalato un errore durante l’ispezione locale del DOCX.')
    }

    if (!containsMedia) {
      return {
        allowed: true,
        mode: 'DOCX_TEXT_ONLY',
        text,
        textRequiresPrivacyReview: text.length > 0 && !inspectFreeTextForPilot(text).allowed,
        media: [],
        totalMediaBytes: 0,
        messages: [...textResult.messages, ...htmlResult.messages].map((message) => message.message),
      }
    }

    if (!media.length) {
      return unavailable('Il DOCX dichiara media incorporati ma nessuna immagine referenziata può essere estratta localmente in modo verificabile.')
    }

    return {
      allowed: true,
      mode: 'DOCX_REFERENCED_MEDIA_SEMANTIC_REVIEWABLE',
      text,
      textRequiresPrivacyReview: text.length > 0 && !inspectFreeTextForPilot(text).allowed,
      media,
      totalMediaBytes,
      messages: [...textResult.messages, ...htmlResult.messages].map((message) => message.message),
    }
  } catch (error) {
    console.error('Local DOCX media semantic preflight failed', error)
    return failed('Il DOCX non può essere ispezionato localmente in modo affidabile.')
  }
}

function containsSequence(bytes: Uint8Array, needle: Uint8Array) {
  if (!needle.length || bytes.length < needle.length) return false
  outer: for (let offset = 0; offset <= bytes.length - needle.length; offset += 1) {
    for (let index = 0; index < needle.length; index += 1) {
      if (bytes[offset + index] !== needle[index]) continue outer
    }
    return true
  }
  return false
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function unavailable(reason: string): LocalDocxSemanticPreflightResult {
  return { allowed: false, code: 'privacy_preflight_unavailable', reason }
}

function failed(reason: string): LocalDocxSemanticPreflightResult {
  return { allowed: false, code: 'privacy_preflight_failed', reason }
}
