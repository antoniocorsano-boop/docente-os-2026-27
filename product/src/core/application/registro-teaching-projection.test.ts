import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildRegistroTeachingProjection,
  validateRegistroTeachingProjection,
} from './registro-teaching-projection'

const COMMIT = '0123456789abcdef0123456789abcdef01234567'

function input() {
  return {
    schoolYear: '2026/2027',
    disciplineName: 'Tecnologia',
    generatedAt: '2026-10-30T05:30:00.000Z',
    provenance: {
      sourceCommit: COMMIT,
      sourceBranch: 'develop',
    },
    classes: [
      {
        sourceSectionId: 'section-1a',
        grade: 1 as const,
        sectionCode: 'A',
        compactLabel: '1A',
        displayLabel: '1ª A',
        sectionStatus: 'CONFERMATA' as const,
        canonicalPlan: {
          code: 'CAN-PLAN-1',
          assetId: 'plan-asset-1',
          generationId: 'plan-generation-1',
        },
        udas: [
          {
            sourceUdaRef: '1-01',
            title: 'Bisogni, risorse e sistemi',
            focus: 'Bisogni, risorse e sistemi',
            plannedHours: 8,
            period: 'Settembre/Ottobre',
            packRefs: ['CAN-PACK-1A'],
          },
        ],
      },
    ],
  }
}

test('builder emits the exact governed envelope and deterministic projected UDA identity', () => {
  const projection = buildRegistroTeachingProjection(input())
  assert.equal(projection.contract, 'DOCENTE_OS_REGISTRO_TEACHING_PROJECTION_V1')
  assert.equal(projection.contractVersion, 1)
  assert.equal(projection.sourceProduct, 'DOCENTE_OS')
  assert.equal(projection.targetProduct, 'REGISTRO_DOCENTE')
  assert.equal(projection.importMode, 'READ_ONLY_PROJECTION')
  assert.equal(projection.acceptanceRequired, true)
  assert.equal(projection.automaticWriteAllowed, false)
  assert.equal(projection.privacyClass, 'PROFESSIONAL_NON_PERSONAL')
  assert.equal(projection.provenance.repository, 'antoniocorsano-boop/docente-os-2026-27')
  assert.equal(
    projection.classes[0]?.udas[0]?.projectedUdaId,
    'docente-os:section-1a:plan-generation-1:1-01',
  )
  assert.equal(projection.classes[0]?.udas[0]?.canonicalGenerationId, 'plan-generation-1')
  assert.match(projection.projectionFingerprint.hash, /^[0-9a-f]{64}$/)
})

test('fingerprint is stable when only generatedAt changes', () => {
  const first = buildRegistroTeachingProjection(input())
  const second = buildRegistroTeachingProjection({
    ...input(),
    generatedAt: '2026-10-30T06:30:00.000Z',
  })
  assert.equal(first.projectionFingerprint.hash, second.projectionFingerprint.hash)
})

test('validator accepts the canonical payload and rejects duplicate source sections', () => {
  const projection = buildRegistroTeachingProjection(input())
  assert.deepEqual(validateRegistroTeachingProjection(projection), { ok: true, value: projection })

  const duplicate = structuredClone(projection)
  duplicate.classes.push(structuredClone(duplicate.classes[0]!))
  const result = validateRegistroTeachingProjection(duplicate)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'DUPLICATE_SOURCE_SECTION_ID')
})

test('validator rejects duplicate projected UDA identities', () => {
  const projection = buildRegistroTeachingProjection(input())
  projection.classes[0]!.udas.push(structuredClone(projection.classes[0]!.udas[0]!))
  const result = validateRegistroTeachingProjection(projection)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'DUPLICATE_PROJECTED_UDA_ID')
})

test('validator rejects malformed commit, fingerprint and unexpected properties', () => {
  const projection = buildRegistroTeachingProjection(input())

  const badCommit = structuredClone(projection)
  badCommit.provenance.sourceCommit = 'ABC'
  assert.equal(validateRegistroTeachingProjection(badCommit).ok, false)

  const badFingerprint = structuredClone(projection)
  badFingerprint.projectionFingerprint.hash = 'xyz'
  assert.equal(validateRegistroTeachingProjection(badFingerprint).ok, false)

  const unexpectedRoot = { ...projection, extra: true }
  assert.equal(validateRegistroTeachingProjection(unexpectedRoot).ok, false)

  const unexpectedClass = structuredClone(projection) as unknown as { classes: Array<Record<string, unknown>> }
  unexpectedClass.classes[0]!.extra = true
  assert.equal(validateRegistroTeachingProjection(unexpectedClass).ok, false)

  const unexpectedUda = structuredClone(projection) as unknown as { classes: Array<{ udas: Array<Record<string, unknown>> }> }
  unexpectedUda.classes[0]!.udas[0]!.extra = true
  assert.equal(validateRegistroTeachingProjection(unexpectedUda).ok, false)
})

test('validator rejects prohibited student-personal properties anywhere in projected class/UDA payload', () => {
  const projection = buildRegistroTeachingProjection(input()) as unknown as {
    classes: Array<Record<string, unknown> & { udas: Array<Record<string, unknown>> }>
  }
  projection.classes[0]!.studentName = 'Mario Rossi'
  assert.equal(validateRegistroTeachingProjection(projection).ok, false)

  const projection2 = buildRegistroTeachingProjection(input()) as unknown as {
    classes: Array<{ udas: Array<Record<string, unknown>> }>
  }
  projection2.classes[0]!.udas[0]!.studentId = 'student-1'
  assert.equal(validateRegistroTeachingProjection(projection2).ok, false)
})


test('versioned JSON corpus accepts the canonical fixture and rejects every negative fixture', () => {
  const load = (name: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')) as unknown
  const positive = load('registro-teaching-projection-v1.json')
  assert.equal(validateRegistroTeachingProjection(positive).ok, true)

  for (const name of [
    'negative/automatic-write-enabled.json',
    'negative/duplicate-section.json',
    'negative/malformed-fingerprint.json',
    'negative/personal-field.json',
    'negative/wrong-source.json',
  ]) {
    assert.equal(validateRegistroTeachingProjection(load(name)).ok, false, name)
  }
})
