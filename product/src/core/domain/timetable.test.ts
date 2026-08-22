import assert from 'node:assert/strict'
import test from 'node:test'
import { minutesToTime, slotDurationMinutes, timeToMinutes } from './timetable'

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
