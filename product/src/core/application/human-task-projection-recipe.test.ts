import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, extractCanonicalPack, extractCanonicalUda, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildProjectionDraft } from './human-task-projection-recipe'
import { B07_PRIMA_RECIPE_PROPOSAL } from './human-task-projection-recipes'

const UDA_102 = `CAN-UDA-1-02 — MATERIALI: DALLA RISORSA AL PRODOTTO
Classe prima
1. COLLOCAZIONE NEL PERCORSO
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
Osservazione guidata di oggetti quotidiani. Individuazione dei materiali, della funzione e delle ragioni plausibili della scelta.
Fase 2 — Classificare i materiali — 2 ore
Costruzione di una mappa delle famiglie di materiali. Attività di classificazione con campioni, fotografie, oggetti o schede.
Fase 3 — Proprietà e prove — 3 ore
Semplici prove comparative adeguate alle dotazioni disponibili.
Fase 4 — Dalla risorsa al prodotto — 2 ore
Ricostruzione di una o più filiere esemplificative.
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
- collabora e documenta il lavoro.
13. VERIFICA
Formativa: domande guida, schede di osservazione, classificazioni, controllo delle tabelle.`

const PACK_1B = `CAN-PACK-1B — MATERIALI E AVVIO AL DISEGNO TECNICO PER L’OPEN DAY
Classe prima — Tecnologia
2. LEZIONE 5 — RICONOSCERE E CLASSIFICARE I MATERIALI (2 h)
UDA prevalente: UDA 2.
Attività: osservazione guidata di oggetti e campioni; distinzione tra risorsa, materia prima, materiale, semilavorato e prodotto; classificazione per famiglie.
Prodotto: SCHEDA E — Carta d’identità di un materiale.
Evidenza: correttezza della classificazione, proprietà osservate, uso del lessico.
Materiali: piccoli campioni sicuri di legno, carta/cartone, metallo, plastica, vetro, tessuto, materiali compositi semplici.
Open Day: selezionare le schede più chiare come OD-CAND.
SCHEDA E — CARTA D’IDENTITÀ DI UN MATERIALE
Nome materiale: __________
Famiglia: __________
Origine prevalente: __________
Aspetto: __________
Proprietà osservabili: __________
Possibili usi: __________
Un vantaggio: __________
Un limite: __________
Fine vita possibile: riuso / riciclo / recupero / altro __________
Disegno o piccolo schema del campione: __________
3. LEZIONE 6 — OSSERVARE E PROVARE LE PROPRIETÀ (2 h)
Attività: prove qualitative e controllate; osservazione; confronto; registrazione.
Prodotto: SCHEDA F — Prova comparativa.
Evidenza: capacità di descrivere procedura, dato osservato e conclusione.`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function candidate(generationId = '5e0d5ae7-9f43-4d55-b470-533f2ac806fe') {
  return compileHumanTaskContentCandidate('Prima', 'B07', {
    uda: source('CAN-UDA-1-02', generationId, UDA_102),
    pack: source('CAN-PACK-1B', '1902bdd3-c65f-46c0-b419-99bcd45131ad', PACK_1B),
  })
}

test('extracts phase-based UDA without forcing it into Ora N', () => {
  const uda = extractCanonicalUda('CAN-UDA-1-02', UDA_102)
  assert.equal(uda.durationHours, 12)
  assert.equal(uda.hours.length, 0)
  assert.equal(uda.phases.length, 6)
  assert.deepEqual(uda.phases.map((phase) => phase.durationMinutes), [120, 120, 180, 120, 120, 60])
  assert.equal(uda.sections.find((section) => section.heading === 'EVIDENZE OSSERVABILI')?.listItems.length, 9)
})

test('extracts numbered lesson guides and embedded student sheets from CAN-PACK-1B', () => {
  const pack = extractCanonicalPack('CAN-PACK-1B', PACK_1B)
  const guide = pack.sections.find((section) => section.heading.startsWith('2. LEZIONE 5'))
  assert.equal(guide?.kind, 'TEACHER_GUIDE')
  assert.equal(guide?.durationMinutes, 120)
  assert.match(guide?.activity ?? '', /classificazione per famiglie/i)
  assert.equal(guide?.materials.length, 7)
  const sheet = pack.sections.find((section) => section.heading.startsWith('SCHEDA E'))
  assert.equal(sheet?.kind, 'STUDENT_SHEET')
})

test('B07 candidate remains reviewable even when UDA phases do not map mechanically to one block', () => {
  const value = candidate()
  assert.equal(value.gate.status, 'READY_FOR_HUMAN_REVIEW')
  assert.equal(value.block.title, 'Riconoscere e classificare i materiali')
  assert.equal(value.block.udaCode, '1-02')
  assert.equal(value.block.segmentKey, 'Prima:3')
  assert.equal(value.evidence.udaHourWindow, null)
  assert.equal(value.gate.issues.some((item) => item.code === 'UDA_HOUR_WINDOW_AMBIGUOUS'), true)
})

test('B07 recipe produces a source-bound draft but never promotes it automatically', () => {
  const value = candidate()
  assert.equal(value.candidateId, B07_PRIMA_RECIPE_PROPOSAL.candidateId)

  const draft = buildProjectionDraft(value, B07_PRIMA_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.equal(draft.promotion, 'HUMAN_APPROVAL_REQUIRED')
  assert.equal(draft.projection?.title, 'Riconoscere e classificare i materiali')
  assert.equal(draft.projection?.durationMinutes, 120)
  assert.equal(draft.projection?.steps.length, 3)
  assert.deepEqual(draft.projection?.steps[2].resourceIds, ['STUDENT-E'])
  assert.equal(draft.projection?.resources[0].title, 'Carta d’identità di un materiale')
  assert.equal(draft.projection?.outcomes.length, 3)
  assert.equal(draft.projection?.observation.length, 3)
  assert.match(draft.projection?.evidence ?? '', /classificazione/i)
  assert.equal(draft.projection?.provenance.planBinding.segmentKey, 'Prima:3')
})

test('recipe fails closed when source generations change', () => {
  const draft = buildProjectionDraft(candidate('new-generation'), B07_PRIMA_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'INVALID')
  assert.equal(draft.issues.some((item) => item.code === 'CANDIDATE_ID_MISMATCH'), true)
})

test('recipe fails closed when annual-plan structure drifts', () => {
  const value = candidate()
  const changedPlanRecipe = {
    ...B07_PRIMA_RECIPE_PROPOSAL,
    planBinding: {
      ...B07_PRIMA_RECIPE_PROPOSAL.planBinding,
      title: 'Titolo non più canonico',
    },
  }
  const draft = buildProjectionDraft(value, changedPlanRecipe)
  assert.equal(draft.status, 'INVALID')
  assert.equal(draft.issues.some((item) => item.code === 'PLAN_BINDING_MISMATCH'), true)
})
