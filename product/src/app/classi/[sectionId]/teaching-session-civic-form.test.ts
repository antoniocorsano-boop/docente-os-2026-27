import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { civicEducationContributionFromFormData } from './teaching-session-civic-form'

const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')

function form(fields: Record<string, string>) {
  const result = new FormData()
  for (const [key, value] of Object.entries(fields)) result.set(key, value)
  return result
}

test('QL2-A civic contribution is optional when no civic fields are submitted', () => {
  assert.equal(civicEducationContributionFromFormData(form({}), 60), null)
})

test('QL2-A civic contribution parses minutes and trims optional evidence', () => {
  assert.deepEqual(
    civicEducationContributionFromFormData(form({
      civicEducationMinutes: '20',
      civicEducationEvidenceNote: '  Discussione su sostenibilità e cittadinanza  ',
    }), 60),
    {
      minutes: 20,
      evidenceNote: 'Discussione su sostenibilità e cittadinanza',
    },
  )
})

test('QL2-A civic contribution rejects minutes beyond the actual lesson duration', () => {
  assert.throws(
    () => civicEducationContributionFromFormData(form({ civicEducationMinutes: '61' }), 60),
    /Invalid civic education minutes/,
  )
})

test('QL2-A civic contribution rejects evidence without contributed minutes', () => {
  assert.throws(
    () => civicEducationContributionFromFormData(form({ civicEducationEvidenceNote: 'Solo nota' }), 60),
    /minutes are required when evidence is present/,
  )
})

test('recordTeachingSession attaches civic contribution after resolving the real TeachingSession', () => {
  assert.match(actionsSource, /civicEducationContributionFromFormData/)
  assert.match(
    actionsSource,
    /session\s*=\s*\{[\s\S]*\.\.\.session,[\s\S]*civicEducation:\s*civicEducationContributionFromFormData\(formData,\s*actualMinutes\)[\s\S]*\}/,
  )
})
