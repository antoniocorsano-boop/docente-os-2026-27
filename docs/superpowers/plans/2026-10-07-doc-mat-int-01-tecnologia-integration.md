# DOC-MAT-INT-01 — Integrazione Documenti ↔ Materiali, verticale Tecnologia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collegare senza riscritture la linea Documenti e la linea Materiali di DOCENTE OS attraverso la prima verticale reale Tecnologia: Programmazione annuale → UDA → lezione → materiali → evidenze → Programma svolto / Relazione finale.

**Architecture:** Riusa integralmente il lavoro già prodotto: PR #692 come fondazione Materiali, PR #695 come fondazione del motore documentale, PR #693 come contratto architetturale. La nuova implementazione aggiunge soltanto il raccordo mancante: authoring strutturato della Programmazione annuale, composizione dal Piano annuale/curricolo, collegamento contestuale a UDA e lezione, e proiezione read-only delle evidenze di svolgimento verso i documenti consuntivi. Nessun nuovo archivio parallelo e nessuna sincronizzazione nascosta.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS/RPC, Node `tsx --test`, motore X5 authored documents, DOC-TPL-01, domini TeachingSession/TeachingEvidence/LessonDesignExtension.

**Spec:** `docs/superpowers/specs/2026-10-07-documenti-materiali-boundary-design.md`

## Global Constraints

- Non riscrivere né duplicare l'implementazione della PR #692; il contratto `TeachingContextSnapshot` / `AtlasMaterialBundle` resta la base del raccordo Studio Atlas.
- Non creare un secondo motore di modelli: `DocumentTemplateKind` e DOC-TPL-01 della PR #695 restano l'unica fondazione dei modelli istituzionali.
- Non creare un secondo archivio documentale: X5 `authored_documents` / versioni resta l'unica identità/version history dei documenti professionali.
- La lezione è il principale punto operativo di raccordo fra progettazione e materiali.
- Materiali e Studio Atlas non modificano automaticamente Programmazione annuale, UDA, Piano annuale o Calendario.
- Il ritorno Materiali → Documenti avviene soltanto tramite fatti/evidenze strutturati e ispezionabili; nessun giudizio professionale viene inferito o finalizzato automaticamente.
- Nessun dato studente viene trasferito a Studio Atlas.
- Le fonti istituzionali orientano la Programmazione annuale ma non vengono ricopiate meccanicamente nel documento.
- La Programmazione annuale deve poter rappresentare contesto, competenze, obiettivi, nuclei/contenuti, metodologie, inclusione/personalizzazione, educazione civica/raccordi trasversali, verifica/valutazione, recupero-consolidamento-potenziamento e monitoraggio.
- Educazione civica resta trasversale: non inventare quote orarie disciplinari.
- Validazione e finalizzazione dei documenti sono sempre umane.
- Nessun identificatore tecnico, codice CAN/Bxx, UUID, provenienza tecnica, provider o formula “generato automaticamente” compare nell'output professionale.
- UI docente in italiano professionale; mobile con flusso verticale e una sola azione primaria per stato.
- Nessun nuovo elemento nella bottom navigation mobile.

## Lavoro esistente da preservare

### Linea Materiali — PR #692

**Riutilizzare senza reimplementare:**

- `product/src/core/domain/atlas-material-handoff.ts`
- `product/src/core/domain/atlas-material-handoff.test.ts`
- `product/src/app/progetta/atlas/ritorno/AtlasMaterialReturnReview.tsx`
- `product/src/app/progetta/atlas/ritorno/actions.ts`
- `product/src/app/progetta/atlas/ritorno/page.tsx`
- `product/src/app/progetta/progetta-model.test.ts`

Il flusso UDA → Studio Atlas → `AtlasMaterialBundle` → scelta esplicita della lezione → persistenza canonica resta invariato salvo correzioni necessarie a seguito di Human Review.

### Linea Documenti — PR #695

**Riutilizzare senza reimplementare:**

- `product/src/core/domain/document-template.ts`
- `product/src/core/application/document-template-quality.ts`
- `product/src/core/infrastructure/supabase/supabase-document-template-repository.ts`
- `product/src/core/presentation/institutional-document-preview.ts`
- `product/src/core/presentation/final-report-canonical-template.ts`
- `product/src/app/documentazione/modelli/TemplateBuilder.tsx`
- `product/src/app/documentazione/page.tsx`
- `product/supabase/migrations/0087_document_template_registry.sql`

La base istituzionale condivisa + modello specifico della famiglia documentale resta il contratto unico di resa.

### Domini operativi già presenti

**Riutilizzare come fonti, non duplicare:**

- `product/src/app/piano-annuale/model.ts` — segmenti/blocchi e sorgenti canoniche del Piano annuale Tecnologia.
- `product/src/core/domain/teaching-session.ts` — lezione svolta e allocazioni ai blocchi canonici.
- `product/src/core/domain/teaching-evidence.ts` — evidenze/osservazioni aggregate e proposte subordinate a decisione umana.
- `product/src/core/domain/lesson-design-extension.ts` — risorse/materiali accettati e provenienza, compresa `sourceKind: 'ATLAS'`.
- `product/src/app/materiali/prossima/lesson-materials-view-model.ts` — viste operative dei materiali della lezione.

## Prerequisiti di esecuzione

Prima di aprire il branch di integrazione:

1. PR #693 resta il contratto di riferimento e deve aver superato Human Review.
2. PR #692 deve superare la Human Review finale sul candidato `c6d877cb6d92d32e663f86ecdc88822dd377cc4d`; non aggiungere nuove feature nel suo branch per questa integrazione.
3. PR #695 deve chiudere i gate residui sul proprio exact head, inclusi Product CI / certificazione browser / accessibilità e Human Visual Acceptance; correggere soltanto i finding reali, senza ridisegnare il motore.
4. Dopo integrazione delle fondazioni, rieseguire/rebasare il piano `docs/superpowers/plans/2026-10-07-doc-01-generalized-authoring.md` perché X5 possa ospitare famiglie documentali oltre UDA.
5. Le tranche DOC-04 già pianificate per evidenze e Relazione finale restano dipendenze separate: questo piano non le duplica.

---

## Review Focus

- Una modifica ai materiali di una lezione non deve riscrivere automaticamente Programmazione annuale o UDA.
- Una Programmazione annuale salvata deve mantenere la propria versione anche se cambia in seguito il Piano annuale/curricolo sorgente; l'aggiornamento deve essere esplicito.
- Una lezione sostituita/superseded non deve contribuire due volte al Programma svolto o alla Relazione finale.
- Un materiale Atlas solo proposto o non accettato non deve essere contato come materiale effettivamente usato.
- Il documento professionale deve restare leggibile e privo di codici tecnici anche quando le sorgenti operative usano `Bxx`, asset id, generation id o UUID.

---

### Task 1: Estendere X5 alla Programmazione annuale senza cambiare UDA e Relazione finale

**Files:**
- Modify: `product/src/core/domain/authored-document.ts`
- Modify/Create after DOC-01 landing: `product/src/core/domain/authored-document.test.ts`
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts`
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts`
- Create: `product/src/core/infrastructure/supabase/annual-programming-authoring-migration-contract.test.ts`
- Create: next free migration after the landed DOC-01/DOC-04 lineage, named `<NNNN>_annual_programming_authoring.sql`

**Interfaces:**
- Extend `AuthoredDocumentKind` additively with `ANNUAL_PROGRAMMING`.
- Preserve `UDA` and `FINAL_REPORT` behavior unchanged.
- Add repository boundary:

```ts
openAnnualProgramming(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
  sourceAssetId: string
  templateVersionId: string
  initialTitle: string
  initialBodyMarkdown: string
}): Promise<string>
```

- Identity uniqueness: one current `ANNUAL_PROGRAMMING` document per workspace + academic year + section + discipline; version history remains immutable.

- [ ] **Step 1: Write failing domain tests**

Assert that `ANNUAL_PROGRAMMING` is accepted only with academic year, section, discipline, active template and canonical source asset; UDA and FINAL_REPORT fixtures remain valid unchanged.

- [ ] **Step 2: Run focused domain test and verify RED**

Run: `cd product && npx tsx --test src/core/domain/authored-document.test.ts`

Expected: FAIL because `ANNUAL_PROGRAMMING` / validation branch does not exist.

- [ ] **Step 3: Extend domain types/validation minimally**

Do not add document workflow states here; those remain in structured authoring/decision layers.

- [ ] **Step 4: Write failing migration/repository tests**

Pin the new RPC `open_annual_programming_authoring`, context validation, uniqueness, active-template requirement and unchanged existing RPCs.

- [ ] **Step 5: Run migration/repository tests and verify RED**

Run the new focused tests with `npx tsx --test`.

- [ ] **Step 6: Implement migration and repository method**

Use the existing X5 patterns, RLS/RPC boundary, optimistic concurrency and immutable versions. Do not create a new table for annual programming documents.

- [ ] **Step 7: Run focused tests + typecheck**

Run:

```bash
cd product
npx tsx --test src/core/domain/authored-document.test.ts src/core/infrastructure/supabase/annual-programming-authoring-migration-contract.test.ts src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

Commit only Task 1 files with message `feat: add annual programming authored documents`.

---

### Task 2: Aggiungere il modello istituzionale specifico della Programmazione annuale

**Files:**
- Create: `product/src/core/presentation/annual-programming-canonical-template.ts`
- Create: `product/src/core/presentation/annual-programming-canonical-template.test.ts`
- Modify only if needed for shared rendering, not document semantics: `product/src/core/presentation/institutional-document-preview.ts`
- Modify: `product/package.json` to add the new focused test to the canonical `npm test` list if the repository still uses an explicit test list.

**Interfaces:**
- Produce:

```ts
export const ANNUAL_PROGRAMMING_CANONICAL_TEMPLATE_V1: DocumentTemplateVersionDraft
export function annualProgrammingCanonicalTemplate(): DocumentTemplateVersionDraft
```

- Template kind must be `ANNUAL_PROGRAMMING`.
- Required semantic sections, in professional order:
  - `IDENTITY_CONTEXT`
  - `COMPETENCES_OBJECTIVES`
  - `CONTENT_PATHS`
  - `METHODS_TOOLS`
  - `INCLUSION_PERSONALIZATION`
  - `CIVIC_TRANSVERSAL`
  - `ASSESSMENT`
  - `RECOVERY_ENHANCEMENT`
  - `MONITORING`
  - `SIGNATURE`

- [ ] **Step 1: Write failing template tests**

Assert exact kind/section order, suitable render roles, conditional civic section, no invented disciplinary hour quota, and professional labels free of technical tokens.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/presentation/annual-programming-canonical-template.test.ts`

Expected: FAIL because template does not exist.

- [ ] **Step 3: Implement the template using DOC-TPL-01 only**

No new renderer or visual system. Inherit the shared institutional base from the existing template engine.

- [ ] **Step 4: Run template + quality + purity tests**

Run:

```bash
cd product
npx tsx --test src/core/presentation/annual-programming-canonical-template.test.ts src/core/application/document-template-quality.test.ts src/core/presentation/institutional-document-preview.test.ts
```

Expected: PASS and quality not `BLOCKED`/`REVIEW_REQUIRED` for the canonical draft.

- [ ] **Step 5: Commit**

Commit with message `feat: add annual programming institutional template`.

---

### Task 3: Comporre la Programmazione di Tecnologia dai dati già noti

**Files:**
- Create: `product/src/core/application/documentation/build-annual-programming-context.ts`
- Create: `product/src/core/application/documentation/build-annual-programming-context.test.ts`
- Create: `product/src/core/application/documentation/compose-annual-programming-draft.ts`
- Create: `product/src/core/application/documentation/compose-annual-programming-draft.test.ts`
- Read/reuse only: `product/src/app/piano-annuale/model.ts`

**Interfaces:**

```ts
export type AnnualProgrammingContext = {
  academicYearId: string
  sectionId: string
  sectionLabel: string
  disciplineId: string
  disciplineLabel: string
  grade: 'Prima' | 'Seconda' | 'Terza'
  canonicalPlanSource: { code: string; assetId: string; generationId: string }
  segments: Array<{
    uda: string
    period: string
    focus: string
    plannedHours: number
  }>
}

export function buildAnnualProgrammingContext(input: {
  academicYearId: string
  sectionId: string
  sectionLabel: string
  disciplineId: string
  disciplineLabel: string
  grade: GradeKey
}): AnnualProgrammingContext
```

```ts
export type AnnualProgrammingDraft = {
  title: string
  bodyMarkdown: string
  sections: AuthoredDocumentSectionDraft[]
  sources: AuthoredDocumentSourceManifestDraft[]
  missingTeacherInputs: string[]
}

export function composeAnnualProgrammingDraft(input: {
  context: AnnualProgrammingContext
  template: DocumentTemplateVersionDraft
}): AnnualProgrammingDraft
```

- [ ] **Step 1: Write failing context tests using Tecnologia Seconda as the first fixture**

Assert source `CAN-PLAN-2`, nine canonical segments, 66 planned hours, inclusion of UDA `2-01` “Agricoltura, suolo e produzioni sostenibili”, and no duplication of plan data in a second constant.

- [ ] **Step 2: Run context test and verify RED**

Run: `cd product && npx tsx --test src/core/application/documentation/build-annual-programming-context.test.ts`

- [ ] **Step 3: Implement context builder as a pure adapter over `piano-annuale/model.ts`**

Do not mutate or fork `ANNUAL_PLAN_SEGMENTS` / `CANONICAL_PLAN_SOURCES`.

- [ ] **Step 4: Write failing draft-composition tests**

Assert:
- known identity/context and content path are prefilled;
- teacher-required professional judgements remain in `missingTeacherInputs` rather than invented text;
- civic/AI/inclusion/monitoring sections can exist without fabricated activities or outcomes;
- technical source refs occur only in internal `sources`, never in professional `bodyMarkdown`.

- [ ] **Step 5: Run draft test and verify RED**

- [ ] **Step 6: Implement deterministic composition with AI disabled**

Use structured sections; do not build one monolithic free-text document.

- [ ] **Step 7: Run focused tests + typecheck**

Expected: PASS.

- [ ] **Step 8: Commit**

Commit with message `feat: compose technology annual programming from canonical plan`.

---

### Task 4: Aggiungere la superficie docente Programmazione annuale senza creare un nuovo workspace

**Files:**
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/page.tsx`
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/AnnualProgrammingEditor.tsx`
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/annual-programming-editor-model.ts`
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/annual-programming-editor-model.test.ts`
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/annual-programming.css`
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/actions.ts`
- Create: `product/src/app/documentazione/programmazioni/[sectionId]/actions.test.ts`
- Modify: `product/src/app/documentazione/page.tsx`

**Interfaces:**
- Primary action when document absent: `Prepara bozza`.
- Primary action when draft exists: `Continua`.
- Editor exposes semantic sections, missing inputs, preview, version state and internal-only `Da dove viene?` details.
- Server action:

```ts
createAnnualProgrammingDraft(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
  grade: GradeKey
}): Promise<{ documentId: string; versionNo: number }>
```

- [ ] **Step 1: Write failing view-model/action tests**

Assert known context is not requested again, only one primary action is exposed per state, mobile model is linear, `Prepara bozza` composes from canonical plan + active `ANNUAL_PROGRAMMING` template, and navigation alone does not create a document.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement action and editor surface using existing X5 structured-version primitives**

Do not add a parallel persistence layer and do not expose template/version ids in ordinary UI.

- [ ] **Step 4: Add the entry to `/documentazione` as a document type, not a new bottom-nav destination**

- [ ] **Step 5: Run focused tests, typecheck and build**

Run:

```bash
cd product
npx tsx --test src/app/documentazione/programmazioni/[sectionId]/annual-programming-editor-model.test.ts src/app/documentazione/programmazioni/[sectionId]/actions.test.ts
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

Commit with message `feat: add annual programming authoring surface`.

---

### Task 5: Collegare Programmazione/UDA alla lezione e preservare integralmente la linea Materiali

**Files:**
- Modify only if needed for contextual entry: `product/src/app/progetta/documenti/nuovo/[assetId]/page.tsx`
- Modify only if needed: `product/src/app/progetta/progetta-model.test.ts`
- Reuse without semantic change: `product/src/core/domain/atlas-material-handoff.ts`
- Reuse without semantic change: `product/src/app/progetta/atlas/ritorno/actions.ts`
- Create: `product/src/core/application/documentation/resolve-programming-lesson-context.ts`
- Create: `product/src/core/application/documentation/resolve-programming-lesson-context.test.ts`

**Interfaces:**

```ts
export type ProgrammingLessonContext = {
  sectionId: string
  disciplineId: string
  udaId: string
  blockId: string | null
  canonicalPlanAssetId: string
  canonicalGenerationId: string
}

export function resolveProgrammingLessonContext(input: {
  context: AnnualProgrammingContext
  udaId: string
  blockId?: string | null
}): ProgrammingLessonContext
```

- [ ] **Step 1: Write failing resolver tests**

Assert:
- `2-01` resolves inside Seconda/`CAN-PLAN-2`;
- an UDA not present in the selected annual context fails closed;
- a supplied block must belong to the same canonical plan/generation;
- no student data is produced.

- [ ] **Step 2: Run test and verify RED**

- [ ] **Step 3: Implement pure resolver**

The resolver creates context only; it does not create lessons, calendar entries, materials or Planner items.

- [ ] **Step 4: Add/adjust the contextual UI link to the existing UDA/material path only where needed**

The existing #692 flow remains authoritative for `Prepara materiali con Atlas` and `Associa alla lezione`.

- [ ] **Step 5: Re-run #692 contract tests**

Run:

```bash
cd product
npx tsx --test src/core/domain/atlas-material-handoff.test.ts src/app/progetta/progetta-model.test.ts
```

Expected: PASS with unchanged bundle/context schemas.

- [ ] **Step 6: Commit**

Commit with message `feat: link annual programming context to lesson preparation`.

---

### Task 6: Proiettare le evidenze di lezione e materiali verso i documenti consuntivi

**Files:**
- Create: `product/src/core/application/documentation/build-program-execution-evidence.ts`
- Create: `product/src/core/application/documentation/build-program-execution-evidence.test.ts`
- Reuse: `product/src/core/domain/teaching-session.ts`
- Reuse: `product/src/core/domain/teaching-evidence.ts`
- Reuse: `product/src/core/domain/lesson-design-extension.ts`
- Modify only at the adapter boundary defined by the existing DOC-04 evidence plan after it lands; do not fork that evidence bundle.

**Interfaces:**

```ts
export type ProgramExecutionEvidenceItem = {
  udaId: string
  blockId: string
  localDate: string
  allocatedMinutes: number
  materialRefs: Array<{
    sourceKind: 'ATLAS' | 'KNOWLEDGE' | 'WEB' | 'AI_TOOL' | 'TEACHER' | 'EDITORIAL_KNOWLEDGE'
    sourceRef: string | null
    title: string
  }>
}

export type ProgramExecutionEvidence = {
  items: ProgramExecutionEvidenceItem[]
  plannedMinutesByUda: Record<string, number>
  executedMinutesByUda: Record<string, number>
  unallocatedSessionMinutes: number
}

export function buildProgramExecutionEvidence(input: {
  annualContext: AnnualProgrammingContext
  sessionSnapshot: TeachingSessionSnapshot
  acceptedLessonExtensions: LessonDesignExtension[]
}): ProgramExecutionEvidence
```

- [ ] **Step 1: Write failing evidence tests**

Assert:
- superseded sessions are excluded using existing `currentTeachingSessions` semantics;
- allocated minutes aggregate only against matching canonical generation;
- only `ACCEPTED` lesson resources are exposed as materials used/available for evidence;
- an Atlas resource remains an evidence reference, not copied content;
- technical Bxx/source ids do not enter professional prose; this object remains internal;
- unallocated session minutes are reported, not silently assigned to an UDA.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/application/documentation/build-program-execution-evidence.test.ts`

- [ ] **Step 3: Implement the read-only evidence builder**

Use `currentTeachingSessions`, allocations and `acceptedLessonDesignResources`; no writes to session/material/document domains.

- [ ] **Step 4: Run evidence + source-domain regression tests**

Run:

```bash
cd product
npx tsx --test src/core/application/documentation/build-program-execution-evidence.test.ts src/core/domain/teaching-session.test.ts src/core/domain/teaching-evidence.test.ts src/core/domain/lesson-design-extension.test.ts
```

Expected: PASS.

- [ ] **Step 5: Connect this evidence read model to the existing DOC-04 evidence adapter once that tranche is present**

No new final-report evidence bundle type is introduced by this task. Programma svolto and Relazione finale remain separate professional documents consuming the same factual base.

- [ ] **Step 6: Commit**

Commit with message `feat: expose lesson execution evidence to documentation`.

---

### Task 7: Certificare la verticale Tecnologia end-to-end

**Files:**
- Create: `product/src/core/application/documentation/technology-document-material-flow.test.ts`
- Modify: `product/package.json` only if needed to include the test in the canonical suite.
- No production file may be modified solely to make this integration test pass unless a real defect is found and covered by a focused RED first.

**Interfaces:**
- No new public interface; this task pins the complete contract.

- [ ] **Step 1: Write an end-to-end domain/application fixture for Tecnologia Seconda**

Fixture must cover:

```text
CAN-PLAN-2
→ UDA 2-01 Agricoltura, suolo e produzioni sostenibili
→ canonical block / lesson context
→ accepted Atlas material reference
→ recorded TeachingSession allocation
→ ProgramExecutionEvidence
→ factual input available to Programma svolto / Relazione finale
```

- [ ] **Step 2: Assert the negative boundaries**

Pin all of the following:
- no student data in Atlas context;
- no automatic annual-programming mutation after material association;
- no automatic UDA/Piano annuale/Calendario write;
- no duplicate evidence from superseded session;
- no unaccepted Atlas material counted;
- no technical code in professional document draft/preview.

- [ ] **Step 3: Run focused integration test**

Run: `cd product && npx tsx --test src/core/application/documentation/technology-document-material-flow.test.ts`

Expected: PASS.

- [ ] **Step 4: Run full product verification**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Run repository certification gates on the exact head**

Require Product CI, Browser Certification, Design Policy, WCAG 2.2 AA, Human Interaction Model/HVA, security gates and any classifier-triggered checks to PASS on the same commit.

- [ ] **Step 6: Human Review**

Review on desktop and mobile:
- Documentazione → Programmazione annuale;
- Programmazione → UDA/lezione context;
- UDA → Studio Atlas → ritorno → associazione esplicita;
- lezione con materiali;
- evidenze disponibili per documenti consuntivi.

No merge before Human Review PASS.

- [ ] **Step 7: Commit only documentation/status changes produced by certification**

Use a separate final certification commit if needed; do not mix new feature behavior after exact-head certification starts.

## Self-Review

- **Spec coverage:** entrambe le linee restano semanticamente distinte; la lezione è il raccordo; Studio Atlas non acquisisce authority; il ritorno a Documenti è read-only/evidence-based; Tecnologia copre la verticale completa.
- **Preservation:** #692 e #695 sono dipendenze riusate, non codice da rifare; i piani DOC-01/DOC-04 esistenti restano validi e non vengono duplicati.
- **Type consistency:** `ANNUAL_PROGRAMMING` è già un `DocumentTemplateKind`; il piano lo aggiunge a X5 `AuthoredDocumentKind` soltanto dopo DOC-01. `AnnualProgrammingContext` usa gli stessi `GradeKey`, asset/generation e segmenti già esistenti nel Piano annuale.
- **Review Focus coverage:** mutazione silenziosa → Tasks 1/4/7; source drift/versioning → Tasks 1/3; sessioni superseded → Tasks 6/7; materiale non accettato → Tasks 6/7; purezza output → Tasks 2/3/7.
- **Scope:** il piano aggiunge solo il raccordo mancante e la prima verticale Programmazione annuale; non replica il motore template, il flusso Atlas né la futura authoring completa di Relazione finale già pianificata separatamente.
