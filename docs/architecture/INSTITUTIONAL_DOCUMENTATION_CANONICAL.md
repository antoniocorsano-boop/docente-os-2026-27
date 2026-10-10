# Documentazione istituzionale — contratto canonico

Data: 2026-10-07  
Stato: **CANONICAL DESIGN / DOCUMENTATION ONLY / HUMAN REVIEW REQUIRED FOR RUNTIME CHANGES**

## Scopo

La capability **Documentazione** di DOCENTE OS deve permettere al docente di predisporre documenti scolastici professionali, coerenti con le fonti istituzionali e con il lavoro realmente svolto, senza duplicare dati, ricostruire a memoria attività già registrate o affrontare moduli tecnici complessi.

Il principio guida è:

> **scrivere una volta, riutilizzare più volte.**

Documentazione non è un archivio parallelo e non è un generatore di testi isolato. È la superficie che compone dati, fonti, decisioni professionali ed evidenze già governati dai domini canonici di DOCENTE OS.

Questo contratto integra e rende coerenti:

- il design `DOC-04` per la Relazione finale;
- il canone `DOC-TPL-01` per i modelli documentali;
- il motore X5 per identità, versioni ed esportazione dei documenti;
- il raccordo curricolare Arena → DOCENTE OS;
- le precedenti analisi SchoolDocs sulla documentazione scolastica;
- i criteri grafici e tipografici già consolidati per documenti istituzionali, del docente e per studenti;
- gli indirizzi ricavati dall'**Atto di indirizzo della Dirigente scolastica del 6 ottobre 2026** per l'aggiornamento del PTOF 2025-2028.

## 1. Obiettivo umano

L'utente deve poter partire da un bisogno professionale espresso in linguaggio naturale, per esempio:

- «Devo preparare la programmazione della 2C»;
- «Devo aggiornare un'UDA»;
- «Devo preparare il programma svolto»;
- «Devo chiudere la relazione finale».

Il sistema deve recuperare ciò che conosce già e chiedere soltanto ciò che manca o che richiede una decisione professionale.

Il docente non deve conoscere:

- identificatori tecnici;
- versioni interne;
- nomi di tabelle;
- codici di template;
- provenienza tecnica;
- struttura del registro dei modelli.

Tali elementi restano disponibili per controllo, audit e manutenzione, ma non sono parte del percorso quotidiano.

## 2. Semplicità d'uso come requisito di prodotto

La semplicità non è una riduzione dei contenuti istituzionali. È una riduzione delle operazioni richieste al docente.

Regole obbligatorie:

1. **Non richiedere due volte un dato già noto.** Istituto, anno scolastico, docente, classe e disciplina vengono ereditati dal contesto quando disponibili.
2. **Una sola azione primaria per stato.** Per esempio: `Prepara bozza`, `Continua`, `Controlla`, `Finalizza`, `Esporta`.
3. **Nessun modulo iniziale esteso.** Il documento nasce con i dati già disponibili; le integrazioni vengono richieste nel punto in cui servono.
4. **Progressione per necessità.** Le opzioni avanzate restano nascoste finché non sono pertinenti.
5. **Anteprima professionale sempre comprensibile.** Il docente vede il documento come apparirà, non una rappresentazione tecnica del modello.
6. **Correzione nel contesto.** Un dato mancante deve indicare chiaramente cosa manca e dove correggerlo.
7. **Mobile prima di tutto per le operazioni frequenti.** Sul telefono la composizione usa una sequenza verticale, leggibile e senza tabelle di configurazione dense.
8. **Il registro dei modelli non è il percorso principale.** La maggior parte dei docenti sceglie un tipo di documento, non un template.
9. **Nessuna sincronizzazione nascosta.** Aggiornamenti di fonti istituzionali o curricolari devono essere confrontati e confermati quando possono modificare un documento professionale.
10. **Decisione professionale sempre umana.** Il sistema può proporre e comporre; il docente valida e finalizza.

## 3. Quattro livelli documentali

### 3.1 Fonti istituzionali

Documenti e riferimenti che orientano la progettazione e la documentazione:

- Atto di indirizzo;
- PTOF;
- RAV;
- Piano di miglioramento;
- curricolo d'istituto;
- criteri e regolamenti pertinenti;
- altre fonti istituzionali approvate.

Queste fonti sono **riferimenti**, non moduli da ricopiare.

### 3.2 Riferimenti disciplinari condivisi

- curricolo verticale;
- curricolo disciplinare;
- programmazione dipartimentale;
- criteri di valutazione;
- riferimenti condivisi per educazione civica e percorsi trasversali.

Il curricolo adottato resta governato dalla relativa autorità curricolare; DOCENTE OS ne usa uno snapshot applicabile e non lo riscrive silenziosamente.

### 3.3 Documenti professionali del docente

Prima famiglia prevista:

- Programmazione annuale / Piano annuale;
- UDA;
- Programma svolto;
- Relazione finale.

Famiglie successive possono comprendere verbali, relazioni o altri documenti professionali, ma soltanto attraverso un'estensione esplicita del canone dei modelli.

### 3.4 Evidenze e monitoraggio

- lezioni e attività registrate;
- materiali e prodotti pertinenti;
- verifiche ed evidenze;
- recupero, consolidamento e potenziamento;
- osservazioni aggregate compatibili con la privacy;
- scostamenti tra previsto ed effettivamente svolto;
- esiti di monitoraggio.

Le evidenze alimentano i documenti senza trasformarsi automaticamente in giudizi professionali.

## 4. Grafo documentale canonico

```text
Atto di indirizzo / RAV / PdM / PTOF
                ↓
        curricolo adottato
                ↓
      curricolo disciplinare
                ↓
  Programmazione / Piano annuale
                ↓
               UDA
                ↓
 lezioni / materiali / verifiche
                ↓
      evidenze e monitoraggio
          ↙             ↘
Programma svolto     Relazione finale
```

Ogni nodo mantiene la propria funzione. Il sistema riusa i dati, ma non fonde documenti con finalità diverse.

## 5. Raccordo con l'Atto di indirizzo 2026/2027

L'Atto di indirizzo del 6 ottobre 2026 richiede un raccordo sistematico fra RAV, Piano di miglioramento, PTOF, programmazione curricolare, progettazione educativa, inclusione, formazione, monitoraggio e rendicontazione.

Per Documentazione ciò diventa un requisito strutturale, non un testo da duplicare.

Quando pertinente al tipo di documento, il modello deve poter rappresentare:

- livello di partenza / contesto;
- destinatari e bisogni;
- competenze e obiettivi;
- risultati attesi;
- tempi;
- risorse e strumenti;
- metodologie;
- inclusione e personalizzazione;
- indicatori e strumenti di rilevazione;
- monitoraggio;
- documentazione degli esiti;
- raccordo tra progettato ed effettivamente realizzato.

Il sistema deve inoltre rispettare tre regole specifiche:

- **Educazione civica:** dimensione trasversale; non viene inventata una quota oraria obbligatoria per la singola disciplina. Le attività vengono riportate quando effettivamente documentate o confermate.
- **Intelligenza Artificiale:** l'assistenza generativa è subordinata a controllo umano, tutela dei dati, trasparenza interna e verifica dell'affidabilità; non sostituisce il giudizio professionale.
- **Monitoraggio:** non basta attestare che un'attività sia stata svolta; dove il documento lo richiede devono poter emergere esiti, scostamenti e impatto rispetto agli obiettivi.

## 6. Struttura dati della Programmazione annuale

La Programmazione annuale non deve essere un testo libero monolitico.

La struttura canonica è composta, quando applicabile, da:

```text
contesto
→ competenze
→ obiettivi
→ nuclei / contenuti
→ attività
→ metodologie
→ inclusione e personalizzazione
→ educazione civica / raccordi trasversali
→ verifica
→ criteri di valutazione
→ recupero / consolidamento / potenziamento
→ monitoraggio
```

PDF e DOCX sono rappresentazioni esportate di dati e decisioni professionali versionati; non sono la sorgente primaria del lavoro.

## 7. Architettura dei modelli: base istituzionale + modello specifico

Ogni documento professionale deriva da **due livelli distinti e complementari**.

### 7.1 Base grafica istituzionale condivisa

La base istituzionale governa gli elementi comuni a tutte le famiglie documentali:

- identità e denominazione dell'Istituto;
- eventuale marchio o logo approvato;
- intestazione e piè di pagina;
- tipografia;
- gerarchia dei titoli;
- spaziature e margini;
- geometria della pagina;
- regole per numerazione e interruzioni di pagina;
- resa delle tabelle;
- blocchi data, luogo e firma;
- criteri di leggibilità, stampa e accessibilità;
- eventuali elementi cromatici istituzionali ammessi.

Questa base è **comune**. Un singolo documento non deve ricostruirla autonomamente.

### 7.2 Modello specifico della famiglia documentale

Ogni famiglia definisce invece:

- scopo professionale;
- sezioni semantiche;
- ordine e obbligatorietà delle sezioni;
- campi e contenuti richiesti;
- regole condizionali;
- uso appropriato di testo, tabelle e selezioni guidate;
- criteri di composizione da dati esistenti;
- punti che richiedono giudizio del docente;
- eventuali vincoli specifici di esportazione.

Esempi:

```text
BASE ISTITUZIONALE
├── Programmazione annuale
├── UDA
├── Programma svolto
└── Relazione finale
```

Il modello specifico eredita la base istituzionale e può usare soltanto le variazioni dichiarate e governate dal canone `DOC-TPL-01`.

## 8. Separazione fra contenuto e resa grafica

La stessa informazione professionale non deve essere duplicata per ottenere PDF, DOCX o anteprima.

Pipeline canonica:

```text
fonti + dati + decisioni del docente
              ↓
      contenuto strutturato
              ↓
 modello specifico del documento
              ↓
     base grafica istituzionale
              ↓
     renderer condiviso
       ↙       ↓       ↘
 anteprima    PDF     DOCX
```

Anteprima ed esportazione devono derivare dalla stessa versione salvata del documento e dalla stessa versione dei modelli applicati.

## 9. Versionamento dei modelli

La base istituzionale e i modelli specifici sono versionati.

Regole:

- un documento finalizzato conserva il riferimento alle versioni con cui è stato prodotto;
- l'aggiornamento futuro della grafica istituzionale non modifica retroattivamente documenti finalizzati;
- una nuova versione di un modello specifico non riscrive documenti precedenti;
- l'attivazione di una nuova versione richiede controllo di qualità e decisione umana;
- nella UI quotidiana il docente non vede identificatori o numeri tecnici di versione.

## 10. Esperienza della superficie Documentazione

La superficie principale deve rispondere a una domanda semplice:

> **Che documento devi preparare o continuare?**

Vista proposta:

```text
Documentazione

Da preparare
In corso
Pronti / finalizzati
Archivio

Tipi di documento
- Programmazione annuale
- UDA
- Programma svolto
- Relazione finale
```

L'ingresso contestuale è preferibile quando il docente arriva da Classe, Piano annuale, UDA o altra superficie che conosce già anno, classe e disciplina.

Percorso minimo:

```text
scegli / apri documento
→ controlla dati già compilati
→ integra soltanto ciò che manca
→ guarda anteprima
→ valida
→ esporta
```

La configurazione dei modelli resta una funzione secondaria e distinta dal percorso di redazione.

## 11. Linguaggio della UI

La UI usa parole professionali comprensibili:

- `Bozza`;
- `Da completare`;
- `Pronta per controllo`;
- `Validata`;
- `Finale`;
- `Dati mancanti`;
- `Aggiorna dai dati registrati`;
- `Da dove viene?`.

Sono vietate nell'interfaccia ordinaria etichette come `registry`, `schema`, `templateVersionId`, `provenance`, `resolver`, `payload`, `UUID` o equivalenti tecnici.

## 12. Purezza dell'output professionale

Il documento finale deve apparire come un normale documento dell'Istituto.

Non deve contenere:

- codici interni;
- identificatori tecnici;
- nomi di tabelle o componenti;
- percorsi di file;
- dati di provenienza tecnica;
- provider o modelli di IA;
- formule come «generato automaticamente»;
- metadati del workflow.

Il controllo tecnico rimane disponibile internamente, ma non contamina il documento.

## 13. Privacy e controllo umano

- nessun dato personale non necessario viene introdotto automaticamente;
- la documentazione di classe usa dati aggregati quando sufficiente;
- diagnosi e categorie sensibili non vengono inferite né importate automaticamente nella redazione;
- la generazione non finalizza mai un documento;
- ogni documento professionale resta sotto responsabilità e decisione del docente;
- l'origine dei dati è ispezionabile internamente senza essere stampata.

## 14. Relazione con DOC-TPL-01 e DOC-04

`DOC-TPL-01` governa:

- identità e famiglia del modello;
- base istituzionale condivisa;
- modelli specifici;
- versioni;
- struttura semantica;
- regole di resa;
- qualità e attivazione.

`DOC-04` governa, per la Relazione finale:

- composizione delle evidenze;
- distinzione tra documentato, derivato, proposto e giudizio professionale;
- readiness;
- revisione e finalizzazione umana;
- provenienza interna;
- raccordo previsto / svolto / esiti.

X5 governa identità del documento, versioni salvate ed esportazione.

## 15. Criteri di accettazione della semplicità

Una verticale documentale è qualificabile soltanto se:

1. non richiede dati già disponibili nel contesto;
2. non presenta un modulo esteso come primo passo;
3. mostra una sola azione primaria coerente con lo stato;
4. distingue chiaramente ciò che è compilato da ciò che manca;
5. permette di comprendere il documento dall'anteprima senza conoscere il motore interno;
6. è utilizzabile da mobile con flusso verticale;
7. mantiene la stessa identità grafica istituzionale delle altre famiglie;
8. applica il modello specifico corretto per il tipo di documento;
9. non espone identificatori o metadati tecnici;
10. non modifica silenziosamente documenti salvati quando cambiano fonti o modelli;
11. lascia al docente ogni giudizio professionale e la finalizzazione;
12. produce un output autonomamente leggibile e utilizzabile in ambito scolastico.

## 16. Decisioni congelate

- **Documentazione è una capability nativa di DOCENTE OS**, non un'applicazione separata.
- **Le fonti istituzionali orientano i documenti ma non vengono ricopiate meccanicamente.**
- **I dati si acquisiscono una volta e si riutilizzano lungo il ciclo professionale.**
- **Curricolo, programmazione, UDA, attività, programma svolto e relazione finale restano semanticamente distinti.**
- **La base grafica istituzionale è condivisa da tutte le famiglie.**
- **Ogni famiglia possiede un modello specifico sopra la base comune.**
- **Anteprima, PDF e DOCX derivano dalla stessa sorgente strutturata e dalle stesse versioni di modello.**
- **L'interfaccia quotidiana non espone la complessità del motore dei modelli.**
- **Educazione civica non riceve quote disciplinari inventate.**
- **IA opzionale, subordinata e mai sostitutiva del docente.**
- **Privacy by default e validazione/finalizzazione esclusivamente umane.**
- **Nessun riferimento tecnico compare nell'output professionale.**
