# P7 — Production Release Receipt

Data: 2026-08-25  
Stato: **PASS / SINGLE_OWNER_PILOT ACTIVE**

## Candidato promosso

- repository SHA: `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`;
- product-equivalent SHA: `0959c37e14e0224232f5040cb577c6332bd193fb`;
- rollback target precedente: `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`;
- modello: `IMMUTABLE_CERTIFIED_SHA`.

## Runtime Production

- provider: Render;
- servizio: `docente-os-2026-27-production`;
- URL: `https://docente-os-2026-27-production.onrender.com`;
- stato deploy: **LIVE**;
- auto-deploy: **OFF**.

## Smoke post-promozione

Workflow `Production Runtime Smoke`, run `32903982577`, job `97983821918`: **PASS**.

Evidenze:

- `expectedCommit = db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`;
- `buildCommit = db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`;
- `exactCandidateShaVerified = true`;
- login tecnico autenticato;
- RPC `current_workspace_context` PASS;
- nessuna azione mutativa eseguita.

## Scope e limiti

Production è attiva esclusivamente come `SINGLE_OWNER_PILOT`, audience `named_owner_only`.

Restano vietati:

- signup pubblico;
- onboarding multi-tenant;
- copia automatica Beta → Production;
- riuso credenziali Beta;
- auto-deploy Production.

`realUserDataAccepted` resta **false**. L'ammissione di dati professionali reali richiede un gate umano separato: `P7-REAL-DATA-ADMISSION`.

Ricevuta machine-readable: `ops/production-release-receipt.json`.
