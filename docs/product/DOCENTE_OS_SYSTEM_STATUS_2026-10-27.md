# DOCENTE OS — Quadro completo di stato e maturazione V1

**Data:** 27 ottobre 2026  
**Ambito:** prodotto Docente OS / Teacher Operating System V1  
**Baseline integrata osservata:** `develop@00f9a181b1213919ebd207f5944eb851307ab6ea`  
**Candidate repair aperto:** PR #761 — `92ea0fd0ea88b942d3dd630423264d9a50d04982`  
**Classificazione di prodotto:** M4 — Advanced Controlled Production Pilot  
**Direzione:** completion and maturation mode, non feature expansion indiscriminata

---

## 1. Executive summary

Docente OS non è più un prototipo di funzionalità. È già un sistema professionale ampio, con architettura, dominio, persistenza, sicurezza, governance e assurance molto maturi.

Il core single-owner del lavoro docente è sostanzialmente presente: Home/Oggi, Teacher Moment/Today+Next, Classi, Orario, Calendario, Lesson Brief, Materiali, Piano annuale/UDA, TeachingSession/registrazione, Observation/Evidence, Conoscenza/KB, Account/MFA e Contextual Copilot.

Il limite principale non è più “cosa manca da costruire”, ma “quanto bene le capability già costruite convergono in pochi journey quotidiani fluidi e affidabili”.

La distanza residua verso una V1 realmente pronta si concentra in cinque aree:

1. convergenza dei journey quotidiani e HUMAN_USE reale;
2. stabilità runtime/pilot e performance sotto carico reale/cold start;
3. Android/PWA/device reality;
4. qualification whole-journey di Knowledge→Lesson, Copilot e Observe→Registra;
5. maturità M5 formale: WCAG manuale/assistive, ASVS requirement-level, SLI/SLO e pilot longitudinale.

La formula di prodotto resta:

> **Teacher Moment → contesto → prossimo passo → copilota → conferma umana → traccia**

La regola di maturazione è:

> **maturare ciò che esiste prima di ampliare il perimetro funzionale.**

---

## 2. Valutazione sintetica

Le seguenti valutazioni sono euristiche di orientamento, non sostituiscono DOS-CRM né i gate ufficiali.

| Dimensione | Lettura sintetica |
|---|---:|
| Architettura e dominio | 9/10 |
| Engineering / assurance | 9/10 |
| Capability core | 8/10 |
| Copertura funzionale single-teacher | 8/10 |
| Usabilità reale | 6,5–7/10 |
| Mobile web | 7,5–8/10 |
| Android/PWA device reality | 5–6/10 |
| Runtime/operability | 6,5/10 |
| Maturità generale distribuibile | 5–6/10 |

Il disallineamento è significativo: il sistema è oggi più maturo tecnicamente di quanto sia maturo come esperienza quotidiana non assistita.

---

## 3. Stato del prodotto

Il runtime canonico è in `product/` ed è basato su Next.js/React/TypeScript, Supabase Auth/PostgreSQL/Storage, RLS deny-by-default e architettura repository/port.

Le superfici principali esistenti comprendono Home/Oggi e Planner/Today+Next, Classi, Orario, Calendario, Lesson Brief/preparazione lezione, Materiali, Piano annuale, Progettazione/UDA ed export, TeachingSession/registrazione lezione, Observation/Teaching Evidence, Conoscenza/Knowledge Base, Account/MFA/sessioni, Impostazioni/contesto professionale e Contextual Copilot.

Il prodotto è correttamente classificato come **M4 — Advanced Controlled Production Pilot**. Il programma M5 riguarda maturazione e distribuzione generale, non una nuova espansione indiscriminata delle feature.

### 3.1 Stato corrente del filone Orario

La PR #760 ha corretto un errore di semantica temporale: una versione `ACTIVE` con `effective_from` futuro non deve essere considerata immediatamente operativa. La correzione integrata usa la data operativa governata e la selezione canonica della versione effettiva.

Dopo il merge della #760 è emerso un secondo boundary case reale. Il 27/10/2026 la nuova versione è effettiva; la griglia ricorrente mostrava il lunedì; il vecchio calcolo associava quella cella al lunedì passato 26/10; la proiezione temporale selezionava correttamente la versione precedente; gli slot fisici delle due versioni hanno ID diversi; la risoluzione della Lezione falliva chiusa verso la Classe.

La PR #761 corregge il comportamento: la cella della settimana ricorrente deve risolvere la **prossima occorrenza concreta** del weekday nella versione corrente.

Exact candidate: `92ea0fd0ea88b942d3dd630423264d9a50d04982`.

Evidenze correnti:

- Product CI #3581: PASS;
- FULL HVA #1126: PASS;
- 114 PASS / 2 skip;
- `Orario → apri lezione`: PASS mobile e desktop;
- baseline pre/post invariata;
- Human Visual / Design Review: **PASS WITH WATCH**;
- nessun visual/design rework richiesto.

La PR #761 è ancora Draft e non mergiata. È il primo elemento da chiudere nel piano di maturazione.

---

## 4. Capability map

| Capability | Stato sostanziale | Gap principale |
|---|---|---|
| Account / MFA / sessioni | tecnicamente molto maturo | revalidation whole-capability sulla futura RC |
| Classi / cattedra | maturo | evitare fallback cognitivi inutili |
| Orario | molto avanzato | integrare #761 + post-merge runtime + HUMAN_USE |
| Calendario / Temporal Projection | integrato e semanticamente separato | qualification whole-capability |
| Today / Next / Teacher Moment | avanzato | QL-1 HUMAN_USE |
| Lesson Brief | avanzato | whole-capability revalidation |
| Materiali | integrati | qualification dentro Knowledge→Lesson |
| TeachingSession / Registra | dominio e writer maturi | Observe→Registra + recovery + HUMAN_USE |
| Observation / Evidence | implementato | journey browser/mobile completo |
| Piano annuale / UDA | molto avanzato | qualification unificata del ciclo |
| Conoscenza / KB | avanzata | QL-3 + stabilità runtime `/knowledge` |
| Contextual Copilot | reale e avanzato | QL-4 + HUMAN_USE |
| PWA / device intake | implementato | Android reality qualification |
| Contextual Voice Capture | DEFERRED | fuori release core |
| Institutional Configurator | conditional/parziale | non prerequisito V1 single-owner |
| Tier 2 / multi-user | non ammesso nella baseline | programma separato privacy/legal/security |

---

## 5. Usabilità

La principale evidence negativa storica resta importante: una HUMAN_USE reale ha classificato il prodotto **FRICTION / REWORK_REQUIRED**.

I problemi non erano soprattutto estetici, ma cognitivi: troppe informazioni simultanee, troppe superfici, preparazione lezione lunga, eccesso di scrolling, Home/Oggi non abbastanza orientata al prossimo momento professionale, sera/domani poco evidente, Copilot non ancora abbastanza operativo e latenza percepita in alcuni passaggi.

Da qui derivano:

- `Product Model ≠ User Model`;
- target `Oggi → Classe → Lezione → Fatto`;
- progressive disclosure;
- una CTA primaria per stato;
- Teacher Moment;
- Today/Next;
- Lesson Brief;
- Contextual Copilot.

Il prodotto è migliorato molto, ma il vero gate non è una nuova HVA: è una **HUMAN_USE task-based sulla RC corrente**.

---

## 6. Mobile e design

Punti forti: mobile come target primario, HVA su 412×915 e desktop, target interattivi >=44 px, overflow controllato, FAB protetto dalle regioni sensibili, drag e posizione semantica governati, bottom navigation e shell consolidate.

Debito residuo osservato sulla #761: nel primo viewport mobile Orario 412×915 la bottom navigation copre visivamente una parte inferiore della CTA secondaria `Modifica orario`. È un WATCH non bloccante e preesistente, da trattare nel filone mobile polish/Android Reality e non nel repair #761.

---

## 7. Engineering e assurance

Il processo operativo corrente è:

`exact SHA → RED causale → GREEN minimo → Product CI → impact classification → HVA → baseline integrity → Human Visual/Design → candidate qualification → decisione umana → merge → post-merge runtime`

Sono presenti exact-SHA qualification, TDD causale, Product CI, Design Policy, Human Interaction Model, HVA browser, baseline/fixture integrity, WCAG automated gates, ASVS gates, P6 performance, P7 recovery, no-implicit-write, planner acceptance, candidate/finalizer receipts e human review separata dall’automazione.

Questa infrastruttura è ormai uno dei punti più maturi del sistema.

---

## 8. Runtime e operability

Dopo il merge della #760:

- Product CI post-merge: PASS;
- HVA Beta: FAIL sul boundary 27/10;
- causa: dimostrata e corretta in #761;
- P6 `/knowledge`: FAIL su Render.

Per `/knowledge` il quadro osservato è più coerente con warm-up/variabilità runtime che con una regressione specifica del codice: candidate locale circa 0,7 s, Render prima navigazione circa 3,6 s, successive circa 1,75 s e 0,94 s, con pattern analogo su altre route.

Il problema non è ancora chiuso. Non va allentato il budget e non va inventata una patch senza causa.

Target di maturità: il runtime deve diventare **operationally boring**.

---

## 9. Copertura rispetto al Teacher OS V1

- **V1-A — Teacher Moment + Today/Next:** copertura alta.
- **V1-B — Lesson Brief:** copertura alta.
- **V1-C — Copilot operativo:** copertura medio-alta; Contextual Copilot e governance avanzati, restano QL-4/HUMAN_USE e Voice deferred.
- **V1-D — Institutional Configurator:** copertura bassa/parziale, ma conditional per il pilot single-owner.
- **V1-E — Runtime/hosting:** parziale; Render resta runtime controllato corrente, decisione definitiva da sustained evidence.

---

## 10. Cosa manca davvero alla V1

| Blocco | Gap |
|---|---|
| Daily Teaching Loop | QL-1 HUMAN_USE reale |
| Knowledge / Materials | QL-3 end-to-end |
| Governed Copilot | QL-4 + HUMAN_USE |
| Observe → Registra | browser/mobile + recovery + Human Use |
| Android/PWA | real-device qualification |
| Runtime | P6/health + sustained evidence |
| Accessibility | manual WCAG + assistive tech |
| Security maturity | ASVS requirement-level |
| Operability | SLI/SLO + incident/support loop |
| General maturity | pilot longitudinale e decisione V1 |

---

## 11. Decisione di programma

Il programma viene congelato su questa regola:

> **Nessun nuovo feature train importante prima della chiusura della maturazione V1.**

Priorità:

1. chiudere #761;
2. stabilizzare il runtime post-merge;
3. congelare una RC reale;
4. eseguire HUMAN_USE QL-1 sulla RC;
5. chiudere QL-3 e QL-4;
6. qualificare Observe→Registra;
7. qualificare Android/PWA reale;
8. completare assurance M5;
9. raccogliere pilot longitudinale;
10. prendere la decisione formale V1.

Voice, Tier 2, multi-user e institutional expansion restano fuori dal core finché non vengono esplicitamente ri-autorizzati.

## 12. Documenti di riferimento

- `docs/product/PROJECT_STATUS_CURRENT.md`
- `docs/product/CAPABILITY_READINESS_CURRENT.md`
- `docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`
- `docs/design/PRODUCT-SIMPLIFICATION.md`
- `docs/design/HUMAN-EXPERIENCE-CONTRACT.md`
- `docs/design/VISUAL-ACCEPTANCE.md`
- `docs/superpowers/plans/2026-10-27-docente-os-v1-maturation-plan.md`
