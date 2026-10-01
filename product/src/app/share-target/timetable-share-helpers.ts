export type Rect = { x: number; y: number; width: number; height: number }

export function looksLikeTimetablePdf(input: {
  title?: string | null
  fileName: string
  fileType: string
}) {
  const isPdf = input.fileType === 'application/pdf' || /\.pdf$/i.test(input.fileName)
  if (!isPdf) return false
  const haystack = [input.title ?? '', input.fileName]
    .join(' ')
    .toLocaleLowerCase('it-IT')
    .replace(/[_-]+/g, ' ')
  return /\b(orario|timetable|quadro\s+orario)\b/.test(haystack)
}

export function normalizeTeacherSearch(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleUpperCase('it-IT')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function teacherLabelMatches(text: string, teacherLabel: string) {
  const needle = normalizeTeacherSearch(teacherLabel)
  if (needle.length < 2) return false
  return normalizeTeacherSearch(text).includes(needle)
}


export type TimetableTextAnchor = {
  text: string
  rect: Rect
  page: number
}

export type InferredTeacherTimetableCell = {
  rect: Rect
  page: number
  weekday: number | null
  ordinal: number | null
  classLabel: string | null
  evidenceText: string
}

const WEEKDAY_BY_LABEL = new Map<string, number>([
  ['LUNEDI', 1],
  ['MARTEDI', 2],
  ['MERCOLEDI', 3],
  ['GIOVEDI', 4],
  ['VENERDI', 5],
  ['SABATO', 6],
])

function normalizeStructuralText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('it-IT')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function weekdayFromTimetableText(value: string) {
  return WEEKDAY_BY_LABEL.get(normalizeStructuralText(value)) ?? null
}

export function ordinalFromTimetableText(value: string) {
  const normalized = normalizeStructuralText(value)
  const match = /^(\d{1,2})\s*(?:A\s*)?ORA$/.exec(normalized)
  if (!match) return null
  const ordinal = Number(match[1])
  return isValidOrdinal(ordinal) ? ordinal : null
}

export function classLabelFromTimetableText(value: string) {
  const normalized = normalizeStructuralText(value).replace(/\s+/g, '')
  return /^[1-5][A-Z]{1,2}$/.test(normalized) ? normalized : null
}

function centerX(rect: Rect) {
  return rect.x + rect.width / 2
}

function centerY(rect: Rect) {
  return rect.y + rect.height / 2
}

export function inferTeacherTimetableCells(
  anchors: readonly TimetableTextAnchor[],
  teacherLabel: string,
): InferredTeacherTimetableCell[] {
  const teacherAnchors = anchors.filter((anchor) => teacherLabelMatches(anchor.text, teacherLabel))
  const inferred: InferredTeacherTimetableCell[] = []
  const seen = new Set<string>()

  for (const teacher of teacherAnchors) {
    const samePage = anchors.filter((anchor) => anchor.page === teacher.page)
    const teacherY = centerY(teacher.rect)
    const teacherX = centerX(teacher.rect)

    const ordinalCandidates = samePage
      .map((anchor) => ({ anchor, ordinal: ordinalFromTimetableText(anchor.text) }))
      .filter((entry): entry is { anchor: TimetableTextAnchor; ordinal: number } => entry.ordinal !== null)
      .map((entry) => ({ ...entry, distance: Math.abs(centerY(entry.anchor.rect) - teacherY) }))
      .filter((entry) => entry.distance <= Math.max(teacher.rect.height * 2.5, 28))
      .sort((a, b) => a.distance - b.distance)

    const weekdayCandidates = samePage
      .map((anchor) => ({ anchor, weekday: weekdayFromTimetableText(anchor.text) }))
      .filter((entry): entry is { anchor: TimetableTextAnchor; weekday: number } => entry.weekday !== null)
      .filter((entry) => centerY(entry.anchor.rect) <= teacherY + Math.max(teacher.rect.height, 18))
      .sort((a, b) => centerY(b.anchor.rect) - centerY(a.anchor.rect))

    const classCandidates = samePage
      .map((anchor) => ({ anchor, classLabel: classLabelFromTimetableText(anchor.text) }))
      .filter((entry): entry is { anchor: TimetableTextAnchor; classLabel: string } => entry.classLabel !== null)
      .map((entry) => ({ ...entry, distance: Math.abs(centerX(entry.anchor.rect) - teacherX) }))
      .filter((entry) => centerY(entry.anchor.rect) <= teacherY)
      .sort((a, b) => a.distance - b.distance || centerY(a.anchor.rect) - centerY(b.anchor.rect))

    const weekday = weekdayCandidates[0]?.weekday ?? null
    const ordinal = ordinalCandidates[0]?.ordinal ?? null
    const classLabel = classCandidates[0]?.classLabel ?? null
    const key = `${teacher.page}:${weekday ?? '?'}:${ordinal ?? '?'}:${classLabel ?? '?'}:${Math.round(teacherX)}:${Math.round(teacherY)}`
    if (seen.has(key)) continue
    seen.add(key)

    const paddingX = Math.max(6, teacher.rect.width * 0.12)
    const paddingY = Math.max(4, teacher.rect.height * 0.3)
    inferred.push({
      page: teacher.page,
      weekday,
      ordinal,
      classLabel,
      evidenceText: teacher.text,
      rect: {
        x: Math.max(0, teacher.rect.x - paddingX),
        y: Math.max(0, teacher.rect.y - paddingY),
        width: teacher.rect.width + paddingX * 2,
        height: teacher.rect.height + paddingY * 2,
      },
    })
  }

  return inferred.sort((a, b) =>
    (a.weekday ?? 99) - (b.weekday ?? 99)
    || (a.ordinal ?? 99) - (b.ordinal ?? 99)
    || (a.classLabel ?? '').localeCompare(b.classLabel ?? ''),
  )
}

export function parseOrdinal(value: string) {
  const parsed = Number(value)
  return isValidOrdinal(parsed) ? parsed : null
}

export function isValidOrdinal(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 20
}

export function isIsoCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  )
}

export function dateFromFilename(filename: string) {
  const match = filename.match(/\b(\d{1,2})[-_.](\d{1,2})[-_.](20\d{2})\b/)
  if (!match) return null
  const [, day, month, year] = match
  const value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return isIsoCalendarDate(value) ? value : null
}

export function clampRectToBounds(rect: Rect, width: number, height: number): Rect {
  const x1 = clamp(Math.floor(rect.x), 0, width)
  const y1 = clamp(Math.floor(rect.y), 0, height)
  const x2 = clamp(Math.ceil(rect.x + rect.width), 0, width)
  const y2 = clamp(Math.ceil(rect.y + rect.height), 0, height)
  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}


const WEEKDAY_LABELS = new Map<number, string>([
  [1, 'Lunedì'],
  [2, 'Martedì'],
  [3, 'Mercoledì'],
  [4, 'Giovedì'],
  [5, 'Venerdì'],
  [6, 'Sabato'],
])

export function derivativeContextLabel(
  teacherLabel: string,
  weekday: number | null,
  ordinal: number | null,
  classLabel: string | null = null,
) {
  const teacher = teacherLabel.trim()
  if (!teacher) throw new Error('Teacher label is required')

  if (weekday === null || ordinal === null) {
    return `DOCENTE: ${teacher}`
  }

  const day = WEEKDAY_LABELS.get(weekday) ?? `Giorno ${weekday}`
  if (!isValidOrdinal(ordinal)) throw new Error('Valid timetable ordinal is required')
  const classroom = classLabel?.trim() ? ` · CLASSE: ${classLabel.trim()}` : ''
  return `DOCENTE: ${teacher} · GIORNO: ${day} · ORA: ${ordinal}${classroom}`
}
