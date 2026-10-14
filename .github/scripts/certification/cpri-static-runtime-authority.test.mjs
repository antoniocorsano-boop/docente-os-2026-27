import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const selfPath = '.github/scripts/certification/cpri-static-runtime-authority.test.mjs'
const productionCanonicalIds = new Set([
  ['4a027986', '5b6d', '49db', '9b52', '01cfae679c08'].join('-'),
  ['d327355b', '76a9', '496f', '99cb', 'dc942fd950e4'].join('-'),
  ['36ef3be5', '925f', '4e28', 'afff', 'df11097827a9'].join('-'),
  ['a1066c0a', '2720', '40b0', '841e', '306cb998ce3e'].join('-'),
  ['978702f8', '4579', '452d', '925b', '8e4d890e19f9'].join('-'),
  ['bd4cb766', '5d46', '4420', 'bc82', 'f979528a14b2'].join('-'),
])

const provenancePaths = new Set([
  'product/src/core/presentation/human-task-approved-manifests.ts',
  'product/src/core/presentation/human-task-approved-manifests-b31-b33.ts',
  'product/src/core/presentation/human-task-approved-manifests-b31-b33-v2.ts',
  'product/src/core/presentation/human-task-approved-manifests-seconda-b01-b04.ts',
  'product/src/core/presentation/human-task-approved-manifests-seconda-b05-b08.ts',
  'product/src/core/presentation/human-task-approved-manifest.test.ts',
  'product/src/core/application/human-task-stakeholder-cognitive-gate.test.ts',
  'product/src/core/application/human-task-projection-recipes-b16-b19.ts',
  'product/src/core/application/human-task-projection-recipes-b20-b22.ts',
  'product/src/core/application/human-task-projection-recipes-b23-b27.ts',
])

const textExtensions = new Set([
  '.cjs', '.js', '.json', '.md', '.mjs', '.sql', '.ts', '.tsx', '.txt', '.yaml', '.yml',
])
const ignoredDirectories = new Set([
  '.git', '.next', 'coverage', 'node_modules', 'playwright-report', 'test-results',
])

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') && entry.name !== '.github') return []
    if (ignoredDirectories.has(entry.name)) return []
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolute)
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) return []
    return [absolute]
  })
}

function classifyOccurrence({ file }) {
  if (file === selfPath) return 'GUARD_SELF'
  if (file.startsWith('docs/')) return 'HISTORICAL_PROVENANCE'
  if (file.startsWith('product/supabase/migrations/')) return 'HISTORICAL_PROVENANCE'
  if (provenancePaths.has(file)) return 'HISTORICAL_PROVENANCE'
  if (file.startsWith('product/src/') || file.startsWith('product/scripts/') || file.startsWith('.github/')) {
    return 'RUNTIME_AUTHORITY'
  }
  return 'UNCLASSIFIED'
}

function scanRepository() {
  const occurrences = []
  for (const absolute of walk(repoRoot)) {
    const file = relative(absolute)
    if (file === selfPath) continue
    const lines = readFileSync(absolute, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      for (const token of productionCanonicalIds) {
        if (!line.includes(token)) continue
        occurrences.push({
          file,
          line: index + 1,
          token,
          classification: classifyOccurrence({ file }),
        })
      }
    })
  }
  return occurrences.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.token.localeCompare(b.token))
}

function formatOccurrences(items) {
  return items.map((item) => `${item.classification} ${item.file}:${item.line} ${item.token}`).join('\n')
}

test('CPRI production materialization classifier separates active runtime authority from historical provenance', () => {
  assert.equal(classifyOccurrence({ file: 'product/src/example/runtime.ts' }), 'RUNTIME_AUTHORITY')
  assert.equal(classifyOccurrence({ file: 'docs/archive.md' }), 'HISTORICAL_PROVENANCE')
  assert.equal(
    classifyOccurrence({ file: 'product/src/core/application/human-task-projection-recipes-b16-b19.ts' }),
    'HISTORICAL_PROVENANCE',
  )
  assert.equal(classifyOccurrence({ file: 'unclassified/location.txt' }), 'UNCLASSIFIED')
})

test('repository has no unclassified CPRI production materialization occurrence', () => {
  const unclassified = scanRepository().filter((item) => item.classification === 'UNCLASSIFIED')
  assert.equal(unclassified.length, 0, `Unclassified CPRI occurrences:\n${formatOccurrences(unclassified)}`)
})

test('repository has zero static CPRI production materialization in active runtime paths', () => {
  const runtimeAuthority = scanRepository().filter((item) => item.classification === 'RUNTIME_AUTHORITY')
  assert.equal(
    runtimeAuthority.length,
    0,
    `Static CPRI runtime authority remains:\n${formatOccurrences(runtimeAuthority)}`,
  )
})
