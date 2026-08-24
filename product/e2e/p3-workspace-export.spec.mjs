import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test('P3 workspace export: owner riceve dati DB e inventario Storage senza mutazioni', async ({ page, baseURL }) => {
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD are required')

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /Entra nel tuo spazio docente/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))

  const response = await page.context().request.get(`${baseURL}/api/account/export-manifest`)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/json')
  expect(response.headers()['content-disposition']).toContain('docente-os-workspace-')
  expect(response.headers()['cache-control']).toContain('no-store')

  const payload = await response.json()
  expect(payload.exportKind).toBe('DOCENTE_OS_WORKSPACE_EXPORT')
  expect(payload.schemaVersion).toBe(1)
  expect(payload.workspace.role).toBe('OWNER')
  expect(payload.deletionReady).toBe(false)

  const tableCounts = payload.inventory?.tableCounts ?? {}
  for (const table of [
    'workspaces',
    'workspace_memberships',
    'academic_years',
    'planner_tasks',
    'knowledge_assets',
    'authored_documents',
    'assistant_write_proposals',
  ]) {
    expect(typeof tableCounts[table], `${table} count`).toBe('number')
    expect(Array.isArray(payload.data?.[table]), `${table} rows`).toBe(true)
    expect(payload.data[table].length).toBe(tableCounts[table])
  }

  expect(payload.inventory?.storage?.bucket).toBe('knowledge-assets')
  expect(Array.isArray(payload.inventory?.storage?.objects)).toBe(true)
  expect(payload.inventory.storage.objectCount).toBe(payload.inventory.storage.objects.length)

  for (const object of payload.inventory.storage.objects) {
    expect(object.path.startsWith(`${payload.workspace.id}/`)).toBe(true)
  }
})

test('P3 workspace export: endpoint anonimo è negato', async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/api/account/export-manifest`)
  expect(response.status()).toBe(401)
})
