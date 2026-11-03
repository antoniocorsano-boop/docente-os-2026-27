import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyCanonicalArenaReleaseForThreeGrades } from './cml-arena-three-grade-preflight'

const NOW = '2026-10-19T12:00:00.000Z'
const INSTITUTION = 'ics-lorenzo-milani'
const VERSION_ID = 'can-curr-master-00-v1-3'
const SOURCE = 'CAN-CURR-MASTER-00 — testo di prova non vigente; non usare come fonte reale'

function canonicalize(value: unknown): unknown {
  if (value === undefined) throw new Error('undefined is not canonical')
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === 'object') {
    const ordered: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      ordered[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return ordered
  }
  throw new Error('not canonical')
}
const canonicalSerialize = (value: unknown) => JSON.stringify(canonicalize(value))
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function fixture() {
  const entries = Array.from({ length: 113 }, (_, i) => {
    const grade = i < 3 ? String(i + 1) : '1'
    const domainId = i < 3 ? 'tecnologia' : `disciplina-prova-${String(i).padStart(3, '0')}`
    return {
      schoolOrder: 'secondaria',
      domainId,
      domainKind: 'DISCIPLINA',
      scope: { type: 'grade' as const, grade },
    }
  }).sort((a, b) => canonicalSerialize(a).localeCompare(canonicalSerialize(b)))

  const segments = entries.map((e, i) => ({
    id: `seg-${String(i).padStart(3, '0')}-${e.domainId}-${e.scope.grade}`,
    versionId: VERSION_ID,
    schoolLevel: 'secondaria',
    subjectOrFieldId: e.domainId,
    scope: structuredClone(e.scope),
    frameworkApplicability: {
      framework: e.scope.grade === '1' ? 'IN2025' : 'IN2012',
      resolutionStatus: 'resolved',
      resolutionReason: 'Fixture: regime transitorio',
    },
    workStatus: 'under-review',
    content: { obiettivi: ['Obiettivo sintetico'], evidenze: ['Evidenza prevista'] },
  }))
  const nodes = segments.map(s => ({
    id: `${s.id}-milestone`,
    versionId: VERSION_ID,
    segmentId: s.id,
    type: 'milestone',
    title: 'Milestone di prova',
  }))
  const sourceSnapshot = {
    format: 'text/plain',
    content: SOURCE,
    contentFootprint: {
      algorithm: 'fnv1a', version: 1,
      hash: fnv1a(canonicalSerialize({ format: 'text/plain', content: SOURCE })),
      computedAt: NOW,
    },
  }
  const release = {
    contract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
    contractVersion: 1,
    institutionId: INSTITUTION,
    schoolYearRef: '2026/2027',
    version: {
      id: VERSION_ID,
      institutionId: INSTITUTION,
      title: 'Master di prova',
      versionNumber: '1.3',
      status: 'under-review',
      createdAt: NOW,
      updatedAt: NOW,
    },
    authority: { state: 'PROVISIONAL_COMPLETE', requiresRevalidationOnApproval: true },
    perimeter: { expected: structuredClone(entries), intentionallyNotApplicable: [] },
    manifest: {
      coverageStatus: 'SATISFIED',
      schoolOrders: ['secondaria'],
      expected: structuredClone(entries),
      present: structuredClone(entries),
      missing: [],
      intentionallyNotApplicable: [],
    },
    segments,
    nodes,
    verticalLinks: [],
    downstreamPolicy: { acceptanceRequired: true, automaticWriteAllowed: false },
    issuedAt: NOW,
    sourceMaster: {
      masterId: 'CAN-CURR-MASTER-00',
      driveFileId: '12eWTPUZBJxZixd6-p8drNAaW5_eL8qWpXZUSDyZZAv4',
      masterVersion: '1.3',
      revisionId: '27',
      materializationState: 'COMPLETE',
      humanProfessionalValidation: 'OPEN',
      curricoloVigente: false,
      authority: 'INSTITUTE_CANONICAL_WORKING_BASELINE',
    },
    sourceSnapshot,
    structuralFootprint: {
      algorithm: 'fnv1a', version: 1, hash: 'pending', computedAt: NOW,
    },
  }
  refreshOuter(release)
  return release
}

function refreshOuter(release: ReturnType<typeof fixture>): void {
  const { structuralFootprint: _fp, issuedAt: _at, ...stable } = release
  const { computedAt: _snapshotTime, ...snapshotFootprint } = stable.sourceSnapshot.contentFootprint
  release.structuralFootprint.hash = fnv1a(canonicalSerialize({
    ...stable, sourceSnapshot: {
      ...stable.sourceSnapshot, contentFootprint: snapshotFootprint,
    },
  }))
}

const check = (release: unknown) => verifyCanonicalArenaReleaseForThreeGrades({
  release,
  targetInstitutionId: INSTITUTION,
  schoolYearRef: '2026/2027',
  expectedRevisionId: '27',
  expectedSourceContentFootprint: fnv1a(canonicalSerialize({ format: 'text/plain', content: SOURCE })),
})

describe('Arena three-grade canonical release read-only preflight', () => {
  it('checks all 113 source scopes and returns only a detached receipt for classes I/II/III', () => {
    const input = fixture()
    const before = JSON.stringify(input)
    const receipt = check(input)
    assert.equal(receipt.status, 'OFFLINE_CONTRACT_VERIFIED')
    assert.equal(receipt.scopeCount, 113)
    assert.equal(receipt.sourceRevisionId, '27')
    assert.equal(receipt.authorityState, 'PROVISIONAL_COMPLETE')
    assert.equal(receipt.curricoloVigente, false)
    assert.equal(receipt.workspaceAcceptanceVerified, false)
    assert.equal(receipt.writePerformed, false)
    assert.deepEqual(receipt.grades.map(g => [g.gradeRef, g.framework]), [
      ['grade-1', 'IN2025'],
      ['grade-2', 'IN2012'],
      ['grade-3', 'IN2012'],
    ])
    assert.ok(receipt.grades.every(g => g.nodeCount > 0))
    assert.equal(JSON.stringify(input), before)
    assert.equal(JSON.stringify(receipt).includes(SOURCE), false)
  })

  it('rejects target alias mismatch and wrong declared year/revision/fingerprint', () => {
    const release = fixture()
    assert.throws(() => verifyCanonicalArenaReleaseForThreeGrades({
      release, targetInstitutionId: 'ic-calvario-covotta-don-milani',
      schoolYearRef: '2026/2027', expectedRevisionId: '27',
    }), /institution|identity|target/i)
    assert.throws(() => verifyCanonicalArenaReleaseForThreeGrades({
      release, targetInstitutionId: INSTITUTION, schoolYearRef: '2027/2028',
      expectedRevisionId: '27',
    }), /year|school/i)
    assert.throws(() => verifyCanonicalArenaReleaseForThreeGrades({
      release, targetInstitutionId: INSTITUTION, schoolYearRef: '2026/2027',
      expectedRevisionId: '28',
    }), /revision/i)
    assert.throws(() => verifyCanonicalArenaReleaseForThreeGrades({
      release, targetInstitutionId: INSTITUTION, schoolYearRef: '2026/2027',
      expectedRevisionId: '27', expectedSourceContentFootprint: '00000000',
    }), /source|fingerprint|footprint/i)
  })

  it('rejects a missing third-grade slice, after an otherwise self-consistent rehash', () => {
    const release = fixture()
    const third = release.segments.find(s => s.subjectOrFieldId === 'tecnologia' && s.scope.grade === '3')
    assert.ok(third)
    third.subjectOrFieldId = 'altra-disciplina'
    release.perimeter.expected = release.perimeter.expected.map(e =>
      e.domainId === 'tecnologia' && e.scope.grade === '3' ? { ...e, domainId: 'altra-disciplina' } : e)
      .sort((a,b) => canonicalSerialize(a).localeCompare(canonicalSerialize(b)))
    release.manifest.expected = structuredClone(release.perimeter.expected)
    release.manifest.present = structuredClone(release.perimeter.expected)
    refreshOuter(release)
    assert.throws(() => check(release), /grade-3|third|classe|segment|perimeter/i)
  })

  it('validates the command-line verifier with a private temporary JSON file only', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'dos-arena-verify-'))
    try {
      const input = path.join(folder, 'vertical.json')
      writeFileSync(input, JSON.stringify(fixture()))
      const script = fileURLToPath(new URL('../../../scripts/check-canonical-vertical-release.mjs', import.meta.url))
      const run = (target: string) => spawnSync(process.execPath, [
        '--import', 'tsx', script,
        '--input', input,
        '--target-institution-id', target,
        '--school-year', '2026/2027',
        '--expected-revision-id', '27',
      ], { cwd: path.resolve(path.dirname(script), '..'), encoding: 'utf8', timeout: 20000 })
      const ok = run(INSTITUTION)
      assert.equal(ok.status, 0, ok.stderr)
      assert.equal(JSON.parse(ok.stdout).status, 'OFFLINE_CONTRACT_VERIFIED')
      assert.equal(ok.stdout.includes(SOURCE), false)
      const no = run('ic-calvario-covotta-don-milani')
      assert.notEqual(no.status, 0)
      assert.equal(no.stdout, '')
      assert.deepEqual(readdirSync(folder), ['vertical.json'])
      assert.equal(readFileSync(input,'utf8'), JSON.stringify(fixture()))
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
