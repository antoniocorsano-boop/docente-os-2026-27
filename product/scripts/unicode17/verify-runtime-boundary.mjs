import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const target = path.join(root, 'src/core/domain/timetable-teacher-evidence.ts')
const source = fs.readFileSync(target, 'utf8')

const failures = []
if (!source.includes('TT_TEACHER_UNICODE_VERSION = UNICODE17_VERSION')) failures.push('Unicode runtime version is not sourced from the frozen Unicode 17 artifact')
if (!source.includes('UNICODE17_CANONICAL_DECOMP')) failures.push('authoritative normalizer does not consume frozen decomposition data')
if (!source.includes('UNICODE17_CANONICAL_COMPOSE')) failures.push('authoritative normalizer does not consume frozen composition data')
if (!source.includes('UNICODE17_FULL_DEFAULT_FOLD')) failures.push('authoritative normalizer does not consume frozen full default fold data')
if (!/export function normalizeTeacherLabel\s*\(/.test(source)) failures.push('authoritative normalizer is not exposed')

const authoritativeStart = source.indexOf('export function normalizeTeacherLabel(')
const authoritativeEnd = source.indexOf('/** @deprecated', authoritativeStart)
const authoritative = authoritativeStart >= 0 && authoritativeEnd > authoritativeStart
  ? source.slice(authoritativeStart, authoritativeEnd)
  : ''
if (/\.normalize\s*\(/.test(authoritative)) failures.push('authoritative normalizer must not use platform String.normalize()')
if (/\.toLowerCase\s*\(/.test(authoritative) || /\.toLocaleLowerCase\s*\(/.test(authoritative)) failures.push('authoritative normalizer must not use platform lowercasing')

if (failures.length) {
  console.error(`Unicode 17 boundary FAIL:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('Unicode 17 boundary PASS: authoritative normalizer is pinned to generated Unicode 17 data')
