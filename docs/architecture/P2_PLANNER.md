# P2 — Planner server-backed vertical slice

Status: STARTED / DOMAIN_AND_PERSISTENCE_BASELINE

## Goal

Deliver the first operational DOCENTE OS vertical slice on top of the frozen P1 identity/workspace baseline.

The Planner is the canonical place for actions to perform. Calendar integration remains a later concern for real fixed-time events and selected reminders.

## User-facing views

The first read model must support these sections:

1. **DA FARE ORA** — overdue open tasks and urgent/high-priority tasks requiring immediate attention;
2. **OGGI** — tasks planned for today or due today;
3. **QUESTA SETTIMANA** — open tasks due/planned within the next seven days;
4. **IN ATTESA / BLOCCATO** — tasks with status `WAITING`;
5. **SENZA DATA** — open tasks without due date or planned date.

A task may match more than one raw criterion; the application read model is responsible for assigning each task to one primary section to avoid duplicates in the UI.

## Canonical PlannerTask

Required fields:

- `id`
- `workspace_id`
- optional `academic_year_id`
- `title`
- optional `notes`
- `status`: `OPEN | WAITING | DONE | CANCELLED`
- `priority`: `LOW | NORMAL | HIGH | URGENT`
- optional `due_at`
- optional `planned_for`
- `source_kind`: `MANUAL | COMMUNICATION | CALENDAR | TEACHING | DOCUMENT | SYSTEM`
- optional `source_ref`
- `created_by`
- `created_at`
- `updated_at`
- optional `completed_at`

## Invariants

1. Every task belongs to exactly one workspace.
2. A task can reference only an academic year belonging to the same workspace.
3. `created_by` is the authenticated user creating the task.
4. Workspace members can read/create/update tasks in their workspace.
5. Cross-workspace access is denied by RLS.
6. `DONE` requires `completed_at`; reopening clears it.
7. `CANCELLED` is terminal for the first slice unless explicitly reopened by a later use case.
8. No application DELETE policy is introduced in P2; history is preserved through status transitions.
9. Planner does not create Calendar events automatically.
10. Source references are references only; Planner does not duplicate Gmail/Drive/Calendar payloads.

## Application operations — first slice

- `listPlannerTasks(workspaceId, now)`
- `createPlannerTask(input)`
- `completePlannerTask(taskId)`
- `movePlannerTask(taskId, plannedFor)`
- `setPlannerTaskWaiting(taskId)`
- `reopenPlannerTask(taskId)`

## Architecture

`UI -> Planner application use cases -> PlannerRepository port -> Supabase adapter -> PostgreSQL + RLS`

The domain layer must not import Supabase SDK types.

## Persistence baseline

Migration `0005_planner_tasks.sql` introduces `public.planner_tasks` with:

- workspace and optional academic-year foreign keys;
- constrained status/priority/source values;
- timestamp/date planning fields;
- RLS member policies for SELECT/INSERT/UPDATE;
- no DELETE policy;
- indexes for workspace/status, due date and planned date.

## P2 acceptance gates

1. planner migration applied to live Supabase;
2. RLS enabled and foreign identity sees zero tasks;
3. domain model and repository port compile without Supabase dependency;
4. Supabase adapter passes typed repository checks;
5. authenticated user can create a task;
6. `/planner` renders canonical sections from server data;
7. complete/move/wait actions persist and refresh correctly;
8. typecheck, lint, build and Vercel deploy pass;
9. no service-role bypass is introduced.

## Non-goals for this slice

- Gmail ingestion;
- Calendar writes;
- Drive document automation;
- recurring tasks;
- notifications;
- multi-user SCHOOL workflow;
- offline/PWA synchronization;
- bulk migration of the legacy prototype.
