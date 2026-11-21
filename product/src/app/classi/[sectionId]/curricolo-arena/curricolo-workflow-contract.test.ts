import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const action = readFileSync(
  new URL('./curricolo-uda-save-actions.ts', import.meta.url), 'utf8',
)
const client = readFileSync(
  new URL('./arena-provisional-grade-preview-client.tsx', import.meta.url), 'utf8',
)
const route = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

test('La UDA parte da una fonte Arena verificata nuovamente sul server', () => {
  const read = action.indexOf('readProvisionalArenaReferenceForClass({')
  const available = action.indexOf("result.status !== 'AVAILABLE'")
  const selected = action.indexOf('curricoloExcerptById(result.reference')
  const write = action.indexOf('knowledge.capture({')
  assert.ok(read >= 0 && read < available && available < selected && selected < write)
  assert.match(action, /createCurricoloWorkProposal\(\{/)
  assert.match(action, /kind: 'UDA'/)
})

test('Il salvataggio opera solo sul workspace personale di prova', () => {
  assert.match(action, /context.workspace.kind !== 'PERSONAL'/)
  assert.match(action, /context.role !== 'OWNER'/)
  assert.match(action, /gnshgapmwyjamhmlikeg\.supabase\.co/)
  assert.match(action, /SupabaseTeachingAssignmentReader/)
  assert.match(action, /SupabaseTeacherSettingsRepository/)
  assert.doesNotMatch(action, /service_role|SERVICE_ROLE_KEY/)
})

test('Progetta riusa documenti UDA versionati e un asset personale distinto dalla fonte', () => {
  assert.match(action, /sourceProvider: 'MANUAL'/)
  assert.match(action, /origin: 'ARENA_TEACHER_PROPOSAL'/)
  assert.match(action, /sourceAssetId: asset.id/)
  assert.match(action, /new SupabaseAuthoredDocumentRepository\(\)\.openUda/)
  assert.match(action, /\/progetta\/documenti\//)
  assert.doesNotMatch(action, /adozione.*automatica|sourceHandoffFootprintHash.*insert/i)
})

test('La schermata propone salvataggio solo per UDA e mantiene gli altri casi non attivi', () => {
  // @trama-feedback-test: check the critical write has persistent visible feedback and pending state.
  assert.match(client, /role="alert"/)
  assert.match(client, /disabled=\{saving\}/)
  assert.match(client, /!draft\.evidence\.trim\(\)/)
  assert.match(action, /!safe\.evidence/)
  assert.match(action, /sourceEvidence: input\.sourceEvidence/)
  assert.match(client, /draft.kind === 'UDA'/)
  assert.match(client, /Salva UDA in Progetta/)
  assert.match(client, /il salvataggio integrato di attività, lezioni e percorsi/)
  assert.equal((route.match(/sectionId=\{sectionId\}/g) ?? []).length >= 2, true)
})
