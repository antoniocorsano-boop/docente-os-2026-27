export const TEACHING_CONTEXT_SCHEMA = 'docente-os.teaching-context/v0.1' as const
export const ATLAS_MATERIAL_BUNDLE_SCHEMA = 'studio-atlas.material-bundle/v0.1' as const

export type TeachingContextSnapshot = {
  schema: typeof TEACHING_CONTEXT_SCHEMA
  source: 'docente-os'
  udaId: string
  udaTitle: string
  grade: 'prima' | 'seconda' | 'terza'
  sectionId?: string
  sectionLabel?: string
  discipline: string
  blockId?: string
  packId?: string
  period?: string
  returnUrl: string
}

export type AtlasMaterialType = 'presentation' | 'worksheet' | 'guide' | 'rubric'

export type AtlasMaterialBundle = {
  schema: typeof ATLAS_MATERIAL_BUNDLE_SCHEMA
  source: 'studio-atlas'
  bundleId: string
  sourceUdaId: string
  generatedAt: string
  items: Array<{
    materialId: string
    type: AtlasMaterialType
    title: string
    description: string
    previewRef?: string
    origin: 'atlas'
  }>
}

const MATERIAL_TYPES = new Set<AtlasMaterialType>(['presentation', 'worksheet', 'guide', 'rubric'])

export function encodeTeachingContext(context: TeachingContextSnapshot) {
  assertTeachingContext(context)
  return Buffer.from(JSON.stringify(context), 'utf8').toString('base64url')
}

export function buildStudioAtlasMaterialHref(origin: string, context: TeachingContextSnapshot) {
  const url = new URL('/materiali', origin)
  url.hash = `context=${encodeTeachingContext(context)}`
  return url.toString()
}

export function parseAtlasMaterialBundle(value: unknown): AtlasMaterialBundle {
  const input = asRecord(value, 'Atlas material bundle')
  if (input.schema !== ATLAS_MATERIAL_BUNDLE_SCHEMA || input.source !== 'studio-atlas') throw new Error('Unsupported Atlas material bundle')
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('Atlas material bundle is empty')

  const items = input.items.map((raw) => {
    const item = asRecord(raw, 'Atlas material item')
    const type = requiredString(item.type, 'type')
    if (!MATERIAL_TYPES.has(type as AtlasMaterialType)) throw new Error(`Unsupported Atlas material type: ${type}`)
    if (item.origin !== 'atlas') throw new Error('Invalid Atlas material origin')
    const parsed = {
      materialId: requiredString(item.materialId, 'materialId'),
      type: type as AtlasMaterialType,
      title: requiredString(item.title, 'title'),
      description: requiredString(item.description, 'description'),
      ...(optionalString(item.previewRef) ? { previewRef: optionalString(item.previewRef) } : {}),
      origin: 'atlas' as const,
    }
    return parsed
  })

  return {
    schema: ATLAS_MATERIAL_BUNDLE_SCHEMA,
    source: 'studio-atlas',
    bundleId: requiredString(input.bundleId, 'bundleId'),
    sourceUdaId: requiredString(input.sourceUdaId, 'sourceUdaId'),
    generatedAt: requiredString(input.generatedAt, 'generatedAt'),
    items,
  }
}

export function decodeAtlasMaterialBundle(encoded: string) {
  if (!encoded || encoded.length > 16_384) throw new Error('Invalid Atlas material envelope')
  try {
    return parseAtlasMaterialBundle(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')))
  } catch (error) {
    if (error instanceof Error && !error.message.startsWith('Unexpected')) throw error
    throw new Error('Malformed Atlas material envelope')
  }
}

function assertTeachingContext(value: TeachingContextSnapshot) {
  if (value.schema !== TEACHING_CONTEXT_SCHEMA || value.source !== 'docente-os') throw new Error('Unsupported teaching context')
  requiredString(value.udaId, 'udaId')
  requiredString(value.udaTitle, 'udaTitle')
  requiredString(value.discipline, 'discipline')
  if (!['prima', 'seconda', 'terza'].includes(value.grade)) throw new Error('Unsupported grade')
  const returnUrl = new URL(requiredString(value.returnUrl, 'returnUrl'))
  if (returnUrl.protocol !== 'https:' && returnUrl.hostname !== 'localhost') throw new Error('Unsafe returnUrl')
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}`)
  return value as Record<string, unknown>
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${label}`)
  return value.trim()
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
