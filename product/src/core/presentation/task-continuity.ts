export type KnowledgeTaskMode = 'prepare' | 'class'
export type ClassTaskEntryMode = 'prepare' | 'teach' | 'record'

type KnowledgeTaskHrefInput = {
  mode: KnowledgeTaskMode
  returnTo: string
  sectionId?: string | null
  blockId?: string | null
}

type KnowledgeTaskListHrefInput = KnowledgeTaskHrefInput & {
  classLabel?: string | null
  category?: string | null
  query?: string | null
}

type ClassTaskHrefInput = {
  mode: ClassTaskEntryMode
  blockId?: string | null
  returnTo: string
}

export function buildTaskAwareKnowledgeHref(assetId: string, input: KnowledgeTaskHrefInput) {
  const params = buildKnowledgeTaskParams(input)
  return `/knowledge/${encodeURIComponent(assetId)}?${params.toString()}`
}

export function buildTaskAwareKnowledgeListHref(input: KnowledgeTaskListHrefInput) {
  const params = buildKnowledgeTaskParams(input)
  if (input.classLabel) params.set('classLabel', input.classLabel)
  if (input.category) params.set('category', input.category)
  if (input.query) params.set('q', input.query)
  return `/knowledge?${params.toString()}`
}

export function buildTaskAwareClassHref(sectionId: string, input: ClassTaskHrefInput) {
  const classPath = `/classi/${encodeURIComponent(sectionId)}`
  const params = new URLSearchParams()
  params.set('mode', input.mode)
  params.set('returnTo', sanitizeInternalReturnTo(input.returnTo, classPath))
  if (isCanonicalBlockId(input.blockId)) params.set('block', input.blockId)
  return `${classPath}?${params.toString()}`
}

export function parseClassTaskEntry(
  input: { mode?: string | null; block?: string | null; returnTo?: string | null },
  fallbackReturnTo: string,
) {
  return {
    mode: asClassTaskEntryMode(input.mode),
    blockId: isCanonicalBlockId(input.block) ? input.block : null,
    returnTo: sanitizeInternalReturnTo(input.returnTo, fallbackReturnTo),
  }
}

export function asKnowledgeTaskMode(value?: string | null): KnowledgeTaskMode | null {
  return value === 'prepare' || value === 'class' ? value : null
}

export function asClassTaskEntryMode(value?: string | null): ClassTaskEntryMode | null {
  return value === 'prepare' || value === 'teach' || value === 'record' ? value : null
}

export function sanitizeInternalReturnTo(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const parsed = new URL(value, 'https://docente-os.local')
    if (parsed.origin !== 'https://docente-os.local') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

function buildKnowledgeTaskParams(input: KnowledgeTaskHrefInput) {
  const params = new URLSearchParams()
  params.set('mode', input.mode)
  params.set('returnTo', sanitizeInternalReturnTo(input.returnTo, '/knowledge'))
  if (input.sectionId) params.set('section', input.sectionId)
  if (input.blockId) params.set('block', input.blockId)
  return params
}

function isCanonicalBlockId(value?: string | null): value is string {
  return Boolean(value && /^B(?:0[1-9]|[12]\d|3[0-3])$/.test(value))
}
