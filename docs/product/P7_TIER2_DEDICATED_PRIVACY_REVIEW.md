# P7 — Tier 2 Dedicated Privacy Review

## Esito

La review T2D è stata completata come **review tecnica e di governance**, non come certificazione legale.

Stato canonico:

- T2A — Data minimization policy: **SATISFIED**
- T2B — Application retention/deletion: **SATISFIED**
- T2C — Personal-data export/deletion: **SATISFIED**
- T2D — Dedicated privacy review: **BLOCKED_EXTERNAL_GOVERNANCE**
- Tier 2 — School personal data: **NOT_ADMITTED**

Il completamento della review non autorizza il trattamento di dati personali scolastici.

## Principio di autorità

DOCENTE OS può verificare controlli tecnici, flussi, restrizioni e procedure operative. Non può invece auto-determinare:

- la titolarità istituzionale del trattamento;
- la base/autorità applicabile al trattamento;
- le finalità approvate dal titolare;
- l'eventuale necessità di una DPIA;
- l'adeguatezza giuridico-organizzativa dei rapporti con responsabili/sub-responsabili;
- l'informativa o il modello di gestione dei diritti adottati dal titolare.

Queste evidenze devono provenire dall'esterno del prodotto e non possono essere sostituite da una dichiarazione del repository.

## Risultati tecnici consolidati

La baseline tecnica già certificata comprende minimizzazione, separazione della topologia Production, RLS, isolamento Storage, export owner-scoped, cancellazione di dati live, backup off-site con retention lock, recovery e incident escalation.

Per il primo Tier 2 restano inoltre vincoli rigidi: niente signup pubblico, niente onboarding multi-tenant, niente migrazione automatica dei dati Beta, niente categorie particolari e niente trasferimento di dati personali a provider AI esterni senza un gate separato.

## Flussi Production identificati

Se Tier 2 fosse in futuro ammesso, i flussi runtime coinvolgerebbero:

- **Render** — runtime applicativo;
- **Supabase** — autenticazione, database e Storage;
- **Cloudflare R2** — destinazione off-site dei backup protetti.

GitHub Actions rimane un ambiente di engineering e rehearsal sintetica: non è autorizzato come percorso per dati personali reali dell'utente.

## Cinque blocker esterni

T2D resta bloccato finché non esistono evidenze verificabili per tutti i seguenti punti:

1. **INSTITUTIONAL_CONTROLLER_AUTHORITY** — decisione/documento che individui il titolare o il contesto autorizzato, il ruolo dell'utilizzatore e le finalità ammesse per DOCENTE OS Tier 2.
2. **PROCESSOR_AND_TRANSFER_REVIEW** — verifica dei termini applicabili ai servizi Production, responsabili/sub-responsabili, localizzazione dei dati e, ove rilevante, garanzie sui trasferimenti.
3. **TRANSPARENCY_AND_RIGHTS_ROUTING** — informativa approvata o integrazione nell'informativa del titolare, più percorso operativo per accesso, rettifica, esportazione e cancellazione.
4. **DPIA_SCREENING** — valutazione documentata del titolare/DPO sull'obbligo o meno di una DPIA per il trattamento previsto.
5. **PURPOSE_SPECIFIC_RETENTION_SCHEDULE** — tempi di conservazione o trigger di cancellazione approvati per ciascuna categoria/finalità Tier 2 ammessa.

## Regola di chiusura

T2D potrà diventare `SATISFIED` soltanto dopo la chiusura documentata di tutti i blocker esterni. Anche allora il Tier 2 dovrà rimanere `NOT_ADMITTED` fino a una **nuova decisione umana esplicita di ammissione**.

Il gate successivo è quindi:

`T2D_EXTERNAL_GOVERNANCE_EVIDENCE`
