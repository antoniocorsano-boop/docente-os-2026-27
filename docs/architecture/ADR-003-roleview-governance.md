# ADR-003 — RoleView governance e osservabilità per ruolo

Data: 2026-09-15  
Stato: PROPOSED — RV-0

## Contesto

DOCENTE OS possiede già stati autorevoli distribuiti nei propri modelli: readiness di configurazione, stato del Piano annuale, Human Task, Lesson Preparation Manifest, provenance, blocker e gate tecnici di sviluppo. Il problema non è creare un ulteriore sistema di stato, ma renderli leggibili e confrontabili senza costringere l'utente o il team a ricostruire il quadro dalla chat, dalle issue o da dashboard separate.

Lo stesso problema ricorre negli altri sistemi sviluppati: CEW usa milestone, evidence gate e binding strutturali; CurManLight usa ruoli e passaggi di validazione; il ciclo di sviluppo software usa PR, exact head e controlli CI.

L'adozione diretta di Plane, Leantime, OpenProject, Grafana o Superset come fonte primaria introdurrebbe una seconda autorità sullo stato. Serve invece un contratto neutrale che proietti lo stato già autorevole dei prodotti.

## Decisione

Introduciamo **RoleView** come livello trasversale di governo e osservabilità orientato al ruolo.

RoleView è:

- un **read model**;
- derivato da fonti autorevoli del prodotto;
- senza persistenza propria nella baseline;
- senza autorità di promozione di stato;
- senza capacità di superare gate;
- capace di esporre stato, stage, gate, maturità, KPI, blocker, azioni suggerite, evidenze e provenance;
- proiettabile diversamente a seconda del ruolo senza alterare la verità sottostante.

RoleView **non è**:

- un secondo dominio;
- un registro parallelo;
- un sostituto del Piano, del Diario, del Lesson Preparation Manifest o dei registri CEW;
- un motore di project management;
- una dashboard che inventa percentuali o livelli di maturità.

## Contratto canonico v0

Ogni snapshot RoleView deve dichiarare almeno:

- `schemaVersion`;
- `product`;
- `scope` e identificativo dell'oggetto osservato;
- `role`;
- `stage`;
- `status`;
- `maturity[]`;
- `gates[]`;
- `kpis[]`;
- `blockers[]`;
- `nextActions[]`;
- `evidence[]`;
- `provenance[]`.

Il contratto TypeScript canonico della slice RV-0 vive in `product/src/core/presentation/roleview-governance.ts`.

### Maturità

La maturità è prima di tutto qualitativa:

- `NOT_ASSESSED`
- `IN_PROGRESS`
- `READY`
- `BLOCKED`

Uno `score` numerico è opzionale. Può essere valorizzato solo quando esiste una metrica misurata e tracciabile. RoleView non converte automaticamente stati qualitativi in percentuali.

### Gate

I gate sono proiezioni di condizioni reali e assumono uno fra:

- `PASS`
- `WARN`
- `BLOCKED`
- `NOT_APPLICABLE`

RoleView non modifica il gate sorgente e non può trasformare `BLOCKED` in `PASS`.

### KPI

Ogni KPI deve riportare:

- identificativo stabile;
- etichetta;
- valore;
- unità;
- derivazione/fonte.

Nella baseline sono ammessi soltanto KPI deterministici ottenuti da dati già presenti nel read model sorgente.

## Primo adapter: Lesson Preparation

RV-0 usa `LessonPreparationManifestResult` introdotto da LP-1 come primo caso reale.

La proiezione espone, senza duplicare storage:

- readiness complessiva della preparazione;
- gate `LESSON_PREPARATION_READY`;
- numero di materiali richiesti, pronti, mancanti e da rivedere;
- informazioni mancanti come blocker;
- provenance già presente nel manifest;
- stato qualitativo di binding canonico, materiali, validazione umana ed evidenze.

La corrispondenza è fail-closed:

- `resolution = BLOCKED` -> RoleView `BLOCKED`;
- `readiness = READY` -> RoleView `READY` e gate `PASS`;
- `readiness = REVIEW_REQUIRED` -> RoleView `ATTENTION` e gate `WARN`;
- `readiness = DRAFT` o `NEEDS_REVISION` -> RoleView `ATTENTION` con blocker/azioni;
- `USED` non implica automaticamente nuova maturità: descrive lo stato operativo della preparazione.

## Ruoli

Il ruolo modifica priorità di lettura e azioni proposte, non i dati autorevoli.

Baseline v0:

- `TEACHER`: attenzione su ciò che serve per la lezione e sulla validazione;
- `COORDINATOR`: attenzione su completezza e avanzamento;
- `REVIEWER`: attenzione su evidenze, provenance e gate;
- `DEVELOPER`: attenzione su coerenza del read model e cause tecniche.

Un adapter può supportare solo un sottoinsieme di ruoli, purché lo dichiari esplicitamente.

## Confini architetturali

Dipendenze consentite:

```text
Domain/Application authoritative state
        ↓
Presentation/read-model adapter
        ↓
RoleViewSnapshot
        ↓
UI / Copilot / external read-only exporter
```

Dipendenze vietate:

```text
RoleView -> modifica diretta del dominio
RoleView -> persistenza parallela dello stato autorevole
Dashboard esterna -> promozione automatica di gate
RoleView -> percentuali di maturità non misurate
Plane/OpenProject/Grafana/Superset -> source of truth del prodotto
```

Questa decisione è coerente con ADR-002: RoleView appartiene al livello di presentazione/applicazione e non entra nel dominio.

## Strategia di adozione

### RV-0 — Foundation

- ADR;
- contratto TypeScript;
- adapter Lesson Preparation;
- test deterministici;
- nessuna UI o persistenza.

### RV-1 — Prima superficie utente

Integrare RoleView nella preparazione della prossima lezione, mostrando solo le informazioni utili al docente: stato, cosa manca, cosa richiede validazione e azione primaria.

### RV-2 — Engineering collector

Produrre snapshot dello stesso contratto a partire da PR/exact head/CI per rappresentare readiness di sviluppo senza ricostruirla manualmente dalla conversazione.

### RV-3 — Secondo prodotto

Implementare un adapter CEW per milestone, evidence gate e binding. Solo dopo questa seconda adozione confrontare la semantica e congelare `roleview.v1`.

### RV-4 — Estrazione e adapter esterni

Se i due prodotti confermano il contratto, estrarre un nucleo condiviso (`roleview-core`) e introdurre, solo se utili, exporter/adapter verso Grafana, Superset, Plane, Leantime o OpenProject.

## Conseguenze

Vantaggi:

- una sola verità di dominio;
- stato leggibile senza chat parallela;
- stesso linguaggio di governo fra prodotti diversi;
- dashboard esterne sostituibili;
- possibilità di interrogare lo stato via copilota senza inventarlo.

Costi:

- ogni prodotto deve implementare un adapter esplicito;
- serve disciplina nel distinguere stato reale, misura e semplice visualizzazione;
- il contratto non va estratto prematuramente prima della seconda adozione.

## Gate di accettazione RV-0

RV-0 è chiuso quando:

1. ADR-003 è presente;
2. `RoleViewSnapshot` è versionato;
3. il primo adapter usa dati LP-1 reali;
4. READY, REVIEW_REQUIRED/DRAFT e BLOCKED sono coperti da test;
5. nessuna write o nuova persistenza è introdotta;
6. Product CI è PASS sullo stesso exact head.
