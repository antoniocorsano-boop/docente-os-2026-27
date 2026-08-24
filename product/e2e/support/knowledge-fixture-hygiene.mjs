import { createClient } from '@supabase/supabase-js'
import { E2E_EMAIL, E2E_PASSWORD, requireE2ECredentials } from './e2e-auth.mjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const KNOWLEDGE_BUCKET = 'knowledge-assets'

let fixtureIdentityPromise = null

export async function knowledgeFixtureAssetIds(_page, titleFragment) {
  const { supabase, userId } = await fixtureIdentity()
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select('id, original_name, captured_at, created_by')
    .eq('created_by', userId)
    .ilike('original_name', `%${titleFragment}%`)
    .order('captured_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) throw new Error(`Knowledge fixture lookup failed: ${error.message}`)
  return [...new Set((data ?? []).map((asset) => asset.id))]
}

export async function deleteKnowledgeAsset(page, assetId, { tolerateMissing = true } = {}) {
  const response = await page.request.delete(`/api/knowledge/${encodeURIComponent(assetId)}`)
  if (response.status() === 204) return true
  if (tolerateMissing && response.status() === 404) return false
  const body = await response.text().catch(() => '')
  throw new Error(`Knowledge cleanup failed for ${assetId}: HTTP ${response.status()} ${body}`)
}

export async function deleteAllKnowledgeFixtures(page, titleFragment) {
  const ids = await knowledgeFixtureAssetIds(page, titleFragment)
  for (const id of ids) await deleteKnowledgeAsset(page, id)
  return ids.length
}

export async function retainNewestKnowledgeFixture(page, titleFragment) {
  const ids = await knowledgeFixtureAssetIds(page, titleFragment)
  const [keep, ...duplicates] = ids
  for (const id of duplicates) await deleteKnowledgeAsset(page, id)
  return keep ?? null
}

export async function deleteOrphanedKnowledgeFixtureObjects(titleFragments) {
  const fragments = [...new Set(titleFragments.filter(Boolean))]
  if (!fragments.length) return []

  const { supabase, userId } = await fixtureIdentity()
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', userId)

  if (membershipError) throw new Error(`Fixture workspace lookup failed: ${membershipError.message}`)

  const { data: assets, error: assetError } = await supabase
    .from('knowledge_assets')
    .select('source_metadata')
    .eq('created_by', userId)

  if (assetError) throw new Error(`Fixture storage reference lookup failed: ${assetError.message}`)

  const referencedPaths = new Set(
    (assets ?? [])
      .map((asset) => asset.source_metadata?.storagePath)
      .filter((value) => typeof value === 'string' && value.length > 0),
  )

  const removed = []
  for (const membership of memberships ?? []) {
    const workspaceId = membership.workspace_id
    const before = await listWorkspaceObjects(supabase, workspaceId)
    const stalePaths = before
      .map((item) => `${workspaceId}/${item.name}`)
      .filter((path) => fragments.some((fragment) => path.includes(fragment)))
      .filter((path) => !referencedPaths.has(path))

    if (!stalePaths.length) continue

    const { error: removeError } = await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .remove(stalePaths)

    if (removeError) throw new Error(`Fixture storage cleanup failed: ${removeError.message}`)

    const remainingPaths = new Set(
      (await listWorkspaceObjects(supabase, workspaceId)).map((item) => `${workspaceId}/${item.name}`),
    )
    const notRemoved = stalePaths.filter((path) => remainingPaths.has(path))
    if (notRemoved.length) {
      throw new Error(`Fixture storage cleanup incomplete: ${notRemoved.join(', ')}`)
    }
    removed.push(...stalePaths)
  }

  return removed
}

async function listWorkspaceObjects(supabase, workspaceId) {
  const { data, error } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .list(workspaceId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  if (error) throw new Error(`Fixture storage listing failed for ${workspaceId}: ${error.message}`)
  return data ?? []
}

async function fixtureIdentity() {
  if (!fixtureIdentityPromise) fixtureIdentityPromise = authenticateFixtureIdentity()
  return fixtureIdentityPromise
}

async function authenticateFixtureIdentity() {
  requireE2ECredentials()
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
  })
  if (error || !data.user) throw new Error(`Knowledge fixture identity failed: ${error?.message ?? 'missing user'}`)
  return { supabase, userId: data.user.id }
}
