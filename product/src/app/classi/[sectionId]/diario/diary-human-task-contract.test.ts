import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const diaryPageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

test('il Diario mantiene il compito docente davanti alla provenance tecnica', () => {
  assert.doesNotMatch(diaryPageSource, /Registro:\s*\{parsed\?\.driveRecordId\}/)
  assert.doesNotMatch(diaryPageSource, /registrazione autorevole|proiezione documentale/i)
  assert.match(diaryPageSource, /className="classDiaryNext"/)
  assert.match(diaryPageSource, />DA RIPRENDERE</)
  assert.match(diaryPageSource, /<details className="classDiaryDetailsDisclosure">/)
})
