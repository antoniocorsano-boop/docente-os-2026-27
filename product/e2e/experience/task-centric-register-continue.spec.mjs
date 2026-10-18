import { expect, test } from '@playwright/test'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BLOCK_ID = 'B01'

test('Journey: Registra → Continua starts from factual outcome', async ({ page }) => {
  await loginE2E(page)
  const fixture = await createRegisterFixture()

  try {
    const recordHref = `/classi/${encodeURIComponent(fixture.sectionId)}/lezioni/${BLOCK_ID}?mode=record`
    await page.goto(recordHref)

    await expect(
      page,
      'La fixture REGISTRA → CONTINUA deve entrare davvero nella registrazione della lezione tenant-local.',
    ).toHaveURL(new RegExp(`/classi/${fixture.sectionId}/lezioni/${BLOCK_ID}\\?mode=record`))
    await expect(page.getByText(/REGISTRA LA LEZIONE/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Chiudi la lezione senza ricopiare tutto' })).toBeVisible()

    const outcome = page.getByRole('combobox', { name: 'Esito effettivo', exact: true })
    await expect(
      outcome,
      'REGISTRA deve partire dall’esito effettivo della lezione, prima dei dettagli facoltativi.',
    ).toBeVisible()
    await expect(outcome.locator('option[value="SVOLTO"]')).toHaveText('Svolto')
    await expect(outcome.locator('option[value="RECUPERATO"]')).toHaveText('Recuperato')
    await expect(outcome.locator('option[value="RIMODULATO"]')).toHaveText('Rimodulato')
    await expect(outcome.locator('option[value="ANNULLATO"]')).toHaveText('Annullato')

    await expect(page.getByText('1 · DATI ESSENZIALI', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Una nota sulla lezione, solo se serve', { exact: true })).toHaveCount(0)
  } finally {
    await fixture.restore()
  }
})

async function createRegisterFixture() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla fixture REGISTRA → CONTINUA')
  }

  const { supabase, userId } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'DOS-UX-01 register-continue fixture',
  })
  const { data: contextRows, error: contextError } = await supabase.rpc('current_workspace_context')
  if (contextError) throw new Error(`Register-continue workspace lookup failed: ${contextError.message}`)
  const context = contextRows?.[0]
  if (!context?.workspace_id || !context?.academic_year_id) {
    throw new Error('Register-continue fixture: workspace o anno scolastico corrente non disponibile')
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
  if (sectionError) throw new Error(`Register-continue section lookup failed: ${sectionError.message}`)
  if (!section) throw new Error('Register-continue fixture: la 2C tenant-local non è disponibile')

  const { data: binding, error: bindingError } = await supabase
    .from('canonical_plan_runtime_bindings')
    .select('asset_id,generation_id')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('canonical_plan_code', 'CAN-PLAN-2')
    .maybeSingle()
  if (bindingError) throw new Error(`Register-continue canonical binding lookup failed: ${bindingError.message}`)
  if (!binding?.asset_id || !binding?.generation_id) {
    throw new Error('Register-continue fixture: CAN-PLAN-2 non è collegato al tenant E2E corrente')
  }

  const identity = {
    sectionId: section.id,
    generationId: binding.generation_id,
    blockId: BLOCK_ID,
  }
  const { data: previous, error: previousError } = await supabase
    .from('annual_plan_block_progress')
    .select('status,executed_on,evidence_note')
    .eq('section_id', identity.sectionId)
    .eq('canonical_generation_id', identity.generationId)
    .eq('block_id', identity.blockId)
    .maybeSingle()
  if (previousError) throw new Error(`Register-continue progress snapshot failed: ${previousError.message}`)

  const { error: writeError } = await supabase
    .from('annual_plan_block_progress')
    .upsert({
      section_id: identity.sectionId,
      canonical_plan_asset_id: binding.asset_id,
      canonical_generation_id: identity.generationId,
      block_id: identity.blockId,
      status: 'SVOLTO',
      executed_on: currentRomeDate(),
      evidence_note: 'HVA temporaneo · REGISTRA → CONTINUA',
      updated_by: userId,
    }, { onConflict: 'section_id,canonical_generation_id,block_id' })
  if (writeError) throw new Error(`Register-continue recorded-state setup failed: ${writeError.message}`)

  return {
    sectionId: section.id,
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
        if (error) throw new Error(`Register-continue progress restore failed: ${error.message}`)
        return
      }

      const { error } = await supabase
        .from('annual_plan_block_progress')
        .delete()
        .eq('section_id', identity.sectionId)
        .eq('canonical_generation_id', identity.generationId)
        .eq('block_id', identity.blockId)
      if (error) throw new Error(`Register-continue progress cleanup failed: ${error.message}`)
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
