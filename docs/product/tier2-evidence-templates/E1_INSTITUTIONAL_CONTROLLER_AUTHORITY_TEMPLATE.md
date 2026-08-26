# E1 — Institutional Controller Authority

**Stato del template:** PREPARED_NOT_APPROVED  
**Gate:** `INSTITUTIONAL_CONTROLLER_AUTHORITY`  
**Effetto su Tier 2:** nessuno finché l'evidenza approvata non viene registrata e verificata.

## 1. Oggetto della decisione

L'Istituto valuta e, se del caso, autorizza l'impiego di **Docente OS** nel perimetro `SINGLE_OWNER_PILOT` per finalità istituzionali definite dal titolare, mantenendo le restrizioni tecniche già imposte dal prodotto.

## 2. Contesto tecnico precompilato

- ambiente: Production separata da Beta;
- accesso: singolo proprietario nominato;
- signup pubblico: disabilitato;
- onboarding multi-tenant: disabilitato;
- migrazione automatica Beta → Production: disabilitata;
- trasferimento di dati personali a servizi AI esterni: non ammesso;
- categorie particolari: non ammesse senza gate separato;
- credenziali e segreti: mai ammessi;
- dati personali scolastici Tier 2: attualmente `NOT_ADMITTED`.

## 3. Decisioni che spettano all'Istituto

Compilare e approvare formalmente:

- **Titolare del trattamento:** `DA_DECIDERE`
- **Soggetto/ruolo autorizzato a utilizzare Docente OS:** `DA_DECIDERE`
- **Finalità istituzionali ammesse:** `DA_DECIDERE`
- **Categorie di interessati ammesse:** `DA_DECIDERE`
- **Categorie di dati personali ammesse:** `DA_DECIDERE`
- **Categorie di dati personali esplicitamente escluse:** `DA_DECIDERE`
- **Base/autorità del trattamento individuata dal titolare:** `DA_DECIDERE`
- **Eventuali ulteriori condizioni o limitazioni:** `DA_DECIDERE`

## 4. Esito istituzionale

- decisione: `APPROVED | CONDITIONAL | REJECTED | DA_DECIDERE`
- ruolo approvatore: `DA_DECIDERE`
- data decisione: `DA_DECIDERE`
- riferimento atto/protocollo: `DA_DECIDERE`
- versione documento: `DA_DECIDERE`

## 5. Registrazione dell'evidenza

Il documento approvato non deve essere copiato nel repository pubblico se contiene firme, nominativi o altri dati non necessari. Nel repository viene registrata solo una receipt con:

- `evidenceReference` stabile;
- `documentDate`;
- `approverRole`;
- `decision`;
- `sha256` della versione approvata/protocollata;
- `verified = true` solo dopo controllo umano della corrispondenza.

## 6. Condizione di chiusura

E1 può essere considerata soddisfatta solo se il titolare ha assunto una decisione esplicita e documentata. **Docente OS non determina autonomamente la base giuridica né può auto-autorizzare il trattamento.**
