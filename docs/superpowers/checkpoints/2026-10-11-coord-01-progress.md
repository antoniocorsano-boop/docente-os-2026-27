# COORD-01 — Progress refresh after DOC-TPL-01 integration

**Date:** 2026-10-11  
**Repository:** `antoniocorsano-boop/docente-os-2026-27`  
**Integration authority:** `develop@191ff892bc38425901c790f40947f8c821edc5cf`  
**Status:** COORDINATION_PROGRESS / DOCUMENTATION_STREAM_ADVANCES

## Verified integrated state

- PR #693 — **MERGED** as `998d6f3cba2f90ad7398e714931911f41528da43`.
- PR #695 — **MERGED** as `191ff892bc38425901c790f40947f8c821edc5cf` from exact reviewed candidate `970248510f1adeaf0684e6efcd2c4406741b7bc9`.
- #695 exact candidate had Product CI PASS, Browser Certification PASS, independent Codex review clean, all review threads resolved and final Human Review PASS before integration.
- Current integrated Documentazione migration lineage reaches **0096** (`0096_document_template_structural_ingress_guard.sql`).
- DOC-TPL-01 foundation is therefore **INTEGRATED**; the next Documentazione dependency is DOC-01 generalized authored documents, then DOC-04 structured Relazione finale.

## Coordination ruling — DOC-01 enters before #692 rebaseline

The canonical documentation dependency is:

`DOC-TPL-01 → DOC-01/X5 → DOC-04`.

DOC-01 introduces an additive authored-document migration and therefore becomes an upstream migration-owning tranche for the pending #692 rebaseline. It is safer to integrate DOC-01 before renumbering #692 than to renumber #692 and then create another earlier-owned migration.

**Ruling:** execute DOC-01 from `develop@191ff892bc38425901c790f40947f8c821edc5cf`, using the next free contiguous migration after 0096, with strict RED→GREEN and exact-head recertification. #692 remains held and must recompute its migration numbers only after DOC-01 and any other earlier migration-owning tranche intended for the current integration cycle are settled.

This ruling does **not** couple DOC-01 to Intelligent UI. PR #696 (specification) and #697 (runtime) remain a separate dependency chain. Their eventual `product/package.json` reconciliation must preserve the union of already-integrated DOC-TPL/DOC-01 tests and Intelligent UI tests.

## Current integration queue

1. **Documentazione current priority:** DOC-01 generalized authored-document foundation from current `develop`.
2. DOC-04 structured Relazione finale authoring/readiness/export only after DOC-01 is integrated and recertified.
3. #696 → #697 remain governed as their own spec→runtime chain; no historical PASS is inherited after refresh.
4. #692 remains last among the currently known large runtime/materials branches and must be rebased once onto the stabilized integrated lineage, then migration-renumbered and package-test reconciled.

## Preserved constraints

- No automatic merge.
- Human Review remains the final gate for each integration candidate.
- No PASS evidence is inherited across candidate changes.
- Preserve teacher authority and no implicit writes.
- `DOS-A1=RUNTIME_DEFERRED` remains binding.
- `product/package.json` conflicts are resolved by test-suite union, never by taking one branch line wholesale.
- FINAL_REPORT authoring must follow the approved structured/atomic boundary: DOC-01 generalizes identity/version history; DOC-04 owns first structured version, provenance, renderer pins, validation/finalization and export semantics.

## Exit condition impact

COORD-01 remains **OPEN**. Task 2 (#693/#695) is materially complete. The coordination snapshot must remain open until the remaining active chains are either integrated or explicitly superseded and the final combined migration lineage/test union/exact-head evidence are verified.
