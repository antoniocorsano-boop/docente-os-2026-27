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
