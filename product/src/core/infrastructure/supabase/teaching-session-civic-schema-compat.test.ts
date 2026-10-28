import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  civicEducationSchemaCompatibility,
  isMissingCivicEducationSchemaError,
  isMissingCivicEducationWriteRpcError,
  selectTeachingSessionWriteRpc,
} from './teaching-session-civic-schema-compat'

const hvaWorkflow = readFileSync(resolve(process.cwd(), '../.github/workflows/experience-acceptance.yml'), 'utf8')

test('QL2-A routes current-schema writes through the civic wrapper even when the contribution is omitted', () => {
  assert.equal(selectTeachingSessionWriteRpc(null), 'record_teaching_session_with_civic_contribution')
  assert.equal(selectTeachingSessionWriteRpc(undefined), 'record_teaching_session_with_civic_contribution')
  assert.equal(
    selectTeachingSessionWriteRpc({ minutes: 20, evidenceNote: null }),
    'record_teaching_session_with_civic_contribution',
  )
})

test('QL2-A previous-schema fallback is explicit and accepts only the known missing civic table or wrapper', () => {
  const strict = civicEducationSchemaCompatibility(undefined)
  const previous = civicEducationSchemaCompatibility('previous')

  assert.equal(strict, 'strict')
  assert.equal(previous, 'previous')
  assert.equal(
    isMissingCivicEducationSchemaError({
      code: 'PGRST205',
      message: "Could not find the table 'public.teaching_session_civic_contributions' in the schema cache",
    }, strict),
    false,
  )
  assert.equal(
    isMissingCivicEducationSchemaError({
      code: 'PGRST205',
      message: "Could not find the table 'public.teaching_session_civic_contributions' in the schema cache",
    }, previous),
    true,
  )
  assert.equal(
    isMissingCivicEducationWriteRpcError({
      code: 'PGRST202',
      message: "Could not find the function public.record_teaching_session_with_civic_contribution in the schema cache",
    }, previous),
    true,
  )
  assert.equal(
    isMissingCivicEducationWriteRpcError({
      code: 'PGRST202',
      message: 'Could not find the function public.record_teaching_session in the schema cache',
    }, previous),
    false,
  )
})

test('QL2-A HVA is the only governed application path opting into previous civic schema compatibility', () => {
  assert.match(hvaWorkflow, /application-acceptance:[\s\S]*DOCENTE_OS_CIVIC_SCHEMA_COMPAT:\s*previous/)
})
