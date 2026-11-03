import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyCanonicalArenaReleaseForThreeGrades } from '../src/core/domain/cml-arena-three-grade-preflight.ts'

const MAX_RELEASE_BYTES = 10_000_000

function requiredOption(name) {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (typeof value !== 'string' || !value.trim() || value.startsWith('--')) {
    throw new Error(`${name} must be explicitly supplied`)
  }
  return value.trim()
}

async function main() {
  const inputPath = await realpath(path.resolve(requiredOption('--input')))
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const relative = path.relative(repoRoot, inputPath)
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
    throw new Error('private release JSON must be read from outside the GitHub repository')
  }
  const size = (await stat(inputPath)).size
  if (size > MAX_RELEASE_BYTES || size === 0) {
    throw new Error('release JSON size is outside the authorized offline limit')
  }

  const targetInstitutionId = requiredOption('--target-institution-id')
  const schoolYearRef = requiredOption('--school-year')
  const expectedRevisionId = requiredOption('--expected-revision-id')
  const fpIndex = process.argv.indexOf('--expected-source-footprint')
  const expectedSourceContentFootprint = fpIndex >= 0
    ? requiredOption('--expected-source-footprint')
    : undefined

  const raw = await readFile(inputPath, 'utf8')
  const receipt = verifyCanonicalArenaReleaseForThreeGrades({
    release: JSON.parse(raw),
    targetInstitutionId,
    schoolYearRef,
    expectedRevisionId,
    ...(expectedSourceContentFootprint === undefined ? {} : { expectedSourceContentFootprint }),
  })
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n')
}

main().catch(() => {
  // No file paths, source text or other untrusted input in failure logs.
  console.error('OFFLINE_CONTRACT_REJECTED: verify file, target identity, source revision and integrity')
  process.exitCode = 1
})
