import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { selectArenaVerticalCurricoloSlice } from './cml-discipline-binding'

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
  footprint.hash = fnv1a(JSON.stringify(canonicalize(stable)))
  footprint.computedAt = NOW
}

function releaseFixture(): Record<string, unknown> {
  const perimeterEntry = {
    schoolOrder: 'secondaria',
    scope: { type: 'grade-range', grades: ['1', '2', '3'] },
    domainId: 'tecnologia',
    domainKind: 'DISCIPLINA',
  }
  const release: Record<string, unknown> = {
    contract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
    contractVersion: 1,
    institutionId: 'ic-calvario-covotta-don-milani',
    schoolYearRef: '2026/2027',
    version: {
      id: 'arena-curricolo-istituto-2026-27-v1',
      institutionId: 'ic-calvario-covotta-don-milani',
      versionNumber: '1',
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

const target = {
  institutionId: 'ic-calvario-covotta-don-milani',
  schoolYearRef: '2026-2027',
  schoolOrder: 'secondaria' as const,
  gradeRef: 'grade-2' as const,
  disciplineRef: 'technology',
}

describe('Arena vertical release JSON material boundary', () => {
  it('rejects a selection-critical root field inherited from a prototype', () => {
    const release = releaseFixture()
    delete release.contract
    Object.setPrototypeOf(release, { contract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1' })
    refreshFootprint(release)

    assert.throws(
      () => selectArenaVerticalCurricoloSlice({ release, target }),
      /json|prototype|plain|own|release material|rejected/i,
    )
  })

  it('rejects a selection-critical nested field inherited from a prototype', () => {
    const release = releaseFixture()
    const segments = release.segments as Array<Record<string, unknown>>
    const segment = segments[0]
    const inheritedScope = segment.scope
    delete segment.scope
    Object.setPrototypeOf(segment, { scope: inheritedScope })
    refreshFootprint(release)

    assert.throws(
      () => selectArenaVerticalCurricoloSlice({ release, target }),
      /json|prototype|plain|own|release material|rejected/i,
    )
  })
})
