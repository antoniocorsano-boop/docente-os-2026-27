# DOC-MAT-INT-01 — Integrazione Documenti ↔ Materiali, verticale Tecnologia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collegare senza riscritture Documenti e Materiali attraverso la prima verticale reale Tecnologia: curricolo applicabile → Programmazione annuale → UDA → lezione → materiali → evidenze → Programma svolto / Relazione finale.

**Architecture:** Riusa le authority esistenti invece di crearne di parallele. Il curricolo applicabile resta governato dal contratto curricolare canonico; il Piano annuale resta proiezione operativa; X5 resta identità/version history dei documenti; DOC-TPL-01 governa base istituzionale + template di famiglia; TeachingSession/evidenze governano ciò che è effettivamente accaduto. Un materiale `ACCEPTED` è disponibile/pianificato, non automaticamente “usato”.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS/RPC, Node `tsx --test`, X5 authored documents, DOC-TPL-01, `CurriculumContextForClassV1`, TeachingSession/TeachingEvidence/LessonDesignExtension.

**Spec:** `docs/superpowers/specs/2026-10-07-documenti-materiali-boundary-design.md`

## Global Constraints

- Il **curricolo applicabile** è una authority distinta dal Piano annuale. `product/src/app/piano-annuale/model.ts` è proiezione operativa, non sorgente curricolare autonoma.
- La Programmazione annuale deve pin-nare l’identità/versione del curricolo applicabile usato, il relativo authority state e l’eventuale requisito di revalidation.
- `PROVISIONAL_BASELINE` e `APPROVED_INSTITUTIONAL` non sono equivalenti: il documento conserva lo stato realmente usato; un successivo passaggio a una versione approvata può richiedere revalidation esplicita, mai riscrittura silenziosa.
- Non creare un secondo archivio documentale: X5 `authored_documents` / versioni resta l’unica identità/version history.
- Non creare un secondo motore template: DOC-TPL-01 governa `InstitutionalBaseVersion` + family `DocumentTemplateVersion`.
- La lezione è il principale punto operativo di raccordo fra progettazione e materiali.
- Studio Atlas e Materiali non modificano automaticamente Programmazione annuale, UDA, Piano annuale o Calendario.
- `LessonDesignExtension.status = ACCEPTED` significa **disponibile/accettato per la lezione**, non prova che il materiale sia stato effettivamente utilizzato.
- Un materiale è classificabile come **usato** nei documenti consuntivi solo se esiste evidenza/receipt esplicita legata a una TeachingSession corrente e al materiale specifico.
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

Riutilizzare il contratto curricolare già presente, inclusi almeno:

```text
CurriculumContextForClassV1
curriculumVersionRef
authority = PROVISIONAL_BASELINE | APPROVED_INSTITUTIONAL
structuralFootprint
coverageFootprint
requiresRevalidationOnApproval
```

Non duplicare questi concetti in costanti del Piano annuale.

### Domini operativi

Riutilizzare:

- TeachingSession corrente e sue allocazioni;
- TeachingEvidence aggregata;
- LessonDesignExtension per materiali proposti/accettati;
- eventuale receipt/evidenza session-linked di effettivo uso materiali;
- vista Materiali della lezione.

## Prerequisiti

1. #693 deve essere Human Review PASS nella sua versione remediata.
2. Le fondazioni runtime Materiali (#692) e DOC-TPL-01 (#695) devono essere integrate/ricertificate nel loro ordine governato prima di eseguire questa tranche.
3. DOC-01/X5 generalizzato deve poter ospitare `ANNUAL_PROGRAMMING`.
4. DOC-04 evidence/readiness resta una dipendenza separata; questo piano non crea un bundle concorrente.

## Review Focus

- nessuna mutazione silenziosa da Materiali a Programmazione/UDA;
- nessuna Programmazione senza pin del curricolo applicabile;
- source drift/revalidation sempre espliciti;
- sessioni superseded escluse;
- `ACCEPTED` senza receipt non contato come “usato”;
- output professionale senza token tecnici.

---

### Task 1: Estendere X5 alla Programmazione annuale

**Files:**
- Modify: `product/src/core/domain/authored-document.ts`
- Modify: `product/src/core/domain/authored-document.test.ts`
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts`
- Modify: repository tests
- Create: migration contract test
- Create: next free migration after landed lineage

**Interfaces:**

Additively support `AuthoredDocumentKind = ANNUAL_PROGRAMMING` while preserving UDA/FINAL_REPORT behavior.

The open/create boundary must receive or resolve:

```ts
{
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
  curriculumVersionRef: string
  curriculumAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
  curriculumRequiresRevalidation: boolean
  institutionalBaseVersionId: string
  templateVersionId: string
  initialTitle: string
}
```

Identity: one current Programmazione annuale per workspace + anno + sezione + disciplina, with immutable versions.

- [ ] RED domain tests for required class/discipline/curricolo/base/template identity and unchanged UDA/FINAL_REPORT fixtures.
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

`ANNUAL_PROGRAMMING` defines these semantic areas in professional order:

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
- Create: `product/src/core/application/documentation/build-annual-programming-context.ts`
- Create: focused tests
- Create: `compose-annual-programming-draft.ts`
- Create: focused tests
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
  curriculum: {
    curriculumVersionRef: string
    authority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
    structuralFootprint: unknown
    coverageFootprint: unknown
    requiresRevalidationOnApproval: boolean
  }
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

1. resolve the applicable curricolo for institution/workspace, academic year, class/section and discipline;
2. fail closed if no applicable baseline can be identified;
3. retain its exact version/authority/footprints/revalidation semantics;
4. independently resolve the canonical operational plan/projection;
5. never infer curricolo authority from `CAN-PLAN-*` constants.

For a provisional baseline, the created document is valid only with the stored provisional authority and revalidation obligation; later institutional approval triggers explicit revalidation comparison, not silent replacement.

- [ ] RED tests using Tecnologia Seconda: applicable curricolo bound + CAN-PLAN-2 operational projection + nine canonical segments/66 planned hours.
- [ ] RED negative test: CAN-PLAN exists but curricolo applicability missing → fail closed.
- [ ] RED revalidation test: provisional baseline stores `requiresRevalidationOnApproval` rather than masquerading as approved.
- [ ] Implement pure/read-only adapters; no source-domain writes.
- [ ] Draft-composition tests: known facts prefilled, professional judgements remain missing teacher inputs, no technical refs in body.
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
- known context is inherited;
- current curricolo authority/version is internally inspectable;
- if source curricolo changed or provisional→approved transition requires revalidation, show an explicit comparison/revalidation state rather than auto-updating;
- ordinary UI hides technical template/base IDs.

- [ ] RED model/action tests for one primary action, no document creation on navigation, curriculum/base/template pins and revalidation state.
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
  curriculumVersionRef: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
}
```

- [ ] RED tests: UDA belongs to selected annual context; block belongs to same generation; curricolo version is preserved; unknown/mismatched context fails closed; no student data.
- [ ] Implement resolver only; no creation of lesson/calendar/material/Planner records.
- [ ] Re-run Atlas handoff contracts unchanged.
- [ ] Commit.

---

### Task 6: Costruire evidenze consuntive senza confondere “accettato” e “usato”

**Files:**
- Create: `build-program-execution-evidence.ts`
- Create: focused tests
- Reuse TeachingSession/TeachingEvidence/LessonDesignExtension.
- Reuse or introduce only at the governed session boundary an explicit material-use receipt/read model; do not infer usage from `ACCEPTED`.

**Internal evidence types:**

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

**Rules:**

- `availableMaterials` may include current `ACCEPTED` lesson extensions;
- `usedMaterials` includes an extension only if a matching explicit receipt exists for the same current TeachingSession and extension;
- no receipt → never claim “used”;
- receipt bound to superseded/non-current session → ignored;
- a receipt cannot turn proposed/dismissed material into used material;
- Atlas references remain evidence refs, not copied content;
- unallocated minutes are reported, not assigned silently.

- [ ] RED: accepted material without receipt appears available but **not used**.
- [ ] RED: matching current-session receipt promotes it to `usedMaterials`.
- [ ] RED: superseded-session receipt, mismatched extension/session, proposed/dismissed material do not count as used.
- [ ] RED: currentTeachingSessions semantics prevent duplicate execution evidence.
- [ ] Implement read-only evidence builder.
- [ ] Connect only through the existing DOC-04 evidence adapter; no competing final-report bundle.
- [ ] Run source-domain regression tests.
- [ ] Commit.

---

### Task 7: Certificare la verticale Tecnologia end-to-end

**Files:**
- Create: `technology-document-material-flow.test.ts`
- Modify `product/package.json` only to include required tests if suite remains explicitly enumerated.

**Fixture:**

```text
curricolo applicabile Tecnologia Seconda
→ Programmazione annuale pinned to curriculumVersionRef
→ CAN-PLAN-2 operational projection
→ UDA 2-01 Agricoltura, suolo e produzioni sostenibili
→ canonical lesson/block
→ Atlas material ACCEPTED (available only)
→ explicit TeachingSession material-use receipt
→ recorded TeachingSession allocation
→ ProgramExecutionEvidence
→ factual input to Programma svolto / Relazione finale
```

**Negative assertions:**

- no student data in Atlas context;
- no automatic Programmazione/UDA/Piano annuale/Calendario write after material association;
- no curricolo inferred from CAN-PLAN alone;
- provisional curricolo revalidation is not silently cleared;
- no duplicate evidence from superseded sessions;
- accepted material without receipt is not reported as used;
- no unaccepted/dismissed material reported as used;
- no technical code in professional draft/preview.

- [ ] Write integration RED/fixture and verify focused behavior.
- [ ] Run full `npm test`, typecheck, lint, build.
- [ ] Run repository exact-head Product/Browser/Design/WCAG/Human Interaction/HVA/security gates as selected.
- [ ] Human Review desktop/mobile of Programmazione → UDA/lezione → Atlas/materiali → evidenze → consuntivi.
- [ ] No merge before Human Review PASS.

## Self-Review

- **Authority:** curricolo, Piano annuale, X5, template engine, TeachingSession and Materiali retain distinct responsibilities.
- **Curricolo:** every Programmazione annuale has an applicable curricolo identity/version/authority and revalidation semantics; CAN-PLAN is not curricolo authority.
- **Materiali:** `ACCEPTED` means available; only session-linked receipt means used.
- **Preservation:** #692/#695 are reused after governed integration, not reimplemented.
- **Privacy:** no student data is added to Atlas or professional output.
- **Output purity:** technical IDs remain internal.
