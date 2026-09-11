import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnnualPlanSection } from '@/core/domain/annual-plan-execution'
import type { KnowledgeAsset } from '@/core/domain/knowledge'
import { buildClassroomSessionView, classroomOpeningGuide, classroomSupportText } from './classroom-session-model'

const section: AnnualPlanSection = {
  id: 'section-3c',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  grade: 'TERZA',
  sectionCode: 'C',
  status: 'CONFERMATA',
  sourceNote: null,
  confirmedAt: null,
  createdAt: '',
  updatedAt: '',
}

function asset(overrides: Partial<KnowledgeAsset> = {}): KnowledgeAsset {
  return {
    id: 'asset-3c',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    assetKind: 'WEB',
    sourceProvider: 'MANUAL',
    sourceLocator: 'https://www.canva.com/d/example',
    originalName: '3C - Leggo la tecnologia come sistema',
    originalText: null,
    mimeType: null,
    byteSize: null,
    sha256: null,
    processingStatus: 'INDEXED',
    sourceMetadata: {
      docenteOsResource: 'CLASS_LESSON_MATERIAL',
      provider: 'CANVA',
      resourceKind: 'PRESENTATION',
      audience: 'STUDENT',
      approvalState: 'PENDING_HUMAN',
      targetDate: '2026-09-11',
      sectionId: 'section-3c',
      canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      classroomSteps: [
        { title: 'Sistema', instruction: 'Riconosci ingresso, processo e uscita.', cue: 'Parti dall’illuminazione dell’aula.' },
        { title: 'Controllo', instruction: 'Individua come viene comandato il sistema.' },
      ],
      classroomSupport: {
        simpler: ['Un sistema riceve qualcosa, lo trasforma e produce un risultato.'],
        examples: ['L’interruttore comanda l’accensione della lampada.'],
        checks: ['Qual è l’ingresso del sistema di illuminazione?'],
        visuals: ['Schema a tre blocchi: ingresso → processo → uscita, con interruttore come controllo.'],
      },
    },
    currentGenerationId: null,
    contentCategory: 'TEACHING_RESOURCE',
    disciplines: ['Tecnologia'],
    classLabels: ['3C'],
    contextStatus: 'REVIEWED',
    reliability: 'VERIFIED',
    capturedAt: '2026-09-10T10:00:00Z',
    createdBy: 'user-1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

test('builds an in-class session only for the exact class and a safe external source', () => {
  const view = buildClassroomSessionView(section, asset())
  assert.ok(view)
  assert.equal(view.classLabel, '3C')
  assert.equal(view.steps.length, 2)
  assert.equal(view.providerLabel, 'Canva')
  assert.equal(view.approvalLabel, 'Predisposto')
  assert.equal(view.canonicalBindingLabel, 'Diagnostica di accoglienza · non imputata al Piano')
  assert.equal(view.imageGenerationAvailable, false)

  assert.equal(buildClassroomSessionView(section, asset({ classLabels: ['3A'] })), null)
  assert.equal(buildClassroomSessionView(section, asset({ sourceLocator: 'javascript:alert(1)' })), null)
})

test('rejects a material explicitly bound to another canonical section', () => {
  const mismatched = asset({
    sourceMetadata: { ...asset().sourceMetadata, sectionId: 'section-3a' },
  })
  assert.equal(buildClassroomSessionView(section, mismatched), null)
})

test('opening guide turns prepared hints into a short spoken start without inventing pupil data', () => {
  const view = buildClassroomSessionView(section, asset())
  assert.ok(view)

  const opening = classroomOpeningGuide(view)
  const hook = classroomSupportText(view, 0, 'HOOK')

  assert.match(opening.hook, /interruttore/)
  assert.match(opening.bridge, /illuminazione/)
  assert.match(opening.question, /ingresso/)
  assert.match(hook.text, /Parti da qui/)
  assert.match(hook.text, /interruttore/)
  assert.equal(hook.generated, false)
})

test('quick support is grounded in prepared lesson hints and never claims image generation', () => {
  const view = buildClassroomSessionView(section, asset())
  assert.ok(view)

  const simpler = classroomSupportText(view, 0, 'SIMPLER')
  const example = classroomSupportText(view, 0, 'EXAMPLE')
  const check = classroomSupportText(view, 0, 'CHECK')
  const visual = classroomSupportText(view, 0, 'VISUAL')

  assert.match(simpler.text, /riceve qualcosa/)
  assert.match(example.text, /interruttore/)
  assert.match(check.text, /ingresso/)
  assert.match(visual.text, /ingresso → processo → uscita/)
  assert.equal(visual.generated, false)
})
