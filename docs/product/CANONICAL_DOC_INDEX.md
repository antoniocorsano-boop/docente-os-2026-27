# DOCENTE OS — Canonical Documentation Index

Data: **2026-09-12**  
Stato: **CANONICAL**

## Ordine di autorità

Quando due documenti sembrano divergere, applicare questo ordine:

1. **Security / RLS / domain invariants**;
2. **ADR accettate**;
3. **stato corrente e programma di maturità**;
4. **Product Experience Masterplan**;
5. **specifiche canoniche di prodotto e di composizione dominio**;
6. **contratti di esperienza verticali**;
7. **Design System V2 + Brand Identity + Design Governance**;
8. **specifiche verticali di modulo**;
9. documenti storici / implementation notes.

Per il solo **stato operativo corrente** la fonte sintetica autorevole è `docs/product/PROJECT_STATUS_CURRENT.md`.

Per la **maturità M4→M5** le fonti autorevoli sono:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`.

Per la **sustained pilot evidence** le fonti autorevoli sono:

- `docs/product/SUSTAINED_PILOT_EVIDENCE_CANONICAL.md`;
- `ops/pilot-evidence-policy.json`;
- `ops/pilot-evidence-ledger.json`.

Per la **WCAG 2.2 AA accessibility assurance** le fonti autorevoli sono:

- `docs/product/WCAG_2_2_AA_ASSURANCE_CANONICAL.md`;
- `ops/wcag22-aa-assurance.json`;
- `.github/scripts/validate-wcag22-aa-assurance.mjs`;
- `.github/workflows/wcag22-aa-assurance.yml`;
- `product/e2e/experience/accessibility.spec.mjs`.

Un run automatico verde non costituisce da solo dichiarazione di conformità WCAG 2.2 AA; prevalgono i criteri di chiusura e le receipt definiti nel contratto canonico M5-03.

Per **versioning, release candidate e promozione** le fonti autorevoli sono:

- `docs/product/RELEASE_ENGINEERING_CANONICAL.md`;
- `ops/release-engineering-policy.json`;
- `ops/production-promotion-contract.json`;
- `ops/production-readiness-review.json`;
- `ops/production-release-receipt.json`;
- `CHANGELOG.md`.

`PROJECT_HEALTH.md` è soltanto un historical pointer. I file `PROJECT_STATUS_YYYY-MM-DD.md` e gli audit datati precedenti preservano la storia e non prevalgono sullo stato CURRENT.

## Core architecture

- `docs/architecture/ADR-001-product-stack.md` — stack e confini fondamentali.
- `docs/architecture/ADR-002-experience-platform.md` — component platform, assistant layer e hosting operativo.
- `docs/architecture/STRUCTURE.md` — struttura generale repository/prodotto.
- `docs/architecture/P1_PERSISTENCE_IDENTITY.md` — persistenza/identità.
- `docs/architecture/P2_PLANNER.md` — Attività/Oggi e `PlannerTask`.
- `docs/architecture/KB_INGESTION.md` — ingestione Conoscenza.
- `docs/architecture/SETTINGS_CANONICAL_SPEC.md` — master data e invarianti delle Impostazioni.
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md` — Orario e sue entità verticali.
- `docs/architecture/WORK_TIME_MENTAL_MODEL.md` — distinzione fra Attività, Piano annuale, Orario, Calendario e Oggi.
- `docs/architecture/TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` — Orario e Calendario indipendenti; Temporal Projection come unico livello di composizione autorizzato.
- `docs/architecture/AI_COLLABORATION_CANONICAL_SPEC.md` — collaborazione AI e human-in-the-loop.

### Regola temporale

Per ogni lavoro T3/T4:

1. `WORK_TIME_MENTAL_MODEL.md` governa il significato per l'utente;
2. `TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` governa le dipendenze tra Orario e Calendario;
3. `TIMETABLE_CANONICAL_SPEC.md` governa le entità interne dell'Orario.

Sono vietate dipendenze dirette `Timetable -> Calendar` e `Calendar -> Timetable`; la composizione resta confinata al servizio di Temporal Projection.

## Product e maturità

- `docs/product/PROJECT_STATUS_CURRENT.md` — **stato sintetico corrente: runtime, capability, gate, maturità e residui**.
- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md` — **audit canonico M4 avanzato e benchmark verso M5**.
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md` — **requisito → evidenza → stato → gap → criterio di chiusura**.
- `docs/product/SUSTAINED_PILOT_EVIDENCE_CANONICAL.md` — **regole M5-02 per evidence longitudinale, journey critiche, privacy e anti-selection-bias**.
- `docs/product/WCAG_2_2_AA_ASSURANCE_CANONICAL.md` — **contratto M5-03 per matrice WCAG 2.2 AA, automazione, receipt manuali e assistive technology**.
- `docs/product/RELEASE_ENGINEERING_CANONICAL.md` — **SemVer, RC immutabili, certificazione, promozione e rollback**.
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md` — north star e programma X0–X6.
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tono, microcopy e grammatica collaborativa.
- `docs/product/X4A_CERTIFICATION_2026-08-24.md` — certificazione Beta della prima write assistita `PLANNER_CREATE_TASK`.
- `docs/product/HOME_DAILY_COCKPIT_CANONICAL_SPEC.md` — Home come cabina di regia giornaliera.
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — contratto di configurazione guidata.
- `docs/product/SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` — regola “contesto completo, esposizione minima”.

### Regola M5

Durante il programma M5 una nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Il default senza evidenza è `DEFERRED`.

La sustained pilot evidence deve essere append-only, non selettiva e Tier-1-safe. Un gate macchina non equivale a `HUMAN_USE`; nessuna soglia SLO può essere congelata prima di una baseline osservata sufficiente.

Una release candidate non equivale a una promozione Production. `develop` non è Production. Le release formali seguono `RELEASE_ENGINEERING_CANONICAL.md` e il contratto Production esistente.

M5-03 mantiene `conformanceClaim=false` finché tutti i criteri A/AA applicabili non dispongono dell'evidenza richiesta; axe/HVA sono controlli di assurance e non certificatori.

### Regola Home

Per ogni lavoro sulla Home `/`:

1. `HOME_DAILY_COCKPIT_CANONICAL_SPEC.md` governa responsabilità e composizione del contesto;
2. `WORK_TIME_MENTAL_MODEL.md` governa il significato di Oggi, Orario, Calendario, Piano annuale e Attività;
3. `TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` governa la composizione temporale;
4. Design System V2, Brand Identity e Design Governance governano anatomia, responsive behavior e identità;
5. `DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` governa tono e microcopy.

La Home non introduce una fonte di verità parallela a TeachingSession, Planner, Orario, UDA o materiali.

### Regola Impostazioni

Per ogni lavoro su `/impostazioni`:

1. `SETTINGS_CANONICAL_SPEC.md` governa persistenza, sorgenti dati e invarianti;
2. `SETTINGS_EXPERIENCE_CONTRACT.md` governa ordine, stati e feedback;
3. `SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` governa la progressive disclosure;
4. il Language & Collaboration System governa tono e microcopy.

È vietato introdurre una seconda Cattedra: Impostazioni e Orario devono usare gli stessi `teaching_assignments`.

## Human + Visual Acceptance

- `product/design/HUMAN-EXPERIENCE-CONTRACT.md` — contratto Human.
- `product/design/VISUAL-ACCEPTANCE.md` — procedura di accettazione visuale.
- `product/design/MOBILE-RULES.md` — regole mobile.
- `product/design/ACCESSIBILITY-RULES.md` — regole di accessibilità correnti.
- `product/design/reviews/` — decisioni visuali datate e closure evidence.

Le review datate sono append-only. Lo stato sintetico corrente dei finding deve essere riportato in `PROJECT_STATUS_CURRENT.md` e, quando riguarda M5, nella readiness matrix. I finding osservati durante il pilot devono inoltre produrre evidence nella ledger M5-02 quando rientrano nel perimetro.

La matrice WCAG e il suo gate non sostituiscono HVA: HVA governa l'accettazione dell'esperienza, M5-03 governa la tracciabilità requisito-evidenza WCAG e le prove manuali/assistive technology.

## Design

- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md` — design system corrente.
- `docs/design/BRAND_IDENTITY_CANONICAL.md` — identità, simbolo, palette, tipografia e motion.
- `docs/design/DESIGN_GOVERNANCE_CANONICAL.md` — regole trasversali vincolanti.
- `docs/design/DESIGN_POLICY_GATE_DPG1.md` — gate deterministico sul diff.
- `docs/design/DESIGN_CONFORMANCE_DPG2.md` — ratchet full-runtime.
- `product/design/DESIGN_DEBT_BASELINE.json` — baseline macchina DPG-2 monotona.
- `product/design/DESIGN_DEBT_RESIDUALS.md` — residui intenzionali; non è una allowlist.
- `docs/design/DESIGN_SYSTEM_V1.md` — riferimento storico.

### Regola Brand e Design

Per ogni lavoro visuale o cross-surface:

1. Design System V2 governa token, anatomia, accessibilità e responsive behavior;
2. Brand Identity governa significato, simbolo e applicazione del brand;
3. Design Governance governa le regole trasversali;
4. DPG-1 governa il diff;
5. DPG-2 governa il ratchet sull'intero runtime;
6. Language & Collaboration governa il linguaggio.

La geometria del simbolo rispetto al riferimento approvato il 2026-09-11 è un invariante canonico. Una PR visuale deve dichiarare `COMPATIBLE`, `SUPERSEDING` o `BREAKING` e superare i gate pertinenti.

## Release e Production

La disciplina di release è separata dalla semplice integrazione in `develop`.

Ordine canonico:

`develop → release candidate exact SHA → gate applicabili → CERTIFIED → decisione umana → Production promotion → runtime smoke → release receipt`.

Vincoli:

- SemVer per le release formalmente emesse;
- major `0` durante M4;
- `1.0.0` riservata alla decisione M5;
- tag RC/stable immutabile;
- nuova modifica dopo freeze = nuova RC;
- rollback applicativo verso SHA precedentemente certificato;
- nessun rollback distruttivo automatico di database o Storage.

## Sustained pilot evidence

Ordine canonico:

`evento verificabile → evidence entry append-only → eventuale finding → follow-up → closure evidence → roll-up longitudinale`.

Vincoli:

- nessun dato personale scolastico o di terzi;
- nessuna telemetria invasiva;
- nessuna conversione di un machine gate in human-use evidence;
- successi, attriti, workaround e fallimenti devono essere registrabili con la stessa grammatica;
- una correzione non cancella l'evidenza originaria;
- M5-05 può proporre SLI/SLO soltanto dopo una baseline M5-02 osservata sufficiente.

## Accessibility assurance

Ordine canonico:

`criterio WCAG → classificazione → evidence → eventuale finding → correzione → receipt → stato`.

Vincoli:

- 55 criteri A/AA presenti una sola volta nella matrice;
- `VERIFIED_PASS` solo con receipt specifica;
- N/A sempre motivato e rivalutato quando cambia il runtime;
- axe non sostituisce audit manuale né assistive technology;
- keyboard/focus/reflow e screen reader restano gate separati;
- `conformanceClaim=false` finché non esiste chiusura completa e deliberata.

## Regola di aggiornamento

Ogni slice che modifica una decisione canonica deve:

1. aggiornare prima o insieme il documento pertinente;
2. dichiarare se la modifica è `COMPATIBLE`, `SUPERSEDING` o `BREAKING` quando applicabile;
3. non lasciare istruzioni operative incompatibili nel repository;
4. aggiornare `PROJECT_STATUS_CURRENT.md` quando cambia una macro-capability, il runtime, un gate maggiore o un rischio di maturità;
5. aggiornare `M5_READINESS_MATRIX_2026-09-12.md` quando cambia lo stato di un gate M5;
6. aggiornare `CHANGELOG.md` quando il cambiamento è rilevante per release, maturità, sicurezza o operatività;
7. aggiungere evidence alla ledger M5-02 quando un evento reale rientra nel suo perimetro, senza riscrivere eventi precedenti.

I checkpoint datati preservano la storia e non devono essere riscritti come se fossero stato corrente.

## Regola per agenti di sviluppo

Prima di implementare una slice, leggere almeno:

1. `PROJECT_STATUS_CURRENT.md`;
2. `M5_READINESS_MATRIX_2026-09-12.md` durante il programma M5;
3. `SUSTAINED_PILOT_EVIDENCE_CANONICAL.md` quando il lavoro riguarda evidenza d'uso, incidenti, friction o KPI;
4. `WCAG_2_2_AA_ASSURANCE_CANONICAL.md` quando il lavoro modifica UI, accessibilità, navigazione, form o interazioni;
5. ADR-001 e ADR-002;
6. Product Experience Masterplan;
7. Language & Collaboration System;
8. Design System V2;
9. Brand Identity e Design Governance per lavoro visuale;
10. DPG-1/DPG-2 per lavoro visuale;
11. la specifica verticale della slice e il relativo contratto di esperienza;
12. per T3/T4, Work/Time Mental Model e Temporal Composition;
13. `RELEASE_ENGINEERING_CANONICAL.md` quando il lavoro coinvolge versioni, RC, promozioni o rollback.

Nessun agente deve inferire una nuova architettura da un singolo file runtime quando esiste una decisione canonica esplicita; nessun agente deve inferire lo stato corrente da un checkpoint datato quando esiste `PROJECT_STATUS_CURRENT.md`.

La baseline DPG-2 non è un budget da spendere: è debito da ridurre. La readiness M5 non è un pretesto per feature expansion: è un programma di maturazione verificabile.
