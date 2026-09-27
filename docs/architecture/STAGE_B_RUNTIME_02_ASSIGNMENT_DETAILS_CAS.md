# Stage B — Runtime 02: Teaching Assignment details CAS

Status: PROPOSED / implementation boundary
Baseline: `8846228c144cbdb0acbe9a0c2cddf734c900009b`

## Purpose

Close the remaining lifecycle bypass in `TeachingAssignment` updates without changing schema, migrations, or UI.

Runtime 01 established a CAS-protected boundary for `PROVISIONAL ↔ CONFIRMED`. Runtime 02 makes that boundary exclusive: an ordinary details update must never change assignment lifecycle state.

## Canonical invariants

1. `teaching_assignments` remains the single canonical Cattedra object shared by Settings and Timetable.
2. Lifecycle transitions are performed only by `transitionTeachingAssignmentStatus` / `setAssignmentStatus`.
3. A details update may change `weekly_minutes` (and later explicitly governed detail fields) but must not accept or write `status`.
4. A details update is optimistic-concurrency protected using the revision observed from a point read of the target assignment.
5. The CAS identity is `id + workspace_id + academic_year_id + expected updated_at`.
6. Missing target or changed revision is a stale conflict; no silent last-write-wins fallback is allowed.
7. A details read/update must not call Timetable `list()` or `getOrCreateDraft()` and must not create timetable versions or slots.
8. Timetable may consume the canonical assignment, but it must not acquire a second lifecycle authority.
9. No schema, migration, RLS, slot, calendar, annual-plan, or UI change belongs to Runtime 02.

## Minimal application boundary

```text
updateTeachingAssignmentDetails
  → point-read TeachingAssignment
  → capture observed updatedAt
  → CAS update details only
  → stale conflict if target/revision changed
```

Writer contract:

```text
updateAssignmentDetails({
  workspaceId,
  academicYearId,
  assignmentId,
  expectedUpdatedAt,
  weeklyMinutes
})
```

`status` is intentionally absent from the writer input.

## Required negative evidence

Native `node:test` tests must demonstrate:

- point read of only the target assignment;
- observed `updatedAt` is forwarded to the writer;
- missing target never reaches the writer;
- writer CAS conflict is propagated;
- details writer input cannot carry lifecycle state;
- details update does not materialize a timetable draft.

## Caller migration

Known callers at baseline:

- `product/src/app/impostazioni/actions.ts` — migrate ordinary assignment editing to the details boundary; keep Confirm/Reopen on the Runtime 01 transition boundary.
- `product/src/app/orario/actions.ts` — remove lifecycle mutation from ordinary update. Timetable remains a consumer/distributor of Cattedra, not lifecycle authority.

## Reusable rule

For governed mutable records, separate **detail mutation** from **state transition**. Each command receives only the fields it owns and uses an observed revision for concurrent writes. A repository method must not expose a wider mutation surface than its application command requires.

## Qualification order

Invariant → caller audit → minimal boundary → native production-path tests → static checks → governed pipelines → independent diff review → human decision → exact-head merge.
