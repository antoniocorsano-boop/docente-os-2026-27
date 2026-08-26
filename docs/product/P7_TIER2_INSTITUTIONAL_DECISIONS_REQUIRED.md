# P7 Tier 2 — Decisioni istituzionali richieste

## Stato

- Perimetro: `SINGLE_OWNER_PILOT`
- Tier 2: `TIER_2_SCHOOL_PERSONAL_DATA = NOT_ADMITTED`
- Evidenze esterne verificate: `0/4`
- Questo documento **non è un atto autorizzativo**. È il quadro delle decisioni che l'Istituto deve assumere e delle evidenze necessarie per renderle verificabili.

## Decisione E1 — Institutional Controller Authority

### Domanda istituzionale

L'Istituto autorizza l'impiego di Docente OS, nel perimetro `SINGLE_OWNER_PILOT`, per finalità istituzionali determinate e con categorie di dati personali scolastici espressamente delimitate?

### Decisioni da assumere

1. Identificare il **titolare del trattamento**.
2. Identificare il **ruolo/soggetto autorizzato** a utilizzare Docente OS.
3. Approvare le **finalità istituzionali** ammesse.
4. Approvare le **categorie di interessati**.
5. Approvare le **categorie di dati personali** ammesse.
6. Approvare le **categorie esplicitamente escluse**.
7. Individuare la **base/autorità del trattamento** secondo la governance del titolare.
8. Imporre eventuali ulteriori condizioni.

### Posizione tecnica raccomandata

Esito suggerito: `CONDITIONAL`, limitato a:

- un solo docente nominato;
- pseudonimo studente come default;
- nessun nome diretto dello studente come default;
- nessuna categoria particolare;
- nessuna credenziale o segreto;
- nessun invio di dati personali a servizi AI esterni;
- signup pubblico, multi-tenant e migrazione automatica Beta → Production disabilitati.

### Evidenza che chiude E1

Atto/decisione istituzionale stabile o protocollata contenente almeno: titolare, ruolo autorizzato, finalità, interessati, categorie dati consentite/vietate, autorità del trattamento, esito, data, ruolo approvatore e versione. La receipt repository registra riferimento stabile e SHA-256 della versione approvata.

---

## Decisione E2 — Transparency & Rights Routing

### Domanda istituzionale

L'informativa vigente copre espressamente il trattamento Docente OS oppure occorre approvare un'integrazione? Quali canali e ruoli gestiscono i diritti applicabili?

### Decisioni da assumere

1. Stabilire `EXISTING_NOTICE_COVERS`, `INTEGRATION_APPROVED` oppure `NOT_COVERED`.
2. Confermare il canale di contatto del titolare.
3. Confermare il contatto RPD/DPO o funzione privacy, ove applicabile.
4. Rendere coerenti informativa e E1 su finalità, interessati e categorie dati.
5. Rendere trasparenti i servizi/responsabili rilevanti.
6. Inserire criteri/periodi di conservazione coerenti con E4.
7. Stabilire il routing istituzionale per accesso, rettifica, export/cancellazione ove applicabili, opposizione/limitazione ed escalation privacy.

### Posizione tecnica raccomandata

Usare `EXISTING_NOTICE_COVERS` **solo se esiste una mappatura esplicita** tra informativa vigente e trattamento Docente OS. In caso contrario predisporre un'integrazione approvata.

### Evidenza che chiude E2

Informativa vigente mappata oppure integrazione approvata, con riferimento/versione/data/approvatore, canali dei diritti documentati e SHA-256 della versione approvata.

---

## Decisione E3 — DPIA Screening

### Domanda istituzionale

Il trattamento Tier 2 previsto richiede una DPIA?

### Decisioni da assumere

Il titolare, con il coinvolgimento privacy previsto, deve valutare e motivare almeno:

- presenza di minori/soggetti vulnerabili;
- scala e frequenza;
- eventuale monitoraggio sistematico;
- combinazione/correlazione di dataset;
- eventuale uso innovativo della tecnologia con rischio elevato;
- possibili effetti sull'esercizio di diritti o servizi;
- ulteriori criteri previsti dalla propria governance.

L'esito deve essere uno solo:

- `DPIA_REQUIRED`; oppure
- `DPIA_NOT_REQUIRED_WITH_RATIONALE`.

### Posizione tecnica raccomandata

**Nessun esito predeterminato.** Il prodotto fornisce i fatti tecnici ma non decide se una DPIA sia necessaria.

### Evidenza che chiude E3

Scheda di screening approvata con criteri valutati, motivazione, esito, data, ruolo approvatore, coinvolgimento RPD/DPO ove previsto, riferimento/versione e SHA-256.

Se l'esito è `DPIA_REQUIRED`, E3 produce un **nuovo gate**: la DPIA deve essere completata e approvata prima della chiusura di T2D.

---

## Decisione E4 — Purpose-specific Retention Schedule

### Domanda istituzionale

Per ogni categoria di dato personale autorizzata in E1, qual è la finalità specifica, quando inizia il periodo di conservazione, quanto dura o quale evento ne determina la cancellazione, e cosa accade alla scadenza?

### Decisioni da assumere

Per ogni categoria E1 devono essere definiti:

1. finalità specifica;
2. evento iniziale del conteggio;
3. periodo oppure trigger oggettivo di cancellazione;
4. azione `DELETE`, `ANONYMIZE` o `REVIEW`;
5. eventuale eccezione/obbligo di conservazione motivato;
6. ruolo responsabile;
7. accettazione del principio di recovery:

`RESTORE -> REAPPLY_DELETION_JOURNAL -> VERIFY -> REOPEN`

### Posizione tecnica raccomandata

Adottare i **periodi più brevi compatibili con la finalità istituzionale**, preferendo trigger oggettivi e verificabili. Espressioni come “finché serve” o “indefinito” non sono sufficienti.

### Evidenza che chiude E4

Matrice di conservazione approvata che copra **tutte e sole** le categorie autorizzate in E1, con riferimento, data, ruolo approvatore, versione e SHA-256.

---

# Ordine consigliato delle decisioni

L'ordine corretto è **E1 → E4 → E2 → E3**.

E1 definisce cosa e perché si vuole trattare. E4 può quindi fissare la conservazione sulle sole categorie realmente ammesse. E2 recepisce finalità, categorie, servizi e retention nell'informativa e nel routing dei diritti. E3 valuta infine il trattamento completo e concretamente definito.

# Regola di chiusura

Il gate T2D può avanzare solo quando esistono **4/4 receipt verificate**. Anche allora il Tier 2 resta `NOT_ADMITTED` fino a una distinta autorizzazione umana finale. Nessun template, bozza o raccomandazione tecnica equivale a una decisione istituzionale.
