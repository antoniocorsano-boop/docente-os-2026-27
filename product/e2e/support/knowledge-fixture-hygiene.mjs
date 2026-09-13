import { createClient } from '@supabase/supabase-js'
import { E2E_EMAIL, E2E_PASSWORD, E2E_TOTP_SECRET, requireE2ECredentials } from './e2e-auth.mjs'
import { generateTotp, governedMfaRetryJitterMs, millisecondsUntilNextTotpStep } from './totp.mjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const KNOWLEDGE_BUCKET = 'knowledge-assets'

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required for Knowledge fixture hygiene')
}

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

export async function knowledgeFixtureSnapshot(titleFragment) {
  const { supabase, userId } = await fixtureIdentity()
  const { data: assets, error: assetError } = await supabase
    .from('knowledge_assets')
    .select('id, original_name, content_category, disciplines, class_labels, context_status, reliability, processing_status, current_generation_id, captured_at, source_metadata')
    .eq('created_by', userId)
    .ilike('original_name', `%${titleFragment}%`)
    .order('captured_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)

  if (assetError) throw new Error(`Knowledge fixture snapshot failed: ${assetError.message}`)
  const asset = assets?.[0] ?? null
  if (!asset) return null
  if (!asset.current_generation_id) return { asset, document: null, units: [] }

  const { data: document, error: documentError } = await supabase
    .from('knowledge_documents')
    .select('id, asset_id, generation_id, document_type, extracted_data, processing_version')
    .eq('asset_id', asset.id)
    .eq('generation_id', asset.current_generation_id)
    .maybeSingle()

  if (documentError) throw new Error(`Knowledge fixture document snapshot failed: ${documentError.message}`)
  if (!document) return { asset, document: null, units: [] }

  const { data: units, error: unitError } = await supabase
    .from('knowledge_units')
    .select('id, unit_type, title, content, structured_data, validation_status, confidence, ordinal')
    .eq('document_id', document.id)
    .order('ordinal', { ascending: true })

  if (unitError) throw new Error(`Knowledge fixture unit snapshot failed: ${unitError.message}`)
  return { asset, document, units: units ?? [] }
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

  await promoteFixtureIdentityToAal2(supabase)
  return { supabase, userId: data.user.id }
}

async function promoteFixtureIdentityToAal2(supabase) {
  const factor = await findGovernedVerifiedFactor(supabase)
  const runJitter = governedMfaRetryJitterMs()

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 6_000 + runJitter) await sleep(remaining + 750 + runJitter)
    else if (runJitter) await sleep(runJitter)

    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challenge.error) {
      if (attempt === 4) throw new Error(`Knowledge fixture MFA challenge failed: ${challenge.error.message}`)
      await sleep(millisecondsUntilNextTotpStep() + 750 + runJitter)
      continue
    }

    const verifiedResult = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code: generateTotp(E2E_TOTP_SECRET),
    })

    if (!verifiedResult.error) {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!assurance.error && assurance.data.currentLevel === 'aal2') return
    }

    if (attempt === 4) {
      throw new Error(`Knowledge fixture MFA verification failed: ${verifiedResult.error?.message ?? 'session did not reach aal2'}`)
    }
    await sleep(millisecondsUntilNextTotpStep() + 750 + runJitter)
  }
}

async function findGovernedVerifiedFactor(supabase) {
  let lastError = null
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const listed = await supabase.auth.mfa.listFactors()
    if (!listed.error) {
      const verified = listed.data.totp.filter((factor) => factor.status === 'verified')
      const factor = verified.find((candidate) => candidate.friendly_name === 'Docente OS CI')
        ?? (verified.length === 1 ? verified[0] : null)
      if (factor) return factor
      lastError = new Error('verified Docente OS CI factor unavailable')
    } else {
      lastError = listed.error
    }
    await sleep(Math.min(1_000 * attempt, 4_000) + governedMfaRetryJitterMs())
  }
  throw new Error(`Knowledge fixture MFA factor lookup failed: ${lastError?.message ?? 'unknown error'}`)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
