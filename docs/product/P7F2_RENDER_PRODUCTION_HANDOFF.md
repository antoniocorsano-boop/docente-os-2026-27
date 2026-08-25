# P7-F2 — Render Production handoff

Status: PREPARED / NOT YET PROVISIONED

## Goal

Create the DOCENTE OS Production web service as an isolated, inactive Render service. This step does not activate Production and does not authorize real user data.

## Prepared resource

Use the separate Blueprint file:

`ops/render-production-blueprint.yaml`

It deliberately does not modify the linked Beta `render.yaml`.

Required Render properties:

- service name: `docente-os-2026-27-production`
- runtime: Node
- region: Frankfurt
- root directory: `product`
- build: `npm ci --no-audit --no-fund && npm run build`
- start: `npm start`
- auto deploy: OFF
- initial inactive-validation tier: Free; re-evaluate tier before activation

## Production-scoped environment values

Populate these in Render during Blueprint creation; do not commit their values:

- `NEXT_PUBLIC_SUPABASE_URL` → Production Supabase project only
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → Production publishable key only
- `NEXT_PUBLIC_APP_URL` → the new Production Render URL

`OPENAI_VISION_MODEL=gpt-5.6` may remain non-secret configuration. Any future provider secret must be configured outside the repository.

## Production Supabase target

Provisioned project ref: `xpxhlmpsvfzgsjxgieks`.

The project is schema-ready and empty. P7-F evidence established 36/36 canonical migrations, zero Auth users, zero workspaces, zero operational data, and zero Storage objects.

## Activation prohibitions

Until the P7 activation blockers are closed:

- no real owner/professional data;
- no Beta data import;
- no public signup;
- no multi-tenant onboarding;
- no automatic deploy;
- no Production promotion declaration.

## After Render creation

Record the actual Render service URL/id in the provisioning receipt, create a dedicated Production-only technical test identity, configure GitHub/Render secrets outside the repo, and run the authenticated non-mutating Production smoke gate.

P7-F2 is complete only after that runtime evidence exists. Blueprint preparation alone is not provisioning.
