# E2 — Transparency & Rights Routing

**Stato del template:** PREPARED_NOT_APPROVED  
**Gate:** `TRANSPARENCY_AND_RIGHTS_ROUTING`  
**Effetto su Tier 2:** nessuno finché l'informativa/procedura non è approvata e verificata.

## 1. Oggetto della decisione

Il titolare verifica che l'uso previsto di **Docente OS** sia coperto da un'informativa approvata, oppure approva un'integrazione specifica, e stabilisce i canali attraverso cui gli interessati possono esercitare i diritti applicabili.

## 2. Contesto tecnico precompilato

Per il perimetro Tier 2 proposto:

- accesso applicativo limitato al `SINGLE_OWNER_PILOT`;
- dati identificativi diretti non ammessi per default dalla policy di minimizzazione;
- export del workspace vincolato a proprietario autenticato;
- cancellazione applicativa soggetta a decisione validata del proprietario;
- backup off-site soggetti a retention tecnica e riconciliazione delle cancellazioni dopo restore;
- nessun trasferimento di dati personali verso AI esterna senza gate separato.

## 3. Elementi che il titolare deve approvare

Indicare o allegare il riferimento all'informativa approvata che copre almeno:

- **identità e canale di contatto del titolare:** `DA_DECIDERE`
- **contatto RPD/DPO, ove applicabile:** `DA_DECIDERE`
- **finalità rilevanti per Docente OS:** `DA_DECIDERE`
- **base/autorità del trattamento:** `DA_DECIDERE`
- **categorie di dati e interessati:** `DA_DECIDERE`
- **destinatari/responsabili e servizi rilevanti:** `DA_DECIDERE`
- **criteri/periodi di conservazione:** `DA_DECIDERE`
- **informazioni sui diritti applicabili:** `DA_DECIDERE`

## 4. Routing operativo dei diritti

Definire i canali istituzionali per:

- accesso: `DA_DECIDERE`
- rettifica: `DA_DECIDERE`
- esportazione/portabilità ove applicabile: `DA_DECIDERE`
- cancellazione ove applicabile: `DA_DECIDERE`
- opposizione/limitazione ove applicabile: `DA_DECIDERE`
- escalation al RPD/DPO: `DA_DECIDERE`

Per ogni canale indicare il **ruolo responsabile**, non è necessario pubblicare nel repository dati personali del responsabile.

## 5. Esito istituzionale

- copertura: `EXISTING_NOTICE_COVERS | INTEGRATION_APPROVED | NOT_COVERED | DA_DECIDERE`
- ruolo approvatore: `DA_DECIDERE`
- data decisione: `DA_DECIDERE`
- riferimento informativa/protocollo: `DA_DECIDERE`
- versione documento: `DA_DECIDERE`

## 6. Registrazione dell'evidenza

La receipt canonica deve contenere `evidenceReference`, data, ruolo approvatore, esito e SHA-256 della versione approvata. `verified=true` è ammesso solo dopo verifica umana della corrispondenza fra receipt e documento.

## 7. Condizione di chiusura

E2 è soddisfatta soltanto quando informativa e routing dei diritti risultano effettivamente approvati dal titolare o dalla funzione privacy competente. Un template compilato ma non approvato **non è evidenza**.
