import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  projectionDownloadFilename,
  resolveRegistroExportRuntimeProvenance,
} from './registro-export-runtime'

const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01'

test('accepts only exact Render commit + branch provenance', () => {
  assert.deepEqual(
    resolveRegistroExportRuntimeProvenance({ RENDER_GIT_COMMIT: COMMIT, RENDER_GIT_BRANCH: 'develop' }),
    { sourceCommit: COMMIT, sourceBranch: 'develop' },
  )
  assert.equal(resolveRegistroExportRuntimeProvenance({ RENDER_GIT_COMMIT: 'unknown', RENDER_GIT_BRANCH: 'develop' }), null)
  assert.equal(resolveRegistroExportRuntimeProvenance({ RENDER_GIT_COMMIT: COMMIT }), null)
  assert.equal(resolveRegistroExportRuntimeProvenance({ RENDER_GIT_BRANCH: 'develop' }), null)
})

test('builds a stable teacher-facing JSON filename from the school year', () => {
  assert.equal(
    projectionDownloadFilename('2026/2027'),
    'docente-os-registro-teaching-projection-2026-2027.json',
  )
})

test('annual-plan export is explicit, server-side and local-download only', () => {
  const actions = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
  const client = readFileSync(new URL('./AnnualPlanClient.tsx', import.meta.url), 'utf8')

  assert.match(actions, /export async function exportRegistroTeachingProjection/)
  assert.match(actions, /buildRegistroTeachingProjectionFromAnnualPlan/)
  assert.match(actions, /validateRegistroTeachingProjection/)
  assert.match(actions, /resolveRegistroExportRuntimeProvenance\(process\.env\)/)
  assert.doesNotMatch(actions, /fetch\(/)

  assert.match(client, /Esporta per Registro Docente/)
  assert.match(client, /Nessun dato studente/)
  assert.match(client, /exportRegistroTeachingProjection/)
  assert.match(client, /application\/json/)
})
