import { expect, test } from '@playwright/test'
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

  const localDate = chooseFixtureDate(startsOn, endsOn, testInfo.project.name.startsWith('mobile') ? 2 : 3)

  try {
    await openChoice(choices.nth(0))
    await dateInput.fill(localDate)
    await dayForm.locator('input[name="label"]').fill(dayLabel)
    await dayForm.locator('input[name="sourceRef"]').fill(`HVA:${runToken}:${projectToken}:${retryToken}`)
    await dayForm.getByRole('button', { name: 'Registra il giorno' }).click()

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

    await expect(calendarRow(page, eventTitle), 'L’impegno appena registrato deve essere rileggibile dal Calendario.').toBeVisible()

    await page.reload()
    await expect(calendarRow(page, dayLabel), 'Il giorno deve sopravvivere a una rilettura completa della pagina.').toBeVisible()
    await expect(calendarRow(page, eventTitle), 'L’impegno deve sopravvivere a una rilettura completa della pagina.').toBeVisible()

    await removeRow(page, eventTitle)
    await expect(calendarRow(page, eventTitle), 'L’impegno eliminato non deve restare nello snapshot corrente.').toHaveCount(0)

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

async function removeRow(page, text) {
  const row = calendarRow(page, text).first()
  await expect(row).toBeVisible()
  await row.getByText('Gestisci', { exact: true }).click()
  await row.getByRole('button', { name: 'Rimuovi' }).click()
}

async function cleanupRow(page, text) {
  try {
    if (!page.url().includes('/calendario')) await page.goto('/calendario')
    const rows = calendarRow(page, text)
    while ((await rows.count()) > 0) {
      const row = rows.first()
      if (!(await row.isVisible())) break
      await row.getByText('Gestisci', { exact: true }).click()
      await row.getByRole('button', { name: 'Rimuovi' }).click()
      await expect(row).toHaveCount(0)
    }
  } catch {
    // The main assertion remains authoritative; cleanup must not mask it.
  }
}

function chooseFixtureDate(startsOn, endsOn, offsetDays) {
  const today = localIsoDate(new Date())
  const candidateBase = today < startsOn ? startsOn : today
  const candidate = addDays(candidateBase, offsetDays)
  if (candidate <= endsOn) return candidate
  return addDays(endsOn, -offsetDays)
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

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
