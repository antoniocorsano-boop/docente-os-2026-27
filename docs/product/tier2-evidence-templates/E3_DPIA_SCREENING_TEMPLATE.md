# E3 — DPIA Screening

**Stato del template:** PREPARED_NOT_APPROVED  
**Gate:** `DPIA_SCREENING`  
**Effetto su Tier 2:** nessuno finché lo screening non è svolto e registrato dal titolare con il coinvolgimento privacy previsto.

## 1. Oggetto dello screening

Valutare se il trattamento Tier 2 previsto per **Docente OS** richiede una valutazione d'impatto sulla protezione dei dati (DPIA). Questo template raccoglie i fatti tecnici; **non determina autonomamente l'esito**.

## 2. Descrizione tecnica precompilata

- contesto: scuola secondaria di primo grado;
- interessati potenziali: studenti e, indirettamente, altri soggetti scolastici solo se autorizzati;
- soggetti minori: potenzialmente sì;
- accesso: `SINGLE_OWNER_PILOT`;
- signup pubblico: no;
- multi-tenant: no;
- dati identificativi diretti: non ammessi per default;
- categorie particolari: non ammesse senza gate separato;
- AI esterna con dati personali: vietata senza gate separato;
- storage/database Production: separati da Beta;
- RLS/workspace isolation: attivi;
- export owner-scoped: verificato;
- cancellazione applicativa e Storage: verificata con rehearsal sintetica;
- backup off-site: protetto da retention lock e soggetto a riconciliazione delle cancellazioni dopo restore.

## 3. Criteri da valutare dal titolare/RPD

Per ciascun punto registrare `YES | NO | NOT_APPLICABLE | NEEDS_ANALYSIS` con motivazione:

- trattamento su scala o frequenza rilevante: `DA_DECIDERE`
- monitoraggio sistematico: `DA_DECIDERE`
- uso di dati di soggetti vulnerabili/minori: `DA_DECIDERE`
- combinazione o correlazione di dataset: `DA_DECIDERE`
- uso innovativo di tecnologia con rischio elevato: `DA_DECIDERE`
- impedimento all'esercizio di un diritto/servizio: `DA_DECIDERE`
- trattamento di categorie particolari: `NO` nel perimetro attuale; ogni modifica richiede gate separato
- altri criteri previsti dalla governance del titolare/RPD: `DA_DECIDERE`

## 4. Misure già presenti da considerare

- minimizzazione/pseudonimizzazione come default;
- segregazione Production/Beta;
- least privilege e RLS;
- niente signup pubblico;
- niente multi-tenant;
- niente AI esterna con dati personali;
- export autenticato;
- cancellazione DB/Storage verificata;
- backup e incident escalation baseline.

## 5. Esito dello screening

Selezionare una sola opzione:

- `DPIA_REQUIRED`
- `DPIA_NOT_REQUIRED_WITH_RATIONALE`
- `SCREENING_INCOMPLETE`

Motivazione sintetica: `DA_DECIDERE`

Se `DPIA_REQUIRED`, indicare:

- responsabile del follow-up: `DA_DECIDERE`
- riferimento della DPIA da predisporre: `DA_DECIDERE`
- stato: `NOT_STARTED | IN_PROGRESS | APPROVED | DA_DECIDERE`

## 6. Approvazione

- ruolo titolare/approvatore: `DA_DECIDERE`
- ruolo RPD/DPO o funzione privacy coinvolta: `DA_DECIDERE`
- data screening: `DA_DECIDERE`
- riferimento/protocollo: `DA_DECIDERE`
- versione: `DA_DECIDERE`

## 7. Condizione di chiusura

E3 è soddisfatta quando esiste uno screening approvato con esito motivato. Se l'esito è `DPIA_REQUIRED`, lo screening **non autorizza Tier 2**: apre un ulteriore gate per completare e approvare la DPIA prima della chiusura T2D.
