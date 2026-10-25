const ROME_TIME_ZONE = 'Europe/Rome'

const WEEKDAY_BY_SHORT_NAME: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

export type RomeDomainClock = {
  localDate: string
  weekday: number
  minuteOfDay: number
}

export function currentRomeDomainClock(): RomeDomainClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(currentDomainDate())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const weekday = WEEKDAY_BY_SHORT_NAME[value.weekday] ?? 7

  return {
    localDate: `${value.year}-${value.month}-${value.day}`,
    weekday,
    minuteOfDay: Number(value.hour) * 60 + Number(value.minute),
  }
}

function currentDomainDate() {
  const configuredNow = process.env.DOCENTE_OS_DOMAIN_NOW?.trim()
  if (!configuredNow) return new Date()

  const epochMs = Date.parse(configuredNow)
  if (!Number.isFinite(epochMs)) {
    throw new Error('DOCENTE_OS_DOMAIN_NOW must be a valid ISO date-time')
  }
  return new Date(epochMs)
}
