# P7 / T2A — Data Minimization Policy

Stato: **SATISFIED POLICY ONLY / TIER 2 NOT ADMITTED**

Questa policy chiude il workstream T2A sul piano di governance. Non autorizza l'ingresso di dati personali scolastici in Production e non modifica lo stato `TIER_2_SCHOOL_PERSONAL_DATA = NOT_ADMITTED`.

## Principio operativo

Il default è: **non raccogliere dati personali se non esiste una finalità esplicita e una necessità dimostrabile**.

La policy applica, in forma di prodotto, i principi di limitazione della finalità, minimizzazione, limitazione della conservazione, integrità/riservatezza e accountability richiamati dall'art. 5 GDPR e dalle indicazioni del Garante per la protezione dei dati personali.

Riferimenti istituzionali:
- https://www.garanteprivacy.it/home/principi-fondamentali-del-trattamento
- https://www.garanteprivacy.it/temi/scuola

## Categorie potenzialmente ammissibili nella prima versione Tier 2

Solo dopo la chiusura degli altri gate e una nuova decisione umana potranno essere valutati:

- riferimento studente pseudonimo locale;
- contesto classe/sezione strettamente necessario;
- dati strutturati di avanzamento didattico, limitati alla finalità e privi di categorie particolari o informazioni su terzi.

Il nome diretto dello studente **non è ammesso nella prima versione Tier 2**. L'eventuale introduzione di identificatori diretti richiede un gate ulteriore specifico.

## Categorie escluse

Restano escluse dalla prima versione Tier 2:

- nome diretto, contatti, indirizzo e data di nascita;
- dati personali di familiari, colleghi o altri terzi;
- salute, disabilità, DSA/BES e altri dati assimilabili a categorie particolari;
- religione o convinzioni;
- dati biometrici;
- dati politici, sindacali o relativi all'orientamento sessuale;
- testo libero disciplinare/delicato o testo personale non vincolato;
- credenziali e segreti;
- allegati contenenti dati personali, finché non esiste un gate specifico.

## Regole a livello di campo

- `studentReference`: token pseudonimo locale, senza nome, email, telefono, indirizzo o data di nascita;
- `classContext`: minimo contesto classe/sezione necessario alla funzione;
- `progressData`: campi strutturati, finalizzati e privi di dati diagnostici, sanitari, familiari o religiosi;
- `freeText`: vietato di default per dati personali nella prima versione Tier 2;
- `attachments`: vietati fino a gate specifico.

## AI boundary

I dati personali Tier 2 non possono essere inviati di default a servizi AI esterni. Qualunque uso futuro richiede una revisione dedicata del fornitore/processore e del flusso dati.

## Effetto sul programma P7

`T2A_DATA_MINIMIZATION_POLICY = SATISFIED`

Restano aperti e bloccanti:

- `T2B_APPLICATION_RETENTION_DELETION`;
- `T2C_PERSONAL_DATA_EXPORT_DELETION`;
- `T2D_DEDICATED_PRIVACY_REVIEW`.

Anche dopo la loro eventuale chiusura, il Tier 2 non potrà attivarsi automaticamente: sarà necessaria una nuova decisione umana esplicita.
