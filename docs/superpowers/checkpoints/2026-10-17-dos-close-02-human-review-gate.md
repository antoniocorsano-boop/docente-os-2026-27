# DOS-CLOSE-02 — exact-baseline regression + Human Review gate

Date: 2026-10-17
Status: HUMAN_REVIEW_PENDING
Scope: Docente OS product closure only

## Authority and scope

This checkpoint executes the next action defined by the TRAMA closure roadmap without reopening product design or adding features.

Canonical product baseline:

`develop@3f2b4fbac475109fdc331415aa16af680fd96c87`

Canonical Git tree:

`798bb6b761a0ec3475b31f056524a810b9660516`

The stop rules from DOS-CLOSE-01 remain binding: no new macro-view, navigation redesign, second material/document authority, speculative schema work, provider-specific runtime authority, IUI reimplementation, DOC-04 workaround, or product change without a demonstrated blocking defect.

## 1. Regression evidence

### 1.1 Exact content identity

The current merge head `3f2b4fbac475109fdc331415aa16af680fd96c87` and the already qualified closure commit `1d01e715c2e736819c4370b05ffdd0152b8b1792` resolve to the same Git tree:

`798bb6b761a0ec3475b31f056524a810b9660516`

Therefore there is no byte-level repository-content delta between the qualified closure commit and the current `develop` baseline. The SHA difference is merge history/metadata, not product content.

### 1.2 Qualification on the identical tree

On `1d01e715c2e736819c4370b05ffdd0152b8b1792` / tree `798bb6b...`:

- Product CI — run 3087 — PASS;
- CV2 Candidate Qualification — run 14 — PASS;
- Human Interaction Model — run 2661 — PASS;
- Certification Impact Classifier — PASS;
- Governed MFA Queue Hygiene — PASS;
- TRAMA TERM-01 Curricolo Vocabulary — PASS;
- TRAMA Perceptible Write — PASS.

Automated Human Interaction Model evidence is not a substitute for the Human Review below.

**Regression ruling: PASS by exact Git-tree identity plus successful qualification of that identical tree.**

A fresh synthetic product commit is explicitly not created merely to manufacture a new SHA-level CI run. Any later gate that normatively requires an exact commit SHA, including DOS-M5-03/L5 evidence reconciliation, remains a separate qualification step after Human Review.

## 2. Beta review surface

Governed Beta service:

`https://docente-os-2026-27-beta.onrender.com`

The currently served product deploy resolves to:

`0b1dca72a940d02961cbc2a9ba3f7365dda43e2f` — MATERIAL-TASK-UX-01

The subsequent integrated commits before the canonical baseline contain governance/release-contract changes and the DOS-CLOSE-01 documentation checkpoint; no subsequent application/product implementation delta was introduced. The latest Beta build and deploy completed successfully and no subsequent service-failure event was observed in the checked event window.

For Human Review, record both identities: canonical repository baseline `3f2b4f...` and served Beta product commit `0b1dca...`. Do not relabel the served commit as exact-head runtime evidence.

## 3. Human Review — four representative teacher journeys

Human verdict vocabulary: `PASS`, `BLOCKER`, `NOT_RUN`.

### J1 — Oggi / prossima lezione → preparazione → materiali

Status: `NOT_RUN`

Accept only if the teacher can move from the next lesson to its preparation and relevant materials while retaining the lesson/class context, without manually reconstructing the task context.

Record:

- starting view and lesson/class;
- preparation entry point;
- material context shown;
- any loss of context, dead end, ambiguity, duplicate authority or unnecessary detour;
- verdict.

### J2 — Materiali della lezione → Riutilizza / Adatta / Crea nuovo

Status: `NOT_RUN`

Accept only if the three intents are understandable from the teaching task, lead to the expected material action, and preserve the canonical material authority without introducing a second library/store mental model.

Record:

- material/task selected;
- behavior of `Riutilizza`;
- behavior of `Adatta`;
- behavior of `Crea nuovo`;
- any ambiguity or blocking failure;
- verdict.

### J3 — Lezione svolta → registrazione → Prossima attività

Status: `NOT_RUN`

Accept only if the teacher can close/register the lesson, optionally record `Prossima attività`, and receive a clear successful outcome without losing the professional continuity note.

Record:

- lesson selected;
- registration flow;
- `Prossima attività` value used for the review;
- confirmation/result visible to the teacher;
- any loss, ambiguity or blocking failure;
- verdict.

### J4 — Riapertura classe/diario → continuità visibile

Status: `NOT_RUN`

Accept only if reopening the relevant class/diary makes the prior lesson state and next professional step sufficiently visible to continue work without rebuilding the context manually.

Record:

- reopened class/diary;
- prior lesson evidence visible;
- next step/context visible;
- any missing continuity or blocking failure;
- verdict.

## 4. Defect rule

Only a failure observed in one of J1–J4 may reopen product code during DOS-CLOSE-02.

For every observed failure classify it as:

- `BLOCKER` — prevents completion of the representative professional journey or causes loss/duplication of authoritative state;
- `NON_BLOCKING` — cosmetic or secondary issue that does not prevent coherent teacher use;
- `OUT_OF_SCOPE` — future capability already parked by the roadmap.

Only demonstrated `BLOCKER` findings authorize a minimal targeted correction. No speculative refactor is authorized.

## 5. Exit gate

DOS-CLOSE-02 exits only when:

1. regression remains PASS on the frozen product content;
2. J1, J2, J3 and J4 each receive an actual human verdict;
3. no unresolved `BLOCKER` remains.

If all four journeys PASS, the next action is product baseline freeze/qualification and L5 evidence reconciliation (`REGRESSION_HISTORY`, `ADOPTION_EVIDENCE`, DOS-M5-03 Human Exact-Head), not a new feature cycle.

Current gate:

`REGRESSION_PASS / HUMAN_REVIEW_PENDING / NO_PRODUCT_CHANGE_AUTHORIZED`
