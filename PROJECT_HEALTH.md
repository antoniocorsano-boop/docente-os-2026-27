# DOCENTE OS — Project Health

Updated: 2026-08-21

```text
STATE: DEPLOY_BLOCKED
PRIMARY_BLOCKER: Netlify production deployment has not been successfully created/verified from the canonical GitHub source.
EVIDENCE:
- canonical repository: antoniocorsano-boop/docente-os-2026-27
- branch: main
- Netlify project: docente-os-2026-27
- Netlify site ID: d51b635a-6f51-4795-b18b-cb4478a0c9e5
- netlify.toml committed on main
- Netlify connector still reports no current deploy
- local npx upload path is blocked by runtime/network timeout toward npm registry
NEXT_ACTION: establish one successful production deployment from main and verify the live URL.
DONE_WHEN: https://docente-os-2026-27.netlify.app resolves to the current DOCENTE OS v2.1 app and core navigation is verified.
```

## Current canonical release

- Release: `v2.1`
- Product: DOCENTE OS 2026/27
- Main feature gate: Circolari AI Bridge
- Source of truth: GitHub `main`
- Persistent operational data: Google Drive / Gmail / Google Calendar as applicable
- Browser-local state: localStorage with JSON backup

## Freeze while DEPLOY_BLOCKED

Do not add unrelated product features until the shipping gate is closed.
Allowed changes: deployment, build, CI, repository wiring, security/data-integrity corrections, verification tooling.

## Post-ship candidate sequence

1. Gmail circular intake
2. circular → action → Calendar/Drive closure
3. bidirectional planner/day view
4. section-specific teaching implementation tracking

This order is provisional and can be changed by an urgent school-operational requirement.
