# H8-B3 wiring prerequisite

The reflection-capture micro-slice is intentionally side-effect free.

Before wiring the post-registration **Porta alla riprogettazione** gesture, the server action must use the actual H8-B2 contracts present on `develop`:

- `buildTeachingSessionAdjustmentProposal(...)` builds the authoritative proposal from an already loaded `TeachingSessionRecord`, its allocations, the selected allocated `blockId`, and the canonical runtime projection.
- `SupabaseLessonDesignRepository.addToolProposalOnce(...)` is the persistence boundary.
- `SupabaseTeachingSessionRepository` currently exposes `listByDay(...)` and `listBySection(...)`; it does **not** expose a `getById(...)` method.

Therefore H8-B3 must not invent a `persistTeachingSessionAdjustment` API or call a nonexistent `getById`. The post-registration action should either reuse `listBySection(...)` under the active workspace/year/section and select the receipt session plus its allocations, or introduce a separately tested RLS-scoped read method before wiring the gesture.

No proposal is created by lesson registration itself.
