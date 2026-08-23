import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildProjectionBatchReview } from './human-task-projection-batch'
import {
  B08_PRIMA_RECIPE_PROPOSAL,
  B09_PRIMA_RECIPE_PROPOSAL,
  B10_PRIMA_UDA_ONLY_RECIPE_PROPOSAL,
} from './human-task-projection-recipes'

const UDA_102 = `CAN-UDA-1-02 — MATERIALI: DALLA RISORSA AL PRODOTTO
Classe prima
Periodo: ottobre/dicembre.
Durata prevista: 12 ore.
4. OBIETTIVI DI APPRENDIMENTO
- distinguere risorsa naturale, materia prima, materiale, semilavorato e prodotto;
- riconoscere famiglie di materiali di uso comune;
- descrivere alcune proprietà fisiche, meccaniche, tecnologiche e funzionali con esempi concreti;
- osservare e confrontare campioni o oggetti mediante criteri definiti;
- eseguire semplici prove comparative in condizioni controllate;
- ricostruire, in forma semplificata, le principali fasi di una filiera materiale;
- motivare la scelta di un materiale in rapporto a funzione, proprietà, costo, disponibilità, sicurezza e impatto ambientale;
- leggere simboli ed etichette essenziali relativi alla composizione o al recupero dei materiali;
- documentare un’attività con tabella, schema, breve relazione o supporto digitale.
8. ARTICOLAZIONE OPERATIVA — 12 ORE
Fase 1 — Dagli oggetti ai materiali — 2 ore
Osservazione guidata di oggetti quotidiani.
Fase 2 — Classificare i materiali — 2 ore
Costruzione di una mappa delle famiglie di materiali.
Fase 3 — Proprietà e prove — 3 ore
Semplici prove comparative adeguate alle dotazioni disponibili.
Fase 4 — Dalla risorsa al prodotto — 2 ore
Ricostruzione di una o più filiere esemplificative, ad esempio legno–carta, minerale–metallo, sabbia–vetro, petrolio/biomassa–polimero. Uso di diagrammi lineari o di flusso.
Fase 5 — Scegliere il materiale — 2 ore
Compito significativo con matrice di criteri.
Fase 6 — Verifica e restituzione — 1 ora
Prova individuale breve e restituzione ragionata.
12. EVIDENZE OSSERVABILI
- riconosce e denomina materiali;
- usa criteri coerenti di classificazione;
- esegue una procedura rispettando consegne e sicurezza;
- registra dati senza confondere osservazioni e interpretazioni;
- collega proprietà e funzione;
- ricostruisce una semplice filiera;
- motiva una scelta fra alternative;
- utilizza lessico tecnico essenziale;
- collabora e documenta il lavoro.`

const PACK_1B = `CAN-PACK-1B — MATERIALI E AVVIO AL DISEGNO TECNICO PER L’OPEN DAY
Classe prima — Tecnologia
3. LEZIONE 6 — OSSERVARE E PROVARE LE PROPRIETÀ (2 h)
UDA prevalente: UDA 2.
Attività: prove qualitative e controllate, senza rischio, su rigidità/flessibilità, trasparenza/opacità, assorbimento superficiale, resistenza alla semplice deformazione manuale ove appropriato, risposta al graffio solo su campioni predisposti e sicuri.
Regola metodologica: una variabile alla volta, osservazione, confronto, registrazione.
Prodotto: SCHEDA F — Prova comparativa.
Evidenza: capacità di descrivere procedura, dato osservato e conclusione senza confondere opinione e risultato.
SCHEDA F — PROVA COMPARATIVA
Domanda: quale materiale __________?
Campione A: __________
Campione B: __________
Che cosa mantengo uguale: __________
Che cosa confronto: __________
Procedura: 1. ___ 2. ___ 3. ___
Osservazioni A: __________
Osservazioni B: __________
Conclusione: __________
Limite della prova: __________
4. LEZIONE 7 — SCEGLIERE UN MATERIALE PER UNA FUNZIONE (2 h)
UDA prevalente: UDA 2; anticipazione metodologica UDA 5.
Attività: confronto tra tre materiali per un semplice oggetto; criteri: funzione, proprietà, disponibilità, lavorabilità, sicurezza, durata, fine vita.
Prodotto: SCHEDA G — Matrice di scelta.
Evidenza: scelta motivata con almeno due criteri.
SCHEDA G — MATRICE DI SCELTA
Oggetto/funzione: __________
Materiale 1: __________
Materiale 2: __________
Materiale 3: __________
Criteri: proprietà adatte / lavorabilità / sicurezza / durata / riuso-riciclo.
Scelta finale: __________
La scelgo perché: 1. __________ 2. __________
Una conseguenza ambientale da considerare: __________
5. LEZIONE 8 — ENTRARE NEL DISEGNO TECNICO (2 h)
UDA prevalente: avvio UDA 3.
Attività: differenza tra disegno libero, geometrico e tecnico; strumenti; postura; impostazione del foglio; intestazione; qualità e funzione della linea.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function candidate(blockId: 'B08' | 'B09' | 'B10', udaText = UDA_102) {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-02', '5e0d5ae7-9f43-4d55-b470-533f2ac806fe', udaText),
    pack: source('CAN-PACK-1B', '1902bdd3-c65f-46c0-b419-99bcd45131ad', PACK_1B),
  })
}

test('batch review prepares B08, B09 and the explicitly composed B10 independently', () => {
  const review = buildProjectionBatchReview(
    [candidate('B08'), candidate('B09'), candidate('B10')],
    [B08_PRIMA_RECIPE_PROPOSAL, B09_PRIMA_RECIPE_PROPOSAL, B10_PRIMA_UDA_ONLY_RECIPE_PROPOSAL],
  )

  assert.deepEqual(review.map((item) => [item.blockId, item.status, item.reason]), [
    ['B08', 'READY_FOR_HUMAN_APPROVAL', 'DRAFT_READY'],
    ['B09', 'READY_FOR_HUMAN_APPROVAL', 'DRAFT_READY'],
    ['B10', 'READY_FOR_HUMAN_APPROVAL', 'DRAFT_READY'],
  ])
})

test('B08 draft preserves one untimed experimental activity and binds Scheda F', () => {
  const [item] = buildProjectionBatchReview([candidate('B08')], [B08_PRIMA_RECIPE_PROPOSAL])
  assert.equal(item.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(item.draft?.projection)
  assert.equal(item.draft.projection.title, 'Proprietà e prove comparative')
  assert.equal(item.draft.projection.durationMinutes, 120)
  assert.equal(item.draft.projection.steps.length, 1)
  assert.equal(item.draft.projection.steps[0].minutes, null)
  assert.deepEqual(item.draft.projection.steps[0].resourceIds, ['STUDENT-F'])
  assert.equal(item.draft.projection.resources[0].title, 'Prova comparativa')
  assert.deepEqual(item.draft.projection.provenance.selectedUdaPhases, [3])
})

test('B09 draft turns the source semicolon into two source-derived steps and binds Scheda G to the criteria step', () => {
  const [item] = buildProjectionBatchReview([candidate('B09')], [B09_PRIMA_RECIPE_PROPOSAL])
  assert.equal(item.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(item.draft?.projection)
  assert.equal(item.draft.projection.title, 'Scegliere un materiale per una funzione')
  assert.equal(item.draft.projection.steps.length, 2)
  assert.deepEqual(item.draft.projection.steps[1].resourceIds, ['STUDENT-G'])
  assert.equal(item.draft.projection.resources[0].title, 'Matrice di scelta')
  assert.deepEqual(item.draft.projection.provenance.selectedUdaPhases, [5])
})

test('B10 UDA-only draft uses exactly phase 4, no PACK headings and no invented timings or resources', () => {
  const [item] = buildProjectionBatchReview([candidate('B10')], [B10_PRIMA_UDA_ONLY_RECIPE_PROPOSAL])
  assert.equal(item.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(item.draft?.projection)
  const projection = item.draft.projection
  assert.equal(projection.title, 'Dalla risorsa al prodotto')
  assert.equal(projection.durationMinutes, 120)
  assert.equal(projection.sourceAlignment.level, 'COMPOSED')
  assert.equal(projection.steps.length, 2)
  assert.deepEqual(projection.steps.map((step) => step.minutes), [null, null])
  assert.match(projection.steps[0].instruction, /filiere esemplificative/i)
  assert.match(projection.steps[1].instruction, /diagrammi lineari o di flusso/i)
  assert.deepEqual(projection.preparation, [])
  assert.deepEqual(projection.resources, [])
  assert.match(projection.evidence, /ricostruisce una semplice filiera/i)
  assert.deepEqual(projection.provenance.selectedUdaPhases, [4])
  assert.deepEqual(projection.provenance.selectedPackHeadings, [])
  assert.deepEqual(projection.provenance.packs, [])
})

test('B10 UDA-only fails closed when the selected UDA phase no longer matches the two-hour block', () => {
  const changedUda = UDA_102.replace('Fase 4 — Dalla risorsa al prodotto — 2 ore', 'Fase 4 — Dalla risorsa al prodotto — 3 ore')
  const [item] = buildProjectionBatchReview([candidate('B10', changedUda)], [B10_PRIMA_UDA_ONLY_RECIPE_PROPOSAL])
  assert.equal(item.status, 'BLOCKED')
  assert.equal(item.reason, 'DRAFT_INVALID')
  assert.equal(item.draft?.issues.some((issue) => issue.code === 'GUIDE_DURATION_MISMATCH'), true)
})
