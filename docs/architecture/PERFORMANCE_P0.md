# DOCENTE OS — Performance P0

Status: IMPLEMENTED / VALIDATION IN PROGRESS

## User contract

A tap must never look ignored.

Performance targets for the teacher-facing product:

- visible acknowledgement of a tap: **< 100 ms perceived**;
- useful primary content target: **< 800 ms warm path**;
- ordinary return navigation target: **< 500 ms where data is already known/prefetched**;
- secondary metadata must never block the primary task surface;
- no repeated bootstrap/write operation on a normal read navigation.

These are product budgets, not claims that every current network condition already meets them.

## P0 critical-path changes

1. `current_workspace_context()` collapses membership -> workspace -> active academic year into one authenticated RPC.
2. `annual_plan_execution_snapshot()` collapses annual sections + block progress into one authenticated RPC.
3. Server repositories share one Supabase client per React server render.
4. Existing teacher settings are read directly under RLS; explicit auth lookup is deferred to the first-run creation path.
5. Home loads teacher settings, planner tasks, timetable and annual snapshot concurrently after resolving context.
6. Piano annuale only bootstraps default sections when the snapshot is actually empty.
7. Root `loading.tsx` gives immediate navigation acknowledgement while dynamic server content is being prepared.

## Infrastructure finding

Current Netlify Next.js server handler runs in `cmh` (Ohio). Supabase runs in `eu-west-1` (Ireland).

Netlify documents `dub` (Ireland) as a selectable Functions region on eligible plans and recommends colocating functions with their data source when round-trip latency is material. For framework-generated Next.js handlers the region must be changed at project level, not by adding runtime config to generated function code.

The current connector does not expose the project Functions-region mutation, so this remains an infrastructure action rather than a code change.

## Next performance gate

After P0 is live, validate on the real mobile path:

1. Home -> Orario
2. Orario -> canonical Class
3. Class -> focused Progetta
4. Class -> Piano annuale
5. Oggi -> return to Home

If warm navigations are still materially above the product budget, P1 moves the operational shell toward direct client-side RLS reads/cache for high-frequency teacher paths, avoiding a mandatory server round-trip for every tap.

## Non-goals

- no weakening of RLS;
- no public caching of user-specific data;
- no destructive migration;
- no relocation of the Supabase project;
- no artificial delay masking.
