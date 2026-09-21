# ECO-02/P7 — Pilot closure evidence

Status: **BETA VERIFIED / TEACHER-CONTROLLED / DOS-A1 RUNTIME_DEFERRED**

Date: 2026-09-21

## Scope verified

Technology · class 2C · B01 · `HTC-SECONDA-B01-v1` · “Il territorio agricolo come sistema”.

The pilot verified the teacher-first path:

`Arena provisional baseline → Prima della lezione → teacher approval → append-only exact-state receipt → guided lesson mode`.

## Human evidence

The teacher reviewed the real preparation screen and explicitly selected **Approva e procedi**. The UI showed **Approvazione in corso…** and then opened guided lesson mode.

No autonomous approval was performed.

## Persisted evidence

The Beta database contains the lesson-preparation receipt created by the human action:

- receipt id: `1fe4769d-16a8-4cf1-bf1b-af6f12177b24`;
- section: operational 2C `5c8a86a5-529e-4a84-ac57-65e5a5e704d4`;
- block: `B01`;
- projection: `HTC-SECONDA-B01-v1`;
- Arena handoff footprint: `7bb48175`;
- curriculum state: `PROVISIONAL_COMPLETE`;
- alignment authority: `PROVISIONAL_BASELINE`;
- accepted lesson-design extensions bound into the receipt: 3;
- preparation fingerprint: `311770ecff1401c4d9c7db855f4eeb3be983c6ece2ff39a1143889dd4782667e`;
- confirmed at: `2026-09-21T08:37:23.959195Z`.

The receipt is append-only under the governed lesson-preparation persistence contract.

## Governance boundary

This evidence proves operational readiness of the **provisional teacher-controlled pilot preparation**. It does **not**:

- convert the Arena baseline into institutional approval;
- authorize automatic curriculum adoption;
- authorize autonomous lesson execution or recording;
- authorize DOS-A1;
- change Production.

Future curriculum, projection, canonical generation, or accepted-extension drift must invalidate the exact-state approval and require a new teacher decision.

## UX findings consolidated in P8

The human test exposed two navigation/semantics issues:

1. **Prima della lezione** was difficult to discover from the class workspace.
2. Guided lesson mode displayed only material-type additions as “Materiali aggiunti dal docente”, while the preparation correctly reported all accepted additions.

P8 therefore adds a stable **Prima della lezione** entry from the class workspace and renames the live-mode subset to **Materiali allegati dal docente**, explicitly explaining that other accepted additions appear directly in the sequence.
