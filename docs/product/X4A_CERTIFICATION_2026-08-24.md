# DOCENTE OS — X4-A Certification Receipt

Data: 2026-08-24  
Stato: **PASS / BETA-PROVEN**  
Capability: `PLANNER_CREATE_TASK`

## Decisione

X4-A è certificata come prima capability persistente assistita di DOCENTE OS, limitata alla creazione reversibile di una attività interna al Planner.

La conversazione X3 resta separata e non mutativa: una risposta o un assenso in chat non costituiscono autorizzazione alla scrittura.

## Contratto certificato

Flusso obbligatorio:

`proposta -> anteprima -> nessuna scrittura -> conferma esplicita -> creazione -> receipt -> eventuale undo`

Sono certificati i seguenti invarianti:

- `Mostra anteprima` persiste una proposta `PREVIEW_READY` ma crea **0** attività Planner;
- `Conferma e crea` usa il `proposalId` e il payload già persistito server-side;
- viene creato esattamente un effetto con provenienza `assistant-write:<proposalId>`;
- la receipt registra `confirmed_by`, `confirmed_at`, `executed_at` ed `effect_ref`;
- `Non creare` produce `REJECTED` e nessun effetto;
- `Annulla creazione` porta il task X4 ancora reversibile a `CANCELLED` e la receipt a `UNDONE`;
- nessuna write X4-A è autorizzata verso Calendario, Orario, Piano annuale, Conoscenza, Drive, Gmail o altri sistemi esterni.

## Evidenze pre-merge

PR applicativa: **#149**  
Head certificata: `637bc76be799300a4f06863f6276cfde8ea58d4d`

Gate sulla PR:

- Product CI: **PASS**;
- K1 application: **PASS**;
- Human + Visual Acceptance application: **PASS**;
- X4 Planner application: **PASS**;
- regressione X3/no implicit write, eseguita dentro il gate X4: **PASS**.

Il primo run X4 aveva segnalato esclusivamente un difetto di isolamento della fixture E2E: il primo scenario aveva già completato correttamente preview -> conferma -> receipt -> undo; il test successivo contava la traccia `CANCELLED` del primo scenario. Corretto il test, il run successivo è PASS senza modifiche al comportamento applicativo.

## Evidenze post-merge / Beta Render

Merge PR #149: `cf7af85f40ceb2588ea66bdb3eca57809329836a`

Run X4 Beta: **32760637818**  
Artifact X4 Beta: **9532629257**

Render ha servito l'**exact commit** `cf7af85f40ceb2588ea66bdb3eca57809329836a`.

Sul runtime Beta canonico:

- X3 regression: **2/2 PASS**;
- X4-A: **2/2 PASS**;
- `preview -> explicit confirmation -> receipt -> undo`: **PASS**;
- `rejection leaves no task`: **PASS**;
- `x4-planner/render-beta`: **PASS**;
- `k1/render-beta`: **PASS**;
- `hva/runtime`: **PASS**;
- `x3-e2e/application`: **PASS**;
- `x3-e2e/render-beta`: **PASS**.

Le failure Vercel dovute a build-rate-limit non appartengono al canale Beta canonico e non incidono su questa certificazione.

## Igiene finale verificata direttamente nel database Beta

Fixture Planner X4 rilevate:

- `CANCELLED`: 14;
- `OPEN`: 0;
- `WAITING`: 0.

Receipt X4 rilevate:

- `UNDONE`: 14;
- `REJECTED`: 4;
- `EXECUTED`: 0;
- `PREVIEW_READY`: 0.

Quindi nessun effetto E2E X4 resta attivo. Le receipt storiche vengono mantenute intenzionalmente come audit trail.

## Limite autorizzato

Questa certificazione **non** autorizza l'estensione automatica di X4 ad altre capability. `PLANNER_CREATE_TASK` resta l'unica write assistita certificata finché una nuova slice non ottiene un contratto, un gate e una decisione separati.
