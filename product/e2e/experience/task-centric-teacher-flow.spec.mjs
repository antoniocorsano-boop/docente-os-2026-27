import { expect, test } from '@playwright/test'
import { createClassroomMaterialFixture } from '../support/classroom-material-fixture.mjs'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { deleteKnowledgeAsset } from '../support/knowledge-fixture-hygiene.mjs'

requireE2ECredentials()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const TEACH_OBSERVE_BLOCK_ID = 'B01'
const MATERIALS_BLOCK_ID = 'B02'

test('Journey: Lezione → Materiali preserves one teacher task', async ({ page }, testInfo) => {
  await loginE2E(page)
  const sectionId = await currentSecondCSectionId()
  let materialFixture = null

  try {
    materialFixture = await createClassroomMaterialFixture({
      sectionId,
      suffix: `${MATERIALS_BLOCK_ID}-viewer-${process.env.GITHUB_RUN_ID ?? 'local'}-${testInfo.project.name}-${Date.now()}`,
    })

    await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/${MATERIALS_BLOCK_ID}?subtask=materials`)

    const shell = page.locator('[data-lesson-shell]')
    await expect(shell, 'Materiali deve restare dentro una Lesson Shell persistente.').toBeVisible()
    await expect(shell).not.toContainText(/CAN-PACK|CAN-PLAN/)
    await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
    await expect(page.locator('a[href^="/classi/"][href*="/lezioni/"][href*="mode="]')).toHaveCount(0)

    const materialsTask = page.locator('[data-lesson-subtask="materials"]')
    await expect(materialsTask).toBeVisible()
    const reuse = materialsTask.getByRole('button', { name: 'Riutilizza', exact: true })
    const adapt = materialsTask.getByRole('button', { name: 'Adatta', exact: true })
    const create = materialsTask.getByRole('button', { name: /Crea/ })
    await expect(reuse).toBeVisible()
    await expect(adapt).toBeVisible()
    await expect(create).toBeVisible()
    await expect(page.getByText('Progetta', { exact: true })).toHaveCount(0)
    await expectTouchTarget(reuse, 'Riutilizza')
    await expectTouchTarget(adapt, 'Adatta')
    await expectTouchTarget(create, 'Crea nuovo')
    await reuse.focus()
    await expect(reuse).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(adapt).toBeFocused()
    await expectVisibleFocus(adapt, 'Adatta')

    if (testInfo.project.name.startsWith('mobile')) {
      await assertResponsiveWidths(page, create, 'Materiali')
    }

    const firstPreview = materialsTask.getByRole('link', { name: 'Controlla', exact: true }).first()
    await expect(
      firstPreview,
      'Una risorsa Knowledge proposta in Materiali deve aprirsi nel Viewer focalizzato del compito.',
    ).toBeVisible()
    await firstPreview.click()

    const materialPreview = page.locator('[data-lesson-material-preview]')
    await expect(
      materialPreview,
      'Il Viewer deve restare una superficie della lezione, non diventare la scheda generica di Conoscenza.',
    ).toBeVisible()
    await expect(page.locator('[data-lesson-shell]')).toBeVisible()
    await expect(materialPreview.getByRole('button', { name: 'Usa nella lezione', exact: true })).toBeVisible()
    await expect(materialPreview.getByText(MATERIALS_BLOCK_ID, { exact: true })).toHaveCount(0)
    await expect(page.locator('.focusedKnowledgeSurface')).toHaveCount(0)

    const backToMaterials = page.getByRole('link', { name: 'Torna ai materiali', exact: true })
    await expect(backToMaterials).toBeVisible()
    await backToMaterials.click()
    await expect(page.locator('[data-lesson-subtask="materials"]')).toBeVisible()
    await expect(page.locator('[data-lesson-shell]')).toBeVisible()

    if (testInfo.project.name.startsWith('mobile')) {
      await page.setViewportSize({ width: 320, height: 800 })
      await expectNoHorizontalOverflow(page, 'Il flusso focalizzato a 320px')
    }
  } finally {
    if (materialFixture) await deleteKnowledgeAsset(page, materialFixture.assetId).catch(() => {})
  }
})

test('State: Materiali without qualified Atlas stays truthful and complete', async ({ page }, testInfo) => {
  await loginE2E(page)
  const sectionId = await currentSecondCSectionId()
  await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/${MATERIALS_BLOCK_ID}?subtask=materials`)

  const shell = page.locator('[data-lesson-shell]')
  const materialsTask = page.locator('[data-lesson-subtask="materials"]')
  await expect(shell).toBeVisible()
  await expect(materialsTask).toBeVisible()
  await expect(materialsTask.getByText('Materiali disponibili', { exact: true })).toBeVisible()
  await expect(materialsTask.getByRole('link', { name: /Atlas/i })).toHaveCount(0)
  await expect(materialsTask.getByText(/Atlas non disponibile|Nessun materiale Atlas|In arrivo da Atlas/i)).toHaveCount(0)

  const reuse = materialsTask.getByRole('button', { name: 'Riutilizza', exact: true })
  const adapt = materialsTask.getByRole('button', { name: 'Adatta', exact: true })
  const create = materialsTask.getByRole('button', { name: /Crea/ })
  await expect(reuse).toBeVisible()
  await expect(adapt).toBeVisible()
  await expect(create).toBeVisible()
  await expectTouchTarget(reuse, 'Riutilizza senza Atlas')
  await expectTouchTarget(adapt, 'Adatta senza Atlas')
  await expectTouchTarget(create, 'Crea senza Atlas')

  if (testInfo.project.name.startsWith('mobile')) {
    await assertResponsiveWidths(page, create, 'Materiali senza Atlas')
  }
})

test('Journey: Conduci → Osserva preserves one governed lesson', async ({ page }, testInfo) => {
  await loginE2E(page)
  const fixture = await createRecordedTeachObserveFixture()

  try {
    const teachHref = `/classi/${encodeURIComponent(fixture.sectionId)}/lezioni/${TEACH_OBSERVE_BLOCK_ID}?mode=teach`
    await page.goto(teachHref)

    await expect(
      page.getByText(/PASSO 1 DI \d+/),
      'La fixture deve caricare la guida operativa della lezione registrata.',
    ).toBeVisible()

    const teachShell = page.locator('[data-lesson-shell]')
    await expect(teachShell, 'CONDUCI deve mantenere la Lesson Shell invece di cambiare identità di prodotto.').toBeVisible()
    await expect(teachShell).toContainText(fixture.classLabel)
    await expect(teachShell).toContainText('Il territorio agricolo come sistema')
    await expect(teachShell).not.toContainText(/CAN-PACK|CAN-PLAN/)
    await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)

    const observe = page.getByRole('link', { name: 'Osserva', exact: true })
    await expect(observe, 'Osserva deve restare una capacità contestuale della stessa Lezione.').toBeVisible()
    await expectTouchTarget(observe, 'Passaggio a Osserva')
    await expect(observe).toHaveAttribute('href', /[?&]subtask=observe(?:&|$)/)
    expect(await observe.getAttribute('href')).not.toMatch(/[?&]mode=/)
    await observe.click()

    const observeShell = page.locator('[data-lesson-shell]')
    await expect(observeShell, 'OSSERVA deve mantenere la Lesson Shell e l’identità della lezione.').toBeVisible()
    await expect(observeShell).toContainText(fixture.classLabel)
    await expect(observeShell).toContainText('Il territorio agricolo come sistema')
    await expect(page).toHaveURL(/subtask=observe/)
    await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
    await expect(page.getByText('EVIDENZA ATTESA', { exact: true })).toBeVisible()
    await expect(page.getByText(/Non inserire nomi, gruppi identificabili o dati individuali degli alunni/)).toBeVisible()
    await expect(page.getByText('Vedi criteri completi', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Torna alla lezione', exact: true })).toBeVisible()

    if (testInfo.project.name.startsWith('mobile')) {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 800 })
        await expectNoHorizontalOverflow(page, `CONDUCI → OSSERVA a ${width}px`)
      }
    }
  } finally {
    await fixture.restore()
  }
})

async function currentSecondCSectionId() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla prova Materiali')
  }

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'DOS-UX-01 material state',
  })
  const { data: contextRows, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`Material workspace lookup failed: ${contextError.message}`)
  const context = contextRows?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('Material state: workspace o anno scolastico corrente non disponibile')
  }

  const { data: section, error: sectionError } = await supabase
    .from('annual_plan_sections')
    .select('id')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('grade', 'SECONDA')
    .eq('section_code', 'C')
    .limit(1)
    .maybeSingle()
  if (sectionError) throw new Error(`Material section lookup failed: ${sectionError.message}`)
  if (!section?.id) throw new Error('Material state: la 2C tenant-local non è disponibile')
  return section.id
}

async function createRecordedTeachObserveFixture() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla fixture CONDUCI → OSSERVA')
  }

  const { supabase, userId } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'DOS-UX-01 teach-observe fixture',
  })
  const { data: contextRows, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`Teach-observe workspace lookup failed: ${contextError.message}`)
  const context = contextRows?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('Teach-observe fixture: workspace o anno scolastico corrente non disponibile')
  }

  const { data: section, error: sectionError } = await supabase
    .from('annual_plan_sections')
    .select('id,workspace_id,academic_year_id,grade,section_code,status')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('grade', 'SECONDA')
    .eq('section_code', 'C')
    .limit(1)
    .maybeSingle()
  if (sectionError) throw new Error(`Teach-observe section lookup failed: ${sectionError.message}`)
  if (!section) throw new Error('Teach-observe fixture: la 2C tenant-local non è disponibile')

  const { data: binding, error: bindingError } = await supabase
    .from('canonical_plan_runtime_bindings')
    .select('asset_id,generation_id')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('canonical_plan_code', 'CAN-PLAN-2')
    .maybeSingle()
  if (bindingError) throw new Error(`Teach-observe canonical binding lookup failed: ${bindingError.message}`)
  if (!binding?.asset_id || !binding?.generation_id) {
    throw new Error('Teach-observe fixture: CAN-PLAN-2 non è collegato al tenant E2E corrente')
  }

  const identity = {
    sectionId: section.id,
    generationId: binding.generation_id,
    blockId: TEACH_OBSERVE_BLOCK_ID,
  }
  const { data: previous, error: previousError } = await supabase
    .from('annual_plan_block_progress')
    .select('status,executed_on,evidence_note')
    .eq('section_id', identity.sectionId)
    .eq('canonical_generation_id', identity.generationId)
    .eq('block_id', identity.blockId)
    .maybeSingle()
  if (previousError) throw new Error(`Teach-observe progress snapshot failed: ${previousError.message}`)

  const { error: writeError } = await supabase
    .from('annual_plan_block_progress')
    .upsert({
      section_id: identity.sectionId,
      canonical_plan_asset_id: binding.asset_id,
      canonical_generation_id: identity.generationId,
      block_id: identity.blockId,
      status: 'SVOLTO',
      executed_on: currentRomeDate(),
      evidence_note: 'HVA temporaneo · CONDUCI → OSSERVA',
      updated_by: userId,
    }, { onConflict: 'section_id,canonical_generation_id,block_id' })
  if (writeError) throw new Error(`Teach-observe recorded-state setup failed: ${writeError.message}`)

  return {
    sectionId: section.id,
    classLabel: `2ª ${section.section_code}`,
    restore: async () => {
      if (previous) {
        const { error } = await supabase
          .from('annual_plan_block_progress')
          .update({
            status: previous.status,
            executed_on: previous.executed_on,
            evidence_note: previous.evidence_note,
            updated_by: userId,
          })
          .eq('section_id', identity.sectionId)
          .eq('canonical_generation_id', identity.generationId)
          .eq('block_id', identity.blockId)
        if (error) throw new Error(`Teach-observe progress restore failed: ${error.message}`)
        return
      }

      const { error } = await supabase
        .from('annual_plan_block_progress')
        .delete()
        .eq('section_id', identity.sectionId)
        .eq('canonical_generation_id', identity.generationId)
        .eq('block_id', identity.blockId)
      if (error) throw new Error(`Teach-observe progress cleanup failed: ${error.message}`)
    },
  }
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function assertResponsiveWidths(page, target, label) {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await expectNoHorizontalOverflow(page, `${label} a ${width}px`)
    const box = await target.boundingBox()
    expect(box, `${label}: CTA non misurabile a ${width}px`).not.toBeNull()
    expect(box.x, `${label}: CTA tagliata a sinistra a ${width}px`).toBeGreaterThanOrEqual(-1)
    expect(box.x + box.width, `${label}: CTA tagliata a destra a ${width}px`).toBeLessThanOrEqual(width + 1)
    expect(box.height, `${label}: target sotto i 44px a ${width}px`).toBeGreaterThanOrEqual(44)
  }
}

async function expectNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(
    geometry.scrollWidth,
    `${label}: overflow orizzontale ${geometry.scrollWidth}px su ${geometry.innerWidth}px.`,
  ).toBeLessThanOrEqual(geometry.innerWidth + 1)
}

async function expectTouchTarget(locator, label) {
  const box = await locator.boundingBox()
  expect(box, `${label}: target non misurabile`).not.toBeNull()
  expect(box.height, `${label}: altezza target sotto 44px`).toBeGreaterThanOrEqual(44)
  expect(box.width, `${label}: larghezza target sotto 44px`).toBeGreaterThanOrEqual(44)
}

async function expectVisibleFocus(locator, label) {
  const indicator = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    }
  })
  const outlineVisible = indicator.outlineStyle !== 'none' && indicator.outlineWidth !== '0px'
  const shadowVisible = indicator.boxShadow !== 'none'
  expect(outlineVisible || shadowVisible, `${label}: nessun indicatore di focus visibile`).toBe(true)
}
