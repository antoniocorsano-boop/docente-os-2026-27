import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateKnowledgeSemanticReadiness,
  KNOWLEDGE_SEMANTIC_INDEX_STRATEGY,
  validateKnowledgeEmbeddingProfile,
  validateKnowledgeEmbeddingVector,
  type KnowledgeEmbeddingProfile,
} from './semantic-retrieval'

const PROFILE: KnowledgeEmbeddingProfile = {
  id: 'multilingual-reference-v1',
  provider: 'REFERENCE_PROVIDER',
  model: 'reference-multilingual',
  modelRevision: '2026-09-15',
  dimensions: 4,
  distanceMetric: 'COSINE',
  languageScope: 'MULTILINGUAL',
  policyRef: 'privacy-policy:k3c-required',
  status: 'ACTIVE',
}

test('K3B: exact cosine remains the canonical vector strategy before performance evidence', () => {
  assert.equal(KNOWLEDGE_SEMANTIC_INDEX_STRATEGY, 'EXACT_COSINE')
})

test('K3B: semantic retrieval is available only with active profile, matching runtime, policy and full current coverage', () => {
  const readiness = evaluateKnowledgeSemanticReadiness({
    profile: PROFILE,
    runtime: { configuredProfileId: PROFILE.id, providerPolicyAllowed: true },
    coverage: { currentUnits: 1094, embeddedCurrentUnits: 1094 },
  })

  assert.equal(readiness.available, true)
  assert.equal(readiness.coverageRatio, 1)
  assert.deepEqual(readiness.reasons, [])
})

test('K3B: partial current-generation coverage fails closed instead of advertising semantic availability', () => {
  const readiness = evaluateKnowledgeSemanticReadiness({
    profile: PROFILE,
    runtime: { configuredProfileId: PROFILE.id, providerPolicyAllowed: true },
    coverage: { currentUnits: 100, embeddedCurrentUnits: 99 },
  })

  assert.equal(readiness.available, false)
  assert.equal(readiness.coverageRatio, 0.99)
  assert.deepEqual(readiness.reasons, ['CURRENT_CORPUS_INCOMPLETE'])
})

test('K3B: provider policy and profile identity are independent fail-closed gates', () => {
  const readiness = evaluateKnowledgeSemanticReadiness({
    profile: PROFILE,
    runtime: { configuredProfileId: 'another-profile', providerPolicyAllowed: false },
    coverage: { currentUnits: 10, embeddedCurrentUnits: 10 },
  })

  assert.equal(readiness.available, false)
  assert.deepEqual(readiness.reasons, ['PROVIDER_PROFILE_MISMATCH', 'PROVIDER_POLICY_BLOCKED'])
})

test('K3B: evaluation or retired profiles never become runtime semantic authority', () => {
  for (const status of ['EVALUATION', 'RETIRED'] as const) {
    const profile = { ...PROFILE, status }
    const readiness = evaluateKnowledgeSemanticReadiness({
      profile,
      runtime: { configuredProfileId: profile.id, providerPolicyAllowed: true },
      coverage: { currentUnits: 10, embeddedCurrentUnits: 10 },
    })
    assert.equal(readiness.available, false)
    assert.deepEqual(readiness.reasons, ['PROFILE_NOT_ACTIVE'])
  }
})

test('K3B: an empty corpus does not masquerade as 100 percent semantic coverage', () => {
  const readiness = evaluateKnowledgeSemanticReadiness({
    profile: PROFILE,
    runtime: { configuredProfileId: PROFILE.id, providerPolicyAllowed: true },
    coverage: { currentUnits: 0, embeddedCurrentUnits: 0 },
  })

  assert.equal(readiness.available, false)
  assert.equal(readiness.coverageRatio, 0)
  assert.deepEqual(readiness.reasons, ['CURRENT_CORPUS_EMPTY'])
})

test('K3B: embedding profiles must support Italian and bounded dimensions', () => {
  assert.deepEqual(validateKnowledgeEmbeddingProfile(PROFILE), [])

  const invalid = validateKnowledgeEmbeddingProfile({
    ...PROFILE,
    dimensions: 5000,
    languageScope: 'ENGLISH' as KnowledgeEmbeddingProfile['languageScope'],
  })

  assert.equal(invalid.includes('dimensions must be an integer between 1 and 4096'), true)
  assert.equal(invalid.includes('profile must support Italian'), true)
})

test('K3B: vector shape and finite values are checked against the selected profile', () => {
  assert.deepEqual(validateKnowledgeEmbeddingVector(PROFILE, [0.1, 0.2, 0.3, 0.4]), [])

  const invalid = validateKnowledgeEmbeddingVector(PROFILE, [0.1, Number.NaN])
  assert.equal(invalid.some((problem) => problem.includes('dimensions mismatch')), true)
  assert.equal(invalid.includes('embedding contains a non-finite value'), true)
})
