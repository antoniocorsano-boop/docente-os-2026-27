# DOCENTE OS — P7 Supabase Auth Service Recovery Receipt

Stato: **PASS / CANONICAL RECEIPT**  
Data prova: 2026-08-25  
Gate: `SUPABASE_AUTH_SERVICE_RECOVERY`

## Evidenza primaria

- workflow: `P7 Supabase Auth Service Recovery`;
- run: `32841165988`;
- job: `97780759559`;
- head testato: `ad322767f1189e8a2a9a706f3b5aef4dec99c92d`;
- implementazione integrata con PR #195, merge `849f0b74e1ace3cb33a231a83ec9a9351cfa67cd`;
- ambiente: stack Supabase completo effimero in GitHub Actions;
- GoTrue: `v2.195.0` nel run certificato;
- Mailpit locale usato per verificare l'emissione della mail di recovery.

## Sequenza provata

La prova ha usato esclusivamente una identità sintetica e ha verificato end-to-end:

1. creazione di un utente Auth confermato;
2. login con password iniziale;
3. richiesta `POST /auth/v1/recover` accettata da GoTrue;
4. email di recovery realmente catturata da Mailpit;
5. generazione e verifica di un recovery action link da GoTrue;
6. emissione di una sessione di tipo recovery;
7. cambio password attraverso la sessione di recovery;
8. rifiuto della password precedente;
9. login riuscito con la nuova password.

Risultato del runner:

- `gotrueServiceExercised = true`;
- `recoverEndpointAccepted = true`;
- `recoveryEmailCapturedByMailpit = true`;
- `recoverySessionIssued = true`;
- `passwordChangedThroughRecoverySession = true`;
- `oldPasswordRejected = true`;
- `newPasswordAccepted = true`.

## Isolamento e sicurezza

- dati reali usati: **false**;
- Beta toccato: **false**;
- Production toccata: **false**;
- risorsa Supabase remota creata: **false**;
- runner e container locali eliminati a fine job;
- nessuna credenziale Beta o Production usata nel rehearsal.

Il tentativo precedente di usare una Supabase development branch remota era stato bloccato dal piano Free; il tentativo di creare un progetto temporaneo a costo $0 era stato bloccato dal limite di due progetti Free attivi. Questi blocchi non hanno creato risorse remote.

## Classificazione

`SUPABASE_AUTH_SERVICE_RECOVERY = PASS`.

Questa evidenza prova il comportamento del servizio GoTrue/Supabase Auth in uno stack Supabase completo e isolato. Non costituisce una prova di disaster recovery gestito dell'infrastruttura cloud Supabase stessa, né autorizza l'attivazione della Production.

Resta separato il blocker `OFFSITE_STORAGE_RECOVERY`, relativo alla copia indipendente e al restore binario degli oggetti Storage.
