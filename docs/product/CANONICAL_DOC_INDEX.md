# DOCENTE OS — Canonical Documentation Index

Data: **2026-09-15**  
Stato: **CANONICAL CANDIDATE / V1 CONVERGENCE**

## Ordine di autorità

Quando due documenti divergono, applicare questo ordine:

1. **Security / RLS / domain invariants**;
2. **ADR accettate**;
3. **`docs/product/PROJECT_STATUS_CURRENT.md`** — stato operativo corrente;
4. **`docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`** — direzione V1;
5. **`docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`** — esperienza e programma prodotto;
6. **specifiche canoniche di architettura e composizione dominio**;
7. **Human Experience / Product Simplification / contratti verticali**;
8. **Design System / Brand / Design Governance**;
9. documenti storici e implementation notes.

La storia non viene cancellata. I documenti precedenti restano evidence, ma non prevalgono sullo stato CURRENT e sulla convergenza V1 quando descrivono una roadmap ormai superata.

## V1 — Teacher Operating System

Fonti primarie:

- `docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md` — identità del prodotto, Teacher Moment, Today+Next, Lesson Brief, copilota, TAR e programma V1-A→V1-E;
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md` — masterplan esperienza aggiornato alla convergenza V1;
- `docs/product/TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md` — tesi del copilota e bisogni del docente nell'era AI;
- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md` — fondazione unica per resoconto→prossima lezione→materiali pronti, riuso, renderer, Canva/Drive opzionali, privacy contestuale e apprendimento governato;
- `docs/architecture/CONTEXTUAL_VOICE_CAPTURE_SPEC.md` — voce come input contestuale del copilota;
- `docs/architecture/INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md` — Google Workspace / Microsoft 365 / local-first / hybrid governati da policy istituzionale;
- `docs/engineering/FAST_FEEDBACK_TEST_STRATEGY_V1.md` — FAST / MERGE / NIGHTLY / RELEASE;
- issue `#387` — programma di convergenza;
- issue `#431` — implementazione incrementale preparazione lezione/materiali pronti;
- issue `#383` — HUMAN_USE che ha prodotto `FRICTION / REWORK_REQUIRED`;
- issue `#385` — Contextual Voice Capture / professional gap confirmed.

Formula V1:

**Teacher Moment → contesto → prossimo passo → copilota → conferma → traccia**

Principio:

> **La complessità appartiene al sistema; l'attenzione deve restare al docente e agli studenti.**

## Core architecture

- `docs/architecture/ADR-001-product-stack.md` — stack e confini fondamentali;
- `docs/architecture/ADR-002-experience-platform.md` — experience platform e assistant layer;
- `docs/architecture/STRUCTURE.md` — struttura repository/prodotto;
- `docs/architecture/P1_PERSISTENCE_IDENTITY.md` — persistenza/identità;
- `docs/architecture/P2_PLANNER.md` — Planner/Oggi;
- `docs/architecture/KB_INGESTION.md` — Knowledge ingestion;
- `docs/architecture/SETTINGS_CANONICAL_SPEC.md` — contesto professionale personale;
- `docs/architecture/ACCOUNT_SECURITY_CANONICAL_SPEC.md` — account, password, MFA e sessioni;
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md` — Orario;
- `docs/architecture/WORK_TIME_MENTAL_MODEL.md` — significato di Attività, Piano, Orario, Calendario e Oggi;
- `docs/architecture/TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` — composizione temporale;
- `docs/architecture/AI_COLLABORATION_CANONICAL_SPEC.md` — AI collaboration e human-in-the-loop;
- `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md` — composizione della readiness della lezione senza nuovo store o semantica parallela;
- `docs/architecture/CONTEXTUAL_VOICE_CAPTURE_SPEC.md` — voice capture;
- `docs/architecture/INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md` — policy/provider istituzionali.

## Product e maturità

- `docs/product/PROJECT_STATUS_CURRENT.md` — stato sintetico autorevole;
- `docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md` — programma di prodotto corrente;
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md` — masterplan;
- `docs/product/TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md` — direzione AI/copilota;
- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md` — audit storico M4→M5;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md` — readiness/evidence;
- `docs/product/SUSTAINED_PILOT_EVIDENCE_CANONICAL.md` — sustained pilot;
- `docs/product/WCAG_2_2_AA_ASSURANCE_CANONICAL.md` — accessibility assurance;
- `docs/product/ASVS_5_0_ASSURANCE_CANONICAL.md` — security assurance;
- `docs/product/RELEASE_ENGINEERING_CANONICAL.md` — versioning/release/promotion;
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tono e microcopy;
- `docs/product/HOME_DAILY_COCKPIT_CANONICAL_SPEC.md` — riferimento storico/verticale Home, subordinato a Today+Next;
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — esperienza Impostazioni;
- `docs/product/ACCOUNT_SECURITY_EXPERIENCE_CONTRACT.md` — esperienza Account.

## Human experience e semplificazione

- `product/design/HUMAN-EXPERIENCE-CONTRACT.md`;
- `product/design/PRODUCT-SIMPLIFICATION.md`;
- `docs/product/UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md` quando integrato dalla relativa branch governance;
- `product/design/VISUAL-ACCEPTANCE.md`;
- `product/design/MOBILE-RULES.md`;
- `product/design/ACCESSIBILITY-RULES.md`;
- `product/design/reviews/` — evidence append-only.

Regola:

**Product Model ≠ User Model.** Il Product Model resta rigoroso; l'esperienza ordinaria è organizzata per Teacher Moment e Next Step.

## Design

- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md`;
- `docs/design/BRAND_IDENTITY_CANONICAL.md`;
- `docs/design/DESIGN_GOVERNANCE_CANONICAL.md`;
- `docs/design/DESIGN_POLICY_GATE_DPG1.md`;
- `docs/design/DESIGN_CONFORMANCE_DPG2.md`;
- `docs/design/SOURCE_PROVENANCE_VISUAL_SYSTEM_CANONICAL.md` — **CANONICAL CANDIDATE**: pattern cross-surface per provenance visuale, source mark + label, separato da stato e authority;
- `product/design/DESIGN_DEBT_BASELINE.json`;
- `product/design/DESIGN_DEBT_RESIDUALS.md`.

Design e brand non possono reintrodurre complessità che compete con il task.

## Institutional integration

`SETTINGS_CANONICAL_SPEC.md` governa il **contesto professionale personale** del docente.

`INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md` governa il livello superiore:

`istituto → policy digitale → provider/scopes/data boundary → capability disponibili`

Google Workspace e Microsoft 365 sono provider di capability. Nessun provider diventa il modello mentale del prodotto.

## AI, voce e preparazione della lezione

Ordine:

1. `AI_COLLABORATION_CANONICAL_SPEC.md` — boundary AI generale;
2. `TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md` — ruolo professionale del copilota;
3. `LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md` — preparazione, materiali, renderer e ciclo Diario→domani;
4. `CONTEXTUAL_VOICE_CAPTURE_SPEC.md` — input voce;
5. specifiche verticali delle capability.

Una proposta AI non diventa record canonico senza il boundary e la conferma richiesti. Un materiale o una osservazione non acquisiscono scope più ampio soltanto perché sono stati prodotti o discussi dal copilota.

## Test e assurance

La strategia corrente è `Fast by default, deep by risk`:

- **FAST** — feedback locale mirato;
- **MERGE** — critical path e invarianti pertinenti;
- **NIGHTLY** — full regression/assurance;
- **RELEASE** — exact SHA, evidence completa applicabile e HUMAN_USE.

Documento: `docs/engineering/FAST_FEEDBACK_TEST_STRATEGY_V1.md`.

Questo cambia **quando** i gate girano, non ciò che proteggono.

## Release e Production

Ordine:

`develop → release candidate exact SHA → gate applicabili → CERTIFIED → decisione umana → Production promotion → runtime smoke → receipt`

Una PR verde o una Beta funzionante non equivalgono a Production.

## Regola finale

La fonte sintetica da consultare per prima è sempre:

`docs/product/PROJECT_STATUS_CURRENT.md`

Per decidere cosa costruire dopo, la fonte corrente è:

`docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`

Per qualsiasi lavoro che tocchi preparazione della lezione, materiali pronti, resa LIM/stampa, Canva/Drive o ciclo Diario→domani, la specifica verticale da riusare senza riscrivere la visione è:

`docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`