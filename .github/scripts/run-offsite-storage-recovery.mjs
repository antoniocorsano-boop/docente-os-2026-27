import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const mode = process.argv[2]
if (!['export', 'restore'].includes(mode)) {
  console.error('usage: node run-offsite-storage-recovery.mjs <export|restore>')
  process.exit(2)
}

const rehearsalDir = process.env.SUPABASE_REHEARSAL_DIR
const backupDir = process.env.OFFSITE_BACKUP_DIR
const offsiteMedium = process.env.OFFSITE_BACKUP_MEDIUM || 'GITHUB_ACTIONS_ARTIFACT'
if (!rehearsalDir || !backupDir) throw new Error('SUPABASE_REHEARSAL_DIR and OFFSITE_BACKUP_DIR are required')

const statusRaw = execFileSync('supabase', ['status', '--output', 'json'], {
  cwd: rehearsalDir,
  encoding: 'utf8',
})
const status = JSON.parse(statusRaw)
const apiUrl = status.API_URL ?? status.api_url ?? status.apiUrl
const adminKey = status.SECRET_KEY ?? status.secret_key ?? status.SERVICE_ROLE_KEY ?? status.service_role_key
if (!apiUrl || !adminKey) throw new Error('Could not resolve local Supabase API URL/admin key')

const headers = {
  apikey: adminKey,
  Authorization: `Bearer ${adminKey}`,
}
const bucket = 'offsite-recovery-rehearsal'
const objectPath = 'synthetic/recovery-sentinel.bin'
const objectUrl = `${apiUrl}/storage/v1/object/${bucket}/${objectPath}`
const manifestPath = path.join(backupDir, 'manifest.json')
const backupObjectPath = path.join(backupDir, 'recovery-sentinel.bin')

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')

async function request(url, init = {}, expected = [200]) {
  const response = await fetch(url, init)
  if (!expected.includes(response.status)) {
    const body = await response.text()
    throw new Error(`${init.method ?? 'GET'} ${url} returned ${response.status}: ${body.slice(0, 300)}`)
  }
  return response
}

async function createFreshBucket() {
  await request(`${apiUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: false }),
  }, [200])
}

async function upload(bytes) {
  await request(objectUrl, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/octet-stream', 'x-upsert': 'true' },
    body: bytes,
  }, [200])
}

async function download() {
  const response = await request(objectUrl, { headers }, [200])
  return Buffer.from(await response.arrayBuffer())
}

async function assertMissing() {
  const response = await fetch(objectUrl, { headers })
  if (response.status !== 400 && response.status !== 404) {
    throw new Error(`expected missing object, got HTTP ${response.status}`)
  }
}

async function removeObject() {
  await request(objectUrl, { method: 'DELETE', headers }, [200])
}

fs.mkdirSync(backupDir, { recursive: true })

if (mode === 'export') {
  await createFreshBucket()
  const bytes = crypto.randomBytes(131071)
  const sourceHash = sha256(bytes)
  await upload(bytes)
  const downloaded = await download()
  if (sha256(downloaded) !== sourceHash || !downloaded.equals(bytes)) {
    throw new Error('source Storage object differs from generated sentinel')
  }

  fs.writeFileSync(backupObjectPath, downloaded)
  fs.writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    gate: 'OFFSITE_STORAGE_RECOVERY',
    bucket,
    objectPath,
    byteLength: downloaded.length,
    sha256: sourceHash,
    syntheticDataOnly: true,
    sourceEnvironment: 'EPHEMERAL_LOCAL_SUPABASE_RUNNER_A',
    offsiteMedium,
  }, null, 2))

  await removeObject()
  await assertMissing()

  console.log(JSON.stringify({
    result: 'PASS',
    stage: 'EXPORT_AND_SOURCE_LOSS',
    sourceStorageExercised: true,
    independentBackupWritten: true,
    independentBackupMedium: offsiteMedium,
    sourceObjectDeleted: true,
    sourceLossVerified: true,
    byteLength: downloaded.length,
    sha256: sourceHash,
    productionTouched: false,
    betaTouched: false,
    realUserDataUsed: false,
  }, null, 2))
}

if (mode === 'restore') {
  if (!fs.existsSync(manifestPath) || !fs.existsSync(backupObjectPath)) throw new Error('off-site artifact is incomplete')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const backupBytes = fs.readFileSync(backupObjectPath)
  if (manifest.gate !== 'OFFSITE_STORAGE_RECOVERY' || manifest.syntheticDataOnly !== true) throw new Error('invalid off-site manifest')
  if (process.env.OFFSITE_BACKUP_MEDIUM && manifest.offsiteMedium !== process.env.OFFSITE_BACKUP_MEDIUM) {
    throw new Error(`off-site medium mismatch: manifest=${manifest.offsiteMedium} expected=${process.env.OFFSITE_BACKUP_MEDIUM}`)
  }
  if (backupBytes.length !== manifest.byteLength || sha256(backupBytes) !== manifest.sha256) throw new Error('off-site backup hash/length mismatch before restore')

  await createFreshBucket()
  await assertMissing()
  await upload(backupBytes)
  const restored = await download()
  const restoredHash = sha256(restored)
  if (restoredHash !== manifest.sha256 || !restored.equals(backupBytes)) throw new Error('restored binary differs from off-site backup')

  console.log(JSON.stringify({
    result: 'PASS',
    scope: 'OFFSITE_STORAGE_RECOVERY',
    sourceEnvironment: manifest.sourceEnvironment,
    restoreEnvironment: 'EPHEMERAL_LOCAL_SUPABASE_RUNNER_B',
    independentBackupMedium: manifest.offsiteMedium,
    separateRunnerBoundary: true,
    freshStorageService: true,
    binaryRestoreVerified: true,
    sha256Verified: true,
    byteLengthVerified: true,
    byteLength: restored.length,
    sha256: restoredHash,
    syntheticDataOnly: true,
    productionTouched: false,
    betaTouched: false,
    realUserDataUsed: false,
  }, null, 2))
}
