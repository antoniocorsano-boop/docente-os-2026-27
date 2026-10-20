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
  const candidate = (disciplineBinding as Record<string, unknown>).selectArenaVerticalCurriculumSlice
  assert.equal(
    typeof candidate,
    'function',
    'vertical Arena intake must expose selectArenaVerticalCurriculumSlice',
  )
  return candidate as Selector
}

const NOW = '2026-10-19T12:00:00.000Z'

function releaseFixture() {
  return {
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
      expected: [
        {
          schoolOrder: 'secondaria',
          scope: { type: 'grade-range', grades: ['1', '2', '3'] },
          domainId: 'tecnologia',
          domainKind: 'DISCIPLINA',
        },
      ],
      intentionallyNotApplicable: [],
    },
    manifest: {
      coverageStatus: 'SATISFIED',
      schoolOrders: ['secondaria'],
      expected: [],
      present: [],
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
      hash: 'a1b2c3d4',
      computedAt: NOW,
    },
  }
}

const target = {
  institutionId: 'ic-calvario-covotta-don-milani',
  schoolYearRef: '2026-2027',
  schoolOrder: 'secondaria' as const,
  gradeRef: 'grade-2' as const,
  disciplineRef: 'technology',
}

describe('Arena vertical curriculum intake applicability', () => {
  it('selects only the exact lower-secondary class slice and preserves Arena provenance', () => {
    const result = selector()({ release: releaseFixture(), target })

    assert.equal(result.segment.id, 'seg-secondaria-tecnologia')
    assert.deepEqual(result.nodes.map((node) => node.id), ['node-tecnologia-2'])
    assert.equal(result.institutionId, target.institutionId)
    assert.equal(result.schoolYearRef, '2026/2027')
    assert.equal(result.schoolOrder, 'secondaria')
    assert.equal(result.gradeRef, 'grade-2')
    assert.equal(result.disciplineRef, 'technology')
    assert.equal(result.version.id, 'arena-curricolo-istituto-2026-27-v1')
    assert.equal(result.version.versionNumber, '1')
    assert.equal(result.structuralFootprint.hash, 'a1b2c3d4')
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
    assert.equal('curriculumCoverage' in result, false)
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
    assert.throws(() => select({ release: incomplete, target }), /manifest|incomplete|rejected/i)

    const writable = releaseFixture()
    writable.downstreamPolicy.automaticWriteAllowed = true
    assert.throws(() => select({ release: writable, target }), /automatic|write|policy|rejected/i)

    const approved = releaseFixture()
    approved.authority = {
      state: 'APPROVED',
      requiresRevalidationOnApproval: false,
    } as never
    assert.throws(() => select({ release: approved, target }), /approved|authority|provisional|rejected/i)
  })

  it('rejects missing or inconsistent Arena version and structural footprint provenance', () => {
    const select = selector()

    const wrongVersion = releaseFixture()
    wrongVersion.segments[2].versionId = 'other-version'
    assert.throws(() => select({ release: wrongVersion, target }), /version|rejected/i)

    const noFootprint = releaseFixture()
    noFootprint.structuralFootprint.hash = ''
    assert.throws(() => select({ release: noFootprint, target }), /footprint|hash|provenance|rejected/i)
  })
})
