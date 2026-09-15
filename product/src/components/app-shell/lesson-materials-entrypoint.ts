export type LessonMaterialsContext = {
  nextLessonPreparation: {
    lesson: {
      sectionId: string | null
      disciplineId: string | null
      startAt: string
      endAt: string
      authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'
    }
    canonicalLesson: {
      sectionLabel: string
      title: string
    } | null
  } | null
}

export type LessonMaterialsEntrypoint = {
  href: '/materiali/prossima'
  sectionLabel: string
  title: string
  timeLabel: string
  authorityLabel: 'LEZIONE DI RIFERIMENTO' | 'ORARIO PROVVISORIO'
}

export function resolveLessonMaterialsEntrypoint(input: {
  active: string
  pathname: string
  context: LessonMaterialsContext
}): LessonMaterialsEntrypoint | null {
  if (!isSupportedSurface(input.active, input.pathname)) return null

  const preparation = input.context.nextLessonPreparation
  const canonical = preparation?.canonicalLesson ?? null
  const lesson = preparation?.lesson ?? null
  if (!lesson || !canonical || !lesson.sectionId || !lesson.disciplineId) return null

  if (input.active === 'classes') {
    const sectionId = classSectionId(input.pathname)
    if (!sectionId || sectionId !== lesson.sectionId) return null
  }

  return {
    href: '/materiali/prossima',
    sectionLabel: canonical.sectionLabel,
    title: canonical.title,
    timeLabel: `${clock(lesson.startAt)}–${clock(lesson.endAt)}`,
    authorityLabel: lesson.authority === 'PROVISIONAL_DRAFT' ? 'ORARIO PROVVISORIO' : 'LEZIONE DI RIFERIMENTO',
  }
}

export function isLessonMaterialsSurface(active: string, pathname: string) {
  return isSupportedSurface(active, pathname)
}

function isSupportedSurface(active: string, pathname: string) {
  if (active === 'home') return /^\/$/.test(pathname)
  if (active === 'today') return /^\/planner\/?$/.test(pathname)
  if (active === 'classes') return /^\/classi\/[^/?#]+(?:\/|$)/.test(pathname)
  return false
}

function classSectionId(pathname: string) {
  const match = pathname.match(/^\/classi\/([^/?#]+)(?:\/|$)/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

function clock(value: string) {
  return value.slice(11, 16)
}
