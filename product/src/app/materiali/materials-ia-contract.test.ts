import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const navigationSource = readFileSync(new URL('../../../components/app-shell/navigation.ts', import.meta.url), 'utf8')
const knowledgeSource = readFileSync(new URL('../knowledge/page.tsx', import.meta.url), 'utf8')
const timetableSource = readFileSync(new URL('../orario/TimetableExperience.tsx', import.meta.url), 'utf8')
const todaySource = readFileSync(new URL('../planner/page.tsx', import.meta.url), 'utf8')
const lessonClientSource = [
  '../classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx',
  '../classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx',
  '../classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx',
  '../classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join(String.fromCharCode(10))

test('Materiali e fonti is the stable home and reuses the canonical tomorrow projection', () => {
  assert.match(navigationSource, /href: '\/knowledge'.*label: 'Materiali e fonti'/)
  assert.match(knowledgeSource, /focus\?: string/)
  assert.match(knowledgeSource, /params\.focus/)
  assert.match(knowledgeSource, /loadTomorrowPreparationBundle/)
  assert.match(knowledgeSource, /focus.*domani|domani.*focus/)
  assert.match(knowledgeSource, /MATERIALI DI DOMANI/)
})

test('Oggi and Lezione do not emit the legacy next-material route', () => {
  assert.doesNotMatch(todaySource, /\/materiali\/(?:prossima|domani)/)
  assert.doesNotMatch(lessonClientSource, /\/materiali\/prossima/)
})

test('Orario exposes literal tomorrow only in view mode through the stable knowledge entry', () => {
  assert.match(timetableSource, /isLiteralTomorrow/)
  assert.match(timetableSource, /mode === 'view'/)
  assert.match(timetableSource, /\/knowledge\?focus=domani/)
})

test('legacy material routes remain available for compatibility', () => {
  assert.equal(existsSync(new URL('./domani/page.tsx', import.meta.url)), true)
  assert.equal(existsSync(new URL('./prossima/page.tsx', import.meta.url)), true)
})
