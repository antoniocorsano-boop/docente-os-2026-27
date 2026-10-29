import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import type { TextbookAdoptionWithBook } from '@/core/domain/textbook-adoption'
import type { TextbookCurricoloAlignmentV1 } from '@/core/domain/cml-textbook-applicability'
import {
  asProgettaFocus,
  asProgettaGrade,
  buildProgettaTextbookSupport,
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
  groupProgettaItems,
  partitionProgettaFocusBySection,
  planningCoverage,
  resolveCanonicalProgettaFocus,
} from './progetta-model'

function item(id: string, contentCategory: KnowledgeAsset['contentCategory']) {
  const asset: KnowledgeAsset = {
    id,
    workspaceId: 'w',
    academicYearId: 'y',
    assetKind: 'GENERATED',
    sourceProvider: 'SYSTEM',
    sourceLocator: null,
    originalName: null,
    originalText: null,
    mimeType: null,
    byteSize: null,
    sha256: null,
    processingStatus: 'INDEXED',
    sourceMetadata: {},
    currentGenerationId: null,
    contentCategory,
    disciplines: [],
    classLabels: [],
    contextStatus: 'REVIEWED',
    reliability: 'VERIFIED',
    capturedAt: '2026-08-22T10:00:00Z',
    createdBy: 'u',
    createdAt: '',
    updatedAt: '',
  }
  return { asset, document: null as KnowledgeDocument | null }
}

function textbookAdoption(input: {
  adoptionId?: string
  textbookId?: string
  assignmentId?: string
  title?: string
  status?: 'PROPOSED' | 'CONFIRMED'
  usageKind?: 'ADOPTED' | 'RECOMMENDED' | 'OTHER'
} = {}): TextbookAdoptionWithBook {
  const adoptionId = input.adoptionId ?? 'adoption-tv2ed-1A'
  const textbookId = input.textbookId ?? 'textbook-tv2ed'
  const assignmentId = input.assignmentId ?? 'assignment-technology-1A'
  const status = input.status ?? 'CONFIRMED'
  return {
    id: adoptionId,
    workspaceId: 'workspace-001',
    academicYearId: 'year-2026-27',
    teachingAssignmentId: assignmentId,
    textbookId,
    usageKind: input.usageKind ?? 'ADOPTED',
    sourceKind: 'MIM_OPEN_DATA',
    sourceRef: 'mim:adoption:technology',
    status,
    confirmedBy: status === 'CONFIRMED' ? 'teacher-001' : null,
    confirmedAt: status === 'CONFIRMED' ? '2026-09-01T08:00:00.000Z' : null,
    createdBy: 'teacher-001',
    createdAt: '2026-09-01T07:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    textbook: {
      id: textbookId,
      workspaceId: 'workspace-001',
      academicYearId: 'year-2026-27',
      isbn13: '9788808950758',
      title: input.title ?? 'Tecnologia.verde',
      subtitle: null,
      authors: 'Paci, Paci, Bernardini',
      publisher: 'Zanichelli',
      editionLabel: 'seconda edizione',
      volumeLabel: 'Tecnologia + Disegno',
      officialUrl: null,
      publisherProductRef: null,
      createdBy: 'teacher-001',
      createdAt: '2026-09-01T07:00:00.000Z',
      updatedAt: '2026-09-01T07:00:00.000Z',
    },
  }
}

function textbookAlignment(overrides: Partial<TextbookCurricoloAlignmentV1> = {}): TextbookCurricoloAlignmentV1 {
  return {
    contract: 'CML_TEXTBOOK_ALIGNMENT_V1',
    alignmentId: 'align-1A-sustainability-pages-16-18',
    textbookAdoptionId: 'adoption-tv2ed-1A',
    textbookId: 'textbook-tv2ed',
    teachingAssignmentId: 'assignment-technology-1A',
    curricoloContextId: 'ctx-technology-1A-2026-27',
    requirementId: 'req-sustainability-01',
    udaCode: 'CAN-UDA-1-01',
    relation: 'COMPOSED',
    coverage: 'PARTIAL',
    evidenceLevel: 'VERIFIED_PAGE',
    chapterLabel: 'Sostenibilità: 2030 e oltre',
    pageRange: { from: 16, to: 18 },
    resourceRef: 'teacher-evidence:sustainability-pages-16-18',
    source: 'TEACHER_VERIFIED',
    verifiedByTeacherAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  }
}

test('organizza gli asset nelle tre aree di progettazione', () => {
  const groups = groupProgettaItems([
    item('p', 'PROGRAMMING'), item('u', 'UDA'), item('r', 'TEACHING_RESOURCE'),
    item('m', 'MODEL'), item('v', 'ASSESSMENT'), item('c', 'CIRCULAR'),
  ])

  assert.deepEqual(groups.map((group) => [group.key, group.items.map(({ asset }) => asset.id)]), [
    ['programming', ['p']],
    ['uda', ['u']],
    ['materials', ['r', 'm', 'v']],
  ])
})

test('rende esplicita la copertura per classe senza inventare UDA mancanti', () => {
  const prima = { asset: { ...item('p1', 'PROGRAMMING').asset, sourceMetadata: { grade: 'prima' } }, document: null }
  const seconda = { asset: { ...item('p2', 'PROGRAMMING').asset, sourceMetadata: { grade: 'seconda' } }, document: null }
  const uda = { asset: { ...item('u1', 'UDA').asset, sourceMetadata: { grade: 'prima' } }, document: null }
  const material = { asset: { ...item('r1', 'TEACHING_RESOURCE').asset, sourceMetadata: { grade: 'prima' } }, document: null }

  assert.deepEqual(planningCoverage([prima, seconda, uda, material]), [
    { grade: 'prima', programming: 1, uda: 1, materials: 1 },
    { grade: 'seconda', programming: 1, uda: 0, materials: 0 },
    { grade: 'terza', programming: 0, uda: 0, materials: 0 },
  ])
})

test('filtra Progetta per grado mantenendo i contenuti comuni', () => {
  const prima = { asset: { ...item('p1', 'PROGRAMMING').asset, sourceMetadata: { grade: 'prima' } }, document: null }
  const seconda = { asset: { ...item('p2', 'PROGRAMMING').asset, sourceMetadata: { grade: 'seconda' } }, document: null }
  const comune = item('shared', 'TEACHING_RESOURCE')

  assert.deepEqual(filterProgettaItemsByGrade([prima, seconda, comune], 'seconda').map(({ asset }) => asset.id), ['p2', 'shared'])
  assert.equal(asProgettaGrade('seconda'), 'seconda')
  assert.equal(asProgettaGrade('quarta'), null)
})

test('mantiene il nucleo comune e la sola variante della sezione corrente', () => {
  const comune = item('shared', 'TEACHING_RESOURCE')
  const secondaC = { asset: { ...item('2c', 'TEACHING_RESOURCE').asset, classLabels: ['2C'] }, document: null }
  const secondaA = { asset: { ...item('2a', 'TEACHING_RESOURCE').asset, classLabels: ['2A'] }, document: null }

  assert.deepEqual(
    filterProgettaItemsBySectionContext([comune, secondaC, secondaA], '2C').map(({ asset }) => asset.id),
    ['shared', '2c'],
  )
})

test('un riferimento generale alla secondaria resta disponibile in ogni sezione ma una sezione esplicita restringe', () => {
  const schoolWide = {
    asset: { ...item('school-wide', 'TEACHING_RESOURCE').asset, classLabels: ['Secondaria di primo grado'] },
    document: null,
  }
  const formatted2C = {
    asset: { ...item('formatted-2c', 'TEACHING_RESOURCE').asset, classLabels: ['Classe 2ª C'] },
    document: null,
  }
  const specific2A = {
    asset: { ...item('specific-2a', 'TEACHING_RESOURCE').asset, classLabels: ['2A'] },
    document: null,
  }

  assert.deepEqual(
    filterProgettaItemsBySectionContext([schoolWide, formatted2C, specific2A], '2C').map(({ asset }) => asset.id),
    ['school-wide', 'formatted-2c'],
  )
})

test('riconosce il focus blocco UDA pacchetto e separa nucleo comune da adattamento di sezione', () => {
  const focus = asProgettaFocus({ block: 'b22', uda: '2-07', pack: 'can-pack-2g' })
  assert.deepEqual(focus, { blockId: 'B22', uda: '2-07', pack: 'CAN-PACK-2G' })

  const core = {
    asset: { ...item('core', 'UDA').asset, originalName: 'CAN-PACK-2G UDA 2-07' },
    document: null,
  }
  const section = {
    asset: { ...item('section', 'TEACHING_RESOURCE').asset, sourceMetadata: { pack: 'CAN-PACK-2G' }, classLabels: ['2C'] },
    document: null,
  }
  const other = {
    asset: { ...item('other', 'UDA').asset, originalName: 'CAN-PACK-2F UDA 2-05' },
    document: null,
  }

  const focused = filterProgettaItemsByFocus([core, section, other], focus)
  assert.deepEqual(focused.map(({ asset }) => asset.id), ['core', 'section'])
  assert.deepEqual(partitionProgettaFocusBySection(focused, '2C'), { core: [core], section: [section] })
  assert.equal(asProgettaFocus({ block: '22', uda: 'foo', pack: '2G' }), null)
})

test('la modalità guidata accetta solo un blocco coerente col piano canonico', () => {
  const prima = asProgettaFocus({ block: 'B01', uda: '1-00', pack: 'CAN-PACK-1A' })
  assert.deepEqual(resolveCanonicalProgettaFocus('prima', prima), {
    blockId: 'B01',
    uda: '1-00',
    pack: 'CAN-PACK-1A',
    period: 'Settembre',
    title: 'Ingresso, laboratorio e metodo',
  })

  const incoerente = asProgettaFocus({ block: 'B01', uda: '1-02', pack: 'CAN-PACK-1B' })
  assert.equal(resolveCanonicalProgettaFocus('prima', incoerente), null)
  assert.equal(resolveCanonicalProgettaFocus(null, prima), null)
})

test('collega in Progetta solo il libro adottato confermato della sezione corrente', () => {
  const focus = resolveCanonicalProgettaFocus(
    'prima',
    asProgettaFocus({ block: 'B03', uda: '1-01', pack: 'CAN-PACK-1A' }),
  )
  assert.ok(focus)

  const result = buildProgettaTextbookSupport({
    sectionId: 'section-1A',
    focus,
    assignments: [
      { id: 'assignment-technology-1A', sectionId: 'section-1A' },
      { id: 'assignment-technology-1C', sectionId: 'section-1C' },
    ],
    adoptions: [
      textbookAdoption(),
      textbookAdoption({
        adoptionId: 'adoption-other-section',
        textbookId: 'textbook-other-section',
        assignmentId: 'assignment-technology-1C',
        title: 'Libro di un’altra sezione',
      }),
      textbookAdoption({
        adoptionId: 'adoption-proposed',
        textbookId: 'textbook-proposed',
        assignmentId: 'assignment-technology-1A',
        title: 'Proposta non confermata',
        status: 'PROPOSED',
      }),
    ],
    validatedAlignments: [textbookAlignment()],
  })

  assert.equal(result.length, 1)
  assert.equal(result[0]?.title, 'Tecnologia.verde')
  assert.equal(result[0]?.isbn13, '9788808950758')
  assert.equal(result[0]?.udaCode, 'CAN-UDA-1-01')
  assert.equal(result[0]?.alignmentState, 'VERIFIED')
  assert.deepEqual(result[0]?.references.map((reference) => reference.pageRangeLabel), ['pp. 16–18'])
})

test('non mostra supporto libro prima di avere sezione e UDA note', () => {
  const adoption = textbookAdoption()
  const assignments = [{ id: 'assignment-technology-1A', sectionId: 'section-1A' }]

  assert.deepEqual(buildProgettaTextbookSupport({
    sectionId: null,
    focus: null,
    assignments,
    adoptions: [adoption],
    validatedAlignments: [],
  }), [])

  assert.deepEqual(buildProgettaTextbookSupport({
    sectionId: 'section-1A',
    focus: null,
    assignments,
    adoptions: [adoption],
    validatedAlignments: [],
  }), [])
})

test('distingue il libro adottato da un allineamento UDA ancora non verificato', () => {
  const focus = resolveCanonicalProgettaFocus(
    'prima',
    asProgettaFocus({ block: 'B03', uda: '1-01', pack: 'CAN-PACK-1A' }),
  )
  assert.ok(focus)

  const result = buildProgettaTextbookSupport({
    sectionId: 'section-1A',
    focus,
    assignments: [{ id: 'assignment-technology-1A', sectionId: 'section-1A' }],
    adoptions: [textbookAdoption()],
    validatedAlignments: [textbookAlignment({ udaCode: 'CAN-UDA-1-02' })],
  })

  assert.equal(result.length, 1)
  assert.equal(result[0]?.alignmentState, 'ADOPTED_ONLY')
  assert.deepEqual(result[0]?.references, [])
})

test('la modalità guidata rende primario l’authoring contestuale senza nascondere piano e archivio', () => {
  const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
  const styleSource = readFileSync(new URL('./progetta-focus.css', import.meta.url), 'utf8')

  assert.match(pageSource, /const guidedAuthoringItem = coreItems\.find\(\(\{ asset \}\) => asset\.contentCategory === 'UDA'\)/)
  assert.match(pageSource, /className="guidedPrimaryAuthoring"/)
  assert.match(pageSource, /className="guidedPrimaryAuthoringAction"/)
  assert.match(pageSource, /\/progetta\/documenti\/nuovo\/\$\{encodeURIComponent\(guidedAuthoringItem\.asset\.id\)\}/)
  assert.match(pageSource, /className="guidedPrimaryAuthoringAction"[^>]*>Prepara documento\s*<span aria-hidden>→<\/span><\/Link>/)
  assert.match(pageSource, />Piano annuale</)
  assert.match(pageSource, />Esplora tutta la progettazione</)
  assert.match(styleSource, /\.guidedPrimaryAuthoring/)
  assert.match(styleSource, /\.guidedPrimaryAuthoringAction/)
})