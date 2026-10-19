import { expect, test } from '@playwright/test'
import { createClassroomMaterialFixture } from '../support/classroom-material-fixture.mjs'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { deleteKnowledgeAsset } from '../support/knowledge-fixture-hygiene.mjs'

requireE2ECredentials()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BLOCK_ID = 'B01'
const LESSON_TITLE = 'Energia: forme, trasformazioni e fabbisogni'

test('Beta REWORK: 3ª E B01 preserves PREPARA → MATERIALI → VISUALIZZA', async ({ page }, testInfo) => {
  await loginE2E(page)
  const sectionId = await currentThirdESectionId()
  let materialFixture = null

  try {
    materialFixture = await createClassroomMaterialFixture({
      sectionId,
      expectedClassLabel: '3E',
      suffix: `terza-b01-rework-${process.env.GITHUB_RUN_ID ?? 'local'}-${testInfo.project.name}-${Date.now()}`,
    })

    await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/${BLOCK_ID}?mode=prepare`)

    const shell = page.locator('[data-lesson-shell]')
    await expect(
      shell,
      'La 3ª E/B01 deve aprire PREPARA task-centric invece del fallback Progetta.',
    ).toBeVisible()
    await expect(shell).toContainText('3ª E')
    await expect(shell).toContainText(LESSON_TITLE)
    await expect(page.locator('[data-lesson-phase="prepare"]')).toHaveAttribute('aria-current', 'step')

    const main = page.locator('#dos-main-content')
    await expect(
      main,
      'Gli identificatori canonici devono restare fuori dal primo livello della superficie docente.',
    ).not.toContainText(/CAN-PLAN-3|CAN-PACK-3A|UDA\s*3-01|\bB01\b/)

    const backToClass = page.getByRole('link', { name: 'Torna alla classe', exact: true })
    await expect(backToClass).toBeVisible()
    await expect(
      backToClass,
      'Torna alla classe non deve essere la CTA primaria dominante di PREPARA.',
    ).not.toHaveClass(/\bprimary\b/)

    const materials = page.getByRole('button', { name: 'Materiali', exact: true })
      .or(page.getByRole('link', { name: 'Materiali', exact: true }))
    await expect(materials).toBeVisible()
    await expectTouchTarget(materials, 'Ingresso Materiali 3ª E')
    await materials.click()

    const materialsTask = page.locator('[data-lesson-subtask="materials"]')
    await expect(materialsTask).toBeVisible()
    await expect(materialsTask.getByText('Materiali disponibili', { exact: true })).toBeVisible()

    const preview = materialsTask.getByRole('link', { name: 'Controlla', exact: true }).first()
    await expect(
      preview,
      'Il materiale della 3ª E deve essere apribile dal subtask Materiali.',
    ).toBeVisible()
    await preview.click()

    const materialPreview = page.locator('[data-lesson-material-preview]')
    await expect(
      materialPreview,
      'Aprire il materiale non deve tornare silenziosamente a PREPARA.',
    ).toBeVisible()
    await expect(page.locator('[data-lesson-shell]')).toContainText('3ª E')
    await expect(page.locator('[data-lesson-shell]')).toContainText(LESSON_TITLE)
    await expect(page).toHaveURL(/\/knowledge\/[^/?#]+\?[^#]*mode=prepare/)
    await expect(materialPreview.getByRole('button', { name: 'Usa nella lezione', exact: true })).toBeVisible()

    const backToMaterials = page.getByRole('link', { name: 'Torna ai materiali', exact: true })
    await expect(backToMaterials).toBeVisible()
    await backToMaterials.click()
    await expect(page.locator('[data-lesson-subtask="materials"]')).toBeVisible()
    await expect(page.locator('[data-lesson-shell]')).toContainText(LESSON_TITLE)

    if (testInfo.project.name.startsWith('mobile')) {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 800 })
        await expectNoHorizontalOverflow(page, `3ª E PREPARA → MATERIALI a ${width}px`)
      }
    }
  } finally {
    if (materialFixture) await deleteKnowledgeAsset(page, materialFixture.assetId).catch(() => {})
  }
})

async function currentThirdESectionId() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla prova 3ª E/B01')
  }

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'DOS-UX-01 Terza E B01 rework',
  })
  const { data: contextRows, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`Terza E workspace lookup failed: ${contextError.message}`)
  const context = contextRows?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('Terza E rework: workspace o anno scolastico corrente non disponibile')
  }

  const { data: section, error: sectionError } = await supabase
    .from('annual_plan_sections')
    .select('id')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('grade', 'TERZA')
    .eq('section_code', 'E')
    .limit(1)
    .maybeSingle()
  if (sectionError) throw new Error(`Terza E section lookup failed: ${sectionError.message}`)
  if (!section?.id) throw new Error('Terza E rework: la 3ª E tenant-local non è disponibile')
  return section.id
}

async function expectTouchTarget(locator, label) {
  const box = await locator.boundingBox()
  expect(box, `${label}: target non misurabile`).not.toBeNull()
  expect(box.height, `${label}: altezza target sotto 44px`).toBeGreaterThanOrEqual(44)
  expect(box.width, `${label}: larghezza target sotto 44px`).toBeGreaterThanOrEqual(44)
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
