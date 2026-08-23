import assert from 'node:assert/strict'
import test from 'node:test'
import { compileHumanTaskContentCandidate, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import { resolveHumanTaskEvidenceFromCandidate } from './human-task-evidence-source-binding'
import {
  B31_B33_EVIDENCE_PROVENANCE_V2,
  B31_PROJECTION_V2,
  B32_PROJECTION_V2,
  B33_PROJECTION_V2,
} from '@/core/presentation/human-task-approved-manifests-b31-b33-v2'

const UDA = `CAN-UDA-1-07 — PROGETTO TECNOLOGICO SOSTENIBILE
Classe prima
Durata prevista: 6 ore.
8. ARTICOLAZIONE OPERATIVA — 6 ORE
Fase 1 — Problema e requisiti — 1 ora.
Presentazione di un problema concreto riferito alla vita scolastica o quotidiana. Individuazione di destinatari, funzione, requisiti, vincoli e criteri di sostenibilità.
Fase 2 — Idee e confronto — 1 ora.
Produzione di più ipotesi, schizzi rapidi e confronto mediante criteri quali utilità, semplicità, quantità di materiale, possibilità di riuso, durata e facilità di realizzazione.
Fase 3 — Progetto della soluzione — 1 ora.
Scelta motivata dell’ipotesi; rappresentazione grafica; definizione di dimensioni essenziali; elenco di materiali, strumenti e fasi operative.
Fase 4 — Modello/prototipo o simulazione — 1 ora.
Realizzazione guidata di un modello semplice, oppure simulazione documentata quando tempi, sicurezza o materiali non consentano la costruzione fisica.
Fase 5 — Verifica e miglioramento — 1 ora.
Controllo del risultato rispetto ai requisiti iniziali; rilevazione di criticità; proposta di almeno un miglioramento tecnico o ambientale.
Fase 6 — Comunicazione e valutazione — 1 ora.
Presentazione del progetto, restituzione individuale, autovalutazione e verifica finale.
10. PRODOTTO ATTESO
Dossier progettuale composto almeno da:
- scheda del problema;
- requisiti e vincoli;
- schizzi delle alternative;
- scelta motivata;
- rappresentazione grafica della soluzione;
- elenco materiali e strumenti;
- sequenza delle fasi;
- eventuale modello/prototipo;
- breve valutazione di sostenibilità;
- autovalutazione finale.
11. EVIDENZE OSSERVABILI
- identifica correttamente il problema e la funzione della soluzione;
- considera requisiti e vincoli;
- propone e confronta alternative.`

function source(code: string, generationId: string, normalizedText: string): HumanTaskPipelineSource {
  return { code, assetId: `asset-${code}`, generationId, title: code, normalizedText }
}

function candidate(blockId: 'B31' | 'B32' | 'B33') {
  return compileHumanTaskContentCandidate('Prima', blockId, {
    uda: source('CAN-UDA-1-07', '92194b46-b7e5-4c52-82a7-b1d75403b8b1', UDA),
    pack: source('CAN-PACK-1D', '1d150f77-6a7f-4f8b-8e85-2fa370956e29', 'CAN-PACK-1D — ALLESTIMENTO OPEN DAY\nNon sostituisce le UDA.'),
  })
}

test('approved B31-B33 evidence equals deterministic extraction from the current UDA fragments', () => {
  assert.equal(
    resolveHumanTaskEvidenceFromCandidate(candidate('B31'), B31_B33_EVIDENCE_PROVENANCE_V2.B31),
    B31_PROJECTION_V2.evidence,
  )
  assert.equal(
    resolveHumanTaskEvidenceFromCandidate(candidate('B32'), B31_B33_EVIDENCE_PROVENANCE_V2.B32),
    B32_PROJECTION_V2.evidence,
  )
  assert.equal(
    resolveHumanTaskEvidenceFromCandidate(candidate('B33'), B31_B33_EVIDENCE_PROVENANCE_V2.B33),
    B33_PROJECTION_V2.evidence,
  )
})

test('source extraction fails closed when a UDA item or phase is not present', () => {
  assert.throws(() => resolveHumanTaskEvidenceFromCandidate(candidate('B31'), {
    ...B31_B33_EVIDENCE_PROVENANCE_V2.B31,
    binding: { kind: 'UDA_SECTION_ITEMS', sectionHeading: 'PRODOTTO ATTESO', itemIndexes: [1, 99] },
  }), /voce 99/i)

  assert.throws(() => resolveHumanTaskEvidenceFromCandidate(candidate('B33'), {
    ...B31_B33_EVIDENCE_PROVENANCE_V2.B33,
    binding: { kind: 'UDA_PHASES', phaseOrdinals: [5, 99] },
  }), /Fase UDA 99/i)
})
