import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('next lesson preparation binds the canonical plan to the lesson discipline', async () => {
  const source = await readFile(new URL('./next-lesson-preparation-loader.ts', import.meta.url), 'utf8')
  assert.match(source, /settingsRepository\.listDisciplines\(workspaceId, academicYearId\)/)
  assert.match(source, /shared\.disciplines\.find\(\(item\) => item\.id === confirmedAssignment\.disciplineId\)/)
  assert.match(source, /canonicalPlanSupportsDisciplineName\(discipline\.name\)/)
  assert.match(source, /Il Piano annuale canonico disponibile non è associato alla disciplina di questa lezione/)
})
