import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const target = path.join(root, 'src/core/domain/timetable-teacher-evidence.ts')
const source = fs.readFileSync(target, 'utf8')

const failures = []
if (!source.includes("TT_TEACHER_UNICODE_VERSION = '17.0.0'")) failures.push('Unicode version is not pinned to 17.0.0')
if (!source.includes('normalizeTeacherLabelPreview')) failures.push('preview-only normalization guard is missing')
if (/export function normalizeTeacherLabel\s*\(/.test(source)) failures.push('authoritative normalizer exposed before frozen Unicode 17 materialization')

if (failures.length) {
  console.error(`Unicode 17 boundary FAIL:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('Unicode 17 boundary PASS: authoritative normalizer remains gated')
