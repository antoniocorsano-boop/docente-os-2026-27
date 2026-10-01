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
    .replace(/[^\\p{L}\\p{N}]+/gu, ' ')
    .trim()
    .replace(/\\s+/g, ' ')
}

export function teacherLabelMatches(text: string, teacherLabel: string) {
  const needle = normalizeTeacherSearch(teacherLabel)
  if (needle.length < 2) return false
  return normalizeTeacherSearch(text).includes(needle)
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
) {
  const teacher = teacherLabel.trim()
  if (!teacher) throw new Error('Teacher label is required')

  if (weekday === null || ordinal === null) {
    return `DOCENTE: ${teacher}`
  }

  const day = WEEKDAY_LABELS.get(weekday) ?? `Giorno ${weekday}`
  if (!isValidOrdinal(ordinal)) throw new Error('Valid timetable ordinal is required')
  return `DOCENTE: ${teacher} · GIORNO: ${day} · ORA: ${ordinal}`
}
