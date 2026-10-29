# Textbook Alignment Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a governed, read-only textbook provenance layer that connects the 25 canonical Tecnologia UDA to the adopted `Tecnologia.verde` + Disegno configuration without changing curriculum authority, UDA identity, hours or annual sequencing.

**Architecture:** Keep Arena/Atlas as curriculum authority and DOCENTE OS as planning/UDA authority. Represent the textbook as an explicit support/provenance relation with verification state. Initial runtime work is read-only and fail-closed: unverified chapters/pages are never presented as exact facts.

**Tech Stack:** TypeScript, Next.js product layer, Node test runner/current repository test conventions, existing Human Task source/provenance model.

**Spec:** `docs/superpowers/specs/2026-10-29-textbook-alignment-map-design.md`

## Global Constraints

- Adopted textbook identity: `Tecnologia.verde`, seconda edizione, Tecnologia + Disegno, ISBN `9788808950758`.
- The adopted ISBN must not be treated as including the separate Informatica volume.
- Arena/Atlas remains curriculum authority.
- DOCENTE OS remains authority for canonical programming, UDA identity, hours and sequence.
- Textbook alignment is support/provenance only.
- Exact chapter/page claims require verified evidence; unknown values remain absent/`TO_VERIFY`.
- No copyrighted textbook body text is copied into code or repository documentation.
- No UDA rewrite or CAN-PLAN resequencing is part of this plan.

## Review Focus

1. A `TO_VERIFY` record must never render an exact page/chapter as if verified.
2. A textbook record must not alter UDA title, hours, sequence or curriculum reference.
3. ISBN `9788808950758` must not imply access to Informatica coverage.
4. Multi-section UDA must support composed bindings without forcing one primary chapter.
5. Section/class adaptations must continue to reference the canonical UDA identity rather than clone it.

---

### Task 1: Domain contract and validation

**Files:**
- Create: `product/src/core/domain/textbook-alignment.ts`
- Create: `product/src/core/domain/textbook-alignment.test.ts`

**Interfaces:**
- Produces: `TextbookAlignment`, `TextbookAlignmentEvidenceLevel`, `TextbookAlignmentRelation`, `validateTextbookAlignment()`.
- Consumes: canonical UDA codes as strings; no provider SDK types.

- [ ] **Step 1: Write failing domain tests**

Pin these behaviors:

- valid `VERIFIED_PAGE` requires a page range;
- `TO_VERIFY` cannot carry an authoritative exact page claim;
- `coverage='PARTIAL'` is valid for digital gaps;
- adopted ISBN identity is explicit;
- no field exists that can mutate canonical UDA hours/title/sequence.

- [ ] **Step 2: Run the focused domain test and verify RED**

Run the repository's current Node test command for `product/src/core/domain/textbook-alignment.test.ts`.

Expected: FAIL because the contract does not yet exist.

- [ ] **Step 3: Implement the minimal domain contract**

Implement pure TypeScript types plus `validateTextbookAlignment(input: TextbookAlignment): TextbookAlignmentValidationResult`.

- [ ] **Step 4: Run the focused domain test and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Commit**

`feat(textbook): add governed alignment domain contract`

### Task 2: Canonical read-only catalog for the 25 UDA

**Files:**
- Create: `product/src/core/application/textbook-alignment-catalog.ts`
- Create: `product/src/core/application/textbook-alignment-catalog.test.ts`

**Interfaces:**
- Consumes: `TextbookAlignment` from Task 1.
- Produces: `getTextbookAlignmentsForUda(udaCode)` and `getTextbookAlignmentCoverageSummary()`.

- [ ] **Step 1: Write failing catalog tests**

Assert:

- all 25 canonical UDA appear exactly once in the coverage summary;
- 13 are `DIRECT_CANDIDATE`, 9 `COMPOSED_CANDIDATE`, 2 `PARTIAL_GAP`, 1 `STRUCTURAL_GAP` at the v0.1 evidence boundary;
- `CAN-UDA-3-07` is the structural gap;
- `CAN-UDA-1-06` and `CAN-UDA-2-08` are partial gaps;
- only the already verified sustainability page ranges can be returned as `VERIFIED_PAGE` at this stage.

- [ ] **Step 2: Run focused test and verify RED**

Expected: FAIL because the catalog does not exist.

- [ ] **Step 3: Implement the minimal read-only catalog**

Transcribe only the normalized metadata from `docs/architecture/TEXTBOOK_ALIGNMENT_MAP.md`; do not copy textbook body text.

- [ ] **Step 4: Run focused test and verify GREEN**

Expected: PASS with all 25 UDA accounted for.

- [ ] **Step 5: Commit**

`feat(textbook): add canonical read-only UDA alignment catalog`

### Task 3: Human Task provenance integration without behavior change

**Files:**
- Modify: `product/src/core/presentation/human-task-content.ts` or the current focused source/provenance module selected after exact baseline inspection.
- Create/modify: focused Human Task provenance tests alongside the existing source-binding tests.

**Interfaces:**
- Consumes: `getTextbookAlignmentsForUda(udaCode)`.
- Produces: an optional textbook support/provenance presentation model; it must not enter canonical authority calculation.

- [ ] **Step 1: Write failing provenance tests**

Pin:

- existing PLAN/UDA/PACK source order and authority remain unchanged;
- verified textbook support can be displayed as secondary provenance;
- `TO_VERIFY` remains generic and never fabricates page/chapter copy;
- structural/partial gaps produce an explanatory support state rather than disappearance or invented coverage.

- [ ] **Step 2: Run focused test and verify RED**

Expected: FAIL because textbook provenance is not exposed.

- [ ] **Step 3: Implement the minimal read-only projection**

Do not modify lesson timing, objective, activities, evidence, assessment or continuation.

- [ ] **Step 4: Run focused tests and existing Human Task regression suite**

Expected: all PASS.

- [ ] **Step 5: Commit**

`feat(textbook): expose textbook support provenance in human task`

### Task 4: Progetta read-only alignment surface

**Files:**
- Modify the smallest current Progetta/UDA detail component after exact baseline inspection.
- Add focused presentation/browser tests following repository conventions.

**Interfaces:**
- Consumes: textbook alignment presentation from Tasks 2–3.
- Produces: progressive-disclosure UI: source label, verification state, section/chapter/page only when supported.

- [ ] **Step 1: Write failing presentation/browser tests**

Assert:

- textbook support is not in the first visual priority above curriculum/UDA identity;
- verified page range can be revealed for the sustainability subset;
- `TO_VERIFY` shows no fabricated number;
- Informatica gap is explicit for `CAN-UDA-3-07`;
- mobile layout remains usable.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement minimal progressive-disclosure UI**

Use teacher-facing language such as `Supporto dal libro adottato`, not internal taxonomy labels.

- [ ] **Step 4: Run product tests, typecheck/build and browser qualification**

Expected: PASS.

- [ ] **Step 5: Commit**

`feat(textbook): surface verified textbook support in progetta`

### Task 5: Exact chapter/page verification tranche

**Files:**
- Modify: `docs/architecture/TEXTBOOK_ALIGNMENT_MAP.md`
- Modify: `product/src/core/application/textbook-alignment-catalog.ts`
- Add/update focused catalog tests.

**Interfaces:**
- Consumes: teacher-verified physical/ebook index and teacher guide references.
- Produces: promoted `VERIFIED_PAGE`/`VERIFIED_SECTION` bindings without altering UDA authority.

- [ ] **Step 1: Verify Prima 1-00…1-07 against the adopted physical/ebook index**

Promote only confirmed chapter/page ranges.

- [ ] **Step 2: Run catalog tests**

Expected: PASS; no `TO_VERIFY` field is silently converted.

- [ ] **Step 3: Repeat for Seconda**

Cover section B/C plus Disegno mappings.

- [ ] **Step 4: Repeat for Terza**

Cover section D/E plus Disegno mappings and keep Informatica gap explicit.

- [ ] **Step 5: Commit each level as an independently reviewable evidence update**

Suggested messages:

- `docs(textbook): verify class-one textbook bindings`
- `docs(textbook): verify class-two textbook bindings`
- `docs(textbook): verify class-three textbook bindings`

### Task 6: Qualification and integration boundary

**Files:** no intended product changes beyond Tasks 1–5.

- [ ] **Step 1: Run complete relevant product/domain tests**
- [ ] **Step 2: Run typecheck and production build**
- [ ] **Step 3: Run selected Human Task/browser gates**
- [ ] **Step 4: Exact-diff review for authority drift, fabricated textbook precision and copyright leakage**
- [ ] **Step 5: Freeze exact candidate SHA and publish qualification evidence**

No merge or deploy occurs without a separate human integration decision.
