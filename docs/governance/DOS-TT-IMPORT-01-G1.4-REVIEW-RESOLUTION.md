# DOS-TT-IMPORT-01 / G1.4 — Risoluzione rilievi di review

Stato: REVIEW REMEDIATION — DOCUMENTATION ONLY  
Autorità normativa: `docs/governance/DOS-TT-IMPORT-01-G1.4-TRANSITION-REPLAN-CONTRACT.md`  
HOLD: `HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE`

Questo documento **non introduce un secondo contratto G1.4**. Registra esclusivamente la risoluzione dei rilievi emersi in review e i prerequisiti di materializzazione. In caso di divergenza prevale sempre il contratto governato G1.4 indicato sopra.

## 1. Unicità normativa e precedente sezione «G1.4 — review UX»

La sezione `G1.4 — review UX` di `docs/architecture/TIMETABLE_IMPORT_G1_MATERIALIZATION_PLAN.md` appartiene al piano storico di materializzazione G1 ed è **SUPERSEDED per la semantica G1.4**.

Resta utilizzabile soltanto come contesto storico/architetturale per il flusso `/orario`. Non può definire, modificare o restringere invarianti, casi governati, boundary, digest, idempotenza, atomicità, identità della sessione, gestione delle eccezioni o gate G1.4.

L'unica fonte normativa per tali aspetti è `DOS-TT-IMPORT-01-G1.4-TRANSITION-REPLAN-CONTRACT.md`, con **68 casi governati**.

## 2. RPC legacy di attivazione

La baseline contiene `public.activate_timetable_version(uuid)` in `product/supabase/migrations/0025_timetable_lifecycle.sql`. Tale RPC precede G1.4 e non implementa l'intero boundary governato richiesto dal contratto.

Pertanto è classificato come **LEGACY_INCOMPATIBLE_WITH_G1_4_APPLY**.

Prima di rimuovere `HOLD_RUNTIME` o `HOLD_PRODUCTION_APPLY`, la materializzazione deve dimostrare una e una sola delle seguenti condizioni:

- l'RPC legacy non è più invocabile per una transizione G1.4; oppure
- l'RPC delega all'unico boundary atomico G1.4 e non possiede un percorso alternativo di attivazione.

Nessun chiamante può attivare una nuova versione bypassando: verifica del confine storico, mapping `old-occurrence → stable-session → new-occurrence`, preservazione/risoluzione delle eccezioni future, precondizioni e revisioni, `PlanDigestPayload`, idempotenza, successor `DRAFT`, atomicità e receipt.

Questo è un **gate di materializzazione fail-closed**; questa PR non modifica runtime o migrazioni.

## 3. Fonte autorevole di `executed_history_boundary`

G1.4 non deve inventare una tassonomia concorrente degli stati della sessione.

La materializzazione deve prima individuare e dichiarare l'**owner persistente canonico** dal quale derivano gli stati che qualificano una sessione/occorrenza come eseguita o consolidata. Il calcolo di `executed_history_boundary` deve dipendere esclusivamente da tale owner e da una tassonomia versionata/testata.

Se la baseline non dispone ancora di un owner o di stati persistenti sufficienti e univoci, la condizione è **NOT_MATERIALIZED** e l'attivazione G1.4 resta bloccata. Non sono ammessi fallback euristici, inferenze dalla posizione temporale, etichette UI o nuovi stati introdotti soltanto nel client.

Anteprima e apply devono usare la stessa fonte; il piano registra revisione/fingerprint del boundary. Una variazione successiva all'anteprima rende il piano obsoleto, coerentemente con il caso governato 68.

## 4. Conteggio governato

Il conteggio normativo G1.4 è **68 casi**. Qualsiasi precedente riferimento a 48 o 55 casi è storico/superato e non costituisce gate G1.4.

## 5. Gate risultante

La materializzazione non può essere autorizzata finché non sono verificati con test almeno:

- unico boundary atomico G1.4 senza bypass legacy;
- owner canonico e tassonomia del confine storico;
- continuità della stessa sessione e della preparazione canonica attraverso il cambio di occorrenza;
- preservazione o risoluzione esplicita delle eccezioni future;
- digest pre-apply non ricorsivo e idempotenza forte;
- successor `DRAFT` unica e completa;
- esecuzione dei **68 casi governati**.

Fino ad allora restano attivi `HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN / HOLD_MERGE`.
