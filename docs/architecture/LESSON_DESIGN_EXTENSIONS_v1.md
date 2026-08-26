# DOCENTE OS — Lesson Design Extensions v1

Status: FOUNDATION / HUMAN-AUTHORITY BOUNDARY

## Purpose

DOCENTE OS already owns a canonical Lesson Workspace at:

`/classi/<sectionId>/lezioni/<blockId>`

with the human flow:

`Prepara → In classe → Osserva → Registra`.

This contract extends that existing workspace. It does **not** introduce a parallel lesson editor and it does not move concrete lesson execution back into the generic `Progetta` catalogue.

## Canonical boundary

The Human Task `HumanTaskLessonProjection` remains the canonical instructional projection of the annual-plan block/UDA/pack.

Lesson design tools may add a section-specific layer, but they MUST NOT rewrite:

- canonical `projection.steps`;
- UDA identity;
- annual-plan Bxx identity;
- canonical source asset or successful generation;
- curriculum authority.

The effective classroom sequence is therefore:

`CANONICAL PROJECTION + HUMAN-ACCEPTED LESSON EXTENSIONS`.

## Lesson extension lifecycle

Every tool-generated or system-generated addition begins as:

`PROPOSED`.

A proposal can enter the effective lesson only after an explicit teacher action:

`PROPOSED → ACCEPTED`.

Direct accepted inserts are rejected in storage. Direct authenticated UPDATE is revoked; acceptance passes through `accept_lesson_design_extension(...)`.

Accepted additions can be removed from the lesson layer without deleting or changing the canonical projection or the original Knowledge source.

## Supported extension kinds

Sequence additions:

- `HOOK_QUOTE` — brief quotation/stimulus;
- `HOOK_EVENT` — current or local real-world event;
- `HOOK_VIDEO` — short introductory video/micro-video;
- `HOOK_QUESTION` — activation question;
- `FORMATIVE_CHECK` — brief formative check.

Resource additions:

- `TEACHER_RESOURCE` — material reserved for teacher use;
- `STUDENT_RESOURCE` — material explicitly approved for student use.

A resource attachment is not transformed into a fake lesson step. Sequence additions and resources remain semantically distinct.

## Placement

Accepted sequence extensions may be placed:

- at lesson start;
- immediately before a canonical step;
- immediately after a canonical step;
- at lesson end.

Anchored additions store the canonical step id. If that step no longer exists in the current projection, DOCENTE OS fails closed: the addition is preserved but omitted from the effective sequence and requires teacher review. The system MUST NOT silently move it to a different step.

## Provenance

Every extension carries a source kind and optional source reference/label:

- `EDITORIAL_KNOWLEDGE`;
- `KNOWLEDGE`;
- `WEB`;
- `AI_TOOL`;
- `TEACHER`.

This contract intentionally separates provenance from authority. A web result, an AI-produced micro-video or an editorial suggestion can be useful source material but cannot become accepted teaching sequence content without the teacher.

## Current v1 tools

### Knowledge attachment

The first operational tool reuses the existing Knowledge Base.

In `Prepara`, DOCENTE OS derives up to four Knowledge resources explicitly pertinent to the current grade/section/Bxx/UDA/pack. The teacher may inspect a resource and choose **Aggiungi alla lezione**.

That explicit click creates the extension proposal and immediately crosses the human acceptance boundary because the teacher is selecting the exact already-visible resource. Tool-generated proposals that have not been individually selected MUST NOT use this shortcut.

The attached source remains in Knowledge. The lesson stores only a binding/provenance layer.

### Local activation-question proposal

The first sequence-design tool is `LESSON_ACTIVATION_QUESTION_V1`.

It is deliberately local and deterministic. It reads only the current canonical lesson projection already resolved by DOCENTE OS, using the lesson title and objective as grounding. It does not call an LLM, news source, video provider or any other external service.

The tool creates a `HOOK_QUESTION` extension with:

- status `PROPOSED` through the existing repository boundary;
- placement `START`;
- explicit provenance `EDITORIAL_KNOWLEDGE` with `projection:<projectionId>` as source reference;
- payload markers `toolId`, `dedupeKey` and `executionKind = LOCAL_DETERMINISTIC`;
- grounding to the current Bxx/projection/title/objective;
- no direct acceptance.

The proposal appears in **Da controllare**. Only the existing explicit teacher action **Aggiungi alla lezione** may cross `PROPOSED → ACCEPTED` and make the question part of `In classe`.

The mutation path resolves the lesson through `resolveRuntimeHumanTaskLessonProjection`, the same runtime resolver used by the Lesson Workspace page. Runtime-only lesson projections therefore use the same stale-projection guard as the rendered page rather than falling back to the legacy projection map.

Tool deduplication is enforced at the persistence boundary, not by a read-before-write UI check. Migration `0038_lesson_design_tool_deduplication.sql` adds a partial UNIQUE index over the full canonical lesson context plus `payload.dedupeKey`. Concurrent submissions therefore converge on one stored proposal: the winning insert creates the row and a conflicting request retrieves that same row after PostgreSQL returns `23505`.

Removing the stored proposal makes the tool available again. If the canonical projection changes, the normal lesson-context guard requires a reload before a new mutation.

This tool is intentionally a proof of the full proposal lifecycle before connecting richer adapters. It establishes that a lesson-design tool can be useful without weakening human authority or pretending that an external provider exists.

## Planned editorial knowledge integration

The teacher guide and textbook ecosystem will feed this same boundary rather than introduce a separate lesson model.

The teacher guide may become the preferred root of **didactic/editorial disciplinary knowledge**, while curriculum and institutional documents remain normative authority.

Future editorial adapters should be able to propose:

- explanations and examples for the teacher;
- student-appropriate material;
- lesson-opening hooks;
- formative checks;
- stylistic/linguistic models;
- references to textbook pages or publisher resources.

Teacher-only guide content and student-usable material MUST remain explicitly separated.

## Planned hook tools

Future hook builders should use the existing `PROPOSED → ACCEPTED` extension lifecycle.

A hook tool may propose:

1. a short relevant quotation, with attribution/provenance;
2. a verified current or local event, with source and date;
3. a brief micro-video or storyboard generated/assembled through an approved tool adapter;
4. further activation-question variants grounded in approved editorial knowledge.

No provider is made canonical by this v1 foundation. The current contextual assistant in DOCENTE OS is a local/deterministic contextual responder; this tranche does not pretend that an external generative-video or news provider is already connected.

## Time model

The canonical lesson duration remains visible as authored by the Human Task projection.

Accepted sequence extensions may carry their own optional minutes. The UI reports those minutes separately as added time. DOCENTE OS MUST NOT silently rewrite the canonical duration to conceal the adaptation.

## Knowledge and copyright boundary

Attaching a Knowledge resource to a lesson does not republish it to students.

Teacher resources remain teacher-side by default. A future student material flow must explicitly mark `STUDENT_RESOURCE` and must respect source rights, licensing and copyright constraints. Long protected editorial passages are not automatically redistributed through student-facing surfaces.

## Student feedback boundary

The existing `experience_feedback` flow is authenticated product-experience feedback from the teacher. It is not the future anonymous classroom feedback system.

Anonymous student self-assessment/lesson/UDA feedback will be a separate subsystem, later connected to `Osserva`/`Registra` through a teacher-opened session and short code/QR. It must not reuse teacher identity or individual student accounts.

## Acceptance criteria v1

- Lesson Workspace remains the only concrete lesson work surface.
- Canonical Human Task projection is never modified by lesson tools.
- Tool/system additions are stored as `PROPOSED`.
- Only explicit teacher acceptance makes an addition effective in `In classe`.
- Accepted sequence additions are composed around canonical steps deterministically.
- Stale anchored additions fail closed.
- Resource attachments stay resources, not sequence steps.
- Relevant Knowledge resources can be attached from `Prepara` without duplicating the source.
- The local activation-question tool creates only a grounded `PROPOSED` extension and never self-accepts.
- Runtime-only lesson projections use the same resolver for rendering and mutation.
- Tool proposals declaring a `dedupeKey` are unique per canonical lesson context at the database boundary.
- Accepted additions remain visible after refresh.
- Removing an addition does not remove its Knowledge source or mutate the annual plan.
- No external AI/news/video provider is falsely claimed as connected by this tranche.
