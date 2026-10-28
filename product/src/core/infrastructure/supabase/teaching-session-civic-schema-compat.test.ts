import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isMissingCivicEducationSchemaError,
  selectTeachingSessionWriteRpc,
} from './teaching-session-civic-schema-compat'

test('QL2-A keeps legacy TeachingSession writes on the historical RPC when no civic contribution exists', () => {
  assert.equal(selectTeachingSessionWriteRpc(null), 'record_teaching_session')
  assert.equal(selectTeachingSessionWriteRpc(undefined), 'record_teaching_session')
})

test('QL2-A requires the composite RPC only when a civic contribution is actually present', () => {
  assert.equal(
    selectTeachingSessionWriteRpc({ minutes: 20, evidenceNote: null }),
    'record_teaching_session_with_civic_contribution',
  )
})

test('QL2-A tolerates only the missing civic contribution table while a candidate is read against the previous schema', () => {
  assert.equal(
    isMissingCivicEducationSchemaError({
      code: 'PGRST205',
      message: "Could not find the table 'public.teaching_session_civic_contributions' in the schema cache",
    }),
    true,
  )
  assert.equal(
    isMissingCivicEducationSchemaError({
      code: 'PGRST205',
      message: "Could not find the table 'public.teaching_sessions' in the schema cache",
    }),
    false,
  )
  assert.equal(
    isMissingCivicEducationSchemaError({
      code: '42501',
      message: 'permission denied for table teaching_session_civic_contributions',
    }),
    false,
  )
})
