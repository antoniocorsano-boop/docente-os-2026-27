import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  civicEducationSchemaCompatibility,
  isMissingCivicEducationSchemaError,
  isMissingCivicEducationWriteRpcError,
  selectTeachingSessionWriteRpc,
  shouldFallbackToLegacyTeachingSessionRpc,
} from './teaching-session-civic-schema-compat'

const workflowDir = resolve(process.cwd(), '../.github/workflows')
const hvaWorkflow = readFileSync(resolve(workflowDir, 'experience-acceptance.yml'), 'utf8')
const browserCertificationWorkflow = readFileSync(resolve(workflowDir, 'browser-certification-orchestrator.yml'), 'utf8')

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
  const missingWrapper = {
    code: 'PGRST202',
    message: 'Could not find the function public.record_teaching_session_with_civic_contribution in the schema cache',
  }

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
  assert.equal(isMissingCivicEducationWriteRpcError(missingWrapper, previous), true)
  assert.equal(
    isMissingCivicEducationWriteRpcError({
      code: 'PGRST202',
      message: 'Could not find the function public.record_teaching_session in the schema cache',
    }, previous),
    false,
  )
  assert.equal(
    shouldFallbackToLegacyTeachingSessionRpc({ civicEducation: null, error: missingWrapper, compatibility: previous }),
    true,
  )
  assert.equal(
    shouldFallbackToLegacyTeachingSessionRpc({
      civicEducation: { minutes: 20, evidenceNote: null },
      error: missingWrapper,
      compatibility: previous,
    }),
    false,
  )
  assert.equal(
    shouldFallbackToLegacyTeachingSessionRpc({ civicEducation: null, error: missingWrapper, compatibility: strict }),
    false,
  )
})

test('QL2-A previous-schema compatibility is limited to governed local application runners', () => {
  const previousOptIns = readdirSync(workflowDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .flatMap((name) => {
      const source = readFileSync(resolve(workflowDir, name), 'utf8')
      const count = source.match(/DOCENTE_OS_CIVIC_SCHEMA_COMPAT:\s*previous/g)?.length ?? 0
      return Array.from({ length: count }, () => name)
    })
    .sort()

  assert.deepEqual(previousOptIns, ['browser-certification-orchestrator.yml', 'experience-acceptance.yml'])

  const [applicationBlock, runtimeBlock = ''] = hvaWorkflow.split(/\n\s*runtime-acceptance:/)
  assert.match(applicationBlock, /application-acceptance:[\s\S]*DOCENTE_OS_CIVIC_SCHEMA_COMPAT:\s*previous/)
  assert.doesNotMatch(runtimeBlock, /DOCENTE_OS_CIVIC_SCHEMA_COMPAT:\s*previous/)

  assert.match(
    browserCertificationWorkflow,
    /browser-certification:[\s\S]*DOCENTE_OS_CIVIC_SCHEMA_COMPAT:\s*previous/,
  )
})
