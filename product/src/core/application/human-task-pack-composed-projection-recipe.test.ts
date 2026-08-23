import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { buildPackComposedProjectionDraft } from './human-task-pack-composed-projection-recipe'
import { buildProjectionBatchReview } from './human-task-projection-batch'
import {
  B11_B15_RECIPE_PROPOSALS,
  B13_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
  B14_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
  B15_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
} from './human-task-projection-recipes-b11-b15'

const UDA_102 = `CAN-UDA-1-02 — MATERIALI: DALLA RISORSA AL PRODOTTO
Classe prima
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
Osservazione guidata.
Fase 2 — Classificare i materiali — 2 ore
Classificazione guidata.
Fase 3 — Proprietà e prove — 3 ore
Prove comparative.
Fase 4 — Dalla risorsa al prodotto — 2 ore
Ricostruzione di una filiera.
Fase 5 — Scegliere il materiale — 2 ore
Scelta con criteri.
Fase 6 — Verifica e restituzione — 1 ora
Restituzione.
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

const UDA_103 = `CAN-UDA-1-03 — DISEGNARE PER COMPRENDERE E COMUNICARE
Classe prima
Durata prevista: 14 ore.
3. OBIETTIVI DI APPRENDIMENTO
- riconoscere funzione e uso di matita, righe, squadre, compasso e altri strumenti di base;
- organizzare correttamente il foglio e lo spazio grafico;
- tracciare linee parallele, perpendicolari e inclinate;
- costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane;
- effettuare semplici misurazioni e riportare misure in modo ordinato;
- comprendere il significato di scala, proporzione e convenzione grafica in situazioni elementari;
- distinguere disegno libero, geometrico e tecnico;
- utilizzare semplici procedure di rappresentazione anche con strumenti digitali, ove disponibili.
7. ARTICOLAZIONE DELLE 14 ORE
Fase 1 — Il disegno come linguaggio tecnico — 2 ore
Distinzione fra disegno libero, geometrico e tecnico.
Fase 2 — Strumenti, postura, precisione e organizzazione del foglio — 2 ore
Uso degli strumenti e impostazione della tavola.
Fase 3 — Linee, parallelismo e perpendicolarità — 2 ore
Esercitazioni progressive e controllo degli errori.
Fase 4 — Segmenti, angoli, assi e bisettrici — 2 ore
Costruzioni geometriche guidate.
Fase 5 — Figure geometriche piane — 4 ore
Costruzioni di figure piane.
Fase 6 — Tavola di sintesi e verifica — 2 ore
Elaborato individuale.
12. EVIDENZE OSSERVABILI
- scelta e uso appropriato degli strumenti;
- rispetto della sequenza operativa;
- precisione di linee, intersezioni e costruzioni;
- ordine e leggibilità della tavola;
- capacità di riconoscere e correggere errori;
- uso corretto del lessico geometrico-tecnico;
- progressiva autonomia operativa.`

const PACK_1B = `CAN-PACK-1B — MATERIALI E AVVIO AL DISEGNO TECNICO PER L’OPEN DAY
5. LEZIONE 8 — ENTRARE NEL DISEGNO TECNICO (2 h)
Attività: differenza tra disegno libero, geometrico e tecnico; strumenti; postura; impostazione del foglio; intestazione; qualità e funzione della linea.
Prodotto: SCHEDA/TAVOLA H — Il mio primo foglio tecnico.
Evidenza: uso degli strumenti, ordine, precisione, rispetto delle consegne.
TAVOLA H — IL MIO PRIMO FOGLIO TECNICO
- riquadro semplice;
- intestazione;
- esercizio su linee orizzontali, verticali, inclinate;
- coppie di parallele;
- coppie di perpendicolari;
- breve autoverifica: precisione / pulizia / completezza.
6. LEZIONE 9 — COSTRUZIONI DI BASE E CONTROLLO DELL’ERRORE (2 h)
Attività: segmenti, perpendicolari, parallele, asse di un segmento; esercitazione graduata; confronto tra procedura corretta e risultato approssimativo.
Prodotto: TAVOLA I — Costruzioni fondamentali.
Evidenza: sequenza, precisione, capacità di correggere.
7. LEZIONE 10 — FIGURA GEOMETRICA COME PROGETTO (2 h)
Attività: costruzione di una semplice composizione geometrica vincolata da misure/consegne; prima riflessione su requisiti e vincoli.
Prodotto: TAVOLA L — Composizione geometrica controllata.
Evidenza: interpretazione della consegna, controllo delle misure, leggibilità.`

const PACK_1C = `CAN-PACK-1C — MICRO-PROGETTO OPEN DAY — CLASSE PRIMA
COMPITO SIGNIFICATIVO
Progettiamo un piccolo oggetto utile e sostenibile.
FASE 1 — INDIVIDUARE IL PROBLEMA
Scheda 1 — IL PROBLEMA
1. Dove nasce il problema?
2. Chi lo incontra?
3. Che cosa rende difficile fare bene quella attività?
4. Quale bisogno vogliamo soddisfare?
5. Scrivi il problema in una frase: “Abbiamo bisogno di…”
6. Come sapremo che la soluzione funziona?
FASE 2 — DEFINIRE REQUISITI E VINCOLI
Scheda 2 — REQUISITI
La soluzione deve:
- essere utile;
- essere stabile e sicura;
- essere realizzabile con materiali semplici;
- usare poco materiale;
- poter essere spiegata con un disegno;
- essere verificabile con una prova semplice;
- considerare riuso, riciclabilità o riduzione dello spreco.
Aggiungere 2-4 requisiti specifici del progetto.
Vincoli da indicare: dimensioni indicative, materiali disponibili, tempo, strumenti consentiti, eventuale lavoro in gruppo.
FASE 3 — PRODURRE DUE IDEE
Scheda 3 — DUE SOLUZIONI POSSIBILI
Idea A: piccolo schizzo + descrizione.
Idea B: piccolo schizzo + descrizione.
Per ciascuna idea indicare:
- vantaggi;
- limiti;
- materiale principale;
- facilità di realizzazione;
- comportamento a fine vita.
FASE 4 — SCEGLIERE CON CRITERI
Scheda 4 — MATRICE DI SCELTA
Criteri minimi, punteggio 1-3:
- utilità;
- stabilità/sicurezza;
- semplicità costruttiva;
- disponibilità dei materiali;
- uso contenuto di materia;
- possibilità di riuso/riciclo;
- qualità della forma.
Somma dei punteggi e scelta finale.
Consegna obbligatoria: “Scegliamo l’idea ___ perché…”.
FASE 5 — TAVOLA PROGETTUALE
Scheda/Tavola 5 — IL PROGETTO GRAFICO
- titolo;
FASE 6 — PIANIFICARE LA REALIZZAZIONE
Scheda 6 — PIANO DI LAVORO
1. operazione;
FASE 7 — REALIZZARE IL PROTOTIPO
Il prototipo può essere in cartoncino, carta, cartone ondulato, legno leggero solo se lavorabile in sicurezza con strumenti ammessi, materiali recuperati puliti e altri materiali semplici preventivamente autorizzati.
Criterio guida: non deve essere un “lavoretto”, ma una soluzione coerente con il progetto documentato.
FASE 8 — PROVARE
Scheda 7 — LA PROVA
1. Che cosa vogliamo verificare?
2. Come facciamo la prova?
3. Che cosa osserviamo o misuriamo?
4. Il requisito è rispettato? Sì / parzialmente / no.
5. Quale difetto emerge?
FASE 9 — MIGLIORARE
Scheda 8 — VERSIONE 2
- cambieremmo…
FASE 10 — SOSTENIBILITÀ
Scheda 9 — SCELTA RESPONSABILE
- possibilità di riuso;
FASE 11 — PITCH OPEN DAY
Durata: 60-90 secondi per gruppo.
Traccia:
1. “Il problema che abbiamo osservato è…”
2. “Avevamo due idee…”
3. “Abbiamo scelto questa perché…”
4. “Il materiale principale è… perché…”
5. “Questa è la tavola del progetto…”
6. “Abbiamo provato il prototipo facendo…”
7. “La cosa che miglioreremmo è…”
8. “La nostra scelta di sostenibilità è…”
KIT OPEN DAY OBBLIGATORIO
- tavola progettuale;
RUBRICA DEL MICRO-PROGETTO — 4 LIVELLI
A. DEFINIZIONE DEL PROBLEMA E REQUISITI`

const PACK_1D = `CAN-PACK-1D — ALLESTIMENTO E CONDUZIONE OPEN DAY — CLASSE PRIMA
1. OBIETTIVI DELL’ALLESTIMENTO
- mostrare processi, non semplici manufatti;
- valorizzare il linguaggio tecnico e la capacità di spiegare;
2. STRUTTURA CONSIGLIATA IN 5 STAZIONI
STAZIONE 1 — OSSERVIAMO LA TECNOLOGIA`

function source(code: string, generationId: string, text: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText: text }
}

function candidate(blockId: 'B11' | 'B12' | 'B13' | 'B14' | 'B15', overrides?: { pack1cGeneration?: string; includePack1d?: boolean }) {
  const isDrawing = blockId === 'B11' || blockId === 'B12' || blockId === 'B15'
  const supportPacks = blockId === 'B13' || blockId === 'B14'
    ? [source('CAN-PACK-1C', overrides?.pack1cGeneration ?? '2f1da16d-45b4-42aa-841a-09d283d5d96a', PACK_1C)]
    : blockId === 'B15'
      ? [
          source('CAN-PACK-1C', overrides?.pack1cGeneration ?? '2f1da16d-45b4-42aa-841a-09d283d5d96a', PACK_1C),
          ...(overrides?.includePack1d === false ? [] : [source('CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29', PACK_1D)]),
        ]
      : []

  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source(isDrawing ? 'CAN-UDA-1-03' : 'CAN-UDA-1-02', isDrawing ? '296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c' : '5e0d5ae7-9f43-4d55-b470-533f2ac806fe', isDrawing ? UDA_103 : UDA_102),
    pack: source('CAN-PACK-1B', '1902bdd3-c65f-46c0-b419-99bcd45131ad', PACK_1B),
    supportPacks,
  })
}

test('batch dispatcher prepares B11-B15 using DIRECT and PACK_COMPOSED recipes', () => {
  const review = buildProjectionBatchReview(
    ['B11', 'B12', 'B13', 'B14', 'B15'].map((blockId) => candidate(blockId as 'B11' | 'B12' | 'B13' | 'B14' | 'B15')),
    [...B11_B15_RECIPE_PROPOSALS],
  )
  assert.deepEqual(review.map((item) => [item.blockId, item.status]), [
    ['B11', 'READY_FOR_HUMAN_APPROVAL'],
    ['B12', 'READY_FOR_HUMAN_APPROVAL'],
    ['B13', 'READY_FOR_HUMAN_APPROVAL'],
    ['B14', 'READY_FOR_HUMAN_APPROVAL'],
    ['B15', 'READY_FOR_HUMAN_APPROVAL'],
  ])
})

test('B13 derives problem, requirements and alternatives only from operational support PACK 1C', () => {
  const draft = buildPackComposedProjectionDraft(candidate('B13'), B13_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.deepEqual(draft.projection.steps.map((step) => step.title), ['Individuare il problema', 'Definire requisiti e vincoli', 'Produrre due idee'])
  assert.deepEqual(draft.projection.steps.map((step) => step.minutes), [null, null, null])
  assert.deepEqual(draft.projection.resources.map((resource) => resource.id), ['PROJECT-PROBLEM', 'PROJECT-REQ', 'PROJECT-IDEAS'])
  assert.deepEqual(draft.projection.provenance.packs.map((pack) => pack.code), ['CAN-PACK-1C'])
  assert.match(draft.projection.evidence, /Il problema \+ Requisiti \+ Due soluzioni possibili/)
})

test('B14 preserves the prototype safety wording and does not invent internal timing', () => {
  const draft = buildPackComposedProjectionDraft(candidate('B14'), B14_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.equal(draft.projection.steps.length, 3)
  assert.deepEqual(draft.projection.steps.map((step) => step.minutes), [null, null, null])
  assert.match(draft.projection.steps[1].instruction, /cartoncino, carta, cartone ondulato/i)
  assert.match(draft.projection.steps[1].instruction, /non deve essere un “lavoretto”/i)
  assert.deepEqual(draft.projection.steps[2].resourceIds, ['PROJECT-TEST'])
})

test('B15 binds logistics PACK 1D structurally but excludes it from didactic provenance', () => {
  const value = candidate('B15')
  assert.equal(value.candidateId, B15_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL.candidateId)
  const draft = buildPackComposedProjectionDraft(value, B15_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'READY_FOR_HUMAN_APPROVAL')
  assert.ok(draft.projection)
  assert.deepEqual(draft.projection.provenance.planBinding.supportPackCodes, ['CAN-PACK-1C', 'CAN-PACK-1D'])
  assert.deepEqual(draft.projection.provenance.packs.map((pack) => pack.code), ['CAN-PACK-1B', 'CAN-PACK-1C'])
  assert.equal(draft.projection.provenance.packs.some((pack) => pack.code === 'CAN-PACK-1D'), false)
  assert.deepEqual(draft.projection.steps.map((step) => step.minutes), [null, null, null])
  assert.equal(draft.projection.resources[0].id, 'OPEN-DAY-PITCH')
  assert.equal(draft.projection.resources[0].prompts.length, 8)
  assert.match(draft.projection.evidence, /Composizione geometrica controllata/i)
  assert.match(draft.projection.evidence, /Pitch Open Day/i)
})

test('support PACK generation drift invalidates a PACK_COMPOSED recipe', () => {
  const draft = buildPackComposedProjectionDraft(
    candidate('B13', { pack1cGeneration: 'new-support-generation' }),
    B13_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
  )
  assert.equal(draft.status, 'INVALID')
  assert.equal(draft.issues.some((item) => item.code === 'CANDIDATE_ID_MISMATCH'), true)
})

test('B15 fails closed when logistics support PACK required by the plan is missing', () => {
  const value = candidate('B15', { includePack1d: false })
  assert.equal(value.gate.status, 'BLOCKED')
  assert.equal(value.gate.issues.some((item) => item.code === 'SUPPORT_PACK_SOURCE_MISSING'), true)
  const draft = buildPackComposedProjectionDraft(value, B15_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL)
  assert.equal(draft.status, 'INVALID')
})
