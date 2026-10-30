import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnnualPlanExecutionSnapshot } from '@/core/domain/annual-plan-execution'
import type { CanonicalPlanRuntimeSources } from './model'
import { buildRegistroTeachingProjectionFromAnnualPlan } from './registro-export-model'

const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01'

const EXPECTED_TITLES = {
  Seconda: {
    '2-01': 'Agricoltura, suolo e produzioni sostenibili',
    '2-02': 'Alimenti, trasformazione e conservazione',
    '2-03': 'Territorio, città e pianificazione',
    '2-04': 'Edificio, strutture e materiali da costruzione',
    '2-05': 'Abitazione, impianti, sicurezza ed efficienza',
    '2-06': 'Rilievo, scale e proiezioni ortogonali',
    '2-07': 'Progettare uno spazio o un semplice oggetto',
    '2-08': 'Dati, rappresentazione digitale e modellazione introduttiva',
  },
  Terza: {
    '3-01': 'Energia: forme, trasformazioni e fabbisogni',
    '3-02': 'Fonti rinnovabili e non rinnovabili',
    '3-03': 'Produzione, distribuzione e uso dell’energia elettrica',
    '3-04': 'Elettricità, circuiti e sicurezza',
    '3-05': 'Macchine, meccanismi e sistemi tecnologici',
    '3-06': 'Assonometria, sezioni e rappresentazione tridimensionale',
    '3-07': 'Informatica, algoritmi, reti e automazione',
    '3-08': 'Tecnologia, sostenibilità e scelte responsabili',
    '3-09': 'Progetto conclusivo e orientamento',
  },
} as const

function snapshot(): AnnualPlanExecutionSnapshot {
  const common = {
    workspaceId: 'workspace-secret',
    academicYearId: 'academic-year-secret',
    status: 'CONFERMATA' as const,
    sourceNote: 'Orario docente',
    confirmedAt: '2026-09-01T08:00:00.000Z',
    createdAt: '2026-09-01T07:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  }

  return {
    sections: [
      { ...common, id: 'section-2a', grade: 'SECONDA', sectionCode: 'A' },
      { ...common, id: 'section-3a', grade: 'TERZA', sectionCode: 'A' },
    ],
    progress: [],
  }
}

function runtimeSources(): CanonicalPlanRuntimeSources {
  return {
    Prima: { code: 'CAN-PLAN-1', assetId: 'plan-asset-1', generationId: 'plan-generation-1' },
    Seconda: { code: 'CAN-PLAN-2', assetId: 'plan-asset-2', generationId: 'plan-generation-2' },
    Terza: { code: 'CAN-PLAN-3', assetId: 'plan-asset-3', generationId: 'plan-generation-3' },
  }
}

test('exports every canonical UDA title for Seconda and Terza, including split annual-plan segments', () => {
  const projection = buildRegistroTeachingProjectionFromAnnualPlan({
    snapshot: snapshot(),
    runtimeSources: runtimeSources(),
    schoolYear: '2026/2027',
    disciplineName: 'Tecnologia',
    generatedAt: '2026-10-30T06:00:00.000Z',
    provenance: { sourceCommit: COMMIT, sourceBranch: 'develop' },
  })

  for (const [compactLabel, expected] of [
    ['2A', EXPECTED_TITLES.Seconda],
    ['3A', EXPECTED_TITLES.Terza],
  ] as const) {
    const projectedClass = projection.classes.find((item) => item.compactLabel === compactLabel)
    assert.ok(projectedClass, `missing projected class ${compactLabel}`)
    assert.deepEqual(
      Object.fromEntries(projectedClass.udas.map((uda) => [uda.sourceUdaRef, uda.title])),
      expected,
    )
  }
})
