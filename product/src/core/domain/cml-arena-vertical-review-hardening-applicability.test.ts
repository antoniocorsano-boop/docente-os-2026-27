import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as disciplineBinding from './cml-discipline-binding'

type Selector = (input: {
  release: unknown
  target: {
    institutionId: string
    schoolYearRef: string
    schoolOrder: 'secondaria'
    gradeRef: 'grade-2'
    disciplineRef: string
  }
}) => unknown

const NOW = '2026-10-21T03:30:00.000Z'
const VERSION_ID = 'arena-curricolo-istituto-2026-27-v1'

function selector(): Selector {
  const candidate = (disciplineBinding as Record<string, unknown>).selectArenaVerticalCurricoloSlice
  assert.equal(typeof candidate, 'function')
  return candidate as Selector
}

function canonicalize(value: unknown): unknown {
  if (value === undefined) throw new Error('cannot canonicalize undefined')
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  throw new Error(`cannot canonicalize ${typeof value}`)
}

function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function refreshFootprint(release: Record<string, unknown>): void {
  const footprint = release.structuralFootprint as Record<string, unknown>
  const { structuralFootprint: _footprint, issuedAt: _issuedAt, ...stable } = release
  footprint.hash = fnv1a(canonicalSerialize(stable))
  footprint.computedAt = NOW
}

function expectedScope(domainKind: string) {
  return {
    schoolOrder: 'secondaria',
    scope: { type: 'grade-range', grades: ['1', '2', '3'] },
    domainId: 'tecnologia',
    domainKind,
  }
}

function expectedScopeKey(value: ReturnType<typeof expectedScope>): string {
  return canonicalSerialize({
    schoolOrder: value.schoolOrder,
    domainId: value.domainId,
    domainKind: value.domainKind,
    scope: value.scope,
  })
}

function releaseFixture() {
  const discipline = expectedScope('DISCIPLINA')
  const expected = [structuredClone(discipline)]
  const release = {
    contract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
    contractVersion: 1,
    institutionId: 'ic-calvario-covotta-don-milani',
    schoolYearRef: '2026/2027',
    version: {
      id: VERSION_ID,
      institutionId: 'ic-calvario-covotta-don-milani',
      title: 'Curricolo verticale di istituto 2026/2027',
      versionNumber: '1',
      status: 'under-review',
      createdAt: NOW,
      updatedAt: NOW,
    },
    authority: {
      state: 'PROVISIONAL_COMPLETE',
      requiresRevalidationOnApproval: true,
    },
    perimeter: {
      expected,
      intentionallyNotApplicable: [],
    },
    manifest: {
      coverageStatus: 'SATISFIED',
      schoolOrders: ['secondaria'],
      expected: structuredClone(expected),
      present: structuredClone(expected),
      missing: [],
      intentionallyNotApplicable: [],
    },
    segments: [{
      id: 'seg-secondaria-tecnologia',
      versionId: VERSION_ID,
      schoolLevel: 'secondaria',
      subjectOrFieldId: 'tecnologia',
      scope: { type: 'grade-range', grades: ['1', '2', '3'] },
      content: {},
    }],
    nodes: [{
      id: 'node-tecnologia-2',
      versionId: VERSION_ID,
      segmentId: 'seg-secondaria-tecnologia',
      type: 'milestone',
      title: 'Comprendere sistemi tecnologici',
    }],
    verticalLinks: [] as Array<Record<string, unknown>>,
    downstreamPolicy: {
      acceptanceRequired: true,
      automaticWriteAllowed: false,
    },
    issuedAt: NOW,
    structuralFootprint: {
      algorithm: 'fnv1a',
      version: 1,
      hash: 'pending',
      computedAt: NOW,
    },
  }
  refreshFootprint(release)
  return release
}

const target = {
  institutionId: 'ic-calvario-covotta-don-milani',
  schoolYearRef: '2026-2027',
  schoolOrder: 'secondaria' as const,
  gradeRef: 'grade-2' as const,
  disciplineRef: 'technology',
}

function validLink(id: string) {
  return {
    id,
    versionId: VERSION_ID,
    sourceNodeId: 'node-tecnologia-2',
    targetNodeId: 'node-tecnologia-2',
    relationType: 'prerequisite',
    rationale: 'Continuity',
    status: 'draft',
    createdAt: NOW,
    updatedAt: NOW,
  }
}

describe('Arena vertical curricolo review hardening', () => {
  it('rejects perimeter coverage collisions across different domain kinds', () => {
    const release = releaseFixture()
    const crossKind = expectedScope('AMBITO_TRASVERSALE')
    const expected = [structuredClone(release.perimeter.expected[0]), crossKind]
      .sort((left, right) => expectedScopeKey(left).localeCompare(expectedScopeKey(right)))
    release.perimeter.expected = structuredClone(expected)
    release.manifest.expected = structuredClone(expected)
    release.manifest.present = structuredClone(expected)
    refreshFootprint(release)

    assert.throws(
      () => selector()({ release, target }),
      /domain.*kind|coverage.*identity|ambiguous|collision|rejected/i,
    )
  })

  it('rejects a vertical link with an empty identifier', () => {
    const release = releaseFixture()
    release.verticalLinks = [validLink('')]
    refreshFootprint(release)

    assert.throws(
      () => selector()({ release, target }),
      /vertical.*link.*id|identifier|rejected/i,
    )
  })

  it('rejects duplicate vertical-link identifiers', () => {
    const release = releaseFixture()
    release.verticalLinks = [validLink('link-1'), validLink('link-1')]
    refreshFootprint(release)

    assert.throws(
      () => selector()({ release, target }),
      /duplicate.*vertical.*link|vertical.*link.*duplicate|identifier|rejected/i,
    )
  })
})
