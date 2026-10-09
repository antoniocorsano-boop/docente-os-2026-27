# DOC-MAT-INT-01 — Integrazione Documenti ↔ Materiali, verticale Tecnologia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collegare senza riscritture Documenti e Materiali attraverso la prima verticale reale Tecnologia: curricolo applicabile → Programmazione annuale → UDA → lezione → materiali → evidenze → Programma svolto / Relazione finale.

**Architecture:** Riusa le authority esistenti invece di crearne di parallele. Il curricolo applicabile resta governato dal contratto curricolare canonico; il Piano annuale resta proiezione operativa; X5 resta identità/version history dei documenti; DOC-TPL-01 governa base istituzionale + template di famiglia; TeachingSession/evidenze governano ciò che è effettivamente accaduto. Ogni versione immutabile della Programmazione conserva il footprint curricolare esatto usato per comporla. Un materiale `ACCEPTED` è disponibile/pianificato, non automaticamente “usato”.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS/RPC, Node `tsx --test`, X5 authored documents, DOC-TPL-01, `CurriculumContextForClassV1`, `CurriculumCoverageEvaluation`, TeachingSession/TeachingEvidence/LessonDesignExtension.

**Spec:** `docs/superpowers/specs/2026-10-07-documenti-materiali-boundary-design.md`

## Global Constraints

- Il **curricolo applicabile** è una authority distinta dal Piano annuale. `product/src/app/piano-annuale/model.ts` è proiezione operativa, non sorgente curricolare autonoma.
- La Programmazione annuale deve pin-nare, **per ogni immutable document version**, il footprint curricolare accettato usato per comporla: `CurriculumContextForClassV1` + `CurriculumCoverageEvaluation` (o un equivalente snapshot canonico lossless), non soltanto `curriculumVersionRef`.
- Il footprint persistito deve conservare almeno: `contextId`, `curriculumVersionRef`, authority effettiva, requirements e relativi source refs, transition/remodulation state, coverage status, requirement coverage, blocking IDs e `requiresRevalidationOnApproval`.
- `PROVISIONAL_BASELINE` e `APPROVED_INSTITUTIONAL` non sono equivalenti. Un successivo cambio di authority, requirements, source refs, transition state o coverage richiede confronto/revalidation esplicita anche se il `curriculumVersionRef` testuale restasse uguale.
- Non creare un secondo archivio documentale: X5 `authored_documents` / versioni resta l’unica identità/version history.
- Non creare un secondo motore template: DOC-TPL-01 governa `InstitutionalBaseVersion` + family `DocumentTemplateVersion`.
- La lezione è il principale punto operativo di raccordo fra progettazione e materiali.
- Studio Atlas e Materiali non modificano automaticamente Programmazione annuale, UDA, Piano annuale o Calendario.
- `LessonDesignExtension.status = ACCEPTED` significa **disponibile/accettato per la lezione**, non prova che il materiale sia stato effettivamente utilizzato.
- Un materiale è classificabile come **usato** nei documenti consuntivi solo con evidenza/receipt esplicita legata a una TeachingSession corrente e al materiale specifico.
- In assenza di receipt, il materiale può comparire soltanto come pianificato/disponibile, mai come fatto svolto.
- Le evidenze verso Programma svolto/Relazione finale sono read-only e non trasformano automaticamente fatti in giudizi professionali.
- Nessun dato studente viene trasferito a Studio Atlas.
- Educazione civica resta trasversale: non inventare quote orarie disciplinari.
- Validazione/finalizzazione dei documenti sono umane.
- Nessun identificatore tecnico, CAN/Bxx, UUID, provenance tecnica, provider o formula “generato automaticamente” compare nell’output professionale.
- UI docente in italiano professionale; nessun nuovo elemento nella bottom navigation.

## Lavoro esistente da preservare

### Materiali / Studio Atlas

Riutilizzare il contratto UDA → Studio Atlas → `AtlasMaterialBundle` → scelta esplicita della lezione → persistenza canonica. Nessun binding implicito e nessuna authority Atlas su documenti/Piano annuale.

### Documenti / template

Riutilizzare X5 per documenti/versioni e DOC-TPL-01 per base istituzionale + template di famiglia. Ogni versione documento conserva i pin esatti della base e del family template usati.

### Curricolo

Riutilizzare il contratto già presente:

```text
CurriculumContextForClassV1
CurriculumCoverageEvaluation
curriculumVersionRef
authority = PROVISIONAL_BASELINE | APPROVED_INSTITUTIONAL
requirements + sourceRefs
transitionRemodulation
coverage status + requirementCoverage + blockingRequirementIds
requiresRevalidationOnApproval
```

Il footprint curricolare persistito è uno snapshot della combinazione `CurriculumContextForClassV1 + CurriculumCoverageEvaluation` accettata per quella versione documento. Non duplicare questi concetti in costanti del Piano annuale.

### Domini operativi

Riutilizzare TeachingSession corrente e allocazioni, TeachingEvidence aggregata, LessonDesignExtension per materiali proposti/accettati, eventuale receipt session-linked di effettivo uso materiali e la vista Materiali della lezione.

## Prerequisiti

1. #693 deve essere Human Review PASS nella versione remediata.
2. Le fondazioni runtime Materiali (#692) e DOC-TPL-01 (#695) devono essere integrate/ricertificate nel loro ordine governato prima di eseguire questa tranche.
3. DOC-01/X5 generalizzato deve poter ospitare `ANNUAL_PROGRAMMING`.
4. DOC-04 evidence/readiness resta una dipendenza separata; questo piano non crea un bundle concorrente.

## Review Focus

- nessuna mutazione silenziosa da Materiali a Programmazione/UDA;
- nessuna Programmazione senza footprint curricolare persistito nella stessa immutable version;
- source drift/revalidation espliciti anche se cambia il footprint mantenendo lo stesso version ref;
- sessioni superseded escluse;
- `ACCEPTED` senza receipt non contato come “usato”;
- output professionale senza token tecnici.

---

### Task 1: Estendere X5 alla Programmazione annuale e pin-nare il footprint curricolare

**Files:**
- Modify: `product/src/core/domain/authored-document.ts`
- Modify: `product/src/core/domain/authored-document.test.ts`
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts`
- Modify: repository tests
- Create: migration contract test
- Create: next free migration after landed lineage

**Interfaces:**

Additively support `AuthoredDocumentKind = ANNUAL_PROGRAMMING` while preserving UDA/FINAL_REPORT behavior.

The create boundary must receive or resolve:

```ts
{
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
  curricularContext: CurriculumContextForClassV1
  curriculumCoverage: CurriculumCoverageEvaluation
  institutionalBaseVersionId: string
  templateVersionId: string
  initialTitle: string
}
```

The trusted boundary validates that `curricularContext` and `curriculumCoverage` match the same class/year/discipline and accepted command/scope, then persists a **lossless immutable curriculum footprint snapshot on the created document version**. Do not store only a document-level pointer that could be overwritten later.

Each later saved Programmazione version either:

1. inherits the exact prior footprint unchanged because its curricular basis is unchanged; or
2. explicitly adopts a newly reviewed footprint and records that exact snapshot on the new immutable version.

Identity remains one current Programmazione annuale per workspace + anno + sezione + disciplina, with immutable version history.

- [ ] RED domain tests for required class/discipline/curriculum context+coverage/base/template identity and unchanged UDA/FINAL_REPORT fixtures.
- [ ] RED persistence test: version v1 stores a complete immutable snapshot of `curricularContext` + `curriculumCoverage`.
- [ ] RED persistence test: v2 can retain v1 footprint unchanged without reading “current” Arena state during historical rendering.
- [ ] RED revalidation test: same `curriculumVersionRef` but changed requirements/sourceRefs/transition state/coverage is detected as a different footprint and cannot silently replace v1.
- [ ] RED migration/repository tests for workspace/context validation, uniqueness and immutable history.
- [ ] Implement minimally using existing X5 tables/RPC patterns; no parallel archive.
- [ ] Run focused tests + typecheck to GREEN.
- [ ] Commit.

---

### Task 2: Aggiungere il template istituzionale della Programmazione annuale

**Files:**
- Create: `product/src/core/presentation/annual-programming-canonical-template.ts`
- Create: focused test
- Modify shared renderer only if needed for generic rendering, not semantics.

**Contract:**

`ANNUAL_PROGRAMMING` defines these semantic areas:

```text
IDENTITY_CONTEXT
COMPETENCES_OBJECTIVES
CONTENT_PATHS
METHODS_TOOLS
INCLUSION_PERSONALIZATION
CIVIC_TRANSVERSAL
ASSESSMENT
RECOVERY_ENHANCEMENT
MONITORING
SIGNATURE
```

The family template inherits a pinned `InstitutionalBaseVersion`; it does not duplicate institutional header/footer/typography geometry.

- [ ] RED tests for kind/order/render roles, no invented civic-hours quota, professional labels, separate base/template pin.
- [ ] Implement with DOC-TPL-01 only.
- [ ] Run template + quality + purity/preview tests to GREEN.
- [ ] Commit.

---

### Task 3: Costruire il contesto Programmazione da curricolo + Piano annuale

**Files:**
- Create: `build-annual-programming-context.ts` + tests
- Create: `compose-annual-programming-draft.ts` + tests
- Read/reuse: `product/src/app/piano-annuale/model.ts`
- Reuse canonical curricolo applicability contract/repository.

**Interface:**

```ts
export type AnnualProgrammingContext = {
  academicYearId: string
  sectionId: string
  sectionLabel: string
  disciplineId: string
  disciplineLabel: string
  grade: 'Prima' | 'Seconda' | 'Terza'
  curricularContext: CurriculumContextForClassV1
  curriculumCoverage: CurriculumCoverageEvaluation
  canonicalPlanSource: {
    code: string
    assetId: string
    generationId: string
  }
  segments: Array<{
    uda: string
    period: string
    focus: string
    plannedHours: number
  }>
}
```

`buildAnnualProgrammingContext()` MUST:

1. resolve the applicable curricolo for workspace/anno/classe/disciplina;
2. validate and bind `CurriculumContextForClassV1` + `CurriculumCoverageEvaluation` using the canonical applicability contract;
3. fail closed when mandatory curriculum coverage is not satisfied;
4. independently resolve the canonical operational plan/projection;
5. never infer curricolo authority from `CAN-PLAN-*` constants.

The draft composer passes the exact curricolo context+coverage snapshots to Task 1 persistence. They are not discarded after composition.

- [ ] RED Tecnologia Seconda: accepted curricolo snapshot + CAN-PLAN-2 + nine segments/66 planned hours.
- [ ] RED: CAN-PLAN exists but curricolo applicability missing/unsatisfied → fail closed.
- [ ] RED: provisional baseline retains `requiresRevalidationOnApproval` and its exact requirements/source refs.
- [ ] RED: two snapshots with equal `curriculumVersionRef` but different requirements/coverage compare as materially different and require explicit revalidation.
- [ ] Implement pure/read-only adapters; no source-domain writes.
- [ ] Draft tests: facts prefilled; professional judgements remain missing teacher inputs; no technical refs in body.
- [ ] Run focused tests + typecheck to GREEN.
- [ ] Commit.

---

### Task 4: Superficie docente Programmazione annuale

**Files:**
- Create route/editor/model/actions under `product/src/app/documentazione/programmazioni/[sectionId]/`
- Modify `/documentazione` entry only.

**Behavior:**

- absent → `Prepara bozza`;
- existing draft → `Continua`;
- known context inherited;
- current document version can expose internal “Da dove viene?” data from its persisted curricolo footprint;
- if a newly resolved curricolo footprint differs from the one pinned to the current document version, show explicit comparison/revalidation rather than auto-updating;
- ordinary UI hides technical curriculum/template/base IDs.

- [ ] RED one-primary-action/no-navigation-write tests.
- [ ] RED exact-footprint pin and revalidation comparison tests.
- [ ] Implement with X5 structured versions.
- [ ] Run focused tests + typecheck + build.
- [ ] Commit.

---

### Task 5: Collegare Programmazione/UDA alla lezione preservando Materiali

**Files:**
- Create: `resolve-programming-lesson-context.ts` + tests
- Modify existing Progetta/UDA UI only if contextual entry is required.

**Interface:**

```ts
export type ProgrammingLessonContext = {
  sectionId: string
  disciplineId: string
  udaId: string
  blockId: string | null
  curriculumContextId: string
  curriculumVersionRef: CmlCanonicalRef
  canonicalPlanAssetId: string
  canonicalGenerationId: string
}
```

- [ ] RED: UDA/block belong to selected annual context and generation; curricolo context/version preserved; mismatches fail closed; no student data.
- [ ] Implement resolver only; no lesson/calendar/material/Planner creation.
- [ ] Re-run Atlas handoff contracts unchanged.
- [ ] Commit.

---

### Task 6: Costruire evidenze consuntive senza confondere “accettato” e “usato”

**Files:**
- Create: `build-program-execution-evidence.ts` + tests
- Reuse TeachingSession/TeachingEvidence/LessonDesignExtension.
- Reuse or introduce only at governed session boundary an explicit material-use receipt/read model; do not infer usage from `ACCEPTED`.

**Internal types:**

```ts
export type PlannedMaterialRef = {
  lessonExtensionId: string
  sourceKind: string
  sourceRef: string | null
  title: string
}

export type MaterialUsageReceipt = {
  teachingSessionId: string
  lessonExtensionId: string
  used: true
  recordedAt: string
}

export type ProgramExecutionEvidenceItem = {
  udaId: string
  blockId: string
  teachingSessionId: string
  localDate: string
  allocatedMinutes: number
  availableMaterials: PlannedMaterialRef[]
  usedMaterials: PlannedMaterialRef[]
}
```

Rules:

- `availableMaterials` may include current `ACCEPTED` extensions;
- `usedMaterials` requires matching explicit receipt for the same current TeachingSession + extension;
- no receipt → never claim used;
- receipt on superseded session → ignored;
- proposed/dismissed resource cannot become used;
- unallocated minutes stay unallocated.

- [ ] RED accepted-without-receipt = available but not used.
- [ ] RED current-session receipt promotes only matching accepted resource to used.
- [ ] RED superseded/mismatched/proposed/dismissed cases do not count.
- [ ] Implement read-only evidence builder and reuse DOC-04 evidence adapter.
- [ ] Run domain regression tests.
- [ ] Commit.

---

### Task 7: Certificare la verticale Tecnologia end-to-end

**Fixture:**

```text
curricolo applicabile Tecnologia Seconda
→ persisted exact curricular footprint on Programmazione v1
→ CAN-PLAN-2 operational projection
→ UDA 2-01
→ canonical lesson/block
→ Atlas material ACCEPTED (available only)
→ explicit current TeachingSession material-use receipt
→ TeachingSession allocation
→ ProgramExecutionEvidence
→ factual input to Programma svolto / Relazione finale
```

**Negative assertions:**

- no student data in Atlas context;
- no automatic Programmazione/UDA/Piano annuale/Calendario write;
- no curricolo inferred from CAN-PLAN alone;
- same version ref with changed accepted footprint triggers revalidation and does not mutate historical version;
- no duplicate evidence from superseded sessions;
- accepted material without receipt is not “used”;
- no technical code in professional output.

- [ ] Run focused integration tests.
- [ ] Run full `npm test`, typecheck, lint, build.
- [ ] Run exact-head Product/Browser/Design/WCAG/Human Interaction/HVA/security gates as selected.
- [ ] Human Review desktop/mobile of Programmazione → UDA/lezione → Atlas/materiali → evidenze → consuntivi.
- [ ] No merge before Human Review PASS.

## Self-Review

- **Authority:** curricolo, Piano annuale, X5, template engine, TeachingSession and Materiali retain distinct responsibilities.
- **Persistence:** every immutable Programmazione version contains the exact accepted curricolo context+coverage footprint used to compose it; historical comparison never depends on current Arena state alone.
- **Revalidation:** equal `curriculumVersionRef` does not suppress revalidation when requirements/source refs/transition/coverage changed.
- **Materiali:** `ACCEPTED` means available; only session-linked receipt means used.
- **Privacy/output:** no student data is added to Atlas and technical provenance stays internal.
