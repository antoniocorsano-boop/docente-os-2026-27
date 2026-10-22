import { expect, test } from '@playwright/test'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BLOCK_ID = 'B01'

test('Journey: legacy Registra resolves an already recorded lesson automatically', async ({ page }) => {
  await loginE2E(page)
  const fixture = await createRegisterFixture()

  const recordHref = `/classi/${encodeURIComponent(fixture.sectionId)}/lezioni/${BLOCK_ID}?date=${encodeURIComponent(fixture.localDate)}&occurrence=${encodeURIComponent(fixture.occurrenceLogicalId)}&mode=record`
  await page.goto(recordHref)

  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
  await expect(page.getByText('Registrata', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/LEZIONE REGISTRATA/).first()).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Esito effettivo', exact: true })).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Osserva', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Materiali', exact: true })).toBeVisible()
})

async function createRegisterFixture() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla fixture REGISTRA → CONTINUA')
  }

  const { supabase } = await authenticatedAal2Supabase({
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
    .select('id')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('grade', 'SECONDA')
    .eq('section_code', 'C')
    .limit(1)
    .maybeSingle()
  if (sectionError) throw new Error(`Register-continue section lookup failed: ${sectionError.message}`)
  if (!section?.id) throw new Error('Register-continue fixture: la 2C tenant-local non è disponibile')

  const { data: sessions, error: sessionError } = await supabase
    .from('teaching_sessions')
    .select('id,local_date,projected_occurrence_logical_id,recorded_at')
    .eq('workspace_id', context.workspace_id)
    .eq('academic_year_id', context.academic_year_id)
    .eq('section_id', section.id)
    .eq('source_kind', 'PROJECTED_OCCURRENCE')
    .not('projected_occurrence_logical_id', 'is', null)
    .order('local_date', { ascending: false })
    .order('recorded_at', { ascending: false })
    .limit(50)
  if (sessionError) throw new Error(`Register-continue TeachingSession lookup failed: ${sessionError.message}`)
  if (!sessions?.length) {
    throw new Error('Register-continue fixture: nessuna TeachingSession occurrence-bound disponibile nella 2C corrente')
  }

  const { data: allocations, error: allocationError } = await supabase
    .from('teaching_session_allocations')
    .select('session_id,block_id')
    .in('session_id', sessions.map((session) => session.id))
    .eq('block_id', BLOCK_ID)
  if (allocationError) throw new Error(`Register-continue allocation lookup failed: ${allocationError.message}`)

  const b01SessionIds = new Set((allocations ?? []).map((allocation) => allocation.session_id))
  const selected = sessions.find((session) => b01SessionIds.has(session.id) && session.local_date && session.projected_occurrence_logical_id)
  if (!selected) {
    throw new Error('Register-continue fixture: nessuna TeachingSession B01 occurrence-bound disponibile nella 2C corrente')
  }

  return {
    sectionId: section.id,
    localDate: selected.local_date,
    occurrenceLogicalId: selected.projected_occurrence_logical_id,
  }
}
