import { buildLessonWorkspaceHref } from './human-task-runtime'
import { buildTaskAwareClassHref, parseClassTaskEntry, sanitizeInternalReturnTo, type ClassTaskEntryMode } from './task-continuity'
import type {
  CompositionAction,
  IntelligentSurface,
  RegisteredActionId,
  SemanticBlockId,
} from './intelligent-ui-contract'
import type { ExperienceMode } from './human-task-model'

const ALL_MODES: readonly ExperienceMode[] = ['EXPLORE', 'GUIDED', 'FOCUSED']
const CANONICAL_BLOCK_ID = /^B(?:0[1-9]|[12]\d|3[0-3])$/

export const INTELLIGENT_UI_BLOCK_CATALOG: Record<SemanticBlockId, {
  surface: IntelligentSurface
  modes: readonly ExperienceMode[]
}> = {
  TASK_FOCUS: { surface: 'HOME', modes: ALL_MODES },
  LESSON_FOCUS: { surface: 'CLASS', modes: ALL_MODES },
}

export const INTELLIGENT_UI_ACTION_IDS = [
  'HOME_OPEN_PLANNER',
  'HOME_OPEN_TIMETABLE',
  'HOME_OPEN_CLASS',
  'HOME_OPEN_LESSON',
  'HOME_SHOW_ALL',
  'CLASS_OPEN_MODELED_LESSON',
  'CLASS_OPEN_INLINE_RECORDER',
  'CLASS_OPEN_COMPLETION',
  'CLASS_OPEN_PLANNING',
  'CLASS_SHOW_ALL',
] as const satisfies readonly RegisteredActionId[]

const ACTION_SURFACES: Record<RegisteredActionId, IntelligentSurface> = {
  HOME_OPEN_PLANNER: 'HOME',
  HOME_OPEN_TIMETABLE: 'HOME',
  HOME_OPEN_CLASS: 'HOME',
  HOME_OPEN_LESSON: 'HOME',
  HOME_SHOW_ALL: 'HOME',
  CLASS_OPEN_MODELED_LESSON: 'CLASS',
  CLASS_OPEN_INLINE_RECORDER: 'CLASS',
  CLASS_OPEN_COMPLETION: 'CLASS',
  CLASS_OPEN_PLANNING: 'CLASS',
  CLASS_SHOW_ALL: 'CLASS',
}

export type RegisteredActionDescriptor =
  | { id: 'HOME_OPEN_PLANNER'; label: string }
  | { id: 'HOME_OPEN_TIMETABLE'; label: string }
  | { id: 'HOME_OPEN_CLASS'; label: string; sectionId: string; mode: ClassTaskEntryMode; blockId?: string | null; returnTo: string }
  | { id: 'HOME_OPEN_LESSON'; label: string; sectionId: string; blockId: string; mode: 'prepare' | 'teach' | 'observe' | 'record' }
  | { id: 'HOME_SHOW_ALL'; label: string }
  | { id: 'CLASS_OPEN_MODELED_LESSON'; label: string; sectionId: string; blockId: string; mode: 'prepare' | 'teach' | 'record' }
  | { id: 'CLASS_OPEN_INLINE_RECORDER'; label: string }
  | { id: 'CLASS_OPEN_COMPLETION'; label: string }
  | { id: 'CLASS_OPEN_PLANNING'; label: string; gradeQuery: 'prima' | 'seconda' | 'terza'; sectionId: string; blockId?: string | null; uda?: string | null; pack?: string | null }
  | { id: 'CLASS_SHOW_ALL'; label: string; sectionId: string }

export function registeredActionSurface(id: RegisteredActionId): IntelligentSurface {
  return ACTION_SURFACES[id]
}

export function isSemanticBlockAllowed(id: SemanticBlockId, surface: IntelligentSurface, mode: ExperienceMode) {
  const entry = INTELLIGENT_UI_BLOCK_CATALOG[id]
  return Boolean(entry && entry.surface === surface && entry.modes.includes(mode))
}

export function resolveRegisteredAction(descriptor: RegisteredActionDescriptor): CompositionAction {
  switch (descriptor.id) {
    case 'HOME_OPEN_PLANNER':
      return action(descriptor.id, descriptor.label, '/planner')
    case 'HOME_OPEN_TIMETABLE':
      return action(descriptor.id, descriptor.label, '/orario')
    case 'HOME_OPEN_CLASS':
      requireNonEmpty(descriptor.sectionId, 'sectionId')
      return action(descriptor.id, descriptor.label, buildTaskAwareClassHref(descriptor.sectionId, {
        mode: descriptor.mode,
        blockId: descriptor.blockId,
        returnTo: descriptor.returnTo,
      }))
    case 'HOME_OPEN_LESSON':
      requireNonEmpty(descriptor.sectionId, 'sectionId')
      requireCanonicalBlock(descriptor.blockId)
      return action(descriptor.id, descriptor.label, buildLessonWorkspaceHref(descriptor.sectionId, descriptor.blockId, descriptor.mode))
    case 'HOME_SHOW_ALL':
      return action(descriptor.id, descriptor.label, '#home-full-view')
    case 'CLASS_OPEN_MODELED_LESSON':
      requireNonEmpty(descriptor.sectionId, 'sectionId')
      requireCanonicalBlock(descriptor.blockId)
      return action(descriptor.id, descriptor.label, buildLessonWorkspaceHref(descriptor.sectionId, descriptor.blockId, descriptor.mode))
    case 'CLASS_OPEN_INLINE_RECORDER':
      return action(descriptor.id, descriptor.label, '#registrazione-avanzata')
    case 'CLASS_OPEN_COMPLETION':
      return action(descriptor.id, descriptor.label, '#decisione-completamento')
    case 'CLASS_OPEN_PLANNING':
      return action(descriptor.id, descriptor.label, buildPlanningHref(descriptor))
    case 'CLASS_SHOW_ALL':
      requireNonEmpty(descriptor.sectionId, 'sectionId')
      return action(descriptor.id, descriptor.label, `/classi/${encodeURIComponent(descriptor.sectionId)}#class-full-view`)
    default:
      throw new Error('Unknown registered action descriptor')
  }
}

export function isResolvedRegisteredAction(value: unknown): value is CompositionAction {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CompositionAction>
  if (!candidate.id || !INTELLIGENT_UI_ACTION_IDS.includes(candidate.id as RegisteredActionId)) return false
  if (typeof candidate.label !== 'string' || !candidate.label.trim()) return false
  if (typeof candidate.href !== 'string') return false

  switch (candidate.id) {
    case 'HOME_OPEN_PLANNER': return candidate.href === '/planner'
    case 'HOME_OPEN_TIMETABLE': return candidate.href === '/orario'
    case 'HOME_SHOW_ALL': return candidate.href === '#home-full-view'
    case 'CLASS_OPEN_INLINE_RECORDER': return candidate.href === '#registrazione-avanzata'
    case 'CLASS_OPEN_COMPLETION': return candidate.href === '#decisione-completamento'
    case 'HOME_OPEN_CLASS': return isValidTaskAwareClassHref(candidate.href)
    case 'HOME_OPEN_LESSON': return isValidLessonHref(candidate.href, true)
    case 'CLASS_OPEN_MODELED_LESSON': return isValidLessonHref(candidate.href, false)
    case 'CLASS_OPEN_PLANNING': return isValidPlanningHref(candidate.href)
    case 'CLASS_SHOW_ALL': return /^\/classi\/[^/]+#class-full-view$/.test(candidate.href)
    default: return false
  }
}

function action(id: RegisteredActionId, label: string, href: string): CompositionAction {
  requireNonEmpty(label, 'label')
  return { id, label, href }
}

function buildPlanningHref(descriptor: Extract<RegisteredActionDescriptor, { id: 'CLASS_OPEN_PLANNING' }>) {
  requireNonEmpty(descriptor.sectionId, 'sectionId')
  if (!['prima', 'seconda', 'terza'].includes(descriptor.gradeQuery)) throw new Error('Invalid gradeQuery')
  if (descriptor.blockId) requireCanonicalBlock(descriptor.blockId)
  const params = new URLSearchParams()
  params.set('grade', descriptor.gradeQuery)
  params.set('section', descriptor.sectionId)
  if (descriptor.blockId) params.set('block', descriptor.blockId)
  if (descriptor.uda) params.set('uda', descriptor.uda)
  if (descriptor.pack) params.set('pack', descriptor.pack)
  return `/progetta?${params.toString()}#focus-operativo`
}

function isValidTaskAwareClassHref(href: string) {
  const parsed = parseInternalHref(href)
  if (!parsed || !/^\/classi\/[^/]+$/.test(parsed.pathname)) return false
  if (hasUnexpectedParams(parsed.searchParams, ['mode', 'returnTo', 'block'])) return false
  const entry = parseClassTaskEntry({
    mode: parsed.searchParams.get('mode'),
    block: parsed.searchParams.get('block'),
    returnTo: parsed.searchParams.get('returnTo'),
  }, '__invalid__')
  return Boolean(entry.mode && entry.returnTo !== '__invalid__')
}

function isValidLessonHref(href: string, allowObserve: boolean) {
  const parsed = parseInternalHref(href)
  if (!parsed || !/^\/classi\/[^/]+\/lezioni\/B(?:0[1-9]|[12]\d|3[0-3])$/.test(parsed.pathname)) return false
  if (hasUnexpectedParams(parsed.searchParams, ['mode'])) return false
  const mode = parsed.searchParams.get('mode')
  return mode === 'prepare' || mode === 'teach' || mode === 'record' || (allowObserve && mode === 'observe')
}

function isValidPlanningHref(href: string) {
  const parsed = parseInternalHref(href)
  if (!parsed || parsed.pathname !== '/progetta' || parsed.hash !== '#focus-operativo') return false
  if (hasUnexpectedParams(parsed.searchParams, ['grade', 'section', 'block', 'uda', 'pack'])) return false
  const grade = parsed.searchParams.get('grade')
  const section = parsed.searchParams.get('section')
  const block = parsed.searchParams.get('block')
  return Boolean(
    (grade === 'prima' || grade === 'seconda' || grade === 'terza') &&
    section &&
    (!block || CANONICAL_BLOCK_ID.test(block)),
  )
}

function parseInternalHref(href: string) {
  if (!href.startsWith('/') || href.startsWith('//') || href.includes('\\')) return null
  try {
    const parsed = new URL(href, 'https://docente-os.local')
    if (parsed.origin !== 'https://docente-os.local') return null
    return parsed
  } catch {
    return null
  }
}

function hasUnexpectedParams(params: URLSearchParams, allowed: readonly string[]) {
  const allowedSet = new Set(allowed)
  return [...params.keys()].some((key) => !allowedSet.has(key))
}

function requireCanonicalBlock(value: string) {
  if (!CANONICAL_BLOCK_ID.test(value)) throw new Error('Invalid canonical block id')
}

function requireNonEmpty(value: string, field: string) {
  if (!value.trim()) throw new Error(`Invalid ${field}`)
}

export function isSafeRegisteredInternalHref(href: string) {
  if (href.startsWith('#')) return /^#[a-z0-9-]+$/i.test(href)
  return Boolean(parseInternalHref(href) && sanitizeInternalReturnTo(href, '__invalid__') !== '__invalid__')
}
