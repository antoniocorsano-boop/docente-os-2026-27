# DOCENTE OS — P7 Incident Escalation Minimum

Stato: **CANDIDATE / OWNER-VISIBLE / SINGLE-OWNER PILOT**

Questo contratto definisce il percorso minimo obbligatorio per rendere un incidente operativo visibile al proprietario, tracciabile e chiudibile con una ricevuta. Non introduce automazioni decisionali né nuove write applicative.

## Canale canonico

Il canale minimo di escalation è una **GitHub Issue nel repository canonico** creata con il template `Incident / escalation`.

Il canale è considerato owner-visible perché:

- è nello stesso repository usato per governance, CI e promozione;
- il proprietario del repository può leggerlo e gestirlo direttamente;
- ogni evento ha URL, numero issue, timestamp, cronologia e stato;
- commenti, aggiornamenti e chiusura costituiscono una traccia auditabile.

Email, chat o notifiche provider possono essere aggiunte in futuro, ma non sostituiscono la receipt canonica.

## Campi minimi obbligatori

Ogni incidente deve contenere:

1. **Environment**: `BETA`, `PRODUCTION_INACTIVE` o `PRODUCTION_ACTIVE`.
2. **Severity**: `SEV-1`, `SEV-2`, `SEV-3` o `SEV-4`.
3. **Detection time**: timestamp UTC o offset-aware.
4. **Observed condition**: cosa è stato osservato, senza deduzioni non provate.
5. **User/data impact**: impatto noto; usare `UNKNOWN` se non ancora determinato.
6. **Real data involved**: `YES`, `NO` o `UNKNOWN`.
7. **Immediate containment**: azione già eseguita oppure `NONE`.
8. **Owner action required**: decisione o verifica richiesta al proprietario.
9. **Evidence links**: almeno un riferimento verificabile (run, commit, log, issue, receipt o provider page).
10. **Status**: `OPEN`, `CONTAINED`, `MONITORING`, `RESOLVED` oppure `FALSE_POSITIVE`.

## Severità

- **SEV-1** — perdita/confidenzialità dati, autenticazione compromessa, indisponibilità critica Production attiva o rischio immediato per dati professionali reali.
- **SEV-2** — funzione critica non disponibile, corruzione potenziale non confermata, restore/recovery non eseguibile quando richiesto.
- **SEV-3** — degrado significativo o errore persistente con workaround disponibile.
- **SEV-4** — anomalia minore, warning o finding senza impatto operativo immediato.

## Escalation minima

Per `SEV-1` e `SEV-2`, l'issue deve dichiarare esplicitamente **Owner action required** e non può essere chiusa senza una decisione registrata.

Per `SEV-3` e `SEV-4`, può essere chiusa dopo verifica tecnica purché la receipt finale riporti esito e prova.

## Receipt minima di chiusura

Prima della chiusura devono essere registrati:

- `finalStatus`;
- `rootCauseStatus`: `CONFIRMED`, `PARTIAL`, `UNKNOWN`, `NOT_APPLICABLE`;
- `containmentVerified`: true/false;
- `dataIntegrityVerified`: true/false/not_applicable;
- `followUpRequired`: true/false;
- link alle evidenze finali;
- commit o PR correttiva, se esiste.

La chiusura di una issue non implica automaticamente che Production sia promuovibile o attivabile.

## Regole di sicurezza

- Nessun segreto, password, token, cookie o service-role key deve essere scritto nell'issue.
- Nessun dato personale scolastico reale deve essere inserito per descrivere l'incidente.
- Se l'impatto dati è sconosciuto, usare `UNKNOWN` e trattare il caso conservativamente.
- L'agente può proporre, classificare e compilare una bozza, ma decisioni critiche e activation restano umane.

## Rehearsal richiesto

Il blocker `INCIDENT_ESCALATION_MINIMUM` può passare solo quando:

1. il template e questo contratto sono presenti su `develop`;
2. il gate `p7-incident/escalation-contract` è verde;
3. viene creata una issue sintetica di rehearsal con dati fittizi;
4. l'issue contiene tutti i campi minimi;
5. viene registrata una receipt finale e l'issue viene chiusa;
6. la readiness canonica viene aggiornata citando issue e commit di implementazione.

Il rehearsal non deve toccare Beta o Production.