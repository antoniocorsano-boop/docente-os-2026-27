import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyLessonMaterialBindingPayload,
  parseLessonMaterialBindingV1,
  type LessonMaterialArtifactKind,
  type LessonMaterialAudience,
  type LessonMaterialRole,
} from './lesson-material-binding'

const ROLES: LessonMaterialRole[] = [
  'TEACHER_BRIEF',
  'LIM_VIEW',
  'STUDENT_HANDOUT',
  'MINI_DECK',
  'VISUAL_AID',
  'ASSESSMENT',
]

function validBinding(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'docente-os.lesson-material-binding.v1',
    role: 'TEACHER_BRIEF',
    artifactKind: 'GUIDE',
    audience: 'TEACHER',
    materialRef: {
      kind: 'KNOWLEDGE_GENERATION',
      assetId: 'asset-1',
      generationId: 'generation-1',
      contentDigest: {
        algorithm: 'SHA-256',
        canonicalization: 'docente-os.material-content.v1',
        value: 'a'.repeat(64),
      },
    },
    provenance: {
      sourceArtifactRefs: ['asset-1'],
      derivationRefs: [],
      evidenceRefs: ['evidence-1'],
      rightsState: 'KNOWN',
      attributionRequirements: [],
    },
    ...overrides,
  }
}

test('all six canonical material roles are accepted', () => {
  for (const role of ROLES) {
    const parsed = parseLessonMaterialBindingV1(validBinding({ role }))
    assert.equal(parsed.role, role)
  }
})

test('role, artifact kind and audience are validated independently', () => {
  const combinations: Array<[LessonMaterialRole, LessonMaterialArtifactKind, LessonMaterialAudience]> = [
    ['LIM_VIEW', 'PRESENTATION', 'MIXED'],
    ['STUDENT_HANDOUT', 'WORKSHEET', 'STUDENT'],
    ['ASSESSMENT', 'RUBRIC', 'TEACHER'],
  ]

  for (const [role, artifactKind, audience] of combinations) {
    const parsed = parseLessonMaterialBindingV1(validBinding({ role, artifactKind, audience }))
    assert.equal(parsed.role, role)
    assert.equal(parsed.artifactKind, artifactKind)
    assert.equal(parsed.audience, audience)
  }

  assert.throws(() => parseLessonMaterialBindingV1(validBinding({ role: 'WORKSHEET' })), /role/i)
  assert.throws(() => parseLessonMaterialBindingV1(validBinding({ artifactKind: 'TEACHER_BRIEF' })), /artifact/i)
  assert.throws(() => parseLessonMaterialBindingV1(validBinding({ audience: 'LIM_VIEW' })), /audience/i)
})

test('knowledge generation without a mandatory content digest is rejected', () => {
  assert.throws(
    () =>
      parseLessonMaterialBindingV1(
        validBinding({
          materialRef: { kind: 'KNOWLEDGE_GENERATION', assetId: 'asset-1', generationId: 'generation-1' },
        }),
      ),
    /digest/i,
  )
})

test('immutable revision without a mandatory content digest is rejected', () => {
  assert.throws(
    () =>
      parseLessonMaterialBindingV1(
        validBinding({
          materialRef: { kind: 'IMMUTABLE_REVISION', assetId: 'asset-1', revisionRef: 'rev-1' },
        }),
      ),
    /digest/i,
  )
})

test('unsupported digest algorithm or canonicalization is rejected', () => {
  const base = validBinding().materialRef as Record<string, unknown>
  const digest = base.contentDigest as Record<string, unknown>

  assert.throws(
    () =>
      parseLessonMaterialBindingV1(
        validBinding({ materialRef: { ...base, contentDigest: { ...digest, algorithm: 'MD5' } } }),
      ),
    /algorithm/i,
  )
  assert.throws(
    () =>
      parseLessonMaterialBindingV1(
        validBinding({ materialRef: { ...base, contentDigest: { ...digest, canonicalization: 'other' } } }),
      ),
    /canonicalization/i,
  )
})

test('asset-only, mutable URL-only and malformed provenance cannot be accepted', () => {
  assert.throws(() => parseLessonMaterialBindingV1(validBinding({ materialRef: { assetId: 'asset-1' } })), /material ref/i)
  assert.throws(
    () => parseLessonMaterialBindingV1(validBinding({ materialRef: { kind: 'URL', url: 'https://example.test/live' } })),
    /material ref/i,
  )
  assert.throws(
    () => parseLessonMaterialBindingV1(validBinding({ provenance: { rightsState: 'KNOWN' } })),
    /provenance/i,
  )
})

test('legacy extension payloads are classified explicitly and malformed v1 payloads fail closed', () => {
  assert.deepEqual(classifyLessonMaterialBindingPayload({ source: 'legacy-resource' }), {
    classification: 'LEGACY_EXTENSION',
    binding: null,
  })

  assert.throws(
    () =>
      classifyLessonMaterialBindingPayload({
        materialBinding: validBinding({ materialRef: { kind: 'KNOWLEDGE_GENERATION', assetId: 'asset-1' } }),
      }),
    /material ref|generation|digest/i,
  )

  const classified = classifyLessonMaterialBindingPayload({ materialBinding: validBinding() })
  assert.equal(classified.classification, 'MATERIAL_BINDING_V1')
  assert.equal(classified.binding?.role, 'TEACHER_BRIEF')
})
