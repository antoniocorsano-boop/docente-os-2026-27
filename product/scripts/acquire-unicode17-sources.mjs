import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd(), 'unicode/17.0.0')
const lock = JSON.parse(await readFile(resolve(ROOT, 'SOURCE.lock.json'), 'utf8'))
const base = `https://raw.githubusercontent.com/${lock.sourceRepository}/${lock.sourceCommit}/${lock.sourcePath}`

const gitBlobSha1 = (bytes) => {
  const header = Buffer.from(`blob ${bytes.length}\0`)
  return createHash('sha1').update(Buffer.concat([header, bytes])).digest('hex')
}

await mkdir(ROOT, { recursive: true })
const receipt = { unicodeVersion: lock.unicodeVersion, sourceCommit: lock.sourceCommit, files: {} }

for (const [name, expected] of Object.entries(lock.files)) {
  const response = await fetch(`${base}/${name}`, { redirect: 'error' })
  if (!response.ok) throw new Error(`Unicode source fetch failed: ${name} HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length !== expected.size) throw new Error(`Unicode source size mismatch: ${name}`)
  const blobSha = gitBlobSha1(bytes)
  if (blobSha !== expected.gitBlobSha1) throw new Error(`Unicode source Git blob mismatch: ${name}`)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  await writeFile(resolve(ROOT, name), bytes)
  receipt.files[name] = { bytes: bytes.length, gitBlobSha1: blobSha, sha256 }
}

await writeFile(resolve(ROOT, 'SOURCE.receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(receipt, null, 2))
