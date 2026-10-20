import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as disciplineBinding from './cml-discipline-binding'

type SelectorInput = {
  release: unknown
  target: {
    institutionId: string
    schoolYearRef: string
    schoolOrder: 'secondaria'
    gradeRef: 'grade-1' | 'grade-2' | 'grade-3'
    disciplineRef: string
  }
}

type SelectedSlice = {
  institutionId: string
  schoolYearRef: string
  schoolOrder: 'secondaria'
  gradeRef: string
  disciplineRef: string
  version: { id: string; versionNumber: string }
  structuralFootprint: { algorithm: 'fnv1a'; version: 1; hash: string; computedAt: string }
  provenance: {
    sourceProduct: 'CURMANLIGHT_ARENA'
    sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1'
    issuedAt: string
  }
  authority: {
    state: 'PROVISIONAL_COMPLETE'
    alignmentAuthority: 'PROVISIONAL_BASELINE'
    requiresRevalidationOnApproval: true
  }
  downstreamPolicy: {
    acceptanceRequired: true
    automaticWriteAllowed: false
  }
  segment: { id: string; subjectOrFieldId: string }
  nodes: Array<{ id: string; segmentId: string }>
}

type Selector = (input: SelectorInput) => SelectedSlice

function selector(): Selector {
  const candidate = (disciplineBinding as Record<string, unknown>).selectArenaVerticalCurricoloSlice
  assert.equal(
    typeof candidate,
    'function',
    'vertical Arena intake must expose selectArenaVerticalCurricoloSlice',
  )
  return candidate as Selector
}

const NOW = '2026-10-19T12:00:00.000Z'

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
  const footprint = release.structuralFootprint
  assert.ok(footprint && typeof footprint === 'object' && !Array.isArray(footprint))
  const { structuralFootprint: _footprint, issuedAt: _issuedAt, ...stable } = release
  ;(footprint as Record<string, unknown>).hash = fnv1a(canonicalSerialize(stable))
  ;(footprint as Record<string, unknown>).computedAt = NOW
}

function releaseFixture() {
  const perimeterEntry = {
    schoolOrder: 'secondaria',
    scope: { type: 'grade-range', grades: ['1', '2', '3'] },
    domainId: 'tecnologia',
    domainKind: 'DISCIPLINA',
  }
  const release = {
    contract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
    contractVersion: 1,
    institutionId: 'ic-calvario-covotta-don-milani',
    schoolYearRef: '2026/2027',
    version: {
      id: 'arena-curricolo-istituto-2026-27-v1',
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
      expected: [structuredClone(perimeterEntry)],
      intentionallyNotApplicable: [],
    },
    manifest: {
      coverageStatus: 'SATISFIED',
      schoolOrders: ['secondaria'],
      expected: [structuredClone(perimeterEntry)],
      present: [structuredClone(perimeterEntry)],
      missing: [],
      intentionallyNotApplicable: [],
    },
    segments: [
      {
        id: 'seg-primaria-tecnologia',
        versionId: 'arena-curricolo-istituto-2026-27-v1',
        schoolLevel: 'primaria',
        subjectOrFieldId: 'tecnologia',
        scope: { type: 'grade-range', grades: ['1', '2', '3', '4', '5'] },
        content: {},
      },
      {
        id: 'seg-secondaria-italiano',
        versionId: 'arena-curricolo-istituto-2026-27-v1',
        schoolLevel: 'secondaria',
        subjectOrFieldId: 'italiano',
        scope: { type: 'grade-range', grades: ['1', '2', '3'] },
        content: {},
      },
      {
        id: 'seg-secondaria-tecnologia',
        versionId: 'arena-curricolo-istituto-2026-27-v1',
        schoolLevel: 'secondaria',
        subjectOrFieldId: 'tecnologia',
        scope: { type: 'grade-range', grades: ['1', '2', '3'] },
        content: {},
      },
    ],
    nodes: [
      {
        id: 'node-tecnologia-2',
        versionId: 'arena-curricolo-istituto-2026-27-v1',
        segmentId: 'seg-secondaria-tecnologia',
        type: 'milestone',
        title: 'Comprendere sistemi tecnologici',
      },
      {
        id: 'node-italiano-2',
        versionId: 'arena-curricolo-istituto-2026-27-v1',
        segmentId: 'seg-secondaria-italiano',
        type: 'milestone',
        title: 'Comprendere e produrre testi',
      },
    ],
    verticalLinks: [],
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

function useScope(
  release: ReturnType<typeof releaseFixture>,
  scope: { type: 'grade'; grade: string } | { type: 'grade-range'; grades: string[] } | { type: 'school-level' },
): void {
  release.perimeter.expected[0].scope = structuredClone(scope) as never
  release.manifest.expected[0].scope = structuredClone(scope) as never
  release.manifest.present[0].scope = structuredClone(scope) as never
  release.segments[2].scope = structuredClone(scope) as never
  refreshFootprint(release)
}

const target = {
  institutionId: 'ic-calvario-covotta-don-milani',
  schoolYearRef: '2026-2027',
  schoolOrder: 'secondaria' as const,
  gradeRef: 'grade-2' as const,
  disciplineRef: 'technology',
}

describe('Arena vertical curricolo intake applicability', () => {
  it('selects only the exact lower-secondary class slice and preserves Arena provenance', () => {
    const release = releaseFixture()
    const result = selector()({ release, target })

    assert.equal(result.segment.id, 'seg-secondaria-tecnologia')
    assert.deepEqual(result.nodes.map((node) => node.id), ['node-tecnologia-2'])
    assert.equal(result.institutionId, target.institutionId)
    assert.equal(result.schoolYearRef, '2026/2027')
    assert.equal(result.schoolOrder, 'secondaria')
    assert.equal(result.gradeRef, 'grade-2')
    assert.equal(result.disciplineRef, 'technology')
    assert.equal(result.version.id, 'arena-curricolo-istituto-2026-27-v1')
    assert.equal(result.version.versionNumber, '1')
    assert.equal(result.structuralFootprint.hash, release.structuralFootprint.hash)
    assert.deepEqual(result.provenance, {
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
      issuedAt: NOW,
    })
    assert.deepEqual(result.authority, {
      state: 'PROVISIONAL_COMPLETE',
      alignmentAuthority: 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: true,
    })
    assert.deepEqual(result.downstreamPolicy, {
      acceptanceRequired: true,
      automaticWriteAllowed: false,
    })
    assert.equal(Object.keys(result).some((key) => key.endsWith('Coverage')), false)
  })

  it('accepts Arena grade, grade-range and school-level scopes applicable to the target class', () => {
    const select = selector()
    for (const scope of [
      { type: 'grade', grade: '2' } as const,
      { type: 'grade-range', grades: ['1', '2', '3'] } as const,
      { type: 'school-level' } as const,
    ]) {
      const release = releaseFixture()
      useScope(release, scope)
      assert.equal(select({ release, target }).segment.id, 'seg-secondaria-tecnologia')
    }
  })

  it('fails closed when institution, year, school order, grade or discipline do not match', () => {
    const select = selector()
    const cases = [
      { ...target, institutionId: 'other-school' },
      { ...target, schoolYearRef: '2027-2028' },
      { ...target, schoolOrder: 'primaria' as never },
      { ...target, gradeRef: 'grade-4' as never },
      { ...target, disciplineRef: 'italiano' },
    ]

    for (const candidate of cases) {
      assert.throws(
        () => select({ release: releaseFixture(), target: candidate }),
        /does not match|no applicable|unsupported|rejected/i,
      )
    }
  })

  it('rejects incomplete, writable or authority-promoting release input', () => {
    const select = selector()

    const incomplete = releaseFixture()
    incomplete.manifest.coverageStatus = 'INCOMPLETE'
    refreshFootprint(incomplete)
    assert.throws(() => select({ release: incomplete, target }), /manifest|incomplete|rejected/i)

    const writable = releaseFixture()
    writable.downstreamPolicy.automaticWriteAllowed = true
    refreshFootprint(writable)
    assert.throws(() => select({ release: writable, target }), /automatic|write|policy|rejected/i)

    const approved = releaseFixture()
    approved.authority = {
      state: 'APPROVED',
      requiresRevalidationOnApproval: false,
    } as never
    refreshFootprint(approved)
    assert.throws(() => select({ release: approved, target }), /approved|authority|provisional|rejected/i)
  })

  it('rejects missing or inconsistent Arena version and structural footprint provenance', () => {
    const select = selector()

    const wrongVersion = releaseFixture()
    wrongVersion.segments[2].versionId = 'other-version'
    refreshFootprint(wrongVersion)
    assert.throws(() => select({ release: wrongVersion, target }), /version|rejected/i)

    const noFootprint = releaseFixture()
    noFootprint.structuralFootprint.hash = ''
    assert.throws(() => select({ release: noFootprint, target }), /footprint|hash|provenance|rejected/i)
  })

  it('rejects release material changed after Arena computed its structural footprint', () => {
    const release = releaseFixture()
    release.nodes[0].title = 'Contenuto alterato dopo il rilascio Arena'
    assert.throws(() => selector()({ release, target }), /footprint|structural|provenance|rejected/i)
  })

  it('rebuilds the Arena manifest instead of trusting a declared SATISFIED status', () => {
    const release = releaseFixture()
    release.manifest.present = []
    refreshFootprint(release)
    assert.throws(() => selector()({ release, target }), /manifest|coverage|rejected/i)
  })
})
