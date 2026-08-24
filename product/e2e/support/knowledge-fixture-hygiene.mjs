import { createClient } from '@supabase/supabase-js'
import { E2E_EMAIL, E2E_PASSWORD, requireE2ECredentials } from './e2e-auth.mjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'

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
