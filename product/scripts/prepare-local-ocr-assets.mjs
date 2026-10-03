import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.join(root, 'public', 'local-ocr')
const coreSource = path.join(root, 'node_modules', 'tesseract.js-core')
const workerSource = path.join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js')
const langSource = path.join(
  root,
  'node_modules',
  '@tesseract.js-data',
  'ita',
  '4.0.0_best_int',
  'ita.traineddata.gz',
)

await rm(target, { recursive: true, force: true })
await mkdir(path.join(target, 'core'), { recursive: true })
await mkdir(path.join(target, 'lang'), { recursive: true })

await cp(workerSource, path.join(target, 'worker.min.js'))
await cp(langSource, path.join(target, 'lang', 'ita.traineddata.gz'))

const coreFiles = await readdir(coreSource)
const requiredCoreFiles = coreFiles.filter((name) => /^tesseract-core.*\.wasm\.js$/.test(name))
if (requiredCoreFiles.length < 2) {
  throw new Error('Tesseract core assets not found')
}

for (const name of requiredCoreFiles) {
  await cp(path.join(coreSource, name), path.join(target, 'core', name))
}

console.log(
  `Local OCR assets prepared: worker + ita + ${requiredCoreFiles.length} core variants`,
)
