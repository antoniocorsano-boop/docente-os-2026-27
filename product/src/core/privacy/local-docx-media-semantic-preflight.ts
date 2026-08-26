import JSZip from 'jszip'
import mammoth from 'mammoth'
import { inspectFreeTextForPilot } from './anonymization-guard'

export const MAX_LOCAL_DOCX_MEDIA_ITEMS = 8
export const MAX_LOCAL_DOCX_MEDIA_BYTES = 8 * 1024 * 1024
export const MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES = 4 * 1024 * 1024

const ALLOWED_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export type LocalDocxMediaPart = {
  index: number
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
  bytes: ArrayBuffer
}

export type LocalDocxPackageMediaAuditResult =
  | {
      allowed: true
      mediaCount: number
      totalMediaBytes: number
    }
  | {
      allowed: false
      reason: string
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

export async function auditDocxPackageMedia(bytes: Uint8Array): Promise<LocalDocxPackageMediaAuditResult> {
  try {
    const zip = await JSZip.loadAsync(bytes)
    const packageMedia = Object.values(zip.files).filter((entry) => {
      const normalizedName = entry.name.replaceAll('\\', '/').toLowerCase()
      return !entry.dir && normalizedName.startsWith('word/media/')
    })

    if (packageMedia.length > MAX_LOCAL_DOCX_MEDIA_ITEMS) {
      return blockedPackage(`Il DOCX contiene più di ${MAX_LOCAL_DOCX_MEDIA_ITEMS} media incorporati nel pacchetto.`)
    }

    let declaredTotalBytes = 0
    const auditedEntries: Array<{ entry: (typeof packageMedia)[number]; contentType: LocalDocxMediaPart['contentType']; declaredSize: number }> = []

    for (const entry of packageMedia) {
      const contentType = contentTypeFromPackageName(entry.name)
      if (!contentType || !ALLOWED_MEDIA_TYPES.has(contentType)) {
        return blockedPackage(`Il DOCX contiene un media non ammesso nel pacchetto: ${entry.name}. Sono ammessi solo PNG, JPEG e WebP.`)
      }

      const declaredSize = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
      if (!Number.isSafeInteger(declaredSize) || declaredSize == null || declaredSize < 0) {
        return blockedPackage(`La dimensione del media ${entry.name} non è verificabile in modo affidabile.`)
      }
      if (declaredSize > MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES) {
        return blockedPackage('Una delle immagini incorporate supera il limite locale di 4 MB.')
      }

      declaredTotalBytes += declaredSize
      if (declaredTotalBytes > MAX_LOCAL_DOCX_MEDIA_BYTES) {
        return blockedPackage('I media incorporati nel pacchetto superano il budget locale complessivo di 8 MB.')
      }

      auditedEntries.push({ entry, contentType, declaredSize })
    }

    let actualTotalBytes = 0
    for (const { entry, contentType, declaredSize } of auditedEntries) {
      const mediaBytes = await entry.async('uint8array')
      if (mediaBytes.byteLength !== declaredSize) {
        return blockedPackage(`La dimensione dichiarata del media ${entry.name} non coincide con i byte estratti.`)
      }
      if (!hasExpectedMediaSignature(mediaBytes, contentType)) {
        return blockedPackage(`Il media ${entry.name} non corrisponde al formato dichiarato e resta bloccato.`)
      }
      actualTotalBytes += mediaBytes.byteLength
      if (actualTotalBytes > MAX_LOCAL_DOCX_MEDIA_BYTES) {
        return blockedPackage('I media incorporati nel pacchetto superano il budget locale complessivo di 8 MB.')
      }
    }

    return { allowed: true, mediaCount: packageMedia.length, totalMediaBytes: actualTotalBytes }
  } catch (error) {
    console.error('Local DOCX package media audit failed', error)
    return blockedPackage('Il pacchetto DOCX non può essere enumerato localmente in modo affidabile.')
  }
}

export async function inspectDocxForLocalSemanticDerivative(bytes: Uint8Array): Promise<LocalDocxSemanticPreflightResult> {
  if (!bytes.length) return failed('DOCX vuoto o illeggibile.')

  const packageAudit = await auditDocxPackageMedia(bytes)
  if (!packageAudit.allowed) return unavailable(packageAudit.reason)

  const arrayBuffer = bytes.slice().buffer
  const containsMedia = packageAudit.mediaCount > 0
  const media: LocalDocxMediaPart[] = []
  let referencedMediaBytes = 0
  let blockedReason: string | null = null

  try {
    const textResult = await mammoth.extractRawText({ arrayBuffer })
    const text = normalizeText(textResult.value)

    const imageConverter = mammoth.images.imgElement(async (image) => {
      if (blockedReason) return { src: 'about:blank' }

      const contentType = image.contentType.toLowerCase()
      if (!ALLOWED_MEDIA_TYPES.has(contentType)) {
        blockedReason = `Il DOCX contiene un media referenziato non ammesso nel derivato locale: ${contentType || 'tipo sconosciuto'}.`
        return { src: 'about:blank' }
      }

      const raw = await image.readAsArrayBuffer()
      if (raw.byteLength > MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES) {
        blockedReason = 'Una delle immagini referenziate supera il limite locale di 4 MB.'
        return { src: 'about:blank' }
      }
      if (media.length >= MAX_LOCAL_DOCX_MEDIA_ITEMS) {
        blockedReason = `Il DOCX contiene più di ${MAX_LOCAL_DOCX_MEDIA_ITEMS} immagini referenziate.`
        return { src: 'about:blank' }
      }
      if (referencedMediaBytes + raw.byteLength > MAX_LOCAL_DOCX_MEDIA_BYTES) {
        blockedReason = 'Le immagini referenziate superano il budget locale complessivo di 8 MB.'
        return { src: 'about:blank' }
      }

      const itemBytes = raw.slice(0)
      if (!hasExpectedMediaSignature(new Uint8Array(itemBytes), contentType as LocalDocxMediaPart['contentType'])) {
        blockedReason = 'Una delle immagini referenziate non corrisponde al formato dichiarato.'
        return { src: 'about:blank' }
      }

      referencedMediaBytes += itemBytes.byteLength
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
      return unavailable('Il DOCX contiene media nel pacchetto ma nessuna immagine referenziata può essere estratta localmente in modo verificabile.')
    }

    return {
      allowed: true,
      mode: 'DOCX_REFERENCED_MEDIA_SEMANTIC_REVIEWABLE',
      text,
      textRequiresPrivacyReview: text.length > 0 && !inspectFreeTextForPilot(text).allowed,
      media,
      totalMediaBytes: packageAudit.totalMediaBytes,
      messages: [...textResult.messages, ...htmlResult.messages].map((message) => message.message),
    }
  } catch (error) {
    console.error('Local DOCX media semantic preflight failed', error)
    return failed('Il DOCX non può essere ispezionato localmente in modo affidabile.')
  }
}

function contentTypeFromPackageName(name: string): LocalDocxMediaPart['contentType'] | null {
  const normalized = name.toLowerCase()
  if (normalized.endsWith('.png')) return 'image/png'
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg'
  if (normalized.endsWith('.webp')) return 'image/webp'
  return null
}

function hasExpectedMediaSignature(bytes: Uint8Array, contentType: LocalDocxMediaPart['contentType']) {
  if (contentType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value)
  }
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function blockedPackage(reason: string): LocalDocxPackageMediaAuditResult {
  return { allowed: false, reason }
}

function unavailable(reason: string): LocalDocxSemanticPreflightResult {
  return { allowed: false, code: 'privacy_preflight_unavailable', reason }
}

function failed(reason: string): LocalDocxSemanticPreflightResult {
  return { allowed: false, code: 'privacy_preflight_failed', reason }
}
