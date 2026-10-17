# Docente OS product closure checkpoint — 2026-10-17

## Purpose

This checkpoint narrows the remaining Docente OS work to product closure. It does **not** redesign the product, introduce a new navigation model, activate DOS-A1, or require a new intelligent-composition subsystem.

Canonical baseline for this decision:

`develop@5eee7f817a975c1562db960579c3f65e1456aacd`

## Product ruling

Docente OS already contains the core professional loop needed for lean closure. The remaining work is therefore **regression + human validation + freeze/qualification**, not another general implementation phase.

No new macro-feature is required merely to declare the current product coherent for teacher use.

## Closure contract

### C1 — Materials are usable from the teaching task

**Status: SATISFIED.**

MATERIAL-CORE-01 and MATERIAL-TASK-UX-01 are integrated. The canonical material lifecycle remains teacher-first and provider-neutral; lesson material preparation exposes the existing intent model **Riutilizza / Adatta / Crea nuovo** without a second material store.

### C2 — Lesson → preparation/materials is already connected

**Status: SATISFIED.**

The current next-lesson preparation path already joins the in-force lesson with canonical plan context, lesson brief/preparation, ready material slots and relevant Knowledge resources. Product closure does not require a new orchestration layer above this path.

### C3 — Lesson closure records the next professional step

**Status: SATISFIED.**

The current lesson-close flow already exposes an optional **Prossima attività** field. The confirmed value is incorporated into the structured TeachingSession reflection/evidence note and the class/diary paths are revalidated after registration. This is the canonical minimum continuity contract for `lezione svolta → prossimo passo`.

### C4 — No redesign is required for closure

**Status: SATISFIED.**

The integrated view-convergence work remains authoritative. Home/Oggi, Classi, Piano annuale, Calendario, Conoscenza, Progetta, Materiali, Impostazioni and Orario are not reopened as a general design programme.

## DOC-04 / Relazione finale ruling

The full Relazione finale professional workflow remains a legitimate product residual, but it is **not a prerequisite for this lean product closure**.

The approved DOC-04 read-only plan requires the authoritative `MaterialUsageReceipt` stream owned by DOC-MAT-INT-01 (`teaching_session_material_usage_receipts`). That contract is not integrated on the current baseline. The approved plan explicitly forbids replacing it with a parallel table, transient caller-supplied objects or a second authority model.

Therefore:

- do not create receipt persistence only to unblock product closure;
- do not merge partial DOC-04 readiness experiments into `develop`;
- keep the complete final-report workflow as a separately scoped residual;
- the existing documentation foundations (DOC-TPL-01, DOC-01 and FINAL_REPORT template foundation) remain intact.

## Intelligent UI ruling

IUI remains optional future composition work. It is not needed to close the current product and must not become a new implementation front before closure/qualification.

## Canonical final sequence

1. **Exact-baseline regression** on the current integrated product.
2. **Human Review** of four representative teacher journeys:
   - Oggi / next lesson → preparation → materials;
   - lesson materials → Riutilizza / Adatta / Crea nuovo;
   - lesson execution → registration → Prossima attività;
   - class/diary reopening → continuity visible without rebuilding context manually.
3. **Resolve only demonstrated blockers** from those journeys; no speculative refactor.
4. **Freeze the product baseline** once the journeys pass.
5. **Reconcile L5 evidence** (`REGRESSION_HISTORY`, `ADOPTION_EVIDENCE`, DOS-M5-03 Human Exact-Head) independently of deferred future features.

## Stop rules

Until a closure journey demonstrates otherwise:

- no new macro-view;
- no navigation redesign;
- no second material/document authority;
- no schema work for hypothetical future needs;
- no provider-specific runtime authority;
- no IUI reimplementation;
- no DOC-04 receipt workaround;
- no product code change merely to improve an already passing closure contract.

## Exit condition

Docente OS is product-closure ready when the exact integrated baseline passes regression and the four representative teacher journeys receive Human Review without a demonstrated blocking defect.

At that point the next action is freeze/qualification, not another feature cycle.
