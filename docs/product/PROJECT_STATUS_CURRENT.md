# DOCENTE OS — Stato corrente canonico

Data: **2026-09-14**  
Stato documento: **CURRENT / CANONICAL CANDIDATE — V1 CONVERGENCE**

## 1. Baseline runtime integrata

`develop@3605912f764468b547aeb344c29f548734eca123`

La Beta corrente ha completato UX-0E ma la successiva HUMAN_USE reale (#383) ha prodotto **FRICTION / REWORK_REQUIRED**. Il prodotto non viene dichiarato UX-complete: l'evidenza umana ha mostrato che la complessità di orchestrazione resta troppo elevata.

## 2. Decisione corrente

DOCENTE OS entra nel programma **V1 — Teacher Operating System** (#387).

Formula:

`Teacher Moment → contesto → prossimo passo → copilota → conferma → traccia`

Documento autorevole di programma:

`docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`

Il valore prioritario non è aggiungere nuovi moduli, ma comporre correttamente capability già costruite attorno al momento professionale del docente.

## 3. Invarianti permanenti

- `TeachingSession` resta la ricevuta autorevole di ciò che è realmente accaduto;
- `AnnualPlanBlockProgress` resta una decisione professionale distinta;
- Orario e Calendario restano domini distinti, composti tramite Temporal Projection;
- Arena mantiene l'autorità curricolare/istituzionale; DOCENTE OS il lavoro operativo del docente;
- AI non scrive direttamente nel dominio;
- sicurezza, RLS, AAL2, privacy, provenance, idempotenza e human authority restano non negoziabili;
- nessuna semplificazione UI può degradare gli invarianti di dominio.

## 4. Capability già disponibili da riusare

Sono già presenti fondazioni significative per:

- account e MFA/AAL2;
- classi/cattedra;
- Orario;
- Piano annuale/UDA;
- TeachingSession e registrazione lezione;
- Observation/Evidence;
- Planner/Oggi;
- Conoscenza/KB;
- materiali contestuali;
- assistant runtime e prime write assistite;
- provenance, RLS e governance;
- design system e mobile shell;
- release/security/accessibility assurance.

Il V1 deve **orchestrare** queste capability, non riscriverle da zero.

## 5. HUMAN_USE corrente

Issue: **#383**.

Evidence principale:

- Home/Oggi troppo legata al concetto di attività e non al prossimo momento professionale;
- sera: manca `domani / cosa devo preparare`;
- preparazione lezione troppo lunga e densa;
- troppe informazioni simultaneamente visibili;
- eccesso di navigazione/scorrimento manuale;
- coprogettazione ancora percepita come gestione di moduli;
- copilota non ancora abbastanza operativo;
- latenza percepita non accettabile in alcuni passaggi;
- defect runtime React #441 osservato nella registrazione;
- incoerenza di navigation state/bundle da verificare.

Esito: **FRICTION / REWORK_REQUIRED**.

Questa evidence non viene cancellata né forzata a PASS: alimenta direttamente il V1.

## 6. Teacher Moment

Il sistema deve comporre il lavoro in base al momento professionale:

- prima della scuola;
- prima della lezione;
- durante;
- subito dopo;
- tra due lezioni;
- fine giornata;
- preparazione del giorno successivo.

Home/Oggi diventa **Today + Next**.

Se il giorno corrente non richiede attenzione, il sistema deve mostrare il prossimo momento pertinente invece di fermarsi a una lista vuota.

## 7. Lesson Brief

La progettazione completa resta nel Product Model, ma l'entry point operativo deve diventare un brief compatto:

- classe/quando;
- obiettivo;
- cosa serve;
- cosa è già pronto;
- cosa manca;
- nota utile precedente;
- proposta del copilota;
- una CTA primaria;
- dettaglio completo solo su richiesta.

## 8. Copilota reale

Il copilota diventa componente operativo del Teacher Moment.

Deve poter:

- recuperare il contesto;
- cercare e sintetizzare;
- produrre, adattare e migliorare contenuti;
- recuperare memoria professionale;
- proporre prossimo passo;
- ricevere input vocale;
- preparare write governate.

Direzione prodotto:

`docs/product/TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md`

## 9. Contextual Voice Capture

La voce è input del copilota, non una nuova applicazione.

Flusso:

`voce → trascrizione effimera → binding contestuale → proposta strutturata → conferma → write governata`

Specifica:

`docs/architecture/CONTEXTUAL_VOICE_CAPTURE_SPEC.md`

Issue: **#385**.

## 10. Institutional Configurator

DOCENTE OS deve adattarsi alla policy dell'istituto, non imporre un ecosistema.

Profili iniziali:

- `PERSONAL_LOCAL_FIRST`;
- `GOOGLE_WORKSPACE_EDU`;
- `MICROSOFT_365_EDU`;
- `HYBRID` solo con confini espliciti.

La scuola governa provider, identity, scopes, data tier, AI policy, voice policy, retention e capability disponibili.

Google Workspace e Microsoft 365 sono provider di capability, non il modello mentale del docente.

Specifica:

`docs/architecture/INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`

## 11. Infrastruttura

Render resta il runtime corrente fino a evidence contraria.

Programma V1-E:

- benchmark Render;
- confronto con Firebase App Hosting / Cloud Run;
- Supabase mantenuto inizialmente per isolare la variabile runtime;
- misure cold/warm, TTFB, tap→interactive, P50/P95;
- scelta hosting su evidence.

## 12. Test strategy

I gate profondi non vengono eliminati.

Nuovo modello:

- **FAST** — unit/type/lint/contract mirati;
- **MERGE** — build + critical path + invarianti pertinenti;
- **NIGHTLY** — HVA completa, WCAG regression, DPG full-runtime, performance/security/cross-surface;
- **RELEASE** — exact SHA, full assurance applicabile, HUMAN_USE, visual acceptance e runtime receipt.

Documento:

`docs/engineering/FAST_FEEDBACK_TEST_STRATEGY_V1.md`

## 13. Programma V1 corrente

1. **V1-A — Teacher Moment + Today/Next**;
2. **V1-B — Lesson Brief**;
3. **V1-C — Copilot reale + Contextual Voice Capture**;
4. **V1-D — Institutional Configurator**;
5. **V1-E — Runtime benchmark e hosting decision**.

Questi assi hanno precedenza su nuove superfici autonome.

## 14. Maturity e assurance

M5 continua come assurance di prodotto ma non detta più il ritmo quotidiano di implementazione.

Stato dove non esiste nuova evidence:

- release engineering: foundation avanzata;
- sustained pilot evidence: collecting;
- WCAG: partial;
- ASVS: partial;
- observability/SLI/SLO: open/partial;
- external runtime continuity: da convergere nel configuratore;
- institutional/multi-user: conditional e da autorizzare separatamente.

## 15. Priorità operative immediate

1. consolidare e integrare la baseline documentale V1;
2. aprire/implementare V1-A Teacher Moment + Today/Next;
3. correggere defect runtime bloccanti osservati dalla HUMAN_USE;
4. implementare V1-B Lesson Brief;
5. rendere operativo il copilota e la voce in V1-C;
6. realizzare Institutional Configurator in V1-D;
7. benchmarkare runtime Google in V1-E;
8. applicare la fast-feedback test strategy.

## 16. KPI principale

**Teacher Attention Returned (TAR)**

Misura quanto lavoro di ricostruzione, ricerca, ricopiatura, navigazione e attesa viene rimosso prima che il docente possa concentrarsi sull'azione professionale.

## 17. Regola finale

> **Il docente non deve andare a cercare DOCENTE OS. DOCENTE OS deve presentarsi con la cosa giusta nel momento giusto e poi togliersi di mezzo.**
