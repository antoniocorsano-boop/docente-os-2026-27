# P7-F2 — Render Production handoff

Status: **COMPLETE / RUNTIME PROVEN / ACTIVATION HOLD**

## Goal

Provision DOCENTE OS Production as an isolated, inactive Render service and prove that it can reach its separate Production Supabase boundary without accepting real user data.

## Provisioned resource

The separate Blueprint remains:

`ops/render-production-blueprint.yaml`

Actual Production runtime:

- service: `docente-os-2026-27-production`
- URL: `https://docente-os-2026-27-production.onrender.com`
- runtime: Node
- region: Frankfurt
- root directory: `product`
- build: `npm ci --no-audit --no-fund && npm run build`
- start: `npm start`
- auto deploy: OFF by contract
- inactive-validation tier: Free; re-evaluate tier before activation

The Production service is intentionally separate from the Beta Render service.

## Production-scoped environment values

Render is configured with Production-only values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_VISION_MODEL`

Secret values are not committed to the repository.

## Production Supabase target

Provisioned project ref: `xpxhlmpsvfzgsjxgieks`.

The project is schema-ready and contains no application data. A dedicated technical Production identity exists solely for authenticated smoke testing.

## Runtime proof

On 2026-08-25 the manual `Production Runtime Smoke` workflow was executed against the real inactive Production service.

- workflow run: `32836204567`
- workflow/test branch: `develop`
- workflow/test commit: `ee141fd156a788f2e4c2357ab0d09e6eec52f073`
- Render-served application commit: `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`
- result: **PASS**
- authenticated: **true**
- technical user session: **present**
- mutating actions performed: **false**

The gate verified root, `/api/build-info`, technical Auth and the authenticated `current_workspace_context` RPC. A direct post-smoke database check confirmed zero workspace, memberships, academic years, planner tasks, Knowledge assets, authored documents and Storage objects.

Canonical evidence: `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`.

## Activation prohibitions

P7-F2 completion does **not** activate Production. Until the P7 activation blockers are closed:

- no real owner/professional data;
- no Beta data import;
- no public signup;
- no multi-tenant onboarding;
- no automatic deploy;
- no Production activation declaration.

## Remaining activation blockers

1. `RESTORE_REHEARSAL`;
2. `OFFSITE_STORAGE_RECOVERY`;
3. `INCIDENT_ESCALATION_MINIMUM`.

P7-F2 is therefore **COMPLETE**, while `productionActivationDecision` remains **HOLD**.