# DOCENTE OS — Stato corrente canonico

Data: 2026-08-24  
Baseline prodotto certificata: `develop` @ `ea1315e4ce77126603e1cc9e87051d79ce98824c`  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi corrente autorevole dello stato del sistema. I checkpoint datati precedenti restano storici e non devono essere usati per dedurre lo stato operativo quando divergono da questo file.

## 1. Classificazione del prodotto

DOCENTE OS è una **Beta operativa avanzata**. Non è più un prototipo/MVP: possiede persistenza reale, autenticazione, RLS, domini separati, flussi didattici persistenti, prima scrittura assistita controllata, authoring UDA versionato, export PDF professionale, runtime Beta verificato, gate end-to-end e Human + Visual Acceptance.

Il sistema non è ancora classificabile come produzione definitiva perché restano aperti l'hardening operativo/produzione e la prova longitudinale durante un anno scolastico reale.

## 2. Runtime canonico

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- runtime Beta canonico: **Render**, servizio `docente-os-2026-27-beta`;
- ramo Beta: `develop`;
- `rootDir`: `product`;
- auto-deploy: commit;
- Vercel non è un gate canonico; le failure correnti dovute a quota/build-rate-limit non descrivono lo stato applicativo;
- Netlify è legacy rispetto all'attuale Beta Render.

## 3. Stato macro-capability

### Fondazioni esperienza

- **X0 COMPLETE** — documentazione/decisioni canoniche di esperienza;
- **X1 COMPLETE** — component foundation;
- **X2 COMPLETE** — AppShell, responsive navigation, command palette;
- **X3 COMPLETE entro READ_ONLY / PROPOSE** — assistente contestuale senza autorizzazione implicita alla scrittura;
- **X4-A COMPLETE / BETA-PROVEN** — una sola capability persistente autorizzata: `PLANNER_CREATE_TASK`, con proposta → anteprima → conferma esplicita → creazione → ricevuta → annullamento; nessuna estensione generalizzata delle write capability;
- **X5-A COMPLETE / BETA-PROVEN** — authoring professionale UDA separato dalla fonte, versioni immutabili, cronologia, RLS e protezione dai conflitti di concorrenza;
- **X5-B COMPLETE / BETA-PROVEN** — export professionale PDF di una versione UDA salvata e immutabile, con provenienza/versione visibili e nessuna write persistente durante l'export;
- **X6 FUTURE / NOT BASELINE** — valutazione agentica avanzata intenzionalmente successiva.

### Tempo e attività didattica

- **T1 COMPLETE** — dominio Orario;
- **T2 COMPLETE** — griglia e gestione operativa;
- **T3A COMPLETE** — lifecycle versioni Orario e attivazione;
- **T3B COMPLETE** — Calendario indipendente;
- **T3C COMPLETE** — Temporal Projection read-only Orario + Calendario;
- **T4 COMPLETE** — TeachingSession persistente e allocazione minuti ai blocchi B01–B33.

Invariante: **Orario e Calendario restano domini indipendenti**; la composizione avviene solo attraverso Temporal Projection.

## 4. Superfici operative disponibili

- Home / Oggi / Planner;
- Conoscenza;
- Piano annuale;
- Progetta;
- authoring UDA versionato;
- export PDF professionale UDA;
- Classi;
- Orario;
- Calendario;
- Impostazioni;
- assistente contestuale X3 sulle superfici autorizzate;
- scrittura X4-A controllata esclusivamente nel Planner.

## 5. Conoscenza

Stato: **ADVANCED / BETA-PROVEN**.

Disponibili e provati:

- acquisizione testo e file;
- Storage privato e isolamento workspace;
- upload same-origin;
- limite applicativo 20 MB per il percorso standard;
- trasformazione/normalizzazione;
- generazioni e provenienza;
- classificazione e contesto professionale;
- PDF testuali e PDF misti con fallback parziale;
- errori recuperabili, retry e cleanup;
- ricerca come compito primario con acquisizione in progressive disclosure;
- continuità Progetta → fonte in Conoscenza preservata dopo X5.

Residui non bloccanti:

- documenti interamente visuali/scansionati senza provider visivo;
- upload grandi/resumable oltre il percorso standard.

## 6. Human + Visual Acceptance

Il sistema HVA è parte permanente del ciclo di sviluppo.

Copre:

- mobile `412×915` e desktop `1440×1000`;
- osservazioni di superficie e journey Human;
- console, rete, errori HTTP, overflow, layout e target interattivi;
- screenshot e receipt strutturate;
- fixture E2E isolate e cleanup.

Stato corrente:

- X5 authoring Render Beta: **PASS**;
- X5-B export Render Beta: **PASS**;
- HVA Render Beta: **PASS** sulle tranche pertinenti;
- K1 Render Beta: **PASS**;
- X3 Render Beta: **PASS**;
- X4 Planner Render Beta: **PASS**;
- H1 Human Task Render Beta: **PASS**.

**V-07 PASS** — Conoscenza privilegia consultazione/ricerca prima dell'acquisizione.  
**V-08 PASS** — target tattile mobile dei filtri conforme.  
**X5-A PASS** — consultazione della fonte e trasformazione in documento di lavoro restano azioni distinte.  
**X5-B PASS** — l'export parte da una versione salvata/immutabile e non introduce una nuova write capability.

## 7. Gate canonici correnti

Per le slice applicative rilevanti il ciclo comprende, secondo ambito:

1. Product CI: test → typecheck → lint → build;
2. gate specialistico applicativo;
3. HVA applicativo quando pertinente;
4. merge su `develop` vincolato alla testa certificata;
5. Render Beta e verifica stato prodotto esatto/equivalente;
6. gate specialistico sul runtime Beta;
7. evidence/receipt e cleanup;
8. aggiornamento della decisione canonica.

Sono inoltre permanenti:

- `ops-security/supabase` — diniego RPC X5 al ruolo anonimo, lifecycle X5 autenticato, accesso X4 alle receipt conforme alla RLS;
- `ops-health/render-beta` — probe periodico di Render, login, Supabase Auth, DB/RLS e coerenza exact/product-equivalent con `develop`.

Le failure Vercel per quota non sono failure del canale Beta Render.

## 8. Operational hardening

Stato: **IN PROGRESS — P0 SECURITY PASS / P1 MONITORING BASELINE PASS**.

Completato:

- quattro RPC X5 `SECURITY DEFINER` non sono più eseguibili dal ruolo `anon`;
- accesso intenzionale `authenticated` preservato e provato end-to-end;
- policy X4 receipt ottimizzata con inizializzazione unica di `auth.uid()` per statement;
- aggiunti gli indici FK mancanti introdotti da X4/X5 che interessano lifecycle e referential checks;
- gate permanente `ops-security/supabase`;
- Product CI, K1, X3 e X4 regressivi PASS dopo il security hardening;
- monitor `ops-health/render-beta` ogni 6 ore e on-demand;
- monitor verificato nel primo run: `/api/build-info`, login, Supabase Auth, lettura DB/RLS e stato prodotto Render exact/equivalent;
- artifact JSON del probe conservato per 30 giorni.

Il monitor GitHub costituisce una **monitoring baseline**, non ancora un sistema completo di incident management/alert escalation.

Non equivale a production readiness completa.

Residui hardening aperti:

- backup/restore verificato;
- recovery account e password policy, inclusa leaked-password protection attualmente non abilitata;
- alert escalation/incident response oltre alla failure del monitor GitHub;
- dipendenze npm: warning corrente di 2 vulnerabilità high da classificare e risolvere senza upgrade ciechi;
- data lifecycle/retention/export dei dati utente;
- performance/load con dataset significativamente più grandi;
- canale produzione definitivo e contratto Beta → produzione.

## 9. Maturità corrente

Valutazione audit aggiornata del 2026-08-24:

- architettura/dominio: **molto matura**;
- persistenza/sicurezza/RLS: **matura e sottoposta a gate operativo dedicato**;
- core operativo docente: **avanzato**;
- Human/UX: **molto avanzato e verificato**;
- Conoscenza: **tra le capability più mature**;
- CI/E2E/HVA: **molto maturo per la fase Beta**;
- authoring professionale UDA + export PDF: **Beta-proven**;
- azioni AI persistenti: **prima capability minima attiva, controllata e reversibile**;
- operations/produzione: **security e monitoring baseline attive; hardening ancora incompleto**.

Le percentuali di maturità restano indicative e non sostituiscono i gate.

## 10. Rischi e residui prioritari

1. **Operational hardening** — backup/restore, recovery/password protection, incident response, data lifecycle, dependency security, performance/load, canale produzione.
2. **Longitudinal proof** — validare settimane e mesi reali: cambi orario, sospensioni, correzioni, accumulo documenti/task/sessioni, fine quadrimestre/anno.
3. **Governance X4** — mantenere `PLANNER_CREATE_TASK` come unica write capability assistita finché non esiste evidenza sufficiente per un'estensione controllata.
4. **Estensione authoring** — valutare altri documenti professionali solo sulla base dell'uso reale, evitando duplicazioni indiscriminate.

## 11. Ordine di maturazione autorizzato

Il ciclo corrente è:

1. **hardening operativo/produzione** — prossimo focus: backup/restore + recovery;
2. pilotaggio continuativo settembre–ottobre;
3. nuove tranche guidate da evidenza reale.

Non introdurre nuove macro-capability non previste per riempire artificialmente la roadmap.