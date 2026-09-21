# ECO-02/P7 — Beta end-to-end acceptance

Status: **BETA_END_TO_END_ACCEPTANCE_COMPLETED**  
Observed: **2026-09-21 10:37 Europe/Rome**  
Environment: **Beta**  
Classroom execution: **not claimed**

## What was verified

The teacher-first path was exercised end to end for **Tecnologia · 2C · B01 — “Il territorio agricolo come sistema”**:

1. the Arena handoff was accepted as a provisional curriculum baseline;
2. the baseline remained `PROVISIONAL_COMPLETE / PROVISIONAL_BASELINE`;
3. the lesson preparation page required an explicit teacher decision;
4. `Approva e procedi` entered a visible pending state;
5. the exact-state approval receipt was persisted append-only;
6. the application entered lesson mode only after that receipt existed.

## Canonical evidence

- Arena footprint: `7bb48175`
- Curriculum adoption receipt: `d1af6eb0-c2a8-4f89-9797-e837a85c4c3e`
- Lesson approval receipt: `1fe4769d-16a8-4cf1-bf1b-af6f12177b24`
- Curriculum baseline fingerprint: `35530861c3e553026b1631c388a2e12c726b79e53fa52a5c4586550a48171d9b`
- Preparation fingerprint: `311770ecff1401c4d9c7db855f4eeb3be983c6ece2ff39a1143889dd4782667e`
- Accepted lesson-design extensions: **3**
- P7 reviewed exact head: `934f827a58ecfac05fdb29c47f45a1dadaa8dc5a`
- Merge commit: `9520abc35af621e188abba3bf88f1b586a44460e`
- Beta deploy: `dep-daoei7u8bjmc73b9s6ag` — **LIVE**

## Authority boundary

The approval confirms only the **effective lesson preparation**. It does not:

- promote the curriculum to institutional approval;
- change the Arena authority model;
- authorize autonomous publication or operational action;
- activate DOS-A1.

The current curriculum remains provisional and must be revalidated when Arena records a definitive institutional adoption.

## Human-use friction observed

Two usability frictions were observed during the successful Beta acceptance:

1. **Discoverability** — “Prima della lezione” was a page title, not a stable navigation entry. Depending on temporal state, the class CTA could instead read “Continua la lezione” or another dynamic task label.
2. **Semantic count** — preparation showed three active additions while lesson mode showed two “materials added by the teacher”; both counts were technically correct, but the UI did not explain that the third accepted addition was a step in the lesson sequence.

ECO-02/P8 consolidates both findings without changing the governance or persistence model.

## What is not yet evidenced

This acceptance does **not** claim that the lesson has been delivered in a classroom, that pupil outcomes were observed, or that the broader sustained-pilot maturity threshold has been reached.
