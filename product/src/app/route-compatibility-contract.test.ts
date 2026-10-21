import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const rootSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const workspaceSource = readFileSync(new URL('./workspace/page.tsx', import.meta.url), 'utf8')
const lessonPageSource = readFileSync(new URL('./classi/[sectionId]/lezioni/[blockId]/page.tsx', import.meta.url), 'utf8')
const primarySource = [
  './planner/page.tsx',
  '../components/app-shell/navigation.ts',
  './altro/page.tsx',
  './knowledge/page.tsx',
  './orario/TimetableExperience.tsx',
  './orario/TimetableGrid.tsx',
  './classi/page.tsx',
  './classi/[sectionId]/page.tsx',
  './classi/[sectionId]/class-secondary-tools.tsx',
  './classi/[sectionId]/lezioni/[blockId]/page.tsx',
  './classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx',
  './classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx',
  './classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx',
  './classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join(String.fromCharCode(10))

test('root and workspace converge on Oggi without a duplicate Home decision surface', () => {
  assert.match(rootSource, /redirect\(['"]\/planner['"]\)/)
  assert.doesNotMatch(rootSource, /AppShell|<Link|Supabase/)
  assert.match(workspaceSource, /redirect\(['"]\/planner['"]\)/)
})

test('new primary UI no longer emits retired route call sites', () => {
  assert.doesNotMatch(primarySource, /\/giornata\/resoconto/)
  assert.doesNotMatch(primarySource, /\/materiali\/prossima/)
  assert.doesNotMatch(primarySource, /\/in-classe\//)
  assert.doesNotMatch(primarySource, /\?mode=(?:prepare|teach|observe|record)/)
})

test('Lezione still accepts legacy mode as compatibility input', () => {
  assert.match(lessonPageSource, /type LegacyLessonWorkspaceMode/)
  assert.match(lessonPageSource, /query\.mode/)
  assert.match(lessonPageSource, /legacyIntent\(legacyMode\)/)
})

test('legacy endpoints remain present while canonical mapping stays soft', () => {
  assert.equal(existsSync(new URL('./giornata/resoconto/page.tsx', import.meta.url)), true)
  assert.equal(existsSync(new URL('./materiali/domani/page.tsx', import.meta.url)), true)
  assert.equal(existsSync(new URL('./materiali/prossima/page.tsx', import.meta.url)), true)
  assert.equal(existsSync(new URL('./classi/[sectionId]/in-classe/[assetId]/page.tsx', import.meta.url)), true)
})
