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

const supabase = createClient(url, process.env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

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

const workspaceName = `__P7_T2B_STORAGE_REHEARSAL_${process.env.GITHUB_RUN_ID}__`
const { data: workspaceId, error: bootstrapError } = await supabase.rpc('bootstrap_personal_workspace', {
  workspace_name: workspaceName,
})
if (bootstrapError || !workspaceId) throw new Error(`Synthetic workspace bootstrap failed: ${bootstrapError?.message ?? 'no workspace id'}`)

const bucket = 'knowledge-assets'
const objectDir = `${workspaceId}/p7-t2b-storage-rehearsal/${process.env.GITHUB_RUN_ID}`
const objectName = 'sentinel.txt'
const objectPath = `${objectDir}/${objectName}`
const sentinel = Buffer.from(`DOCENTE_OS_P7_T2B_STORAGE_SYNTHETIC:${process.env.GITHUB_RUN_ID}\n`, 'utf8')
const sha256 = createHash('sha256').update(sentinel).digest('hex')

let uploaded = false
let downloadedAndVerified = false
let deleteVerified = false
let cleanupAttempted = false

try {
  const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, sentinel, {
    contentType: 'text/plain',
    upsert: false,
    cacheControl: '60',
  })
  if (uploadError) throw new Error(`Synthetic Storage upload failed: ${uploadError.message}`)
  uploaded = true

  const { data: downloaded, error: downloadError } = await supabase.storage.from(bucket).download(objectPath)
  if (downloadError || !downloaded) throw new Error(`Synthetic Storage download failed: ${downloadError?.message ?? 'no payload'}`)
  const downloadedBuffer = Buffer.from(await downloaded.arrayBuffer())
  const downloadedSha = createHash('sha256').update(downloadedBuffer).digest('hex')
  if (downloadedSha !== sha256 || downloadedBuffer.length !== sentinel.length) {
    throw new Error('Synthetic Storage payload integrity mismatch')
  }
  downloadedAndVerified = true

  const { error: removeError } = await supabase.storage.from(bucket).remove([objectPath])
  cleanupAttempted = true
  if (removeError) throw new Error(`Authenticated owner Storage delete failed: ${removeError.message}`)

  const { data: remaining, error: listError } = await supabase.storage.from(bucket).list(objectDir, {
    limit: 100,
    search: objectName,
  })
  if (listError) throw new Error(`Post-delete Storage verification failed: ${listError.message}`)
  if ((remaining ?? []).some((entry) => entry.name === objectName)) {
    throw new Error('Synthetic Storage object still listed after delete')
  }

  const { data: redownloaded, error: redownloadError } = await supabase.storage.from(bucket).download(objectPath)
  if (!redownloadError || redownloaded) {
    throw new Error('Synthetic Storage object remained downloadable after delete')
  }
  deleteVerified = true
} finally {
  if (uploaded && !cleanupAttempted) {
    cleanupAttempted = true
    await supabase.storage.from(bucket).remove([objectPath])
  }
}

const receipt = {
  gate: 'T2B_STORAGE_OWNER_DELETE_REHEARSAL',
  environment: 'PRODUCTION_SYNTHETIC_ONLY',
  result: uploaded && downloadedAndVerified && deleteVerified ? 'PASS' : 'FAIL',
  workspaceId,
  workspaceName,
  bucket,
  objectPath,
  bytes: sentinel.length,
  sha256,
  authenticatedTechnicalIdentity: true,
  uploadVerified: uploaded,
  downloadIntegrityVerified: downloadedAndVerified,
  authenticatedOwnerDeleteVerified: deleteVerified,
  objectAbsentAfterDelete: deleteVerified,
  realUserDataTouched: false,
  workspaceCleanupRequiredByOperator: true,
}

await writeFile('../p7-t2b-storage-rehearsal.json', `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(receipt))
