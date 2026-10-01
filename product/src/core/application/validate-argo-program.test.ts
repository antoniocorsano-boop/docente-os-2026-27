import assert from 'node:assert/strict'
import test from 'node:test'
import type { ArgoProgram } from '@/core/domain/argo-program'
import { validateArgoProgram } from './validate-argo-program'

function validProgram(): ArgoProgram {
  return {
    schoolYear: '2026/2027',
    classRef: '1A',
    subjectRef: 'Tecnologia',
    sourceAssetId: 'asset-programming-1',
    sourceGenerationId: 'gen-1',
    modules: [{
      id: 'MOD-1',
      order: '1',
      description: 'Tecnica e tecnologia',
      arguments: [{
        id: 'ARG-1',
        order: '1',
        description: 'Tecnica',
        performedStatus: 'NOT_PERFORMED',
        performedAt: '2026-10-01',
      }],
    }],
  }
}

test('passes a valid canonical Argo program', () => {
  assert.deepEqual(validateArgoProgram(validProgram()), {
    profileId: 'ARGO_PROGRAM_XLS_PROFILE_v1',
    status: 'PASS',
    findings: [],
  })
})

test('blocks empty required descriptions', () => {
  const program = validProgram()
  program.modules[0]!.description = ' '
  program.modules[0]!.arguments[0]!.description = ''

  const result = validateArgoProgram(program)

  assert.equal(result.status, 'BLOCKED')
  assert.deepEqual(result.findings.map((finding) => finding.code), [
    'MODULE_DESCRIPTION_REQUIRED',
    'ARGUMENT_DESCRIPTION_REQUIRED',
  ])
})

test('blocks module descriptions over the Argo 200 character limit', () => {
  const program = validProgram()
  program.modules[0]!.description = 'x'.repeat(201)

  const result = validateArgoProgram(program)

  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.findings[0]?.code, 'MODULE_DESCRIPTION_TOO_LONG')
})

test('blocks invalid performed dates', () => {
  const program = validProgram()
  program.modules[0]!.arguments[0]!.performedAt = '2026-02-31'

  const result = validateArgoProgram(program)

  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.findings[0]?.code, 'INVALID_PERFORMED_DATE')
})

test('finding identifiers are deterministic', () => {
  const program = validProgram()
  program.modules[0]!.description = ''

  const first = validateArgoProgram(program)
  const second = validateArgoProgram(program)

  assert.deepEqual(first, second)
  assert.equal(first.findings[0]?.findingId, 'MODULE_DESCRIPTION_REQUIRED:MOD-1')
})
