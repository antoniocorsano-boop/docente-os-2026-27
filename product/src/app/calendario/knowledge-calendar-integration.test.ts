import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const actionSource = fs.readFileSync(path.join(root, 'src/app/knowledge/actions.ts'), 'utf8')
const uploadSource = fs.readFileSync(path.join(root, 'src/app/knowledge/upload-actions.ts'), 'utf8')
const migrationSource = fs.readFileSync(path.join(root, 'supabase/migrations/0067_dos_cal_01_knowledge_calendar_source.sql'), 'utf8')
const integrityMigrationSource = fs.readFileSync(path.join(root, 'supabase/migrations/0068_dos_cal_01_link_integrity.sql'), 'utf8')

test('la registrazione nel calendario resta una server action esplicita del docente', () => {
  assert.match(actionSource, /export async function confirmKnowledgeCalendarEvent\(formData: FormData\)/)
  assert.match(actionSource, /knowledgeCalendarEventProposal/)
  assert.match(actionSource, /assertCalendarEventWithinAcademicYear/)
  assert.match(actionSource, /teacherConfirmed: true/)
  assert.doesNotMatch(uploadSource, /createEvent\(/)
  assert.doesNotMatch(uploadSource, /confirmKnowledgeCalendarEvent/)
})

test('la provenienza della proposta rende idempotente la conferma e resta confinata al workspace', () => {
  assert.match(migrationSource, /source_knowledge_unit_id uuid null references public\.knowledge_units\(id\)/)
  assert.match(migrationSource, /create unique index if not exists uq_calendar_events_knowledge_unit/)
  assert.match(migrationSource, /source_workspace_id <> new\.workspace_id/)
  assert.match(migrationSource, /source_unit_type <> 'DEADLINE'/)
  assert.match(migrationSource, /knowledge-derived calendar event must preserve institutional document provenance/)
})


test('la fonte e l’evento restano nello stesso anno scolastico e i riferimenti residui non bloccano la ricreazione', () => {
  assert.match(actionSource, /unitContext\.asset\.academicYearId !== context\.academicYear\.id/)
  assert.match(actionSource, /calendar\.findEventById/)
  assert.match(actionSource, /knowledge\.unlink/)
  assert.match(integrityMigrationSource, /source_academic_year_id <> new\.academic_year_id/)
  assert.match(integrityMigrationSource, /uq_knowledge_links_calendar_event_unit/)
  assert.match(integrityMigrationSource, /cleanup_calendar_event_knowledge_source/)
  assert.match(integrityMigrationSource, /validation_status = 'AUTO'/)
})
