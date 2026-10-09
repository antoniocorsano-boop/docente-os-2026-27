# Document Template Engine — canonical contract

## Purpose

Documentazione usa un unico motore per progettare e governare modelli documentali istituzionali. I file già utilizzati dalla scuola sono sorgenti di riferimento: aiutano a comprendere funzione, prassi e informazioni necessarie, ma non obbligano DOCENTE OS a riprodurne impaginazione, duplicazioni o limiti storici.

Il motore deve separare con chiarezza **identità grafica istituzionale comune** e **struttura specifica della singola famiglia documentale**. Un documento non definisce da solo la propria veste grafica: eredita la base istituzionale approvata e vi applica il modello semantico della propria famiglia.

## Ownership

`DOC-TPL-01` possiede esclusivamente:

- identità e famiglia del modello;
- versioni canoniche del modello;
- base grafica istituzionale condivisa;
- struttura semantica di sezioni e campi della famiglia documentale;
- regole di resa documentale;
- collegamento alle sorgenti di riferimento;
- controllo di qualità del modello;
- decisione umana di attivazione.

Non possiede dati di classe, Piano annuale, lezioni registrate, evidenze, UDA, fonti didattiche o contenuti professionali di un documento compilato.

## Source and canonical template are different things

La sorgente viene conservata come evidenza storica. Il modello canonico può:

- riordinare sezioni;
- eliminare duplicazioni;
- accorpare informazioni equivalenti;
- sostituire griglie inutili con testo professionale;
- usare tabelle solo quando migliorano confronto o sintesi;
- aggiornare lessico e struttura;
- progettare da zero un documento che non possiede ancora una sorgente.

Una nuova sorgente non modifica retroattivamente un modello attivo o un documento già finalizzato.

## Two-layer template model

Ogni documento professionale deriva da due livelli versionati e distinti.

### Institutional shell

La base istituzionale condivisa governa gli elementi trasversali a tutte le famiglie:

- denominazione e identità dell'Istituto;
- marchio o logo approvato;
- intestazione e piè di pagina;
- tipografia e gerarchia dei titoli;
- margini, spaziature e geometria A4;
- regole comuni per tabelle e blocchi testuali;
- numerazione e interruzioni di pagina;
- blocchi data, luogo e firma;
- criteri di leggibilità, stampa e accessibilità;
- eventuali elementi cromatici istituzionali ammessi.

La base istituzionale non contiene la semantica della Programmazione, dell'UDA, del Programma svolto o della Relazione finale.

### Document-family template

Ogni famiglia definisce invece:

- funzione professionale del documento;
- sezioni semantiche;
- ordine e obbligatorietà delle sezioni;
- campi e contenuti richiesti;
- regole condizionali;
- uso appropriato di testo, tabelle e selezioni guidate;
- punti che possono essere composti da dati già disponibili;
- punti che richiedono giudizio o conferma del docente;
- eventuali vincoli specifici di resa.

Gerarchia canonica:

```text
INSTITUTIONAL_SHELL
├── ANNUAL_PLAN
├── UDA
├── COMPLETED_PROGRAM
└── FINAL_REPORT
```

Un modello di famiglia eredita la base istituzionale. Può variare soltanto gli elementi dichiarati dal proprio contratto; non può ridefinire autonomamente identità, tipografia o regole comuni di impaginazione.

## Stable version, pin and governance contract

La regola di ownership stabile è:

```text
InstitutionalBaseVersion = autorità sulla presentazione istituzionale condivisa
DocumentTemplateVersion = autorità sulla semantica della famiglia documentale
AuthoredDocumentVersion = autorità su contenuto/versione + pin esatti a entrambi
Template governance = autorità lifecycle OWNER|ADMIN al trusted boundary; MEMBER non modifica la disponibilità istituzionale
Registry lifecycle = review/attivazione/blocco/rimozione blocco/ritiro trusted e tracciati; RETIRED è storico e read-only
Renderer = composizione pura delle versioni esattamente pinnate; nessuna risoluzione silenziosa della versione corrente
```

Ogni versione di documento a valle deve poter conservare esattamente queste quattro coordinate:

```text
institutional_base_id
institutional_base_version_no
family_template_id
family_template_version_no
```

Anteprima, rendering ed esportazione storica usano quelle coordinate come contratto: non sostituiscono una base o un modello con la versione attiva più recente. Un’identità `BLOCKED` o `RETIRED` non è selezionabile per nuovi documenti, ma le versioni storiche già pinnate restano risolvibili per le superfici autorizzate.

Le operazioni istituzionali `Attiva`, `Blocca`, `Rimuovi blocco` e `Ritira` sono autorizzate soltanto a `OWNER|ADMIN`, con ruolo ricalcolato nel trusted boundary. `MEMBER` può consultare secondo le policy del workspace ma non può mutare la disponibilità istituzionale. `RETIRED` è terminale per la stessa identità: tutte le mutazioni successive falliscono chiuse, mentre le letture storiche esatte restano disponibili.

## Shared rendering contract

Contenuto e resa grafica restano separati.

```text
structured document content
        ↓
document-family template
        ↓
institutional shell
        ↓
shared renderer
  ↙      ↓      ↘
preview  PDF    DOCX
```

Anteprima, PDF e DOCX devono derivare dalla stessa versione salvata del documento e dalle stesse versioni di shell e template di famiglia. Il passaggio da un formato di esportazione all'altro non deve richiedere duplicazione del contenuto professionale.

Una nuova versione della base istituzionale o del modello di famiglia non modifica retroattivamente documenti già finalizzati.

## Quality before activation

Una versione può diventare attiva solo dopo:

1. validazione deterministica della struttura;
2. controllo di qualità documentale;
3. esito `PASS` o `PASS_WITH_NOTES` sulla review più recente della versione;
4. conferma umana esplicita.

Il controllo considera almeno funzione, chiarezza semantica, necessità dei dati, privacy, adeguatezza di tabelle/checklist/testo, coerenza con gli altri documenti, coerenza con la base istituzionale e purezza dell'output.

Il risultato e i findings usati per autorizzare l’attivazione sono ricalcolati nel trusted boundary sui dati persistiti. La UI può rappresentare l’esito, ma non può sostituire o migliorare localmente una review trusted mancante o bloccante.

## Institutional output is clean

Il documento professionale non espone il funzionamento interno di DOCENTE OS. Non devono comparire codici di dominio o di piano, identificatori tecnici, nomi di tabelle o entità software, stati interni, percorsi di archiviazione, impronte tecniche, provenienza di sistema, nomi di provider o formule che dichiarino una generazione automatica.

La provenienza rimane disponibile alle funzioni interne di controllo e audit, non alla resa professionale. Il gate di purezza è applicato anche nel trusted Quality Review dei due stream, affinché un payload professionalmente impuro non possa ottenere una review persistita valida per l’attivazione.

## Representation rules

- **Dati essenziali** per intestazioni e metadati professionali realmente utili.
- **Tabella** per confronti, corrispondenze e sintesi strutturate.
- **Testo professionale** per giudizi, motivazioni, andamento ed esiti.
- **Selezione guidata** per vere scelte multiple, con integrazione testuale quando serve.
- **Chiusura e firma** per gli elementi formali finali.

La geometria del vecchio file non è un contratto di dominio.

## First certified family

La prima famiglia pilota è **Relazione finale del docente**. La struttura canonica comprende:

1. Intestazione;
2. Profilo e andamento della classe;
3. Percorso didattico effettivamente svolto;
4. Esiti del percorso;
5. Metodologie, strumenti e inclusione;
6. Verifica e valutazione;
7. Educazione civica e raccordi trasversali, quando pertinenti;
8. Considerazioni conclusive;
9. Luogo, data e firma.

Programmazione annuale e Programma svolto restano documenti distinti, con funzioni proprie.

## Runtime boundaries

- Registry e versioni sono workspace-scoped e protetti da RLS.
- Le versioni semantiche, della base istituzionale e le review restano storiche e immutabili.
- Le scritture avvengono tramite boundary governati, non tramite write dirette del client autenticato.
- Una sola variante canonica per famiglia può essere attiva nello stesso workspace.
- Una sola base istituzionale corrente viene applicata ai nuovi documenti, salvo varianti esplicitamente approvate.
- Il motore non dipende da un provider generativo.
- `Documentazione` resta una destinazione secondaria: la bottom navigation mobile non cambia.

## Daily UX boundary

Il registro dei modelli è una superficie amministrativa/secondaria. Il docente, nel percorso quotidiano, sceglie il **tipo di documento** e lavora sul contenuto; non deve scegliere identificatori di template, versioni o varianti tecniche.

Il sistema eredita automaticamente il modello attivo pertinente e mostra una normale anteprima istituzionale. Eventuali cambi di modello che incidono su un documento già in lavorazione richiedono confronto e decisione esplicita, mai sostituzione silenziosa.

## Downstream contract

`DOC-01/X5` userà versioni precise della base istituzionale e del template di famiglia per creare documenti versionati. `DOC-04` fornirà contenuti e giudizi professionali alla Relazione finale, mantenendo separati dati documentati, derivazioni, conferme del docente e provenienza interna.

Dipendenza canonica:

`DOC-TPL-01 → DOC-01/X5 → DOC-04`
