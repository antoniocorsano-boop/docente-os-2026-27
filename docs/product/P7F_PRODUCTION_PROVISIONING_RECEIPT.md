# DOCENTE OS — P7-F Production provisioning receipt

Stato: **PARTIAL PASS / SUPABASE PROVISIONED / RENDER BLOCKED BY TOOLING / ACTIVATION HOLD**

## Risultato reale

P7-F ha creato un progetto Supabase Production materialmente separato dal Beta:

- project ref: `xpxhlmpsvfzgsjxgieks`;
- regione: `eu-central-1`;
- stato progetto: `ACTIVE_HEALTHY`;
- 36/36 migrazioni canoniche applicate fino a `knowledge_search_current`;
- Auth users: 0;
- workspace: 0;
- Planner tasks: 0;
- Knowledge assets: 0;
- authored documents: 0;
- calendar events: 0;
- teaching sessions: 0;
- Storage bucket: 1 (`knowledge-assets`, privato);
- Storage objects: 0.

Nessun dato Beta, dato professionale o dato reale dell'owner è stato copiato o inserito.

## Finding fresh-bootstrap

Il primo bootstrap reale ha individuato una dipendenza storica non fresh-install-safe in `0004_harden_event_trigger_rpc_exposure.sql`: la migrazione tentava di revocare permessi da `public.rls_auto_enable()` anche quando la funzione non esiste in un progetto nuovo.

La sorgente canonica è stata corretta con una revoca condizionale basata su `to_regprocedure(...)`. Sul Beta la modifica non cambia lo schema runtime esistente; rende invece il percorso di bootstrap ripetibile su database nuovi.

## Security review

Gli advisor Production riportano il medesimo profilo di warning previsto per gli RPC `SECURITY DEFINER` autenticati e intenzionali già presenti nel Beta. Non è emerso un warning di sicurezza specifico introdotto dal nuovo Production. Il progetto Production non presenta inoltre, nella verifica corrente, il warning Beta sulla leaked-password protection.

Questo non equivale a dichiarare conclusa la security review di attivazione: i gate P7-D restano vincolanti.

## Render

Il servizio Render Production non è stato creato. In questa sessione non è disponibile un connettore Render autenticato capace di creare o configurare servizi.

Restano quindi intenzionalmente non configurati:

- servizio `docente-os-2026-27-production`;
- tier runtime;
- URL applicativo Production;
- variabili/segreti Production-scoped;
- identità tecnica Production;
- smoke test autenticato.

Non vengono inseriti segreti nel repository.

## Verdetto

- Supabase Production: **PROVISIONED / SCHEMA READY / EMPTY**;
- Render Production: **NOT PROVISIONED**;
- Production complessiva: **PARTIALLY_PROVISIONED**;
- attivazione: **HOLD**;
- dati reali accettati: **NO**.

## Prossimo gate — P7-F2

P7-F2 dovrà creare il servizio Render isolato e inattivo, configurare fuori dal repository le sole variabili Production-scoped e verificare un primo smoke tecnico con identità dedicata. Non potrà attivare Production né accettare dati reali.

Dopo P7-F2 potranno essere eseguiti i blocker P7-D: restore rehearsal DB/Auth, off-site Storage recovery e incident escalation minima owner-visible.
