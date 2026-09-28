import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const VERSION = '17.0.0'
const ROOT = resolve(process.cwd(), 'unicode/17.0.0')
const OUT = resolve(process.cwd(), 'src/core/domain/generated/unicode17-teacher-normalization.ts')

const files = {
  unicodeData: 'UnicodeData.txt',
  compositionExclusions: 'CompositionExclusions.txt',
  caseFolding: 'CaseFolding.txt',
  normalizationTest: 'NormalizationTest.txt',
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const parseHexSeq = (value) => value.trim().split(/\s+/u).filter(Boolean).map((hex) => Number.parseInt(hex, 16))

const raw = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, name]) => [key, await readFile(resolve(ROOT, name), 'utf8')])))
const sourceDigests = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, sha256(value)]))

const ccc = new Map()
const decomp = new Map()
for (const line of raw.unicodeData.split(/\r?\n/u)) {
  if (!line || line.startsWith('#')) continue
  const fields = line.split(';')
  const cp = Number.parseInt(fields[0], 16)
  const combining = Number.parseInt(fields[3], 10)
  if (combining) ccc.set(cp, combining)
  const mapping = fields[5]
  if (mapping && !mapping.startsWith('<')) decomp.set(cp, parseHexSeq(mapping))
}

const exclusions = new Set()
for (const line of raw.compositionExclusions.split(/\r?\n/u)) {
  const body = line.replace(/#.*/u, '').trim()
  if (body) exclusions.add(Number.parseInt(body, 16))
}

const compose = new Map()
for (const [cp, mapping] of decomp) {
  if (mapping.length === 2 && !exclusions.has(cp)) compose.set(`${mapping[0]},${mapping[1]}`, cp)
}

// Default full, non-Turkic folding: C + F, with F overriding C where present.
const foldC = new Map()
const foldF = new Map()
for (const line of raw.caseFolding.split(/\r?\n/u)) {
  const body = line.replace(/#.*/u, '').trim()
  if (!body) continue
  const [cpHex, status, mapping] = body.split(';').map((part) => part.trim())
  const cp = Number.parseInt(cpHex, 16)
  if (status === 'C') foldC.set(cp, parseHexSeq(mapping))
  if (status === 'F') foldF.set(cp, parseHexSeq(mapping))
}
const fold = new Map(foldC)
for (const [cp, mapping] of foldF) fold.set(cp, mapping)

const sortEntries = (map) => [...map.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
const sortCompose = (map) => [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))
const literal = (value) => JSON.stringify(value)

const output = `// GENERATED FILE — DO NOT EDIT.\n// Unicode ${VERSION}; generated from frozen UCD inputs by scripts/generate-unicode17-teacher-normalization.mjs.\nexport const UNICODE17_VERSION = ${literal(VERSION)} as const\nexport const UNICODE17_SOURCE_SHA256 = ${literal(sourceDigests)} as const\nexport const UNICODE17_CCC = new Map<number, number>(${literal(sortEntries(ccc))})\nexport const UNICODE17_CANONICAL_DECOMP = new Map<number, readonly number[]>(${literal(sortEntries(decomp))})\nexport const UNICODE17_CANONICAL_COMPOSE = new Map<string, number>(${literal(sortCompose(compose))})\nexport const UNICODE17_FULL_DEFAULT_FOLD = new Map<number, readonly number[]>(${literal(sortEntries(fold))})\n`

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, output, 'utf8')
console.log(JSON.stringify({ unicodeVersion: VERSION, sourceDigests, outputSha256: sha256(output), counts: { ccc: ccc.size, decomp: decomp.size, compose: compose.size, fold: fold.size } }, null, 2))
