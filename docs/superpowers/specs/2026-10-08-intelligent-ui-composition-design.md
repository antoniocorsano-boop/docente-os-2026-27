# IUI-01 — Intelligent UI Composition Layer

Date: 2026-10-08
Status: SPEC_FOR_HUMAN_REVIEW
Target repository: `antoniocorsano-boop/docente-os-2026-27`
Target base: `develop@a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2`
Execution policy: isolated branch, TDD RED → GREEN, exact-head certification, no automatic merge

## 1. Purpose

Introduce an intelligent UI composition layer in Docente OS without turning the product into a generative or unpredictable interface.

The goal is to let the product present the smallest useful interface for the teacher's current task by combining known context, human intent, recorded state and a closed catalogue of approved presentation components.

The composition layer extends the canonical Human Task Model already adopted by Docente OS:

> The more the system knows the user's intent and context, the less interface it should show.

This design does **not** make GPT or any external model an authority over navigation, persistence, curriculum, institutional documents or teacher decisions.

## 2. Existing baseline and dependency

IUI-01 builds on the already integrated DOS-VIEW-CONV-01 work from PR #688.

That tranche established:

- the stable five-destination mobile shell;
- the `Naviga` hub;
- convergence of dense views;
- the Human Task interaction grammar;
- exact-head browser, accessibility and no-implicit-write certification.

IUI-01 must not reopen those decisions or duplicate their work.

Canonical references:

- `docs/architecture/HUMAN_TASK_MODEL.md`
- `docs/superpowers/specs/2026-10-05-docente-os-view-convergence-design.md`
- `docs/architecture/CLASS_WORKSPACE_CONTRACT.md`
- existing Product CI, Browser Certification, Human Interaction Model, Design Policy and no-implicit-write gates.

## 3. Product decision

Docente OS adopts **constrained intelligent composition**, not free-form generative UI.

The architecture is:

> Human Task Model → contextual snapshot → deterministic intent resolution → composition policy → closed component catalogue → validated surface composition → renderer

An optional model-assisted adapter may be introduced later:

> sanitized contextual snapshot → model proposal → strict schema validation → policy validation → renderer

If model output is invalid, unavailable, too slow or disallowed, the system falls back to the deterministic composition for the same context.

The renderer never accepts arbitrary JSX, HTML, CSS, executable code or arbitrary route definitions from a model.

## 4. Non-negotiable invariants

1. **No arbitrary generated page.** The system may compose only registered components and registered actions.
2. **No implicit writes.** Composition may suggest or expose actions; it cannot mutate canonical data by itself.
3. **Teacher authority remains explicit.** Finalization, recording, document approval and professional judgement remain human actions.
4. **Stable navigation remains stable.** Primary navigation, Settings structure, authentication and security surfaces are not model-composed.
5. **Deterministic fallback is mandatory.** Every adaptive surface has a valid non-model composition path.
6. **Same deterministic input produces the same deterministic composition.** No hidden randomness in the baseline composer.
7. **No authority-boundary changes.** Arena, Atlas, Studio Atlas and Docente OS retain their current responsibilities.
8. **No student personal data is sent to a model.** A future model adapter receives only the minimum sanitized context necessary to compose a teacher-facing surface.
9. **Technical identifiers remain secondary.** CAN codes, UUIDs and internal generation identifiers do not become ordinary teacher-facing labels.
10. **A focused task stays focused.** FOCUSED mode keeps one primary action and at most two peer-level support actions.
11. **The complete view remains reachable.** Automatic narrowing must always expose an understandable route to the broader surface.
12. **No runtime model dependency for L3→L4.** IUI-01 must remain useful and complete with the model adapter disabled.

## 5. Surface classes

### 5.1 Stable surfaces

These remain deterministic and structurally stable:

- global/mobile navigation;
- `Naviga` information architecture;
- Settings;
- identity, account and security;
- confirmations for destructive or authoritative actions.

They may display contextual state, but their structure is not dynamically composed by a model.

### 5.2 Contextual surfaces

These may select emphasis and secondary content from recorded context using deterministic rules:

- Oggi;
- Orario;
- Calendario.

### 5.3 Adaptive surfaces

These are candidates for composition because their useful representation changes materially with task and context:

- Home;
- Classe;
- Piano annuale;
- Progetta;
- Conoscenza;
- Materiali;
- Documentazione.

Adaptive does not mean generative. It means the surface is assembled from approved semantic blocks according to a validated composition.

## 6. Core contracts

### 6.1 `UIContext`

A read-only, minimal contextual snapshot for composition.

It may contain only data already authorized for the current teacher and required for the current task, such as:

- current date/time bucket when relevant;
- current teacher workspace and academic year;
- current class/section reference;
- current lesson or next lesson reference;
- current Human Task intent;
- current experience mode;
- relevant completion/readiness states;
- references to canonical objects already known to the current surface.

It must not become a duplicate domain model.

### 6.2 `HumanIntent`

IUI-01 reuses the canonical intents from the Human Task Model:

- `ACT_NOW`
- `PREPARE`
- `TEACH`
- `RECORD`
- `REVIEW`
- `EXPLORE`

No parallel intent taxonomy is introduced.

### 6.3 `ExperienceMode`

IUI-01 reuses:

- `EXPLORE`
- `GUIDED`
- `FOCUSED`

The composition policy applies the existing mode constraints rather than redefining them.

### 6.4 `SurfaceComposition`

`SurfaceComposition` is a serializable, versioned description of what the renderer may show.

Minimum conceptual fields:

- `version`
- `surface`
- `intent`
- `mode`
- `contextSummary`
- `reason`
- `primaryBlock`
- `supportBlocks`
- `primaryAction`
- `supportActions`
- `fullViewAction`

It contains **references to registered semantic blocks and actions**, not presentation code.

A composition is invalid if it:

- references an unknown component/action;
- exposes more than one primary action in FOCUSED mode;
- exposes more than two peer-level support actions in FOCUSED mode;
- omits the current context when context is known;
- narrows a surface without explaining why;
- narrows a surface without a route to the broader view;
- includes an implicit mutation;
- references data outside the current authorized context.

### 6.5 Component catalogue

The catalogue is closed and application-owned.

Initial catalogue entries should wrap or reuse proven patterns already present in Docente OS rather than create a second design system. Candidate semantic roles include:

- `ContextHeader`
- `TaskFocus`
- `LessonFocus`
- `NextStep`
- `MaterialSummary`
- `KnowledgeSummary`
- `PlanProgress`
- `EvidenceSummary`
- `DocumentProgress`
- `StatusFeedback`
- `FullViewLink`

Final implementation names follow existing repository conventions and may differ from these conceptual identifiers.

A catalogue entry declares:

- allowed surfaces;
- allowed experience modes;
- required data contract;
- whether it can contain an action;
- accessibility requirements;
- whether the block is eligible as primary or support content.

### 6.6 Registered actions

Composition references only actions already governed by Docente OS.

An action descriptor identifies a safe application action such as navigation to a known route, opening an existing object, or invoking an existing explicitly confirmed command.

A model or composer cannot invent a route, mutation endpoint, database operation or external destination.

## 7. Composition pipeline

### 7.1 Context builder

The context builder reads existing domain/view-model state and produces `UIContext`.

Rules:

- read-only;
- minimal data;
- no speculative state;
- no new persistence;
- no student personal data for model-eligible contexts;
- explicit provenance for derived state where required by existing contracts.

### 7.2 Deterministic intent resolver

The deterministic resolver is the authoritative baseline for IUI-01.

It resolves or confirms intent from explicit entry path, current surface, known task context and recorded state.

It must not infer professional judgements that are not recorded.

### 7.3 Deterministic composer

The deterministic composer converts `UIContext + HumanIntent + ExperienceMode` into a valid `SurfaceComposition`.

It is pure where practical and covered by table-driven tests.

This layer is implemented before any runtime model integration.

### 7.4 Policy validator

Every composition, deterministic or model-assisted, passes through the same validator.

The validator enforces:

- component catalogue membership;
- action registry membership;
- Human Task mode budgets;
- no-implicit-write constraints;
- surface-specific constraints;
- privacy/data-minimization constraints;
- availability of the full-view escape path;
- required reason/explanation when narrowing occurs.

Validation failure never falls through to partially rendered model output.

### 7.5 Renderer

The renderer maps validated semantic component identifiers to application-owned React components.

It preserves:

- canonical visual tokens;
- responsive behavior;
- keyboard/focus semantics;
- WCAG requirements;
- stable navigation;
- existing domain ownership.

The renderer does not execute model-supplied code.

## 8. Optional model-assisted composition

A runtime model adapter is **out of scope for the first implementation tranche**.

When considered later, it must satisfy all of the following:

- disabled by default until separately qualified;
- provider/model isolated behind an adapter interface;
- receives a sanitized, bounded context rather than raw application state;
- returns only the `SurfaceComposition` schema;
- cannot invoke mutations directly;
- cannot introduce new components or actions;
- must pass the same policy validator as deterministic output;
- timeout, quota exhaustion, invalid output or provider failure cause deterministic fallback;
- product completion and L3→L4 maturity do not depend on its availability.

GPT-5.6 may be used during design, implementation and review in the connected development workflow without creating a runtime dependency in Docente OS.

## 9. First vertical: Home → Classe → prossima lezione

The first implementation vertical validates the architecture with an existing, high-frequency teacher journey.

### 9.1 Entry on Home

When Docente OS knows the teacher's next relevant lesson and enough context exists, Home may produce a FOCUSED or GUIDED composition that states:

- where the teacher is in the day/workflow;
- which class/lesson is relevant;
- why this is the proposed next step;
- one primary action to open the relevant class/lesson task;
- at most two support actions;
- an explicit route to the complete Home view.

### 9.2 Transition to Classe

Opening the class preserves the Human Task context.

Classe must not reset to a generic dashboard if the user arrived with a valid specific task.

### 9.3 Lesson task

The class surface selects the appropriate task representation from existing state, for example PREPARE, TEACH or RECORD, without inventing preparation/completion states.

The user must be able to answer within a few seconds:

- Dove sono?
- Che cosa sto facendo?
- A che punto sono?
- Che cosa faccio adesso?
- Perché proprio questo?
- Come torno alla vista completa?

### 9.4 No-write boundary

Opening or rendering the composed surface does not mark a lesson prepared, taught, completed or recorded.

Any such state change continues through the existing explicit write path.

## 10. Later verticals

After the first vertical is qualified, extend the same composition contract in this order unless evidence requires a different dependency order:

1. **Classe / Progetta / Conoscenza continuity** — preserve task context across preparation and knowledge lookup.
2. **Piano annuale** — select the next useful semantic slice without using the long canonical document as the primary daily interface.
3. **Materiali** — compose project/use/prepare/associate views without changing material authority.
4. **Documentazione** — compose document completion/review surfaces from known institutional context and evidence without auto-finalization.
5. **Optional model adapter** — only after the deterministic architecture and the above boundaries are proven.

## 11. Documentazione boundary

The intelligent UI layer may simplify how a teacher works with institutional documentation, but it does not change the authority model defined by DOC-04 / DOC-TPL-01.

For example, when the teacher opens a Relazione finale, the composition layer may expose:

- current document state;
- sections supported by existing evidence;
- sections requiring professional review;
- one primary next action;
- preview/review support actions.

It must not:

- fabricate institutional evidence;
- silently rewrite Programmazione annuale or UDA;
- finalize a document without explicit teacher action;
- expose internal template/version identifiers in the normal workflow;
- merge the Documenti and Materiali authorities into one data model.

## 12. Failure handling

### 12.1 Missing context

If required context is unavailable or inconsistent, the composer degrades to `GUIDED` or `EXPLORE` rather than guessing.

### 12.2 Invalid composition

Reject the composition and use the deterministic safe composition for the surface.

### 12.3 Model unavailable

No user-facing error is required if deterministic fallback can satisfy the task. Provider failure must not block the teacher's workflow.

### 12.4 Stale context

Authoritative actions revalidate against current application state before execution. A rendered composition is not an authorization token.

### 12.5 Unknown action/component

Fail closed. Do not render a substitute invented at runtime.

## 13. Observability and explainability

IUI-01 requires inspectable composition decisions without adding teacher-facing technical noise.

At test/diagnostic level the system must be able to determine:

- input intent/mode;
- selected composition version;
- selected semantic blocks;
- reason for narrowing;
- whether deterministic or model-assisted composition was used;
- fallback reason when applicable.

Ordinary teacher-facing UI shows only human explanations such as why a lesson or next action is relevant.

No student personal data is added to diagnostics.

## 14. Testing strategy

All implementation changes follow TDD RED → GREEN → relevant suite → qualifying suite.

### 14.1 Contract tests

Cover:

- `UIContext` validation;
- `SurfaceComposition` schema;
- component catalogue membership;
- action registry membership;
- FOCUSED action budgets;
- required full-view escape path;
- required explanation for automatic narrowing;
- deterministic stability for equivalent input;
- fail-closed behavior for unknown components/actions;
- deterministic fallback.

### 14.2 Policy tests

Prove:

- no implicit mutation from render/composition;
- no invented domain state;
- no student personal data in model-eligible context;
- no model-created routes or commands;
- stable navigation unaffected.

### 14.3 Vertical tests

For Home → Classe → prossima lezione:

- context is preserved across navigation;
- entry with SPECIFIC context opens FOCUSED experience;
- incomplete/incoherent context degrades safely;
- one primary action rule holds;
- full-view escape remains reachable;
- explicit write actions remain explicit;
- mobile and desktop layouts remain usable.

### 14.4 Browser/accessibility evidence

Changed surfaces require existing certification infrastructure, including as applicable:

- smartphone and desktop rendering;
- focus/keyboard behavior;
- WCAG 2.2 AA checks;
- no unintended horizontal overflow;
- Human Interaction Model;
- Design Policy;
- no-implicit-write/X3-equivalent gate;
- Human Visual Acceptance before integration.

## 15. Acceptance metrics

The first vertical is successful only if:

- a teacher can identify location, task, state, next action and reason within a few seconds;
- FOCUSED mode has one primary action and at most two peer support actions;
- the broad view is reachable without competing with the primary action;
- crossing Home → Classe preserves the task;
- no render causes a write;
- invalid or missing context never causes invented state;
- the deterministic fallback fully supports the journey;
- all changed-view certification gates pass on the exact head;
- Human Review confirms that the surface feels simpler rather than merely different.

Runtime model success rate, token cost or provider latency are **not** acceptance criteria for the first vertical because the model adapter is not required for it.

## 16. Staged roadmap

### IUI-01 — Contract and architecture

- freeze this design;
- define contracts and boundaries;
- no product runtime change in the design step.

### IUI-02 — Deterministic composition core

- `UIContext`;
- canonical intent/mode reuse;
- `SurfaceComposition`;
- component/action registries;
- validator;
- deterministic composer;
- contract/policy tests.

### IUI-03 — Home → Classe → prossima lezione pilot

- integrate the composition core into the pilot journey;
- preserve context continuity;
- qualify responsive/accessibility/no-write behavior.

### IUI-04 — Classe / Progetta / Conoscenza

- extend composition to preparation and knowledge continuity;
- keep domain contracts and existing persistence unchanged.

### IUI-05 — Documentazione

- apply composition to document completion/review;
- preserve DOC-04 / DOC-TPL-01 authority and template contracts.

### IUI-06 — Optional model adapter

- separately designed and qualified;
- schema-only output;
- strict validation;
- deterministic fallback;
- no product maturity dependency.

### IUI-07 — Evaluation and maturity delta

- compare task clarity, action count, context continuity and Human Review against the pre-IUI baseline;
- produce an evidence-backed maturity delta;
- no maturity promotion without exact-head evidence.

## 17. Implementation boundaries

The implementation plan derived from this spec must:

- start from current `develop` in an isolated branch/worktree;
- preserve TDD RED → GREEN;
- avoid unrelated refactoring;
- avoid a second design system;
- reuse Human Task Model, routes, actions and view models where possible;
- keep `DOS-A1=RUNTIME_DEFERRED`;
- avoid automatic merge;
- require exact-head certification;
- keep final Human Review as the integration gate.

## 18. Stop conditions

Stop and require a new design decision if implementation would require any of the following:

- arbitrary model-generated JSX/HTML/CSS/code;
- direct model access to persistence or database commands;
- student personal data sent to a model;
- new authority boundaries among Docente OS, Arena, Atlas or Studio Atlas;
- new global navigation concepts;
- replacement of existing explicit confirmation/write contracts;
- dependence on a paid or quota-limited model for core teacher workflows;
- a new major subsystem unrelated to UI composition;
- implicit modification of curriculum, planning or institutional documents.

## 19. Definition of done

IUI-01 architecture is complete when:

- this design is approved;
- a detailed implementation plan is derived from it;
- implementation remains decomposed into IUI-02 through IUI-07;
- the first executable tranche is deterministic composition plus the Home → Classe → prossima lezione pilot;
- model-assisted runtime composition remains optional and deferred until the deterministic architecture is proven;
- no requirement above weakens existing Human Task, privacy, authority, accessibility or no-implicit-write contracts.
