import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HumanTaskContentPipelineService,
  canonicalCodeFromOriginalName,
  compileHumanTaskContentCandidate,
  extractCanonicalPack,
  extractCanonicalUda,
  type HumanTaskContentSourcePort,
  type HumanTaskPipelineSource,
} from './human-task-content-pipeline'

const UDA_TEXT = `CAN-UDA-1-01 — TECNOLOGIA, BISOGNI, RISORSE E SISTEMI
Classe prima
1. COLLOCAZIONE NEL PERCORSO
Durata prevista: 8 ore.
7. ARTICOLAZIONE DELLE 8 ORE
Ora 1 — Dai bisogni alle soluzioni
Conversazione guidata, classificazione dei bisogni e prima mappa concettuale.
Ora 2 — Risorse e vincoli
Individuazione di risorse naturali, materiali, energetiche, umane e informative.
Ora 3 — Tecnica, tecnologia, bene e servizio
Confronto e classificazione con esempi scolastici e domestici.
Ora 4 — Leggere un sistema tecnologico
Introduzione allo schema input → trasformazione → output.
Ora 5 — Dal processo al diagramma
Scomposizione di un processo e costruzione di un diagramma.
Ora 6 — Risorse, ambiente e sostenibilità
Riduzione, riuso, riparazione, riciclo e conseguenze ambientali.
Ora 7 — Compito applicativo
Analizzare un oggetto o servizio attraverso una scheda sistema.
Ora 8 — Restituzione, verifica e autovalutazione
Presentazione, verifica individuale e autovalutazione finale.
8. METODOLOGIE
- lezione dialogata.`

const PACK_TEXT = `CAN-PACK-1A — PACCHETTO OPERATIVO DI AVVIO CLASSE PRIMA
==================================================
SCHEDA DOCENTE 3 — BISOGNI, RISORSE, PRODOTTI E SERVIZI
Durata: 2 ore
UDA: 1
Obiettivo: comprendere che la Tecnologia nasce da bisogni e utilizza risorse per produrre beni, servizi e sistemi.
Materiali:
- immagini o carte di oggetti/servizi;
- fogli A3 o quaderno;
- SCHEDA ALUNNO C.
Sequenza:
1. Classificare esempi secondo il bisogno soddisfatto.
2. Distinguere bisogno, bene/prodotto, servizio.
3. Individuare materia, energia, informazione, lavoro/organizzazione.
==================================================
SCHEDA ALUNNO C — DAL BISOGNO ALLA SOLUZIONE
Quale bisogno soddisfa?
È soprattutto un prodotto, un servizio o un sistema?
Materiali/materia
Energia
Informazioni
Persone/organizzazione
==================================================
SCHEDA DOCENTE 4 — PENSARE PER SISTEMI
Durata: 2 ore
UDA: 1
Obiettivo: introdurre la lettura input → trasformazione/processo → output.
Esempi suggeriti:
- bicicletta;
- lampada.
Consegna:
Non descrivere solo che cosa vedi. Spiega che cosa entra, che cosa succede e che cosa esce.
==================================================
SCHEDA ALUNNO D — LEGGO UN SISTEMA TECNOLOGICO
INPUT — che cosa entra?
TRASFORMAZIONE / PROCESSO — che cosa accade?
OUTPUT — che cosa otteniamo?
==================================================
COMPITO SIGNIFICATIVO BREVE — UDA 1
Titolo: Racconta la tecnologia nascosta in un oggetto quotidiano
Consegna:
1. bisogno;
2. funzione;
3. principali materiali;
4. risorse necessarie;
==================================================
RUBRICA BREVE — COMPITO SIGNIFICATIVO UDA 1
AVANZATO
Individua con precisione bisogno, funzione, risorse e sistema.`

function source(code: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId: `gen-${code}`, title: code, normalizedText: text }
}

test('extracts the real UDA hour structure without inventing timings', () => {
  const uda = extractCanonicalUda('CAN-UDA-1-01', UDA_TEXT)
  assert.equal(uda.title, 'TECNOLOGIA, BISOGNI, RISORSE E SISTEMI')
  assert.equal(uda.durationHours, 8)
  assert.equal(uda.hours.length, 8)
  assert.deepEqual(uda.hours.slice(0, 2).map((hour) => hour.title), ['Dai bisogni alle soluzioni', 'Risorse e vincoli'])
})

test('extracts typed CAN-PACK sections', () => {
  const pack = extractCanonicalPack('CAN-PACK-1A', PACK_TEXT)
  assert.equal(pack.sections.filter((section) => section.kind === 'TEACHER_GUIDE').length, 2)
  assert.equal(pack.sections.filter((section) => section.kind === 'STUDENT_SHEET').length, 2)
  assert.equal(pack.sections.some((section) => section.kind === 'TASK_BRIEF'), true)
  assert.equal(pack.sections.some((section) => section.kind === 'RUBRIC'), true)
  const guide = pack.sections.find((section) => section.heading.includes('SCHEDA DOCENTE 3'))
  assert.equal(guide?.durationMinutes, 120)
  assert.match(guide?.objective ?? '', /bisogni/i)
})

test('builds B03 evidence from canonical annual-plan metadata plus KB sources', () => {
  const candidate = compileHumanTaskContentCandidate('Prima', 'B03', {
    uda: source('CAN-UDA-1-01', UDA_TEXT),
    pack: source('CAN-PACK-1A', PACK_TEXT),
  })

  assert.equal(candidate.gate.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(candidate.gate.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.equal(candidate.block.udaCode, '1-01')
  assert.equal(candidate.block.packCode, 'CAN-PACK-1A')
  assert.equal(candidate.block.durationMinutes, 120)
  assert.deepEqual(candidate.evidence.udaHourWindow?.map((hour) => hour.ordinal), [1, 2])
  assert.ok(candidate.evidence.rankedPackMatches.length > 0)
})

test('maps the contiguous four-block UDA window mechanically but still requires human review', () => {
  const expected = new Map([
    ['B03', [1, 2]],
    ['B04', [3, 4]],
    ['B05', [5, 6]],
    ['B06', [7, 8]],
  ])
  for (const [blockId, hours] of expected) {
    const candidate = compileHumanTaskContentCandidate('Prima', blockId, {
      uda: source('CAN-UDA-1-01', UDA_TEXT),
      pack: source('CAN-PACK-1A', PACK_TEXT),
    })
    assert.deepEqual(candidate.evidence.udaHourWindow?.map((hour) => hour.ordinal), hours)
    assert.equal(candidate.gate.promotion, 'HUMAN_REVIEW_REQUIRED')
  }
})

test('fails closed when a required canonical source is missing or mismatched', () => {
  const missing = compileHumanTaskContentCandidate('Prima', 'B03', { uda: null, pack: source('CAN-PACK-1A', PACK_TEXT) })
  assert.equal(missing.gate.status, 'BLOCKED')
  assert.equal(missing.gate.issues.some((item) => item.code === 'UDA_SOURCE_MISSING'), true)

  const mismatch = compileHumanTaskContentCandidate('Prima', 'B03', {
    uda: source('CAN-UDA-1-02', UDA_TEXT),
    pack: source('CAN-PACK-1A', PACK_TEXT),
  })
  assert.equal(mismatch.gate.status, 'BLOCKED')
  assert.equal(mismatch.gate.issues.some((item) => item.code === 'UDA_SOURCE_CODE_MISMATCH'), true)
})

test('discovers sources through a port and never promotes automatically', async () => {
  const values = new Map<string, HumanTaskPipelineSource>([
    ['CAN-UDA-1-01', source('CAN-UDA-1-01', UDA_TEXT)],
    ['CAN-PACK-1A', source('CAN-PACK-1A', PACK_TEXT)],
  ])
  const port: HumanTaskContentSourcePort = {
    async getCurrentByCanonicalCode(_workspaceId, code) {
      return values.get(code) ?? null
    },
  }
  const candidate = await new HumanTaskContentPipelineService(port).compile('workspace', 'Prima', 'B06')
  assert.equal(candidate.gate.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(candidate.gate.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.deepEqual(candidate.evidence.udaHourWindow?.map((hour) => hour.ordinal), [7, 8])
})

test('extracts canonical codes only from supported source names', () => {
  assert.equal(canonicalCodeFromOriginalName('CAN-UDA-1-01_Tecnologia_bisogni'), 'CAN-UDA-1-01')
  assert.equal(canonicalCodeFromOriginalName('CAN-PACK-1A_Avvio_classe'), 'CAN-PACK-1A')
  assert.equal(canonicalCodeFromOriginalName('CAN-PLAN-1_Piano_annuale'), 'CAN-PLAN-1')
  assert.equal(canonicalCodeFromOriginalName('materiale-libero.pdf'), null)
})


// DOC-01/D2b3a — synthetic source capability checks; no new runtime/export contract.
const DOCUMENTATION_UDA_FIXTURE = `CAN-UDA-1-01 — UDA dimostrativa
Durata prevista: 8 ore.
1. METODOLOGIE
- Discussione guidata.
- Confronto di rappresentazioni.
2. COMPITO AUTENTICO
- Elaborare una mappa esplicativa.
3. VERIFICA
- Restituzione individuale.
- Autovalutazione.
4. ARTICOLAZIONE
Ora 1 — Fase dimostrativa
Attività prevista.
Ora 2 — Seconda fase
Attività prevista.`

const DOCUMENTATION_PACK_FIXTURE = `CAN-PACK-1A — Pacchetto dimostrativo
SCHEDA DOCENTE 3 — ATTIVITÀ DIMOSTRATIVA
Materiali:
- Fogli.
- Matite.
Regola metodologica: Confronto guidato.
Evidenza: Mappa prevista.
COMPITO SIGNIFICATIVO BREVE — UDA 1
Consegna: Elaborare una mappa esplicativa.
RUBRICA BREVE — UDA 1
Criterio dimostrativo: chiarezza della rappresentazione.
SCHEDA ALUNNO A — SUPPORTO
Materiale di consultazione.`

test('DOC-01/D2b3a preserves explicit UDA document headings and list items', () => {
  const uda = extractCanonicalUda('CAN-UDA-1-01', DOCUMENTATION_UDA_FIXTURE)
  const byHeading = (heading: string) => uda.sections.filter((section) => section.heading === heading)
  assert.equal(byHeading('METODOLOGIE').length, 1)
  assert.deepEqual(byHeading('METODOLOGIE')[0].listItems, ['Discussione guidata.', 'Confronto di rappresentazioni.'])
  assert.deepEqual(byHeading('COMPITO AUTENTICO')[0].listItems, ['Elaborare una mappa esplicativa.'])
  assert.deepEqual(byHeading('VERIFICA')[0].listItems, ['Restituzione individuale.', 'Autovalutazione.'])
  assert.equal(byHeading('VALUTAZIONI EFFETTIVE').length, 0)
})

test('DOC-01/D2b3a preserves typed task, rubric, method, materials and expected evidence without conflation', () => {
  const pack = extractCanonicalPack('CAN-PACK-1A', DOCUMENTATION_PACK_FIXTURE)
  const guide = pack.sections.find((section) => section.kind === 'TEACHER_GUIDE')
  assert.ok(guide)
  assert.deepEqual(guide.materials, ['Fogli.', 'Matite.'])
  assert.equal(guide.methodNote, 'Confronto guidato.')
  assert.equal(guide.evidence, 'Mappa prevista.')
  const task = pack.sections.find((section) => section.kind === 'TASK_BRIEF')
  const rubric = pack.sections.find((section) => section.kind === 'RUBRIC')
  const sheet = pack.sections.find((section) => section.kind === 'STUDENT_SHEET')
  assert.ok(task && rubric && sheet)
  assert.match(task.content, /Elaborare una mappa esplicativa/)
  assert.match(rubric.content, /chiarezza della rappresentazione/)
  assert.equal(sheet.methodNote, null)
  assert.deepEqual(sheet.materials, [])
  assert.equal(sheet.evidence, null)
})

test('DOC-01/D2b3a missing explicit document fields are not reconstructed from a title or a rubric', () => {
  const uda = extractCanonicalUda('CAN-UDA-1-01', 'CAN-UDA-1-01 — Verifica e metodi\nOra 1 — Compito significativo\nAttività generica.')
  const pack = extractCanonicalPack('CAN-PACK-1A', 'CAN-PACK-1A — Metodi e materiali\nRUBRICA BREVE — UDA 1\nCriterio dimostrativo.')
  assert.equal(uda.sections.length, 0)
  assert.equal(pack.sections.filter((section) => section.kind === 'TASK_BRIEF').length, 0)
  assert.equal(pack.sections[0].methodNote, null)
  assert.deepEqual(pack.sections[0].materials, [])
  assert.equal(pack.sections[0].evidence, null)
})

test('DOC-01/D2b3a source generation changes bind a different candidate; extraction never grants approval', () => {
  const uda = source('CAN-UDA-1-01', DOCUMENTATION_UDA_FIXTURE)
  const pack = source('CAN-PACK-1A', DOCUMENTATION_PACK_FIXTURE)
  const first = compileHumanTaskContentCandidate('Prima', 'B03', { uda, pack })
  const next = compileHumanTaskContentCandidate('Prima', 'B03', { uda, pack: { ...pack, generationId: 'demo-next-generation' } })
  assert.equal(first.gate.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(first.gate.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.equal(next.gate.promotion, 'HUMAN_REVIEW_REQUIRED')
  assert.notEqual(first.candidateId, next.candidateId)
  assert.equal(first.sources.pack?.generationId, pack.generationId)
  assert.equal(next.sources.pack?.generationId, 'demo-next-generation')
  assert.equal(compileHumanTaskContentCandidate('Prima', 'B03', { uda, pack: null }).gate.status, 'BLOCKED')
})


// DOC-01/D2b3b — test-only selection contract over the existing V1 producer.
// No runtime producer, new archive, approval, export endpoint or personal data.
import { createHash } from 'node:crypto'
import { buildRegistroTeachingProjectionFromAnnualPlan } from '../../app/piano-annuale/registro-export-model'
import { buildBlocks, GRADE_STORAGE, CANONICAL_PLAN_CODES, type GradeKey } from '../../app/piano-annuale/model'
import { validateRegistroTeachingProjection, type RegistroTeachingProjectionV1 } from './registro-teaching-projection'

type DocField = 'significant-task' | 'methodology' | 'resource' | 'assessment-method'
type DocLocator = {
  field: DocField; sourceCode: string; assetId: string; generationId: string;
  contentDigest: string; ordinal: number; heading: string; item: number | null;
}
type DocSelection = {
  parentHash: string; sectionId: string; udaId: string; blockId: string; locators: DocLocator[];
}
type DocBasis = { parent: RegistroTeachingProjectionV1; sources: HumanTaskPipelineSource[] }
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
const exactKeys = (value: object, keys: readonly string[]) =>
  Reflect.ownKeys(value).length === keys.length && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor?.enumerable && Object.prototype.hasOwnProperty.call(descriptor, 'value')
  })
const documentFields: readonly DocField[] = ['significant-task', 'methodology', 'resource', 'assessment-method']

function prepareDocumentSelection(parent: unknown, basis: DocBasis, selection: DocSelection) {
  // The separate basis is exclusively a synthetic producer-side fixture.
  // A caller-controlled basis is NOT an authority or privacy verifier.
  try {
    const checked = validateRegistroTeachingProjection(parent)
    const trusted = validateRegistroTeachingProjection(basis.parent)
    if (!checked.ok || !trusted.ok || checked.value.projectionFingerprint.hash !== trusted.value.projectionFingerprint.hash ||
        checked.value.projectionFingerprint.hash !== selection.parentHash) return null
    if (!exactKeys(selection, ['parentHash','sectionId','udaId','blockId','locators']) ||
        !Array.isArray(selection.locators) || !selection.locators.length || selection.locators.length > 100) return null
    const section = checked.value.classes.find(s => s.sourceSectionId === selection.sectionId)
    if (!section || section.sectionStatus !== 'CONFERMATA') return null
    const uda = section.udas.find(u => u.projectedUdaId === selection.udaId)
    if (!uda) return null
    const grade: GradeKey = section.grade === 1 ? 'Prima' : section.grade === 2 ? 'Seconda' : 'Terza'
    const block = buildBlocks(grade).find(b => b.id === selection.blockId)
    if (!block || block.uda !== uda.sourceUdaRef || section.canonicalPlan.code !== CANONICAL_PLAN_CODES[grade] ||
        uda.canonicalGenerationId !== section.canonicalPlan.generationId ||
        ![block.pack, ...block.supportPacks].every(code => uda.packRefs.includes(code))) return null
    const udaCode = 'CAN-UDA-' + block.uda
    const codes = [udaCode, block.pack, ...block.supportPacks]
    const sources = codes.map(code => {
      const matches = basis.sources.filter(s => s.code === code)
      if (matches.length !== 1 || !matches[0].assetId || !matches[0].generationId || !matches[0].normalizedText.trim()) throw Error('source missing or ambiguous')
      return matches[0]
    })
    const candidate = compileHumanTaskContentCandidate(grade, block.id, { uda: sources[0], pack: sources[1], supportPacks: sources.slice(2) })
    if (candidate.gate.status !== 'READY_FOR_HUMAN_REVIEW' || candidate.gate.promotion !== 'HUMAN_REVIEW_REQUIRED') return null
    const seen = new Set<string>()
    const values: Array<{field:DocField;text:string;locator:DocLocator}> = []
    for (const locator of selection.locators) {
      if (!locator || !exactKeys(locator,['field','sourceCode','assetId','generationId','contentDigest','ordinal','heading','item']) ||
          !documentFields.includes(locator.field) || !Number.isInteger(locator.ordinal) ||
          !(locator.item === null || Number.isInteger(locator.item) && locator.item >= 0)) return null
      const source = sources.find(s => s.code === locator.sourceCode)
      if (!source || locator.assetId !== source.assetId || locator.generationId !== source.generationId ||
          locator.contentDigest !== digest(source.normalizedText)) return null
      const key = JSON.stringify([locator.sourceCode,locator.ordinal,locator.field,locator.item])
      if (seen.has(key)) return null
      seen.add(key)
      let text: string | undefined | null
      if (source.code === udaCode) {
        const matches = candidate.evidence.uda?.sections.filter(s => s.heading === locator.heading) ?? []
        const item = matches.length === 1 && matches[0].ordinal === locator.ordinal ? matches[0] : undefined
        const headings: Partial<Record<DocField,string>> = {
          'significant-task':'COMPITO AUTENTICO', methodology:'METODOLOGIE', 'assessment-method':'VERIFICA',
        }
        if (!item || headings[locator.field] !== item.heading || locator.item === null) return null
        text = item.listItems[locator.item]
      } else {
        const packs = [candidate.evidence.pack, ...candidate.evidence.supportPacks].filter(p => p?.code === source.code)
        if (packs.length !== 1) return null
        const matches = packs[0]?.sections.filter(s => s.heading === locator.heading) ?? []
        const item = matches.length === 1 && matches[0].ordinal === locator.ordinal ? matches[0] : undefined
        if (!item) return null
        if (locator.field === 'significant-task' && item.kind === 'TASK_BRIEF' && locator.item === null) text = item.content
        if (locator.field === 'methodology' && locator.item === null) text = item.methodNote
        if (locator.field === 'resource' && locator.item !== null) text = item.materials[locator.item]
        // Rubric/observation/student sheet are not automatically assessment methods.
      }
      if (!text?.trim()) return null
      values.push(Object.freeze({ field:locator.field, text, locator:Object.freeze({...locator}) }))
    }
    const fingerprint = digest(JSON.stringify({
      parentHash:selection.parentHash, sectionId:section.sourceSectionId, udaId:uda.projectedUdaId,
      blockId:block.id, plan:section.canonicalPlan,
      sources:sources.map(s=>[s.code,s.assetId,s.generationId,digest(s.normalizedText)]), values,
    }))
    return Object.freeze({
      labOnly:true as const, canExport:false as const, requiresTeacherReview:true as const,
      nature:'planned' as const, scope:'selected-block' as const, complete:false as const,
      values:Object.freeze(values), missing:Object.freeze(documentFields.filter(f=>!values.some(v=>v.field===f))),
      fingerprint,
    })
  } catch { return null }
}

function documentBasis(grade:GradeKey='Prima', confirmed=true) {
  const gradeNum = grade === 'Prima' ? 1 : grade === 'Seconda' ? 2 : 3
  const block = buildBlocks(grade).find(b=>b.id===(grade==='Prima'?'B03':'B01'))!
  const timestamp='2026-11-19T00:00:00.000Z'
  const parent = buildRegistroTeachingProjectionFromAnnualPlan({
    snapshot:{sections:[{
      id:'demo-section',workspaceId:'demo-workspace',academicYearId:'demo-year',grade:GRADE_STORAGE[grade],
      sectionCode:'A',status:confirmed?'CONFERMATA':'PROVVISORIA',sourceNote:null,
      confirmedAt:confirmed?timestamp:null,createdAt:timestamp,updatedAt:timestamp,
    }],progress:[]},
    runtimeSources:{
      Prima:{code:'CAN-PLAN-1',assetId:'demo-plan-asset-1',generationId:'demo-plan-gen-1'},
      Seconda:{code:'CAN-PLAN-2',assetId:'demo-plan-asset-2',generationId:'demo-plan-gen-2'},
      Terza:{code:'CAN-PLAN-3',assetId:'demo-plan-asset-3',generationId:'demo-plan-gen-3'},
    },
    schoolYear:'2026/2027',disciplineName:'Tecnologia',generatedAt:timestamp,
    provenance:{sourceCommit:'a'.repeat(40),sourceBranch:'demo'},
  })
  assert.equal(parent.classes[0].grade,gradeNum)
  const udaCode='CAN-UDA-'+block.uda
  const uda=source(udaCode,DOCUMENTATION_UDA_FIXTURE.replace('CAN-UDA-1-01',udaCode))
  const pack=source(block.pack,DOCUMENTATION_PACK_FIXTURE.replace('CAN-PACK-1A',block.pack))
  const supports=block.supportPacks.map(code=>source(code,DOCUMENTATION_PACK_FIXTURE.replace('CAN-PACK-1A',code)))
  const basis:DocBasis={parent,sources:[uda,pack,...supports]}
  const extractedUda=extractCanonicalUda(uda.code,uda.normalizedText)
  const extractedPack=extractCanonicalPack(pack.code,pack.normalizedText)
  const locator=(field:DocField,s:HumanTaskPipelineSource,part:{ordinal:number;heading:string},item:number|null):DocLocator=>({
    field,sourceCode:s.code,assetId:s.assetId,generationId:s.generationId,contentDigest:digest(s.normalizedText),
    ordinal:part.ordinal,heading:part.heading,item,
  })
  const method=extractedUda.sections.find(s=>s.heading==='METODOLOGIE')!
  const verification=extractedUda.sections.find(s=>s.heading==='VERIFICA')!
  const task=extractedPack.sections.find(s=>s.kind==='TASK_BRIEF')!
  const guide=extractedPack.sections.find(s=>s.kind==='TEACHER_GUIDE')!
  const selection:DocSelection={
    parentHash:parent.projectionFingerprint.hash,sectionId:'demo-section',
    udaId:parent.classes[0].udas.find(u=>u.sourceUdaRef===block.uda)!.projectedUdaId,blockId:block.id,
    locators:[locator('methodology',uda,method,0),locator('assessment-method',uda,verification,0),
      locator('significant-task',pack,task,null),locator('resource',pack,guide,0)],
  }
  return {basis,selection,uda,pack,locator,extractedPack}
}

test('DOC-01/D2b3b uses the real V1 producer and exact selected fields, never auto-exports',()=>{
  const {basis,selection}=documentBasis()
  const r=prepareDocumentSelection(basis.parent,basis,selection)
  assert.ok(r)
  assert.equal(r.labOnly,true)
  assert.equal(r.canExport,false)
  assert.equal(r.requiresTeacherReview,true)
  assert.equal(r.complete,false)
  assert.deepEqual(r.values.map(v=>v.field),['methodology','assessment-method','significant-task','resource'])
  assert.deepEqual(r.values.slice(0,2).map(v=>v.text),['Discussione guidata.','Restituzione individuale.'])
  assert.match(r.values[2].text,/Elaborare una mappa esplicativa/)
  assert.equal(r.values[3].text,'Fogli.')
  assert.deepEqual(r.missing,[])
  assert.equal(r.scope,'selected-block')
  assert.doesNotMatch(JSON.stringify(r),/Mappa prevista|Criterio dimostrativo|demo-workspace|demo-year/)
})

test('DOC-01/D2b3b preserves distinct canonical grade and selected UDA identities',()=>{
  for(const grade of ['Prima','Seconda','Terza'] as const){
    const {basis,selection}=documentBasis(grade)
    assert.ok(prepareDocumentSelection(basis.parent,basis,selection))
    const other=basis.parent.classes[0].udas.find(u=>u.projectedUdaId!==selection.udaId)!
    assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,udaId:other.projectedUdaId}),null)
  }
})

test('DOC-01/D2b3b rejects provisional sections, tampered parent or wrong plan block',()=>{
  const {basis,selection}=documentBasis()
  const provisional=documentBasis('Prima',false)
  assert.equal(prepareDocumentSelection(provisional.basis.parent,provisional.basis,provisional.selection),null)
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,parentHash:'b'.repeat(64)}),null)
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,blockId:'B01'}),null)
  assert.equal(prepareDocumentSelection({...basis.parent,automaticWriteAllowed:true},basis,selection),null)
})

test('DOC-01/D2b3b rejects missing, ambiguous, changed generation or changed source bytes',()=>{
  const {basis,selection,pack}=documentBasis()
  for(const sources of [
    basis.sources.filter(s=>s.code!==pack.code),
    [...basis.sources,pack],
    basis.sources.map(s=>s.code===pack.code?{...s,generationId:'demo-next-generation'}:s),
    basis.sources.map(s=>s.code===pack.code?{...s,normalizedText:s.normalizedText+'\nModifica'}:s),
  ]) assert.equal(prepareDocumentSelection(basis.parent,{...basis,sources},selection),null)
})

test('DOC-01/D2b3b cannot derive verification from a rubric or method from a title',()=>{
  const {basis,selection,pack,locator,extractedPack}=documentBasis()
  const rubric=extractedPack.sections.find(s=>s.kind==='RUBRIC')!
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,locators:[locator('assessment-method',pack,rubric,null)]}),null)
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,locators:[{...selection.locators[0],heading:'ARTICOLAZIONE'}]}),null)
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,locators:[{...selection.locators[0],item:99}]}),null)
})

test('DOC-01/D2b3b keeps missing fields distinct and rejects duplicate or editorial text input',()=>{
  const {basis,selection}=documentBasis()
  const r=prepareDocumentSelection(basis.parent,basis,{...selection,locators:[selection.locators[0]]})
  assert.ok(r)
  assert.deepEqual(r.missing,['significant-task','resource','assessment-method'])
  assert.equal(r.values.length,1)
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,locators:[selection.locators[0],selection.locators[0]]}),null)
  const editorial={...selection.locators[0],text:'Editoriale'}
  assert.equal(prepareDocumentSelection(basis.parent,basis,{...selection,locators:[editorial]}),null)
  assert.ok(Object.isFrozen(r.values[0].locator))
})

test('DOC-01/D2b3b binds a new review to changed selection; no automatic annual coverage',()=>{
  const {basis,selection}=documentBasis()
  const first=prepareDocumentSelection(basis.parent,basis,selection)
  const next=prepareDocumentSelection(basis.parent,basis,{...selection,locators:[...selection.locators].reverse()})
  assert.ok(first&&next)
  assert.notEqual(first.fingerprint,next.fingerprint)
  assert.equal(first.fingerprint,prepareDocumentSelection(basis.parent,basis,selection)?.fingerprint)
  assert.equal(first.complete,false)
  assert.equal(next.canExport,false)
})
