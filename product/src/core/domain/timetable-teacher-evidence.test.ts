import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TT_TEACHER_UNICODE_VERSION,
  normalizeTeacherLabel,
  normalizeTeacherLabelPreview,
  sameTeacherEvidence,
  validateTeacherEvidenceProfile,
  type TeacherEvidenceOccurrence,
  type TeacherEvidenceProfile,
} from './timetable-teacher-evidence'

const profile: TeacherEvidenceProfile = {
  profileId: 'fixture-structured-timetable',
  profileVersion: '1',
  parserFamily: 'fixture',
  parserVersion: '1',
  allowedSignalKinds: ['teacher-structural-id', 'teacher-group'],
  sameRules: [{ kind: 'teacher-structural-id', comparator: 'EQUAL' }],
  distinctRules: [{ kind: 'teacher-group', comparator: 'NOT_EQUAL' }],
}

const occurrence = (id: string, structuralId: string, group = 'G-1'): TeacherEvidenceOccurrence => ({
  occurrenceId: id,
  signals: [
    { kind: 'teacher-structural-id', value: structuralId },
    { kind: 'teacher-group', value: group },
  ],
})

test('dichiara Unicode 17.0.0 come versione contrattuale', () => {
  assert.equal(TT_TEACHER_UNICODE_VERSION, '17.0.0')
})

test('normalizzatore autorevole usa equivalenza canonica e regole contrattuali', () => {
  assert.equal(normalizeTeacherLabel('  D’ANGELO\u00A0–  ROSSI  '), "d'angelo - rossi")
  assert.equal(normalizeTeacherLabel('RÒSSI'), normalizeTeacherLabel('RÒSSI'))
  assert.notEqual(normalizeTeacherLabel('Rossi'), normalizeTeacherLabel('Ròssi'))
})

test('full default case folding Unicode 17 non equivale al semplice lowercase', () => {
  assert.equal(normalizeTeacherLabel('STRAẞE'), 'strasse')
  assert.equal(normalizeTeacherLabel('ΟΣΟΣ'), 'οσοσ')
  assert.equal(normalizeTeacherLabel('İ'), 'i̇')
})

test('Hangul composto e decomposto convergono senza String.normalize()', () => {
  assert.equal(normalizeTeacherLabel('\uAC01'), normalizeTeacherLabel('\u1100\u1161\u11A8'))
})

test('alias preview converge sul normalizzatore autorevole durante PREVIEW_ONLY', () => {
  assert.equal(normalizeTeacherLabelPreview('RÒSSI'), normalizeTeacherLabel('RÒSSI'))
})

test('Unicode non valido fallisce chiuso', () => {
  assert.throws(() => normalizeTeacherLabel('\uD800ROSSI'), /NO_MATCH_SAFE/)
})

test('profilo assente non abilita inferenze', () => {
  assert.equal(validateTeacherEvidenceProfile(null), false)
  assert.equal(sameTeacherEvidence(occurrence('a', 'T-1'), occurrence('b', 'T-1'), null), 'UNKNOWN')
})

test('structural-id uguale produce SAME solo confrontando due occorrenze', () => {
  assert.equal(sameTeacherEvidence(occurrence('a', 'T-1'), occurrence('b', 'T-1'), profile), 'SAME')
})

test('structural-id diverso non produce SAME', () => {
  assert.equal(sameTeacherEvidence(occurrence('a', 'T-1'), occurrence('b', 'T-2'), profile), 'UNKNOWN')
})

test('gruppi governati differenti producono DISTINCT', () => {
  assert.equal(sameTeacherEvidence(occurrence('a', 'T-1', 'G-1'), occurrence('b', 'T-2', 'G-2'), profile), 'DISTINCT')
})

test('SAME e DISTINCT simultanei falliscono chiuso in UNKNOWN', () => {
  assert.equal(sameTeacherEvidence(occurrence('a', 'T-1', 'G-1'), occurrence('b', 'T-1', 'G-2'), profile), 'UNKNOWN')
})

test('segnali non governati non diventano prova implicita', () => {
  const a: TeacherEvidenceOccurrence = { occurrenceId: 'a', signals: [{ kind: 'same-surname', value: 'ROSSI' }] }
  const b: TeacherEvidenceOccurrence = { occurrenceId: 'b', signals: [{ kind: 'same-surname', value: 'ROSSI' }] }
  assert.equal(sameTeacherEvidence(a, b, profile), 'UNKNOWN')
})

test('fixture multi-giorno/multi-classe confronta realmente tutte le occorrenze', () => {
  const occurrences = [occurrence('mon-2A', 'T-1'), occurrence('tue-3C', 'T-1'), occurrence('fri-1B', 'T-1')]
  for (let index = 1; index < occurrences.length; index += 1) {
    assert.equal(sameTeacherEvidence(occurrences[0], occurrences[index], profile), 'SAME')
  }
})

test('profili contraddittori o semanticamente impropri sono rifiutati', () => {
  const overlapping: TeacherEvidenceProfile = {
    ...profile,
    distinctRules: [{ kind: 'teacher-structural-id', comparator: 'NOT_EQUAL' }],
  }
  const wrongComparator: TeacherEvidenceProfile = {
    ...profile,
    sameRules: [{ kind: 'teacher-structural-id', comparator: 'NOT_EQUAL' }],
  }
  const undeclaredKind: TeacherEvidenceProfile = {
    ...profile,
    sameRules: [{ kind: 'not-allowed', comparator: 'EQUAL' }],
  }
  assert.equal(validateTeacherEvidenceProfile(overlapping), false)
  assert.equal(validateTeacherEvidenceProfile(wrongComparator), false)
  assert.equal(validateTeacherEvidenceProfile(undeclaredKind), false)
})

test('segnale governato duplicato nella stessa occorrenza fallisce chiuso', () => {
  const duplicated: TeacherEvidenceOccurrence = {
    occurrenceId: 'a',
    signals: [
      { kind: 'teacher-structural-id', value: 'T-1' },
      { kind: 'teacher-structural-id', value: 'T-2' },
    ],
  }
  assert.equal(sameTeacherEvidence(duplicated, occurrence('b', 'T-1'), profile), 'UNKNOWN')
})
