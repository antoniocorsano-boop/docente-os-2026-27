# DOCENTE OS — Stato corrente canonico

Data: **2026-09-14**  
Stato documento: **CURRENT / CANONICAL STATUS CANDIDATE**

Questo documento è la sintesi autorevole dello stato operativo corrente della branch di convergenza V1. Checkpoint, audit datati e PR storiche preservano la provenienza ma non devono prevalere sullo stato corrente quando divergono.

Baseline integrata di partenza:

`develop@3605912f764468b547aeb344c29f548734eca123`

Programma corrente:

**#387 — Teacher Operating System V1 Product Convergence**

## 1. Classificazione

DOCENTE OS resta tecnicamente:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

ma il programma operativo non è più una sequenza di micro-slice di maturazione. La priorità è ora la **convergenza del prodotto** attorno al lavoro reale del docente.

Ambito dati ammesso nella baseline corrente:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

Restano separati e non automaticamente autorizzati:

- Tier 2 scolastico/personale;
- uso istituzionale multiutente;
- multi-school tenancy;
- accessi provider con privilegi istituzionali;
- promozione Beta → Production.

## 2. Invarianti che restano validi

- `TeachingSession` resta la ricevuta autorevole di ciò che è realmente accaduto.
- `AnnualPlanBlockProgress` resta una decisione professionale distinta.
- Observation/Evidence restano additive e governate.
- Orario e Calendario restano domini distinti, composti tramite Temporal Projection.
- AI non esegue decisioni professionali autonome.
- ogni write persistente/esterna significativa mantiene preview/conferma secondo policy.
- sicurezza, RLS, AAL2, privacy, provenance e idempotenza non vengono indeboliti dalla semplificazione.

## 3. Capability già disponibili

La fondazione tecnica necessaria al V1 è in larga parte presente:

- autenticazione, Account, MFA/AAL2;
- workspace docente e contesto professionale;
- classi, cattedra, orario, calendario e temporal composition;
- Piano annuale/UDA e TeachingSession;
- observation/evidence;
- Conoscenza e provenance;
- Progetta/materiali;
- Planner/Oggi;
- assistant runtime e `AssistantContext`;
- write assistite governate;
- design system/app shell;
- pipeline CI/security/accessibility/performance;
- integrazioni e adapter già impostati per evoluzione provider-neutral.

Conclusione: il problema principale non è più **mancanza di moduli**, ma **orchestrazione nel momento professionale**.

## 4. Evidence HUMAN_USE corrente

La sessione UX-0F #383 ha prodotto un finding reale:

**FRICTION / REWORK_REQUIRED**.

Osservazioni principali:

- `Oggi` descrive correttamente l'assenza di task attuali ma non anticipa il prossimo momento utile, ad esempio la preparazione di domani;
- la preparazione lezione è ancora una pagina lunga e documentale, non un brief operativo;
- troppe capability sono visibili contemporaneamente;
- il docente deve ancora ricostruire il contesto e attraversare il Product Model;
- sono state osservate latenze percepite incompatibili con un uso professionale fluido;
- è comparso un errore React minified nella journey di registrazione;
- l'esperienza non restituisce ancora sufficiente attenzione al docente.

UX-0 non viene dichiarata PASS artificialmente. L'evidence diventa input vincolante del V1.

## 5. Nuova identità di prodotto

> **DOCENTE OS è il Teacher Operating System: memoria operativa e riflessiva del docente, orchestratore del lavoro professionale e copilota AI contestuale.**

Formula:

`Teacher Moment → contesto → prossimo passo → copilota → conferma → traccia`

Documento di riferimento:

`docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`

## 6. Teacher Moment

Il sistema deve comporre il lavoro in base al momento professionale:

- prima della scuola;
- prima della lezione;
- durante;
- subito dopo;
- tra due lezioni;
- fine giornata;
- preparazione del giorno successivo.

Home/Oggi deve quindi mostrare **adesso + prossimo**, non solo un elenco statico di attività.

## 7. Lesson Brief

La lezione completa resta ricca nel Product Model, ma l'entry point operativo deve diventare un brief compatto con:

- classe/quando;
- obiettivo;
- cosa serve;
- cosa è già pronto;
- cosa manca;
- nota utile precedente;
- proposta del copilota;
- una sola CTA primaria;
- dettaglio completo solo su richiesta.

## 8. Copilota e voce

Il copilota diventa componente operativo reale, non chat accessoria.

Deve poter:

- recuperare il contesto;
- cercare e sintetizzare;
- produrre, adattare e migliorare contenuti;
- proporre prossimo passo;
- ricevere input vocale;
- preparare write governate.

Contextual Voice Capture:

`voce → trascrizione effimera → binding contestuale → proposta strutturata → conferma → write`

Issue collegata: **#385**.

## 9. Institutional Configurator

DOCENTE OS deve adattarsi alla policy dell'istituto, non imporre un ecosistema.

Profili:

- `PERSONAL_LOCAL_FIRST`;
- `GOOGLE_WORKSPACE_EDU`;
- `MICROSOFT_365_EDU`;
- `HYBRID` solo con data-boundary esplicito.

Google Workspace e Microsoft 365 sono provider di capability, non il modello mentale del docente.

Documento di riferimento:

`docs/architecture/INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`

## 10. Infrastruttura

Render non viene sostituito per supposizione.

Programma V1-E:

- benchmark Render corrente;
- Firebase App Hosting / Cloud Run come target Google;
- Supabase mantenuto inizialmente per isolare la variabile runtime;
- misure cold/warm, TTFB, tap→interactive, P50/P95;
- scelta hosting su evidence.

## 11. Test strategy

I gate profondi restano, ma non tutti devono bloccare ogni iterazione.

Nuovo modello:

- **FAST** — unit/type/lint/contract mirati durante sviluppo;
- **MERGE** — build + critical path + invarianti pertinenti;
- **NIGHTLY** — HVA completa, WCAG regressions, DPG full runtime, P6/P7, cross-surface, security cadence;
- **RELEASE** — full assurance, HUMAN_USE applicabile, exact SHA e runtime receipt.

Documento:

`docs/engineering/FAST_FEEDBACK_TEST_STRATEGY_V1.md`

## 12. Programma V1 corrente

1. **V1-A — Teacher Moment + Today/Next**;
2. **V1-B — Lesson Brief**;
3. **V1-C — Copilot reale + Contextual Voice Capture**;
4. **V1-D — Institutional Configurator**;
5. **V1-E — Runtime benchmark e hosting decision**.

Questi cinque assi hanno precedenza su nuove superfici autonome.

## 13. Maturity program

M5 continua come assurance di prodotto, ma non detta più il ritmo quotidiano di implementazione.

Stato sintetico invariato dove non esiste nuova evidence:

- M5-01 release engineering: foundation avanzata;
- M5-02 sustained pilot evidence: collecting;
- M5-03 WCAG: partial;
- M5-04 ASVS: partial;
- M5-05 observability/SLI/SLO: open/partial;
- M5-06 external runtime continuity: da convergere nel configuratore;
- M5-07 institutional/multi-user: conditional e governato separatamente.

## 14. Priorità operative immediate

1. usare #383 come evidence, non come rituale da chiudere a ogni costo;
2. correggere defect runtime osservati nella HUMAN_USE;
3. implementare Teacher Moment / Today+Next;
4. sostituire la pagina lunga di preparazione con Lesson Brief;
5. rendere il copilota operativo e voice-capable;
6. realizzare Institutional Configurator provider-neutral;
7. benchmarkare runtime Google senza migrazione big-bang;
8. applicare fast-feedback test strategy.

## 15. Regola finale

> **Non ottimizziamo più il prodotto per la completezza delle schermate. Lo ottimizziamo per la continuità dell'attenzione professionale del docente.**
