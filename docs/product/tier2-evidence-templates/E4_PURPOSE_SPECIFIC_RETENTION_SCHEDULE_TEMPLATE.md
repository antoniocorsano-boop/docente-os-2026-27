# E4 — Purpose-specific Retention Schedule

**Stato del template:** PREPARED_NOT_APPROVED  
**Gate:** `PURPOSE_SPECIFIC_RETENTION_SCHEDULE`  
**Effetto su Tier 2:** nessuno finché i periodi/trigger non sono approvati dal titolare.

## 1. Oggetto della decisione

Definire, per ogni categoria di dato Tier 2 eventualmente ammessa, **finalità, durata o trigger oggettivo di conservazione e azione a scadenza**. Il prodotto non imposta autonomamente periodi istituzionali.

## 2. Vincoli tecnici già definiti

- cancellazione live: DB + Storage applicativi;
- export owner-scoped disponibile prima della cancellazione;
- backup off-site soggetti a retention tecnica separata;
- dopo un restore, le cancellazioni già deliberate devono essere riconciliate prima della riapertura operativa;
- nessuna cancellazione distruttiva dei backup bloccati prima della loro naturale scadenza;
- categorie particolari fuori perimetro;
- dati identificativi diretti non ammessi per default.

## 3. Matrice da approvare

Compilare una riga per ogni categoria effettivamente ammessa.

| Categoria dati | Finalità specifica | Evento iniziale | Periodo o trigger di cancellazione | Azione a scadenza | Eccezione/obbligo di conservazione | Ruolo responsabile |
|---|---|---|---|---|---|---|
| pseudonimo studente | `DA_DECIDERE` | `DA_DECIDERE` | `DA_DECIDERE` | `DELETE | ANONYMIZE | REVIEW` | `DA_DECIDERE` | `DA_DECIDERE` |
| associazione classe-pseudonimo | `DA_DECIDERE` | `DA_DECIDERE` | `DA_DECIDERE` | `DELETE | ANONYMIZE | REVIEW` | `DA_DECIDERE` | `DA_DECIDERE` |
| note didattiche personali eventualmente ammesse | `DA_DECIDERE` | `DA_DECIDERE` | `DA_DECIDERE` | `DELETE | ANONYMIZE | REVIEW` | `DA_DECIDERE` | `DA_DECIDERE` |
| documenti/asset contenenti dati Tier 2 ammessi | `DA_DECIDERE` | `DA_DECIDERE` | `DA_DECIDERE` | `DELETE | REVIEW` | `DA_DECIDERE` | `DA_DECIDERE` |

Aggiungere o rimuovere righe in base alle categorie realmente autorizzate in E1. **La matrice E4 non può ampliare le categorie autorizzate da E1.**

## 4. Backup e recovery

Il titolare prende atto che le copie di disaster recovery possono sopravvivere temporaneamente alla cancellazione live per il periodo tecnico di retention già configurato. Deve approvare il seguente principio operativo:

`RESTORE -> REAPPLY_DELETION_JOURNAL -> VERIFY -> REOPEN`

Decisione sul principio di riconciliazione: `APPROVED | REJECTED | DA_DECIDERE`

## 5. Approvazione

- ruolo approvatore: `DA_DECIDERE`
- data decisione: `DA_DECIDERE`
- riferimento atto/protocollo: `DA_DECIDERE`
- versione documento: `DA_DECIDERE`

## 6. Registrazione dell'evidenza

La receipt deve registrare il riferimento stabile e lo SHA-256 della matrice approvata, senza pubblicare nel repository contenuti personali non necessari.

## 7. Condizione di chiusura

E4 è soddisfatta solo se **ogni categoria ammessa in E1** ha una regola di conservazione o un trigger oggettivo approvato. Valori generici come `finché serve`, `indefinito` o campi `DA_DECIDERE` non chiudono il gate.
