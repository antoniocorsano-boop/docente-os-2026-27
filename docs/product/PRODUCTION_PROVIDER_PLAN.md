# DOCENTE OS — P7-E Production provider + inactive provisioning plan

Stato: **PROVIDER SELECTED / PROVISIONING NOT STARTED / ACTIVATION HOLD**

## Decisione

Per il primo rilascio `SINGLE_OWNER_PILOT`, il provider applicativo Production è **Render**, regione **Frankfurt**.

La scelta riusa un modello operativo già provato nel Beta senza condividere il servizio, i dati o i segreti. Production resta un servizio distinto e usa un progetto Supabase distinto.

## Vincoli di deploy

- sorgente: repository canonico DOCENTE OS;
- branch sorgente: `develop`;
- promozione: solo SHA immutabile già certificato;
- auto-deploy: disabilitato;
- regione: Frankfurt;
- nome pianificato: `docente-os-2026-27-production`;
- health check: `/`;
- tier runtime: da decidere prima del provisioning, senza assumere che il piano Beta sia adatto all'attivazione Production;
- dominio personalizzato: rinviato finché i blocker di attivazione non sono chiusi.

## Sequenza autorizzata P7-F

P7-F può creare esclusivamente infrastruttura **inattiva e isolata**:

1. creare un progetto Supabase Production distinto dal Beta;
2. creare un servizio Render Production distinto dal Beta in Frankfurt;
3. mantenere auto-deploy disabilitato;
4. configurare esclusivamente segreti Production-scoped fuori dal repository;
5. applicare lo schema in modo non distruttivo;
6. verificare RLS e Storage policy su dati tecnici sintetici/fixture isolate;
7. eseguire restore rehearsal DB/Auth nell'ambiente isolato;
8. predisporre e verificare una copia off-site degli oggetti Storage;
9. verificare smoke autenticato con identità tecnica Production dedicata;
10. produrre receipt senza attivare accesso reale.

## Divieti P7-F

P7-F non può:

- attivare Production per uso reale;
- importare dati professionali Beta;
- accettare dati reali dell'owner;
- riutilizzare credenziali Beta;
- creare write cross-environment;
- abilitare signup pubblico o onboarding multi-tenant;
- configurare auto-deploy;
- dichiarare Production ready finché i blocker P7-D non sono chiusi.

## Blocker di attivazione che restano aperti

- restore rehearsal DB/Auth;
- off-site Storage recovery;
- incident escalation minima owner-visible.

Load/scale, leaked-password protection, longitudinal proof e retention/account deletion restano WATCH per il pilot single-owner e diventano vincoli più forti prima di un rollout più ampio.

## Alternative

Openship/self-hosted resta un'opzione di indipendenza infrastrutturale futura. Non viene introdotta nel pilot perché aggiungerebbe una nuova superficie operativa prima di aver chiuso recovery, backup e incident response. Una migrazione futura dovrà mantenere gli stessi contratti P7-A/P7-B e non potrà essere implicita.
