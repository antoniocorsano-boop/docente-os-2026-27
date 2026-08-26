import JSZip from 'jszip'
import mammoth from 'mammoth'
import { inspectFreeTextForPilot } from './anonymization-guard'

export const MAX_LOCAL_DOCX_MEDIA_ITEMS = 8
export const MAX_LOCAL_DOCX_MEDIA_BYTES = 8 * 1024 * 1024
export const MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES = 4 * 1024 * 1024
const MAX_CONTENT_TYPES_BYTES = 256 * 1024

const ALLOWED_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const CENTRAL_FILE_HEADER = 0x02014b50
const EOCD_SIGNATURE = 0x06054b50

type AllowedMediaType = 'image/png' | 'image/jpeg' | 'image/webp'

type AuditedPackageMedia = {
  name: string
  contentType: AllowedMediaType
  bytes: Uint8Array
}

export type LocalDocxMediaPart = {
  index: number
  contentType: AllowedMediaType
  bytes: ArrayBuffer
}

export type LocalDocxPackageMediaAuditResult =
  | {
      allowed: true
      mediaCount: number
      totalMediaBytes: number
      media: AuditedPackageMedia[]
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
    const rawDirectory = inspectRawZipCentralDirectory(bytes)
    if (!rawDirectory.allowed) return blockedPackage(rawDirectory.reason)

    const rawMediaNames = rawDirectory.names.filter(isStrictWordMediaPart)
    if (rawMediaNames.length > MAX_LOCAL_DOCX_MEDIA_ITEMS) {
      return blockedPackage(`Il DOCX contiene più di ${MAX_LOCAL_DOCX_MEDIA_ITEMS} media incorporati nel pacchetto.`)
    }

    const zip = await JSZip.loadAsync(bytes)
    const manifestEntry = zip.file('[Content_Types].xml')
    if (!manifestEntry) return blockedPackage('Il DOCX non contiene il manifest OPC [Content_Types].xml.')

    const manifestBytes = await manifestEntry.async('uint8array')
    if (!manifestBytes.length || manifestBytes.byteLength > MAX_CONTENT_TYPES_BYTES) {
      return blockedPackage('Il manifest OPC dei tipi di contenuto non ha una dimensione ammessa o verificabile.')
    }
    const contentTypes = parseOpcContentTypes(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes))
    if (!contentTypes.allowed) return blockedPackage(contentTypes.reason)

    const packageMedia = Object.values(zip.files).filter((entry) => !entry.dir && isStrictWordMediaPart(entry.name))
    if (packageMedia.length !== rawMediaNames.length) {
      return blockedPackage('La vista ZIP del DOCX non coincide con la directory centrale grezza; il pacchetto resta bloccato.')
    }

    const rawSet = new Set(rawMediaNames)
    if (packageMedia.some((entry) => !rawSet.has(entry.name))) {
      return blockedPackage('I nomi dei media DOCX non coincidono tra directory ZIP e contenitore estratto.')
    }

    let declaredTotalBytes = 0
    const auditedEntries: Array<{ entry: (typeof packageMedia)[number]; contentType: AllowedMediaType; declaredSize: number }> = []

    for (const entry of packageMedia) {
      const contentType = resolveOpcContentType(entry.name, contentTypes.defaults, contentTypes.overrides)
      if (!contentType || !ALLOWED_MEDIA_TYPES.has(contentType)) {
        return blockedPackage(`Il DOCX contiene un media con tipo OPC non ammesso o non dichiarato: ${entry.name}. Sono ammessi solo PNG, JPEG e WebP.`)
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

      auditedEntries.push({ entry, contentType: contentType as AllowedMediaType, declaredSize })
    }

    let actualTotalBytes = 0
    const auditedMedia: AuditedPackageMedia[] = []
    for (const { entry, contentType, declaredSize } of auditedEntries) {
      const mediaBytes = await entry.async('uint8array')
      if (mediaBytes.byteLength !== declaredSize) {
        return blockedPackage(`La dimensione dichiarata del media ${entry.name} non coincide con i byte estratti.`)
      }
      if (!hasExpectedMediaSignature(mediaBytes, contentType)) {
        return blockedPackage(`Il media ${entry.name} non corrisponde al tipo OPC dichiarato e resta bloccato.`)
      }
      actualTotalBytes += mediaBytes.byteLength
      if (actualTotalBytes > MAX_LOCAL_DOCX_MEDIA_BYTES) {
        return blockedPackage('I media incorporati nel pacchetto superano il budget locale complessivo di 8 MB.')
      }
      auditedMedia.push({ name: entry.name, contentType, bytes: mediaBytes })
    }

    return { allowed: true, mediaCount: packageMedia.length, totalMediaBytes: actualTotalBytes, media: auditedMedia }
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

      const contentType = normalizeAllowedMediaType(image.contentType)
      if (!contentType) {
        blockedReason = `Il DOCX contiene un media referenziato non ammesso nel derivato locale: ${image.contentType || 'tipo sconosciuto'}.`
        return { src: 'about:blank' }
      }

      const raw = await image.readAsArrayBuffer()
      if (raw.byteLength > MAX_LOCAL_DOCX_MEDIA_ITEM_BYTES) {
        blockedReason = 'Una delle immagini referenziate supera il limite locale di 4 MB.'
        return { src: 'about:blank' }
      }
      if (media.length >= MAX_LOCAL_DOCX_MEDIA_ITEMS * 4) {
        blockedReason = 'Il DOCX contiene un numero anomalo di riferimenti a immagini e resta bloccato.'
        return { src: 'about:blank' }
      }
      if (referencedMediaBytes + raw.byteLength > MAX_LOCAL_DOCX_MEDIA_BYTES * 4) {
        blockedReason = 'I riferimenti alle immagini superano il budget locale di ispezione e restano bloccati.'
        return { src: 'about:blank' }
      }

      const itemBytes = raw.slice(0)
      if (!hasExpectedMediaSignature(new Uint8Array(itemBytes), contentType)) {
        blockedReason = 'Una delle immagini referenziate non corrisponde al formato dichiarato.'
        return { src: 'about:blank' }
      }

      referencedMediaBytes += itemBytes.byteLength
      const index = media.length
      media.push({ index, contentType, bytes: itemBytes })
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
    if (!allPackageMediaSurfaced(packageAudit.media, media)) {
      return unavailable('Il DOCX contiene almeno un media incorporato che non viene esposto integralmente alla revisione visuale locale.')
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

function inspectRawZipCentralDirectory(bytes: Uint8Array): { allowed: true; names: string[] } | { allowed: false; reason: string } {
  const eocdOffset = findEocd(bytes)
  if (eocdOffset < 0) return { allowed: false, reason: 'La directory centrale ZIP del DOCX non è verificabile.' }

  const disk = readLe16(bytes, eocdOffset + 4)
  const centralDisk = readLe16(bytes, eocdOffset + 6)
  const entriesOnDisk = readLe16(bytes, eocdOffset + 8)
  const entriesTotal = readLe16(bytes, eocdOffset + 10)
  const centralSize = readLe32(bytes, eocdOffset + 12)
  const centralOffset = readLe32(bytes, eocdOffset + 16)
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entriesTotal) return { allowed: false, reason: 'Archivi ZIP multi-volume non sono ammessi nel preflight DOCX.' }
  if (entriesTotal === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) return { allowed: false, reason: 'ZIP64 non è ammesso nel preflight DOCX locale.' }
  if (centralOffset + centralSize > eocdOffset || centralOffset + centralSize > bytes.length) return { allowed: false, reason: 'La directory centrale ZIP ha limiti incoerenti.' }

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const names: string[] = []
  const exact = new Set<string>()
  const folded = new Set<string>()
  let offset = centralOffset

  try {
    for (let index = 0; index < entriesTotal; index += 1) {
      if (offset + 46 > bytes.length || readLe32(bytes, offset) !== CENTRAL_FILE_HEADER) return { allowed: false, reason: 'Una entry della directory centrale ZIP non è valida.' }
      const flags = readLe16(bytes, offset + 8)
      const fileNameLength = readLe16(bytes, offset + 28)
      const extraLength = readLe16(bytes, offset + 30)
      const commentLength = readLe16(bytes, offset + 32)
      const next = offset + 46 + fileNameLength + extraLength + commentLength
      if (next > centralOffset + centralSize || next > bytes.length) return { allowed: false, reason: 'Una entry ZIP supera i limiti della directory centrale.' }
      if ((flags & 0x0001) !== 0) return { allowed: false, reason: 'Entry ZIP cifrate non sono ammesse nel preflight DOCX.' }

      const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength))
      if (!isSafeZipPartName(name)) return { allowed: false, reason: `Il pacchetto DOCX contiene un nome di parte ZIP non sicuro o ambiguo: ${name || '(vuoto)'}.` }
      if (exact.has(name) || folded.has(name.toLowerCase())) return { allowed: false, reason: `Il pacchetto DOCX contiene nomi di parte ZIP duplicati o ambigui: ${name}.` }
      exact.add(name)
      folded.add(name.toLowerCase())
      names.push(name)
      offset = next
    }
  } catch {
    return { allowed: false, reason: 'I nomi delle parti ZIP non sono codificati in modo verificabile.' }
  }

  if (offset !== centralOffset + centralSize) return { allowed: false, reason: 'La directory centrale ZIP contiene dati non contabilizzati.' }
  return { allowed: true, names }
}

function parseOpcContentTypes(xml: string): { allowed: true; defaults: Map<string, string>; overrides: Map<string, string> } | { allowed: false; reason: string } {
  if (!/<Types\b[^>]*xmlns=["']http:\/\/schemas\.openxmlformats\.org\/package\/2006\/content-types["'][^>]*>/i.test(xml)) {
    return { allowed: false, reason: 'Il manifest OPC dei tipi di contenuto ha namespace o radice non validi.' }
  }

  const defaults = new Map<string, string>()
  const overrides = new Map<string, string>()
  for (const match of xml.matchAll(/<(Default|Override)\b([^>]*)\/?\s*>/gi)) {
    const kind = match[1].toLowerCase()
    const attrs = parseXmlAttributes(match[2])
    if (!attrs) return { allowed: false, reason: 'Il manifest OPC contiene attributi non verificabili.' }
    const contentType = attrs.get('contenttype')?.trim().toLowerCase()
    if (!contentType) return { allowed: false, reason: 'Il manifest OPC contiene una dichiarazione senza ContentType.' }

    if (kind === 'default') {
      const extension = attrs.get('extension')?.trim().toLowerCase()
      if (!extension || extension.includes('/') || extension.includes('\\')) return { allowed: false, reason: 'Il manifest OPC contiene una estensione Default non valida.' }
      const previous = defaults.get(extension)
      if (previous && previous !== contentType) return { allowed: false, reason: `Il manifest OPC contiene Default confliggenti per .${extension}.` }
      defaults.set(extension, contentType)
    } else {
      const partName = attrs.get('partname')
      if (!partName || !partName.startsWith('/') || partName.includes('\\') || hasDotSegments(partName)) return { allowed: false, reason: 'Il manifest OPC contiene un Override con PartName non valido.' }
      const normalized = partName.slice(1)
      const key = normalized.toLowerCase()
      const previous = overrides.get(key)
      if (previous && previous !== contentType) return { allowed: false, reason: `Il manifest OPC contiene Override confliggenti per ${partName}.` }
      overrides.set(key, contentType)
    }
  }
  return { allowed: true, defaults, overrides }
}

function resolveOpcContentType(name: string, defaults: Map<string, string>, overrides: Map<string, string>) {
  const override = overrides.get(name.toLowerCase())
  if (override) return override
  const finalSegment = name.split('/').at(-1) ?? ''
  const dot = finalSegment.lastIndexOf('.')
  if (dot <= 0 || dot === finalSegment.length - 1) return null
  return defaults.get(finalSegment.slice(dot + 1).toLowerCase()) ?? null
}

function parseXmlAttributes(fragment: string) {
  const result = new Map<string, string>()
  let consumed = ''
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/gs
  for (const match of fragment.matchAll(pattern)) {
    consumed += match[0]
    const key = match[1].toLowerCase()
    if (result.has(key)) return null
    result.set(key, decodeXmlAttribute(match[3]))
  }
  const residue = fragment.replace(pattern, '').replace(/[\s/]/g, '')
  if (residue) return null
  return result
}

function decodeXmlAttribute(value: string) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function allPackageMediaSurfaced(packageMedia: AuditedPackageMedia[], surfaced: LocalDocxMediaPart[]) {
  return packageMedia.every((packaged) => surfaced.some((item) => item.contentType === packaged.contentType && bytesEqual(packaged.bytes, new Uint8Array(item.bytes))))
}

function bytesEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false
  for (let index = 0; index < left.byteLength; index += 1) if (left[index] !== right[index]) return false
  return true
}

function normalizeAllowedMediaType(value: string): AllowedMediaType | null {
  const normalized = value.trim().toLowerCase()
  return ALLOWED_MEDIA_TYPES.has(normalized) ? normalized as AllowedMediaType : null
}

function isStrictWordMediaPart(name: string) {
  return name.startsWith('word/media/') && name.length > 'word/media/'.length && !name.endsWith('/')
}

function isSafeZipPartName(name: string) {
  return Boolean(name)
    && !name.includes('\\')
    && !name.includes('\u0000')
    && !name.startsWith('/')
    && !name.includes('//')
    && !hasDotSegments(name)
}

function hasDotSegments(name: string) {
  return name.split('/').some((segment) => segment === '.' || segment === '..')
}

function findEocd(bytes: Uint8Array) {
  const minOffset = Math.max(0, bytes.length - 0xffff - 22)
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readLe32(bytes, offset) !== EOCD_SIGNATURE) continue
    const commentLength = readLe16(bytes, offset + 20)
    if (offset + 22 + commentLength === bytes.length) return offset
  }
  return -1
}

function readLe16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readLe32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function hasExpectedMediaSignature(bytes: Uint8Array, contentType: AllowedMediaType) {
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
