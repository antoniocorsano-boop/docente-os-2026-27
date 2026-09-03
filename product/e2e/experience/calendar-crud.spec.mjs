import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

test('Calendario: CRUD autenticato con rilettura e cleanup', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/calendario')

  const projectToken = safe(testInfo.project.name)
  const runToken = process.env.GITHUB_RUN_ID ?? process.env.EXPERIENCE_FIXTURE_TOKEN ?? 'local'
  const retryToken = `r${testInfo.retry}`
  const dayLabel = `HVA giorno calendario — ${runToken}-${projectToken}-${retryToken}`
  const eventTitle = `HVA impegno calendario — ${runToken}-${projectToken}-${retryToken}`

  const add = page.locator('details.calendarAdd')
  await expect(add).toBeVisible()
  await ensureOpen(add)

  const choices = add.locator('details.calendarAddChoice')
  await expect(choices).toHaveCount(2)

  const dayForm = choices.nth(0).locator('form')
  const dateInput = dayForm.locator('input[name="localDate"]')
  const startsOn = await dateInput.getAttribute('min')
  const endsOn = await dateInput.getAttribute('max')
  expect(startsOn, 'Il form Calendario deve esporre il limite iniziale dell’anno scolastico.').toBeTruthy()
  expect(endsOn, 'Il form Calendario deve esporre il limite finale dell’anno scolastico.').toBeTruthy()

  const lease = await prepareVacantCalendarDate(startsOn, endsOn)
  const localDate = lease.localDate

  try {
    await openChoice(choices.nth(0))
    await dateInput.fill(localDate)
    await dayForm.locator('input[name="label"]').fill(dayLabel)
    await dayForm.locator('input[name="sourceRef"]').fill(`HVA:${runToken}:${projectToken}:${retryToken}`)

    // saveDay intentionally updates an existing (workspace, year, date) row. Re-check
    // immediately before submit so this smoke never treats teacher-authored data as test-owned.
    await assertCalendarDateStillVacant(lease, localDate)
    await dayForm.getByRole('button', { name: 'Registra il giorno' }).click()

    await revealCalendarHistory(page)
    await expect(calendarRow(page, dayLabel), 'Il giorno appena registrato deve essere rileggibile dal Calendario.').toBeVisible()

    await ensureOpen(add)
    await openChoice(choices.nth(1))
    const eventForm = choices.nth(1).locator('form')
    await eventForm.locator('input[name="title"]').fill(eventTitle)
    await eventForm.locator('select[name="timing"]').selectOption('ALL_DAY')
    await eventForm.locator('input[name="startsOn"]').fill(localDate)
    await eventForm.locator('input[name="endsOn"]').fill(localDate)
    await eventForm.locator('input[name="sourceRef"]').fill(`HVA:${runToken}:${projectToken}:${retryToken}`)
    await eventForm.getByRole('button', { name: "Registra l’impegno" }).click()

    await revealCalendarHistory(page)
    await expect(calendarRow(page, eventTitle), 'L’impegno appena registrato deve essere rileggibile dal Calendario.').toBeVisible()

    await page.reload()
    await revealCalendarHistory(page)
    await expect(calendarRow(page, dayLabel), 'Il giorno deve sopravvivere a una rilettura completa della pagina.').toBeVisible()
    await expect(calendarRow(page, eventTitle), 'L’impegno deve sopravvivere a una rilettura completa della pagina.').toBeVisible()

    await removeRow(page, eventTitle)
    await expect(calendarRow(page, eventTitle), 'L’impegno eliminato non deve restare nello snapshot corrente.').toHaveCount(0)

    await revealCalendarHistory(page)
    await removeRow(page, dayLabel)
    await expect(calendarRow(page, dayLabel), 'Il giorno eliminato non deve restare nello snapshot corrente.').toHaveCount(0)
  } finally {
    await cleanupRow(page, eventTitle)
    await cleanupRow(page, dayLabel)
  }
})

function calendarRow(page, text) {
  return page.locator('.calendarRow').filter({ hasText: text })
}

async function ensureOpen(details) {
  if ((await details.getAttribute('open')) === null) {
    await details.locator(':scope > summary').click()
  }
}

async function openChoice(choice) {
  if ((await choice.getAttribute('open')) === null) {
    await choice.locator(':scope > summary').click()
  }
}

async function revealCalendarHistory(page) {
  const histories = page.locator('details.calendarHistory')
  for (let index = 0; index < await histories.count(); index += 1) {
    await ensureOpen(histories.nth(index))
  }
}

async function removeRow(page, text) {
  const row = calendarRow(page, text).first()
  await expect(row).toBeVisible()
  await row.getByText('Gestisci', { exact: true }).click()
  await row.getByRole('button', { name: 'Rimuovi' }).click()
}

async function cleanupRow(page, text) {
  try {
    if (!page.url().includes('/calendario')) await page.goto('/calendario')
    await revealCalendarHistory(page)
    const rows = calendarRow(page, text)
    while ((await rows.count()) > 0) {
      const row = rows.first()
      if (!(await row.isVisible())) break
      await row.getByText('Gestisci', { exact: true }).click()
      await row.getByRole('button', { name: 'Rimuovi' }).click()
      await expect(row).toHaveCount(0)
      await revealCalendarHistory(page)
    }
  } catch {
    // The main assertion remains authoritative; cleanup must not mask it.
  }
}

async function prepareVacantCalendarDate(startsOn, endsOn) {
  const supabase = createClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: requiredEnv('E2E_EMAIL'),
    password: requiredEnv('E2E_PASSWORD'),
  })
  if (authError) throw new Error(`Calendar HVA preflight authentication failed: ${authError.message}`)

  const { data: contexts, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`Calendar HVA context preflight failed: ${contextError.message}`)

  const context = contexts?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('Calendar HVA requires an authenticated workspace with an active academic year')
  }
  if (context.academic_year_starts_on !== startsOn || context.academic_year_ends_on !== endsOn) {
    throw new Error('Calendar HVA form bounds do not match the authenticated academic-year context')
  }

  const { data: occupiedRows, error: occupiedError } = await supabase
    .from('calendar_days')
    .select('local_date')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)

  if (occupiedError) throw new Error(`Calendar HVA vacancy preflight failed: ${occupiedError.message}`)

  const occupiedDates = new Set((occupiedRows ?? []).map((row) => row.local_date))
  const localDate = findVacantDate(startsOn, endsOn, occupiedDates)
  if (!localDate) {
    throw new Error('Calendar HVA found no vacant date in the active academic year; no mutation was attempted')
  }

  return {
    supabase,
    workspaceId: context.workspace_id,
    academicYearId: context.academic_year_id,
    localDate,
  }
}

async function assertCalendarDateStillVacant(lease, localDate) {
  const { data, error } = await lease.supabase
    .from('calendar_days')
    .select('id')
    .eq('workspace_id', lease.workspaceId)
    .eq('academic_year_id', lease.academicYearId)
    .eq('local_date', localDate)
    .limit(1)

  if (error) throw new Error(`Calendar HVA vacancy recheck failed: ${error.message}`)
  if ((data ?? []).length > 0) {
    throw new Error('Calendar HVA candidate date became occupied before submit; no mutation was attempted')
  }
}

function findVacantDate(startsOn, endsOn, occupiedDates) {
  const today = localIsoDate(new Date())
  const preferredStart = today < startsOn ? startsOn : today > endsOn ? endsOn : today

  for (const date of datesBetween(preferredStart, endsOn)) {
    if (!occupiedDates.has(date)) return date
  }
  if (preferredStart > startsOn) {
    for (const date of datesBetween(startsOn, addDays(preferredStart, -1))) {
      if (!occupiedDates.has(date)) return date
    }
  }
  return null
}

function* datesBetween(startsOn, endsOn) {
  for (let date = startsOn; date <= endsOn; date = addDays(date, 1)) {
    yield date
  }
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function localIsoDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required for Calendar HVA`)
  return value
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
