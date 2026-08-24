import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const runId = process.env.GITHUB_RUN_ID ?? 'local'
const confirmedTitle = `X4A attività confermata ${runId}`
const rejectedTitle = `X4A attività rifiutata ${runId}`

if (!password) throw new Error('E2E_PASSWORD is required for the authenticated X4 acceptance test')

test('X4A Planner gate: preview, explicit confirmation, receipt and undo', async ({ page }) => {
  const identity = await authenticatedSupabase()
  await cleanup(identity, confirmedTitle)
  await login(page)

  try {
    await page.goto('/planner')
    await expect(page.getByText(confirmedTitle, { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: /Chiedi a DOCENTE OS/ }).click()
    const panel = page.locator('.dosAssistantPanel.floating.expanded')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('Crea un’attività nel Planner', { exact: true })).toBeVisible()
    await expect(panel.getByText('Reversibile', { exact: true })).toBeVisible()

    const write = panel.locator('.dosAssistantWrite')
    await write.getByLabel('Attività').fill(confirmedTitle)
    await write.getByLabel('Nota facoltativa').fill('Fixture X4A: verificare preview, ricevuta e annullamento.')
    await write.getByLabel('Quando').selectOption('today')
    await write.getByLabel('Priorità').selectOption('HIGH')
    await write.getByRole('button', { name: 'Mostra anteprima' }).click()

    const preview = write.getByRole('region', { name: 'Anteprima dell’azione' })
    await expect(preview).toBeVisible()
    await expect(preview).toContainText(confirmedTitle)
    await expect(preview).toContainText('Cosa cambia')
    await expect(preview).toContainText('Cosa resta invariato')
    await expect(preview).toContainText(/Non modifica il Piano annuale/i)
    await expect(preview).toContainText(/Non crea o modifica eventi nel Calendario/i)
    await expect(preview).toContainText(/Non modifica l’Orario/i)
    await expect(preview).toContainText(/Confermando autorizzi solo questa attività/i)

    const previewState = await fixtureState(identity, confirmedTitle)
    expect(previewState.tasks).toHaveLength(0)
    expect(previewState.proposals).toHaveLength(1)
    expect(previewState.proposals[0].status).toBe('PREVIEW_READY')
    expect(previewState.proposals[0].confirmed_by).toBeNull()
    expect(previewState.proposals[0].effect_ref).toBeNull()

    await page.screenshot({ path: 'test-results/x4a-01-preview.png' })
    await write.getByRole('button', { name: 'Conferma e crea' }).click()
    await expect(write.getByText('Attività creata nel Planner', { exact: true })).toBeVisible()

    const executedState = await fixtureState(identity, confirmedTitle)
    expect(executedState.tasks).toHaveLength(1)
    expect(executedState.tasks[0].title).toBe(confirmedTitle)
    expect(executedState.tasks[0].source_kind).toBe('SYSTEM')
    expect(executedState.tasks[0].source_ref).toMatch(/^assistant-write:/)
    expect(executedState.proposals).toHaveLength(1)
    expect(executedState.proposals[0].status).toBe('EXECUTED')
    expect(executedState.proposals[0].confirmed_by).toBe(identity.userId)
    expect(executedState.proposals[0].confirmed_at).toBeTruthy()
    expect(executedState.proposals[0].executed_at).toBeTruthy()
    expect(executedState.proposals[0].effect_ref).toBe(executedState.tasks[0].id)
    expect(executedState.proposals[0].payload_fingerprint).toMatch(/^[0-9a-f]{64}$/)

    await page.screenshot({ path: 'test-results/x4a-02-executed.png' })
    await write.getByRole('button', { name: 'Annulla creazione' }).click()
    await expect(write.getByText('Creazione annullata', { exact: true })).toBeVisible()

    const undoneState = await fixtureState(identity, confirmedTitle)
    expect(undoneState.tasks).toHaveLength(1)
    expect(undoneState.tasks[0].status).toBe('CANCELLED')
    expect(undoneState.proposals).toHaveLength(1)
    expect(undoneState.proposals[0].status).toBe('UNDONE')
    expect(undoneState.proposals[0].undone_at).toBeTruthy()
    await page.screenshot({ path: 'test-results/x4a-03-undone.png' })
  } finally {
    await cleanup(identity, confirmedTitle)
  }
})

test('X4A Planner gate: rejection leaves no task', async ({ page }) => {
  const identity = await authenticatedSupabase()
  await cleanup(identity, rejectedTitle)
  await login(page)

  try {
    await page.goto('/planner')
    await page.getByRole('button', { name: /Chiedi a DOCENTE OS/ }).click()
    const write = page.locator('.dosAssistantWrite')
    await write.getByLabel('Attività').fill(rejectedTitle)
    await write.getByRole('button', { name: 'Mostra anteprima' }).click()
    await write.getByRole('button', { name: 'Non creare' }).click()
    await expect(write.getByText('Proposta annullata', { exact: true })).toBeVisible()

    const state = await fixtureState(identity, rejectedTitle)
    expect(state.tasks).toHaveLength(0)
    expect(state.proposals).toHaveLength(1)
    expect(state.proposals[0].status).toBe('REJECTED')
    expect(state.proposals[0].effect_ref).toBeNull()
  } finally {
    await cleanup(identity, rejectedTitle)
  }
})

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await Promise.all([
    page.waitForURL(/\/workspace(?:$|\?)/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
  ])
}

async function authenticatedSupabase() {
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(`X4 fixture identity failed: ${error?.message ?? 'missing user'}`)
  return { supabase, userId: data.user.id }
}

async function fixtureState({ supabase, userId }, title) {
  const { data: tasks, error: taskError } = await supabase
    .from('planner_tasks')
    .select('id,title,status,source_kind,source_ref,created_by')
    .eq('created_by', userId)
    .eq('title', title)
  if (taskError) throw new Error(`X4 task lookup failed: ${taskError.message}`)

  const { data: proposals, error: proposalError } = await supabase
    .from('assistant_write_proposals')
    .select('id,status,payload_fingerprint,confirmed_by,confirmed_at,executed_at,effect_ref,undone_at,created_by,payload')
    .eq('created_by', userId)
    .contains('payload', { title })
  if (proposalError) throw new Error(`X4 proposal lookup failed: ${proposalError.message}`)
  return { tasks: tasks ?? [], proposals: proposals ?? [] }
}

async function cleanup(identity, title) {
  const state = await fixtureState(identity, title)
  for (const proposal of state.proposals) {
    if (proposal.status === 'PREVIEW_READY') {
      const { error } = await identity.supabase.rpc('reject_assistant_write_proposal', { target_proposal_id: proposal.id })
      if (error) throw new Error(`X4 preview cleanup failed: ${error.message}`)
    }
    if (proposal.status === 'EXECUTED') {
      const { error } = await identity.supabase.rpc('undo_assistant_planner_create_task', { target_proposal_id: proposal.id })
      if (error) throw new Error(`X4 execution cleanup failed: ${error.message}`)
    }
  }

  const refreshed = await fixtureState(identity, title)
  const active = refreshed.tasks.filter((task) => task.status === 'OPEN' || task.status === 'WAITING')
  if (active.length) throw new Error(`X4 cleanup left ${active.length} active Planner fixture(s)`)
}
