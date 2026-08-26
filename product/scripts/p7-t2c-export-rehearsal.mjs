import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const required = [
  'PRODUCTION_SUPABASE_URL',
  'PRODUCTION_SUPABASE_PUBLISHABLE_KEY',
  'PRODUCTION_E2E_EMAIL',
  'PRODUCTION_E2E_PASSWORD',
  'GITHUB_RUN_ID',
]
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`)
}

const url = process.env.PRODUCTION_SUPABASE_URL
if (!url.includes('xpxhlmpsvfzgsjxgieks.supabase.co')) {
  throw new Error('Refusing rehearsal outside the certified Production Supabase project')
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
const anonymous = createClient(url, process.env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY, clientOptions)
const unauthenticated = await anonymous.rpc('workspace_export_manifest')
if (!unauthenticated.error) throw new Error('Unauthenticated export request was not rejected')

const supabase = createClient(url, process.env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY, clientOptions)
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.PRODUCTION_E2E_EMAIL,
  password: process.env.PRODUCTION_E2E_PASSWORD,
})
if (authError || !authData.user) throw new Error(`Technical authentication failed: ${authError?.message ?? 'no user'}`)

const { data: initialContext, error: initialContextError } = await supabase.rpc('current_workspace_context')
if (initialContextError) throw new Error(`Initial workspace context failed: ${initialContextError.message}`)
if ((initialContext ?? []).length !== 0) {
  throw new Error('Refusing rehearsal because the technical identity already has an application workspace')
}

const workspaceName = `__P7_T2C_EXPORT_REHEARSAL_${process.env.GITHUB_RUN_ID}__`
const { data: workspaceId, error: bootstrapError } = await supabase.rpc('bootstrap_personal_workspace', {
  workspace_name: workspaceName,
})
if (bootstrapError || !workspaceId) throw new Error(`Synthetic workspace bootstrap failed: ${bootstrapError?.message ?? 'no workspace id'}`)

const bucket = 'knowledge-assets'
const objectDir = `${workspaceId}/p7-t2c-export-rehearsal/${process.env.GITHUB_RUN_ID}`
const objectName = 'synthetic-export-asset.txt'
const objectPath = `${objectDir}/${objectName}`
const sentinel = Buffer.from(`DOCENTE_OS_P7_T2C_EXPORT_SYNTHETIC:${process.env.GITHUB_RUN_ID}\n`, 'utf8')
const assetSha256 = createHash('sha256').update(sentinel).digest('hex')

let uploaded = false
let assetExportVerified = false
let storageCleanupVerified = false
try {
  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, sentinel, {
    contentType: 'text/plain', upsert: false, cacheControl: '60',
  })
  if (uploadError) throw new Error(`Synthetic export asset upload failed: ${uploadError.message}`)
  uploaded = true

  const { data: manifest, error: manifestError } = await supabase.rpc('workspace_export_manifest')
  if (manifestError || !manifest) throw new Error(`Owner export manifest failed: ${manifestError?.message ?? 'no manifest'}`)
  if (manifest.schemaVersion !== 1) throw new Error('Unexpected workspace export manifest schemaVersion')
  if (manifest.identity?.workspaceId !== workspaceId || manifest.identity?.role !== 'OWNER') {
    throw new Error('Export manifest identity is not bound to the synthetic OWNER workspace')
  }

  const requiredCollections = [
    'workspaces','workspace_memberships','academic_years','teacher_workspace_settings','teaching_disciplines',
    'annual_plan_sections','annual_plan_block_progress','teaching_assignments','timetable_versions','timetable_slots',
    'calendar_days','calendar_events','teaching_sessions','teaching_session_allocations','planner_tasks',
    'assistant_write_proposals','knowledge_assets','knowledge_documents','knowledge_processing_generations',
    'knowledge_ingestion_runs','knowledge_units','knowledge_links','authored_documents','authored_document_versions',
    'experience_feedback',
  ]
  for (const key of requiredCollections) {
    if (!Array.isArray(manifest.data?.[key])) throw new Error(`Export manifest missing collection: ${key}`)
  }
  if (manifest.data.workspaces.length !== 1 || manifest.data.workspace_memberships.length !== 1) {
    throw new Error('Synthetic workspace ownership rows are not completely represented in export')
  }

  const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8')
  const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex')

  const { data: downloaded, error: downloadError } = await supabase.storage.from(bucket).download(objectPath)
  if (downloadError || !downloaded) throw new Error(`Synthetic asset export download failed: ${downloadError?.message ?? 'no payload'}`)
  const downloadedBuffer = Buffer.from(await downloaded.arrayBuffer())
  const downloadedSha256 = createHash('sha256').update(downloadedBuffer).digest('hex')
  if (downloadedSha256 !== assetSha256 || downloadedBuffer.length !== sentinel.length) {
    throw new Error('Exported synthetic asset integrity mismatch')
  }
  assetExportVerified = true

  const packageIndex = {
    schemaVersion: 1,
    workspaceId,
    databaseManifest: { bytes: manifestBytes.length, sha256: manifestSha256 },
    assets: [{ bucket, path: objectPath, bytes: sentinel.length, sha256: assetSha256 }],
  }
  const packageIndexBytes = Buffer.from(JSON.stringify(packageIndex), 'utf8')
  const packageIndexSha256 = createHash('sha256').update(packageIndexBytes).digest('hex')

  const { error: removeError } = await supabase.storage.from(bucket).remove([objectPath])
  if (removeError) throw new Error(`Synthetic asset cleanup failed: ${removeError.message}`)
  const { data: redownloaded, error: redownloadError } = await supabase.storage.from(bucket).download(objectPath)
  if (!redownloadError || redownloaded) throw new Error('Synthetic export asset remained downloadable after cleanup')
  storageCleanupVerified = true

  const receipt = {
    gate: 'T2C_PERSONAL_DATA_EXPORT_REHEARSAL',
    environment: 'PRODUCTION_SYNTHETIC_ONLY',
    result: 'PASS',
    workspaceId,
    workspaceName,
    requestAuthenticationBoundary: {
      unauthenticatedRequestRejected: true,
      authenticatedTechnicalIdentity: true,
      ownerRoleVerified: true,
    },
    databaseExport: {
      manifestSchemaVersion: manifest.schemaVersion,
      collectionCount: requiredCollections.length,
      requiredCollectionsVerified: true,
      bytes: manifestBytes.length,
      sha256: manifestSha256,
    },
    assetExport: {
      bucket, objectPath, bytes: sentinel.length, sha256: assetSha256,
      downloadIntegrityVerified: assetExportVerified,
    },
    packageIndex: { schemaVersion: 1, sha256: packageIndexSha256 },
    syntheticAssetCleanupVerified: storageCleanupVerified,
    workspaceCleanupRequiredByOperator: true,
    realUserDataTouched: false,
    tier2AdmissionEffect: 'NONE',
  }
  await writeFile('../p7-t2c-export-rehearsal.json', `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(receipt))
} finally {
  if (uploaded && !storageCleanupVerified) {
    await supabase.storage.from(bucket).remove([objectPath])
  }
}
