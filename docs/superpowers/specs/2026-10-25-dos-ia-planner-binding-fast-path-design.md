# DOS-IA Planner Binding Fast Path — Design

## Intent

Ridurre la latenza della home `Oggi` (`/planner`) senza cambiare budget, navigazione, autorità o comportamento utente. Il problema residuo del CV2 è strutturale: per costruire il link della lezione Oggi carica oggi un bundle didattico completo quando le serve solo un binding governato `lessonLogicalId -> blockId`.

## Goals

- mantenere invariata la semantica fail-closed di `LESSON | CLASS | ORARIO`;
- risolvere solo i binding delle lezioni effettivamente mostrate da Oggi;
- evitare su `/planner` Knowledge, manifest/rendering, lesson design, curriculum approval e continuità didattica;
- non aumentare `P6_ROUTE_BUDGET_MS=2500` né `P6_P95_BUDGET_MS=1800`;
- lasciare il caricamento completo di preparazione a Lezione/Materiali/Copilota.

## Non-goals

- nessuna modifica a HVA, WCAG, X3 o X4;
- nessuna modifica a schema, tenant, fixture o dati canonici;
- nessun caching persistente o nuovo stato server;
- nessun bypass di cattedra, disciplina attiva o sorgente canonica.

## Approaches considered

1. **Alzare il budget P6.** Scartato: nasconde la regressione.
2. **Cache del bundle completo.** Scartato: conserva l'overfetch e introduce invalidazione/stato.
3. **Resolver read-only minimale.** Scelto: riusa solo annual-plan snapshot, cattedre, discipline e canonical plan source per determinare il prossimo blocco, senza costruire il dominio completo di preparazione.

## Chosen architecture

Aggiungere `today-lesson-binding-loader.ts` con un loader server-side che:

1. riceve `workspaceId`, `academicYearId` e le sole `HomeDailyLesson` selezionate;
2. carica in parallelo snapshot del Piano annuale, cattedre e discipline;
3. per ogni lezione applica gli stessi prerequisiti governati già usati dal loader completo: sezione canonica, cattedra `CONFIRMED`, disciplina attiva/supportata;
4. risolve la sorgente canonica una sola volta per grado/codice e usa `buildClassWorkspaceLearningFocus(..., knowledgeItems=[])` solo per ottenere `nextBlock.id`;
5. restituisce `TodayIALessonBundle[]`; gli elementi non risolvibili vengono omessi, facendo mantenere a `buildTodayIAProjection` il fallback `CLASS`/`ORARIO` esistente.

`/planner` userà questo loader al posto di `loadLessonPreparationBundlesForLessons`.

## Success criteria

- contratto sorgente RED prima dell'implementazione e GREEN dopo;
- Product CI verde;
- P6 reale sul candidate con budget invariati, incluso p95 <= 1800 ms;
- nessuna regressione HVA/route semantics.