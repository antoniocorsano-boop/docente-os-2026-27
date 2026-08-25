# DOCENTE OS — P7-F2 Production runtime receipt

Stato: **PASS / INACTIVE PRODUCTION PROVISIONED / ACTIVATION HOLD**

Data evidenza: 2026-08-25

## Ambiente verificato

- Render Production: `https://docente-os-2026-27-production.onrender.com`
- Supabase Production project ref: `xpxhlmpsvfzgsjxgieks`
- workflow: `Production Runtime Smoke`
- run: `32836204567`
- branch di esecuzione: `develop`
- commit di workflow/test: `ee141fd156a788f2e4c2357ab0d09e6eec52f073`
- commit applicativo servito da Render Production al momento del test: `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`

## Evidenza runtime

Lo smoke non mutativo ha verificato con esito PASS:

- root applicativa Production raggiungibile;
- `/api/build-info` raggiungibile;
- autenticazione con identità tecnica Production dedicata;
- sessione Auth valida;
- RPC autenticato `current_workspace_context` raggiungibile;
- nessun riferimento al progetto Supabase Beta;
- nessuna azione applicativa mutativa.

Output certificato del gate:

- `result = PASS`
- `authenticated = true`
- `technicalUserIdPresent = true`
- `mutatingActionsPerformed = false`

## Verifica post-smoke

Dopo il gate il Supabase Production è stato ricontrollato direttamente. Stato applicativo:

- workspace: 0;
- membership: 0;
- academic years: 0;
- planner tasks: 0;
- knowledge assets: 0;
- authored documents: 0;
- Storage objects: 0.

L'unico utente presente è l'identità tecnica Production dedicata al collaudo, con email confermata. Nessun dato Beta o dato professionale reale è stato introdotto.

## Verdetto P7-F2

- Render Production: **PROVISIONED / REACHABLE / INACTIVE**;
- Supabase Production: **PROVISIONED / SCHEMA_READY / EMPTY_OF_APPLICATION_DATA**;
- Production technical Auth: **PASS**;
- authenticated runtime smoke: **PASS**;
- P7-F2: **COMPLETE**;
- Production activation: **HOLD**;
- real user data authorized: **false**.

## Blocker che restano vincolanti

P7-F2 non chiude i blocker di attivazione:

1. `RESTORE_REHEARSAL` — DB/Auth recovery da provare in ambiente isolato;
2. `OFFSITE_STORAGE_RECOVERY` — copia indipendente e restore Storage da provare;
3. `INCIDENT_ESCALATION_MINIMUM` — escalation owner-visible e relativa receipt minima da implementare.

Restano inoltre watch non bloccanti per il pilot: load/scale isolato, leaked-password protection quando disponibile, prova longitudinale e retention/deletion.

## Nota di promozione

Il runtime Production serviva `f33eb478...`, mentre `develop` era già a `ee141fd...`. Questo non è un failure del provisioning: dimostra che Production è separata e non segue automaticamente `develop`. Ogni eventuale allineamento futuro deve avvenire tramite una decisione di promozione esplicita e uno SHA certificato, senza auto-deploy.