import assert from 'node:assert/strict'
import test from 'node:test'
import { canActivateTimetableDraft, minutesToTime, slotDurationMinutes, timeToMinutes, type TimetableVersion } from './timetable'

test('converte orari e minuti senza dipendere da timezone', () => {
  assert.equal(timeToMinutes('08:30'), 510)
  assert.equal(minutesToTime(510), '08:30')
})

test('calcola la durata effettiva di uno slot', () => {
  assert.equal(slotDurationMinutes('08:00', '09:00'), 60)
  assert.equal(slotDurationMinutes('08:15', '09:05'), 50)
})

test('supporta preset che non iniziano all’ora piena', () => {
  assert.equal(minutesToTime(timeToMinutes('07:30') + 55), '08:25')
})

test('una prima bozza può essere messa in uso', () => {
  assert.equal(canActivateTimetableDraft(null, version('DRAFT', '2026-09-01')), true)
})

test('una bozza successiva deve iniziare dopo la versione in uso', () => {
  const active = version('ACTIVE', '2026-09-01')
  assert.equal(canActivateTimetableDraft(active, version('DRAFT', '2026-09-01')), false)
  assert.equal(canActivateTimetableDraft(active, version('DRAFT', '2026-08-31')), false)
  assert.equal(canActivateTimetableDraft(active, version('DRAFT', '2026-09-15')), true)
})

test('una versione non in bozza non può essere attivata dal flusso di modifica', () => {
  assert.equal(canActivateTimetableDraft(null, version('ACTIVE', '2026-09-01')), false)
})

function version(status: TimetableVersion['status'], effectiveFrom: string): TimetableVersion {
  return {
    id: `${status}-${effectiveFrom}`,
    workspaceId: 'workspace',
    academicYearId: 'year',
    label: 'Orario',
    status,
    effectiveFrom,
    effectiveTo: null,
    sourceKind: 'MANUAL',
    sourceRef: null,
    createdAt: '2026-08-23T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z',
  }
}
