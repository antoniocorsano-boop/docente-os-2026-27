# DOCENTE OS — P7-D Production Readiness Review

Stato: **REVIEW COMPLETE / ACTIVATION HOLD**

Questa review distingue la preparazione di infrastruttura Production inattiva dall'attivazione con dati reali. Il provisioning non equivale alla promozione e non autorizza traffico utente, dati professionali o onboarding.

## Decisione

- **Production activation:** HOLD.
- **Inactive provisioning:** ammesso solo dopo una decisione esplicita sul provider hosting.
- **Scope:** `SINGLE_OWNER_PILOT` / `named_owner_only`.
- **Production e Beta:** devono restare separati per applicazione, Supabase, DB, Auth, Storage e segreti.

## Precondizioni già soddisfatte

- P7-A: contratto Beta → Production e gate `production-promotion/contract`.
- P7-B: topologia Production separata.
- P7-C: specifica infrastrutturale e gate `production-infrastructure/spec`.
- security baseline Supabase/dependencies.
- runtime Beta e gate applicativi canonici.

## Blocker prima dell'attivazione con dati reali

### Restore rehearsal DB/Auth

Stato: **NOT PROVEN / BLOCKER**.

Un ambiente Production non deve ricevere dati professionali finché il percorso di recupero DB/Auth non è stato provato su ambiente isolato. Il limite corrente del piano Beta non viene trasformato in eccezione di sicurezza: l'ambiente Production inattivo potrà invece fornire la separazione necessaria per eseguire questa prova prima dell'attivazione.

### Off-site Storage recovery

Stato: **NOT PROVEN / BLOCKER**.

L'integrità DB↔Storage del Beta è provata, ma non equivale a backup indipendente. Prima di dati reali deve esistere una copia esterna degli originali Storage e deve essere verificato almeno un percorso di restore.

### Incident escalation minima

Stato: **NOT IMPLEMENTED / BLOCKER**.

Il monitor GitHub rileva failure, ma una Production attiva richiede almeno una escalation owner-visible e una receipt minima dell'incidente. Non serve introdurre una piattaforma enterprise: serve un percorso operativo verificabile.

## Blocker prima del provisioning inattivo

### Provider Production

Stato: **UNDECIDED / BLOCKER_FOR_PROVISIONING**.

Non si crea alcun servizio finché hosting provider, service boundary, regione e meccanismo di segreti non sono esplicitamente scelti e compatibili con P7-C.

## Watch che non bloccano il pilot single-owner

- **Load/scale isolato:** necessario prima di un rollout più ampio; non blocca il pilot nominale finché i budget Beta restano soddisfatti.
- **Leaked-password protection:** da attivare quando il piano Supabase lo consente.
- **Longitudinal proof:** necessario per maturità oltre il pilot, non per creare infrastruttura inattiva.
- **Retention/account deletion:** resta disabilitata finché export e recovery non hanno evidenza sufficiente.

## Regola operativa

Nessun elemento di questa review autorizza:

- creazione di Production attiva;
- uso di dati reali;
- migrazione automatica Beta → Production;
- riuso di credenziali Beta;
- onboarding pubblico;
- ampliamento delle write capability AI.

## Prossimo gate — P7-E

P7-E deve scegliere il provider Production e definire un piano di provisioning **inattivo**. Può predisporre risorse isolate solo dopo la decisione esplicita; non può attivare Production né accettare dati reali. Il nuovo ambiente dovrà poi essere usato per chiudere recovery, Storage backup/restore e gli altri blocker di attivazione.
