import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E } from '../support/e2e-auth.mjs'

const registroBaseURL = process.env.REGISTRO_BASE_URL ?? 'http://127.0.0.1:4173'
const producerSha = process.env.A4_R2B_PRODUCER_SHA ?? ''
const consumerSha = process.env.A4_R2B_REGISTRO_SHA ?? ''
const outputRoot = path.resolve(process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience')
const evidenceDir = path.join(outputRoot, 'a4-r2b-interoperability')

function canonicalClassLabel(value) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/SECONDARIA\s+I\s+GRADO/g, '')
    .replace(/[^0-9A-Z]/g, '')
  const match = normalized.match(/([1-3])(?:A)?([A-Z])/) ?? normalized.match(/([1-3])([A-Z])/) 
  return match ? `${match[1]}${match[2]}` : normalized
}

async function openRegistroDrawerItem(page, label) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const item = page.locator('aside').getByRole('button', { name: label, exact: true })
  await expect(item).toBeVisible()
  await item.click()
}

async function setupFreshRegistroVault(page, password) {
  await page.goto(registroBaseURL, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Configura archivio protetto' })).toBeVisible()
  await page.locator('#vault-password').fill(password)
  await page.getByRole('button', { name: 'Configura archivio protetto' }).click()
  await expect(page.getByRole('heading', { name: 'Le mie classi' })).toBeVisible()
}

async function closeRegistroPersistenceConfirmation(page) {
  const heading = page.getByRole('heading', { name: 'Dati Salvati in Locale con Successo!' })
  await expect(heading).toBeVisible()
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click()
  await expect(heading).toBeHidden()
}

async function ensureRegistroClasses(page, projection) {
  const openButtons = page.getByRole('button', { name: /^Apri classe / })
  const existing = new Set()
  for (let index = 0; index < await openButtons.count(); index += 1) {
    const label = await openButtons.nth(index).getAttribute('aria-label')
    if (label) existing.add(canonicalClassLabel(label.replace(/^Apri classe\s+/i, '')))
  }

  for (const sourceClass of projection.classes) {
    const target = canonicalClassLabel(sourceClass.compactLabel)
    if (existing.has(target)) continue

    page.once('dialog', dialog => dialog.accept(sourceClass.compactLabel))
    await page.getByRole('button', { name: /Nuova Classe/ }).click()
    await expect(page.getByRole('heading', { name: `Gestione Elenco Alunni: ${sourceClass.compactLabel}` })).toBeVisible()
    await closeRegistroPersistenceConfirmation(page)
    await openRegistroDrawerItem(page, 'Classi')
    await expect(page.getByRole('heading', { name: 'Le mie classi' })).toBeVisible()
    existing.add(target)
  }
}

async function exportProjectionFromDocenteOs(page, testInfo) {
  await loginE2E(page)
  await page.goto('/piano-annuale')
  await expect(page.getByRole('heading', { name: 'Piano annuale' })).toBeVisible()

  const management = page.locator('details').filter({ hasText: 'Gestione del piano e della sezione' }).first()
  await expect(management).toBeVisible()
  if ((await management.getAttribute('open')) === null) {
    await management.locator(':scope > summary').click()
  }
  const exportButton = management.getByRole('button', { name: 'Esporta per Registro Docente', exact: true })
  await expect(exportButton).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await exportButton.click()
  const download = await downloadPromise
  await expect(page.getByRole('status')).toContainText('File pronto per Registro Docente.')

  await fs.mkdir(evidenceDir, { recursive: true })
  const exportPath = path.join(evidenceDir, `${testInfo.project.name}--docente-os-export.json`)
  await download.saveAs(exportPath)
  const bytes = await fs.readFile(exportPath)
  return { exportPath, bytes, projection: JSON.parse(bytes.toString('utf8')) }
}

test('A4-R2B Task 8 transfers the real Docente OS JSON export into Registro preview, reconciliation and acceptance', async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000)

  expect(producerSha, 'The producer exact SHA must be declared by the qualification harness.').toMatch(/^[0-9a-f]{40}$/)
  expect(consumerSha, 'The Registro exact SHA must be declared by the qualification harness.').toMatch(/^[0-9a-f]{40}$/)

  const { exportPath, bytes, projection } = await exportProjectionFromDocenteOs(page, testInfo)
  expect(projection.contract).toBe('DOCENTE_OS_REGISTRO_TEACHING_PROJECTION_V1')
  expect(projection.contractVersion).toBe(1)
  expect(projection.sourceProduct).toBe('DOCENTE_OS')
  expect(projection.targetProduct).toBe('REGISTRO_DOCENTE')
  expect(projection.importMode).toBe('READ_ONLY_PROJECTION')
  expect(projection.acceptanceRequired).toBe(true)
  expect(projection.automaticWriteAllowed).toBe(false)
  expect(projection.privacyClass).toBe('PROFESSIONAL_NON_PERSONAL')
  expect(projection.provenance?.sourceCommit).toBe(producerSha)
  expect(projection.classes.length, 'Task 8 must exercise real class reconciliation, not an empty projection.').toBeGreaterThan(0)

  const registroContext = await browser.newContext({
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: testInfo.project.use.viewport ?? { width: 1280, height: 900 },
  })
  const registro = await registroContext.newPage()
  const vaultPassword = `a4-r2b-task8-${testInfo.project.name}`

  try {
    await setupFreshRegistroVault(registro, vaultPassword)
    await ensureRegistroClasses(registro, projection)
    await openRegistroDrawerItem(registro, 'Programmazione didattica')
    await expect(registro.getByRole('heading', { name: 'Programmazione didattica', exact: true })).toBeVisible()

    const importPanel = registro.locator('details').filter({ hasText: 'Importa da Docente OS' }).first()
    await expect(importPanel).toBeVisible()
    if ((await importPanel.getAttribute('open')) === null) {
      await importPanel.locator(':scope > summary').click()
    }

    await importPanel.locator('input[type="file"]').setInputFiles(exportPath)
    await expect(importPanel.getByRole('heading', { name: 'Anteprima della programmazione' })).toBeVisible()
    await expect(importPanel.getByText(producerSha, { exact: true })).toBeVisible()

    for (const sourceClass of projection.classes) {
      const row = importPanel.locator('li').filter({ hasText: sourceClass.displayLabel }).first()
      await expect(row).toContainText('Associata')
    }

    const acceptButton = importPanel.getByRole('button', { name: 'Accetta e salva la proiezione', exact: true })
    await expect(acceptButton).toBeEnabled()
    await acceptButton.click()
    await expect(importPanel.getByRole('status')).toContainText('Proiezione Docente OS accettata e salvata.')

    const receipt = {
      schemaVersion: 1,
      gate: 'A4-R2B_TASK_8_INTEROPERABILITY',
      project: testInfo.project.name,
      producerSha,
      consumerSha,
      exportedFile: path.basename(exportPath),
      exportSha256: createHash('sha256').update(bytes).digest('hex'),
      classCount: projection.classes.length,
      udaCount: projection.classes.reduce((total, item) => total + item.udas.length, 0),
      privacyClass: projection.privacyClass,
      automaticWriteAllowed: projection.automaticWriteAllowed,
      preview: 'PASS',
      reconciliation: 'PASS',
      acceptance: 'PASS',
    }
    await fs.writeFile(
      path.join(evidenceDir, `${testInfo.project.name}--receipt.json`),
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf8',
    )
  } finally {
    await registroContext.close()
  }
})
