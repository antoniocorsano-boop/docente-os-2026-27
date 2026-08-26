# P7 — Real Data Admission Review

Stato: **READY FOR HUMAN DECISION**

La Production è già attiva in modalità `SINGLE_OWNER_PILOT`, ma il runtime attivo non equivale all'autorizzazione a introdurre dati professionali reali.

## Perimetro proposto

Il primo livello ammissibile è volutamente ristretto:

**`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`**

Può comprendere contenuti professionali del proprietario nominato che non contengono dati personali di studenti, famiglie, colleghi o altri terzi. Restano esclusi credenziali, segreti e qualunque dato appartenente alle categorie personali a rischio più elevato.

Esempi coerenti con Tier 1: programmazioni, UDA, rubriche generiche, modelli, materiali didattici propri, planning e documenti professionali privi di nominativi o altri identificatori personali di terzi.

## Dati non ammessi in questa fase

`TIER_2_SCHOOL_PERSONAL_DATA` resta **NOT_ADMITTED**.

Sono quindi esclusi, finché non esiste un gate dedicato, dati personali riferibili a studenti, famiglie, colleghi o altri terzi, incluse informazioni che possano identificare direttamente o indirettamente una persona.

Prima di un eventuale Tier 2 dovranno essere formalizzati almeno:

- policy di minimizzazione dei dati;
- retention e cancellazione a livello applicativo;
- procedura di export/cancellazione dei dati personali;
- review privacy dedicata.

## Invarianti

Restano invariati:

- single-owner only;
- signup pubblico OFF;
- multi-tenant OFF;
- auto-deploy Production OFF;
- copia automatica Beta → Production OFF;
- import manuale solo per azione esplicita del proprietario;
- backup/recovery e retention R2 già certificati;
- nessun ampliamento implicito dello scope.

## Decisione

Questo documento e il relativo validator **non autorizzano dati reali**. Preparano soltanto una decisione umana esplicita e limitata a Tier 1.

Finché la decisione resta `PENDING`, `realUserDataAccepted` rimane `false`.
