import assert from 'node:assert/strict'
import test from 'node:test'
import { buildClassWorkspaceSummary, formatWeeklyMinutes } from './class-workspace-model'

test('builds class workspace from canonical section, assignment and progress', () => {
  const summary = buildClassWorkspaceSummary(
    {
      id: 'section-2c', workspaceId: 'w', academicYearId: 'y', grade: 'SECONDA', sectionCode: 'C',
      status: 'CONFERMATA', sourceNote: null, confirmedAt: null, createdAt: '', updatedAt: '',
    },
    [{
      id: 'a1', workspaceId: 'w', academicYearId: 'y', sectionId: 'section-2c', disciplineId: 'd1',
      weeklyMinutes: 120, status: 'CONFIRMED', sourceNote: null, createdAt: '', updatedAt: '',
    }],
    [{ id: 'd1', workspaceId: 'w', academicYearId: 'y', name: 'Tecnologia', isActive: true, createdBy: 'u', createdAt: '', updatedAt: '' }],
    [
      { id: 'p1', sectionId: 'section-2c', canonicalPlanAssetId: 'asset', canonicalGenerationId: 'gen', blockId: 'B01', status: 'SVOLTO', executedOn: null, evidenceNote: null, updatedAt: '' },
      { id: 'p2', sectionId: 'section-2c', canonicalPlanAssetId: 'asset', canonicalGenerationId: 'gen', blockId: 'B02', status: 'PIANIFICATO', executedOn: null, evidenceNote: null, updatedAt: '' },
    ],
  )

  assert.equal(summary.displayLabel, '2ª C')
  assert.equal(summary.compactLabel, '2C')
  assert.equal(summary.gradeQuery, 'seconda')
  assert.equal(summary.assignments[0]?.discipline, 'Tecnologia')
  assert.equal(summary.completedBlocks, 1)
  assert.equal(summary.sectionStatusLabel, 'Confermata')
})

test('weekly minutes are presented in human form', () => {
  assert.equal(formatWeeklyMinutes(120), '2 h/settimana')
  assert.equal(formatWeeklyMinutes(90), '1 h 30 min/settimana')
})
