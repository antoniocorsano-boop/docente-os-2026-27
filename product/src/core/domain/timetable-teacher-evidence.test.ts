import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TT_TEACHER_UNICODE_VERSION,
  normalizeTeacherLabel,
  sameTeacherEvidence,
  validateTeacherEvidenceProfile,
  type TeacherEvidenceProfile,
} from './timetable-teacher-evidence'

const profile: TeacherEvidenceProfile = {
  profileId: 'fixture-structured-timetable',
  profileVersion: '1',
  parserFamily: 'fixture',
  parserVersion: '1',
  sameRules: [{ allOf: ['teacher-structural-id'] }],
  distinctRules: [{ allOf: ['distinct-teacher-group'] }],
}

test('dichiara Unicode 17.0.0 come versione contrattuale', () => {
  assert.equal(TT_TEACHER_UNICODE_VERSION, '17.0.0')
})

test('normalizza NFC, spazi governati, apostrofi e trattini senza fuzzy matching', () => {
  assert.equal(normalizeTeacherLabel('  D’ANGELO\u00A0–  ROSSI  '), "d'angelo - rossi")
  assert.equal(normalizeTeacherLabel('RÒSSI'), normalizeTeacherLabel('RÒSSI'))
  assert.notEqual(normalizeTeacherLabel('Rossi'), normalizeTeacherLabel('Ròssi'))
})

test('Unicode non valido fallisce chiuso', () => {
  assert.throws(() => normalizeTeacherLabel('\uD800ROSSI'), /NO_MATCH_SAFE/)
})

test('profilo assente o non valido non abilita inferenze', () => {
  assert.equal(validateTeacherEvidenceProfile(null), false)
  assert.equal(sameTeacherEvidence([{ kind: 'teacher-structural-id', value: 'x' }], null), 'UNKNOWN')
})

test('SAME richiede un segnale esplicitamente ammesso dal profilo', () => {
  assert.equal(sameTeacherEvidence([{ kind: 'teacher-structural-id', value: 'T-1' }], profile), 'SAME')
  assert.equal(sameTeacherEvidence([{ kind: 'same-surname', value: 'ROSSI' }], profile), 'UNKNOWN')
})

test('DISTINCT richiede un segnale esplicitamente ammesso dal profilo', () => {
  assert.equal(sameTeacherEvidence([{ kind: 'distinct-teacher-group', value: 'G-2' }], profile), 'DISTINCT')
})

test('segnali SAME e DISTINCT contraddittori producono UNKNOWN', () => {
  assert.equal(sameTeacherEvidence([
    { kind: 'teacher-structural-id', value: 'T-1' },
    { kind: 'distinct-teacher-group', value: 'G-2' },
  ], profile), 'UNKNOWN')
})

test('giorno, classe, pagina, coordinate e ripetizione non sono prova implicita', () => {
  const ungoverned = ['weekday', 'class', 'page', 'coordinates', 'same-surname'].map((kind) => ({ kind, value: 'x' }))
  assert.equal(sameTeacherEvidence(ungoverned, profile), 'UNKNOWN')
})

test('fixture multi-giorno/multi-classe si aggrega solo con prova strutturale governata', () => {
  const occurrences = [
    { weekday: 1, classLabel: '2A', teacherStructuralId: 'T-1' },
    { weekday: 2, classLabel: '3C', teacherStructuralId: 'T-1' },
    { weekday: 5, classLabel: '1B', teacherStructuralId: 'T-1' },
  ]
  for (const occurrence of occurrences) {
    assert.equal(sameTeacherEvidence([{ kind: 'teacher-structural-id', value: occurrence.teacherStructuralId }], profile), 'SAME')
  }
})
