# DOCENTE OS — AILit Framework Adoption Note v1

Status: PROPOSED / ARCHITECTURE-ONLY
Date: 2026-08-29
Source basis: OECD / European Union, *Preparare gli studenti all'era dell'IA — AILit Framework* (2026), Italian edition supplied for analysis.

## 1. Decision

DOCENTE OS must not introduce a separate AILit storage or curriculum subsystem.

AILit enters DOCENTE OS through the existing Knowledge Base pipeline:

`ORIGINAL SOURCE -> KNOWLEDGE ASSET -> PROCESSING GENERATION -> NORMALIZED DOCUMENT -> KNOWLEDGE UNITS -> RELATIONS -> OPERATIONAL USE`

The original AILit document remains the authoritative source artifact. Every extracted structure is derivative, versioned and reviewable.

## 2. Authority

AILit is represented as:

`EXTERNAL_REFERENCE`

It is not automatically:

- a national prescriptive requirement;
- an institutional curriculum requirement;
- a teacher planning obligation;
- evidence that a student has achieved a competence.

If CurManLight Arena later exports an explicit institutionally adopted AILit alignment, DOCENTE OS may receive it as a planning constraint through the existing interoperability boundary. The source of that authority remains Arena's human-confirmed institutional decision.

## 3. Knowledge Base extension

Use existing entities (`KnowledgeAsset`, `KnowledgeProcessingGeneration`, `KnowledgeDocument`, `KnowledgeUnit`, `KnowledgeLink`).

Add the professional category:

`REFERENCE_FRAMEWORK`

Recommended typed knowledge-unit semantics:

- `FRAMEWORK_PROCESS`
- `FRAMEWORK_KNOWLEDGE`
- `FRAMEWORK_SKILL`
- `FRAMEWORK_ATTITUDE`
- `FRAMEWORK_COMPETENCY`
- `FRAMEWORK_EXPECTATION`
- `FRAMEWORK_SCENARIO`
- `ETHICAL_PRINCIPLE`

These are semantic subtypes/structured extraction metadata, not a replacement for the generic KnowledgeUnit model.

Every AILit-derived unit must retain:

- source asset;
- source processing generation;
- source page or source locator when available;
- framework/version identity;
- parent/relationship structure;
- extraction validation state (`AUTO`, `REVIEWED`, `REJECTED`);
- reliability state.

## 4. Preserve source semantics

The AILit structure must not be flattened into one list of AI competences.

Preserve at least:

- Interacting with AI;
- Creating with AI;
- Managing AI;
- Shaping AI;
- knowledge;
- skills;
- attitudes;
- competencies;
- progression/learner expectations;
- classroom scenarios;
- transversal ethical principles.

Progression is not treated as a rigid class/age mapping.

## 5. Conoscenza

AILit should appear in Conoscenza as a professional reference framework with filters for:

- framework;
- process/domain;
- competence;
- knowledge/skill/attitude;
- ethical principle;
- progression level;
- reviewed/unreviewed extraction;
- linked discipline/class/UDA where a human or approved interoperability mapping exists.

Search may answer questions such as:

- which AILit elements relate to source verification;
- which address privacy, bias or sustainability;
- which are linked to a given UDA;
- which proposed mappings still require human review.

Search results must distinguish source-supported facts from inferred relationships.

## 6. Progetta / Piano annuale

AILit is an optional planning dimension unless Arena provides an institutionally required alignment.

Recommended statuses:

- `ADVISORY`;
- `INSTITUTIONALLY_REQUIRED`;
- `NOT_APPLICABLE`.

For `ADVISORY` mappings the teacher may:

- accept;
- modify;
- reject;
- leave unselected.

No advisory alignment may silently contribute to mandatory curriculum coverage.

## 7. AI collaboration

The existing AI Collaboration Canonical Spec already establishes the correct authority boundary: AI is contextual, propositional, verifiable and subordinate to the teacher.

For AILit, AI may:

- find candidate relationships between an UDA/activity and AILit elements;
- explain the rationale;
- propose learning activities;
- identify missing evidence;
- compare an AI output against sources;
- suggest reflection prompts about privacy, bias, attribution, environmental impact or human agency.

AI may not:

- mark the alignment as authoritative;
- mark a competence as achieved;
- convert a reference element into a mandatory requirement;
- overwrite teacher-authored planning;
- treat use of an AI tool as sufficient evidence of AI literacy.

## 8. Evidence model

DOCENTE OS should record operational evidence only after explicit teacher confirmation.

Examples:

- students checked AI output against reliable sources;
- students justified accepting, modifying or rejecting AI output;
- an activity explicitly addressed bias/privacy/sustainability;
- the teacher found a proposed alignment pedagogically inappropriate;
- a planned AILit element was actually observable in classroom work.

Evidence must link to the exact teacher-owned plan/UDA/activity and the exact reference-framework element.

Where sent back to Arena, it is `CURRICULUM_ALIGNMENT_EVIDENCE` / external-framework evidence for human review, never a canonical curriculum mutation.

## 9. Human Task behaviour

For an AILit suggestion, the UI should preserve the sequence:

1. what was found;
2. source/provenance;
3. proposed alignment;
4. why it may fit;
5. what changes if accepted;
6. teacher decision.

If evidence or applicability is insufficient, the state is `TO_VERIFY`, not an implicit acceptance.

## 10. Implementation slices

### DAILIT-0 — Source intake

- ingest the supplied AILit PDF through the existing KB pipeline;
- classify as `REFERENCE_FRAMEWORK`;
- preserve original hash/version/provenance;
- no planning side effects.

### DAILIT-1 — Typed extraction

- produce framework/process/competence/expectation/scenario units;
- preserve page provenance;
- expose review state;
- test reprocessing generation safety.

### DAILIT-2 — Knowledge UX

- add framework filters and structured display in Conoscenza;
- show original source and extraction provenance;
- keep search usable if AI provider is disabled.

### DAILIT-3 — Planning use

- allow advisory AILit links in Progetta/Piano annuale/UDA;
- keep them distinct from mandatory Arena curriculum coverage;
- require explicit teacher acceptance for persisted links.

### DAILIT-4 — Arena handoff

- consume versioned external-framework alignments from Arena;
- distinguish `ADVISORY` from `INSTITUTIONALLY_REQUIRED`;
- preserve existing plan and require revalidation if authority changes.

### DAILIT-5 — Operational evidence

- capture teacher-confirmed evidence;
- export only professional/non-personal evidence;
- preserve source and decision provenance.

## 11. Acceptance criteria

1. The supplied PDF remains immutable and retrievable as the original source.
2. Reprocessing cannot replace a successful current generation with a failed one.
3. AILit extraction remains derivative and reviewable.
4. AILit advisory content cannot satisfy mandatory curriculum coverage.
5. AI cannot create institutional authority.
6. Teacher acceptance/modification/rejection is always available for planning proposals.
7. Progression is not inferred solely from grade/age.
8. Operational evidence is teacher-confirmed and traceable.
9. Interoperability does not require shared persistence or student personal data.
10. DOCENTE OS remains fully usable if the AI provider is unavailable.

## 12. Decision summary

AILit is the first concrete instance of a reusable `External Reference Framework` capability in DOCENTE OS.

The correct implementation extends the Knowledge Base, planning-link and interoperability contracts already present. It does not add a new AILit module, new authority model or parallel curriculum engine.
