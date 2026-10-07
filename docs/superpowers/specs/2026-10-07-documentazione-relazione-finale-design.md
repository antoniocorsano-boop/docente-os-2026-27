# DOCENTE OS — Documentazione professionale e verticale Relazione finale

Data: 2026-10-07  
Stato: **DESIGN SPEC / HUMAN REVIEW REQUIRED / NO IMPLEMENTATION AUTHORIZED**  
Codice di lavoro: **DOC-04**  
Baseline di progetto: `develop@4c3c7f7d0bd4ad56d9d1427f141a8a4ec9283b84`

## 1. Decisione di prodotto

DOCENTE OS introduce una capability denominata **Documentazione** per trasformare dati, fonti, attività ed evidenze già posseduti dai domini canonici in documenti professionali del docente, senza duplicare la source of truth sottostante.

La prima verticale è **Relazione finale** perché attraversa l'intera catena professionale:

`curricolo/programmazione → Piano annuale → attività realmente svolte → evidenze → scostamenti → valutazione professionale → documento finale`

La capability non ricostruisce SchoolDocs come applicazione separata. Recupera invece i principi utili già emersi nel lavoro storico — provenienza, versionamento, composizione, revisione umana e distinzione fra canone e attuazione — e li integra nel runtime attuale di DOCENTE OS.

La verticale deve essere utile anche senza provider generativi: la raccolta dei dati, il controllo di completezza, la composizione strutturale, l'editing, il versionamento e l'esportazione restano funzioni del prodotto.

## 2. Obiettivo umano

A fine anno il docente non deve ricostruire a memoria mesi di lavoro né copiare informazioni già presenti altrove.

Il sistema deve permettere di arrivare da:

> «Devo preparare la relazione finale della 2C»

ad una superficie che risponde immediatamente a:

1. **Quali dati possiedo già?**
2. **Che cosa manca davvero?**
3. **Quali affermazioni derivano da registrazioni verificabili?**
4. **Quali parti richiedono invece un giudizio professionale del docente?**
5. **Qual è la versione che sto revisionando?**
6. **Che cosa sto validando come definitivo?**
7. **Da quali fonti deriva il documento esportato?**

Successo della verticale: il docente deve dedicare il proprio tempo alla **valutazione professionale e alla revisione**, non alla ricostruzione amministrativa di dati già registrati.

## 3. Vincoli canonici esistenti

La progettazione rispetta i seguenti confini già presenti nel prodotto.

### 3.1 Proprietà dei dati

- **Classe/sezione** resta posseduta dal registro canonico delle sezioni.
- **Piano annuale e stato B01–B33** restano posseduti dal dominio Piano annuale.
- **Esecuzione reale** resta posseduta da `TeachingSession` e dalle sue evidenze.
- **UDA e progettazione** restano possedute dal dominio Progetta/Knowledge secondo i relativi contratti.
- **Fonti e documenti importati** restano `KnowledgeAsset` e relative generazioni.
- **Impostazioni professionali e istituto** restano nelle impostazioni del workspace.
- **Documentazione** possiede esclusivamente il documento professionale composto: identità, versioni, stato di revisione/finalizzazione e manifest di provenienza della singola versione.

Una superficie di Documentazione può leggere e comporre gli altri domini, ma non acquisisce il diritto di modificarli.

### 3.2 Canone vs accaduto

Il Piano annuale descrive ciò che è programmato e conserva lo stato professionale dei blocchi. `TeachingSession` descrive ciò che è stato realmente registrato dal docente, con durata, data, note, provenienza ed eventuale allocazione ai blocchi.

La Relazione finale deve **comporre** queste due prospettive e non usarne una come sostituto dell'altra.

In particolare:

- una `TeachingSession` non rende automaticamente `SVOLTO` un blocco del Piano;
- un blocco `SVOLTO` non autorizza a inventare dettagli di una sessione non registrata;
- le sessioni diagnostiche, di recupero o trasversali possono esistere senza allocazione Bxx;
- gli scostamenti devono restare visibili come scostamenti, non essere riscritti retroattivamente nel canone.

### 3.3 Human-in-the-loop

La validazione di una Relazione finale è una **decisione istituzionale/professionale umana**. Un assistente può leggere, sintetizzare e proporre, ma non può validare o finalizzare autonomamente il documento.

## 4. Stato tecnico riusabile

DOCENTE OS possiede già una prima infrastruttura documentale X5:

- `authored_documents`;
- `authored_document_versions`;
- salvataggi come versioni immutabili;
- controllo di concorrenza ottimistico;
- accesso RLS per workspace;
- scritture tramite boundary dedicati, non via `insert/update/delete` diretto;
- authoring UDA con fonte originale immutata;
- cronologia versioni;
- esportazione da una versione salvata e immutabile;
- anteprima A4 e stampa/salvataggio PDF senza nuova dipendenza PDF.

La verticale DOC-04 deve **generalizzare questo motore**, non crearne un secondo.

Limite attuale da superare: X5 è deliberatamente UDA-specifico. `document_kind` accetta solo `UDA`, `source_asset_id` è obbligatorio e il repository espone `openUda()`. Una Relazione finale deriva invece da più fonti e da un contesto di sezione/anno, quindi non può essere modellata come copia editabile di un singolo `KnowledgeAsset`.

## 5. Alternative architetturali esaminate

### A. Nuovo archivio `final_reports`

Creare tabelle, editor ed export separati per la Relazione finale.

**Vantaggio:** implementazione locale apparentemente semplice.  
**Svantaggi:** duplica versionamento, concorrenza, RLS, export e provenienza; crea un secondo motore documentale; rende più difficile aggiungere Programmazione, Programma svolto e verbali.

**Decisione: respinta.**

### B. Documento generato al volo senza persistenza

Comporre ogni volta la relazione dalle fonti correnti e lasciare all'utente solo l'esportazione.

**Vantaggio:** nessuna nuova persistenza.  
**Svantaggi:** non conserva la versione effettivamente revisionata; le fonti possono cambiare; non esiste una storia professionale del documento; impossibile distinguere bozza, validazione e finale.

**Decisione: respinta.**

### C. Generalizzazione X5 + manifest di fonti per versione

Estendere l'authoring esistente a più tipi documentali e legare ogni versione a uno **snapshot di composizione/provenienza** che elenca gli input realmente usati.

**Vantaggi:** riuso di versioning/RLS/export; un solo motore documentale; provenienza verificabile; compatibilità con UDA; estensibilità futura a Programmazione, Programma svolto, verbali e altri documenti.

**Decisione raccomandata.**

## 6. Nuovo confine di capability

### 6.1 Owner proposto

**Documentazione professionale** diventa owner soltanto di:

- identità del documento composto;
- tipo documentale;
- contesto professionale del documento;
- versioni immutabili del testo;
- manifest di input/provenienza associato a ciascuna versione;
- decisioni umane di validazione/finalizzazione;
- proiezione per esportazione della versione scelta.

Non possiede né copia come fonte autonoma:

- sezioni;
- Piano annuale;
- TeachingSession;
- osservazioni/evidenze;
- UDA;
- Knowledge;
- curricolo istituzionale;
- dati di calendario/orario.

Questa estensione della mappa di capability richiede approvazione architetturale esplicita prima dell'implementazione.

### 6.2 Principio di ricostruibilità

Il **read model di preparazione** della Relazione finale deve essere ricostruibile dagli owner sottostanti.

Il **documento revisionato**, invece, è un nuovo artefatto professionale e deve essere persistito perché contiene interventi umani, versioni e una decisione finale che non sono ricostruibili deterministicamente dalle fonti.

## 7. Modello documentale proposto

L'implementazione dovrà preservare compatibilità con le UDA X5 esistenti.

### 7.1 `authored_documents`

Generalizzazione concettuale:

```text
id
workspace_id
academic_year_id
document_kind
source_asset_id?      # obbligatorio per UDA, non per Relazione finale
section_id?           # obbligatorio per FINAL_REPORT
teaching_discipline_id?
title
current_version_no
created_by
created_at
updated_at
```

Tipi iniziali:

```text
UDA
FINAL_REPORT
```

I tipi successivi (`ANNUAL_PROGRAMMING`, `PROGRAM_CARRIED_OUT`, ecc.) non vengono implementati nella verticale DOC-04, ma il modello non deve impedirli.

Invarianti:

- `UDA` mantiene l'attuale vincolo di `source_asset_id`;
- `FINAL_REPORT` richiede anno scolastico e sezione canonica dello stesso workspace/anno;
- una Relazione finale è unica per `workspace + academic_year + section + discipline + document_kind`, salvo futura decisione esplicita su più relazioni per la stessa disciplina;
- la navigazione non crea documenti: la creazione avviene solo dopo azione esplicita del docente.

### 7.2 `authored_document_versions`

Il contenuto resta immutabile dopo il salvataggio:

```text
id
document_id
version_no
title
body_markdown
created_by
created_at
```

Ogni salvataggio produce una nuova versione, mantenendo il comportamento X5.

### 7.3 Manifest di provenienza per versione

Nuovo concetto: **Document Source Manifest**.

Ogni versione della Relazione finale deve essere associata agli input che hanno sostenuto la composizione iniziale o un aggiornamento guidato.

Campi logici minimi per una voce:

```text
version_id
source_kind
source_ref
source_version_ref?
role
captured_at
source_fingerprint?
summary_snapshot?
```

`source_kind` deve poter distinguere almeno:

- `TEACHER_SETTINGS`;
- `SECTION`;
- `TEACHING_ASSIGNMENT`;
- `ANNUAL_PLAN_CANON`;
- `ANNUAL_PLAN_PROGRESS`;
- `TEACHING_SESSION`;
- `TEACHING_OBSERVATION`;
- `TEACHING_EVIDENCE`;
- `KNOWLEDGE_ASSET`;
- `KNOWLEDGE_GENERATION`;
- `TEACHER_INPUT`;
- `TEMPLATE`.

Il manifest non crea una nuova source of truth: serve a spiegare **quali versioni/fonti sono state usate per produrre quella specifica versione del documento**.

Per le fonti versionabili deve essere fissato il riferimento preciso alla generazione/versione usata, non solo l'identificatore logico corrente.

### 7.4 Decisioni di revisione e finalizzazione

Non si deve rendere mutabile una versione soltanto per cambiarne lo stato.

Si propone un registro separato di decisioni:

```text
document_version_id
decision = VALIDATED | FINALIZED | REOPENED
actor_id
decided_at
note?
```

Regole:

- `VALIDATED`: il docente dichiara di avere revisionato professionalmente la versione;
- `FINALIZED`: quella versione diventa la versione finale corrente;
- un successivo intervento non altera il contenuto finalizzato: crea una nuova versione e, se necessario, una nuova finalizzazione;
- le versioni finali precedenti restano storicamente consultabili;
- nessun modello generativo può creare una decisione `VALIDATED` o `FINALIZED`.

## 8. Read model `FinalReportEvidenceBundle`

Prima di creare una bozza, DOCENTE OS costruisce un read model **non persistente** che mostra ciò che sa e ciò che non sa.

Struttura logica:

```text
context
  workspace
  academicYear
  teacher
  school
  section
  discipline

planned
  canonicalPlan
  UDA / nuclei
  expectedBlocks

executed
  annualPlanProgress
  teachingSessions
  allocatedMinutes
  unallocatedSessions
  deviations

observed
  classObservations
  anonymousGroupObservations
  evidenceReferences

institutionalSources
  curriculumBinding
  explicitlySelectedTemplate
  relevantVerifiedKnowledge

humanRequired
  classOverview
  methodologyJudgement
  overallAssessment
  reasonsForDeviations
  inclusionSummary
  civicEducationSummary
  finalReflection
  nextYearIndications

missingInformation
provenance
```

Il bundle è una **proiezione**, non un nuovo database.

## 9. Classificazione dei dati nella bozza

Ogni elemento usato nella relazione deve appartenere internamente a una delle seguenti classi:

### DOCUMENTED

Dato proveniente da record persistente o fonte versionata verificabile.

Esempi:

- identità della classe;
- disciplina;
- data/durata di una TeachingSession;
- blocco Bxx e relativo stato;
- nota/evidenza registrata;
- UDA appartenente al piano canonico;
- asset Knowledge e generazione usata.

### DERIVED

Calcolo deterministico a partire da dati documentati.

Esempi:

- numero di blocchi per stato;
- minuti complessivi di sessioni valide;
- distribuzione temporale;
- elenco degli scostamenti registrati;
- confronto fra previsto ed eseguito.

Ogni derivazione deve avere una regola testabile e non dipendere da un modello generativo.

### TEACHER_CONFIRMED

Valutazione, interpretazione o formulazione esplicitamente confermata dal docente.

Esempi:

- andamento complessivo della classe;
- efficacia metodologica;
- qualità della partecipazione;
- valutazione degli esiti;
- motivazione pedagogica di uno scostamento;
- indicazioni per l'anno successivo.

### PROPOSED

Testo proposto da un sistema assistivo ma non ancora confermato.

Non può essere presentato come fatto né rendere il documento «validato».

### TO_VERIFY

Informazione incompleta, incoerente o priva di fonte sufficiente.

Deve restare visibile come elemento da controllare e non essere trasformata automaticamente in testo assertivo.

## 10. Readiness: niente percentuale cosmetica

DOCENTE OS non deve mostrare un «87% completo» se il numero non deriva da una regola professionale esplicita.

Stati raccomandati:

- **DATI_INSUFFICIENTI** — mancano fonti minime per iniziare una bozza significativa;
- **PRONTA_PER_BOZZA** — esiste contesto sufficiente per comporre la struttura e i fatti documentati;
- **RICHIEDE_INTEGRAZIONI** — la bozza esiste ma restano campi professionali necessari;
- **PRONTA_PER_REVISIONE** — tutti i campi obbligatori sono presenti, ma non ancora validati;
- **VALIDATA** — una versione è stata revisionata e validata dal docente;
- **FINALE** — una versione è stata esplicitamente finalizzata.

Il sistema deve mostrare **quali elementi** determinano lo stato, non solo l'etichetta.

## 11. Contenuto della Relazione finale

La struttura deve essere governata da un modello configurabile e, quando disponibile, da un **template di istituto esplicitamente selezionato**. DOCENTE OS non deve assumere che esista un unico modello normativo nazionale di Relazione finale.

Baseline semantica della verticale:

1. **Intestazione**
   - istituto;
   - anno scolastico;
   - docente;
   - disciplina;
   - classe/sezione.

2. **Riferimento alla programmazione**
   - percorso annuale adottato;
   - nuclei/UDA essenziali;
   - eventuale riferimento al curricolo istituzionale verificato.

3. **Sviluppo effettivo del percorso**
   - attività/UDA/blocchi effettivamente attestati;
   - periodizzazione;
   - sessioni significative;
   - attività trasversali registrate.

4. **Scostamenti e rimodulazioni**
   - previsto vs svolto;
   - recuperi, rimodulazioni, annullamenti;
   - motivazioni solo se documentate o confermate dal docente.

5. **Metodologie, strumenti e ambienti**
   - da fonti/progettazioni confermate quando disponibili;
   - altrimenti campo professionale del docente;
   - vietato inferire automaticamente una metodologia dalla sola presenza di un materiale.

6. **Evidenze e valutazione**
   - tipi di evidenze registrate;
   - criteri/rubriche solo se fonti effettivamente collegate;
   - valutazione complessiva come giudizio professionale umano.

7. **Partecipazione e andamento della classe**
   - può essere assistita dalle osservazioni di classe/gruppi anonimi;
   - non deve trasformare indicatori osservativi in giudizi certi sugli apprendimenti;
   - formulazione finale confermata dal docente.

8. **Inclusione e adattamenti**
   - sintesi professionale generale;
   - nessun caricamento automatico di diagnosi, condizioni sanitarie o dati personali degli alunni;
   - nessun nome alunno nella composizione predefinita;
   - eventuali elementi sensibili richiedono caso d'uso e policy separati.

9. **Educazione civica / trasversalità**
   - inclusa solo quando esistono attività/evidenze o input esplicito;
   - non dedotta automaticamente dalla semplice affinità tematica di una UDA.

10. **Considerazioni finali e continuità**
    - punti di forza/criticità;
    - eventuali nuclei da riprendere;
    - indicazioni utili per l'anno successivo;
    - formulazione finale del docente.

Il **Programma svolto** resta un documento distinto nella futura DOC-03. DOC-04 può mostrare una sintesi del percorso svolto e usare gli stessi dati, ma non deve cancellare la distinzione tra i due artefatti professionali.

## 12. Regole di composizione deterministica

La prima bozza deve poter essere costruita senza AI.

Un compositore deterministico deve poter:

- inserire intestazione e contesto;
- elencare il percorso pianificato;
- ricavare stati Bxx e date di esecuzione disponibili;
- aggregare durate reali delle TeachingSession valide, evitando doppio conteggio delle sessioni superseded;
- distinguere sessioni allocate al canone e sessioni non allocate;
- elencare scostamenti registrati;
- sintetizzare in forma tabellare/strutturata le evidenze;
- predisporre segnaposto espliciti per i giudizi professionali mancanti.

La prosa narrativa può essere:

1. scritta direttamente dal docente; oppure
2. proposta dall'assistente partendo dallo stesso bundle tracciabile.

La disponibilità di un provider AI non è un requisito per aprire, completare, validare o esportare il documento.

## 13. Ruolo dell'assistenza generativa

L'assistente può:

- spiegare cosa manca;
- sintetizzare fonti documentate;
- proporre una formulazione più leggibile;
- confrontare previsto e registrato;
- segnalare incoerenze;
- proporre una bozza di un paragrafo indicando le evidenze usate.

Non può:

- inventare attività non registrate;
- dedurre esiti di apprendimento dalla sola copertura del Piano;
- trasformare `DEVELOPING/CONSOLIDATED` in voti o giudizi individuali;
- dichiarare svolta una parte non supportata;
- modificare Piano, TeachingSession o Knowledge durante la composizione;
- validare/finalizzare il documento;
- esportare su sistemi esterni senza conferma esplicita.

Ogni proposta generativa resta `PROPOSED` fino a intervento umano.

## 14. Esperienza utente della verticale

### 14.1 Ingresso

Nuova superficie primaria completa:

`/documentazione`

Non viene aggiunta inizialmente una sesta destinazione alla barra mobile inferiore. La superficie è raggiungibile da:

- navigazione completa/menu generale;
- Home quando esiste un compito documentale pertinente;
- Classe;
- Piano annuale;
- eventuali richiami contestuali nel periodo di chiusura dell'anno.

### 14.2 Elenco Relazioni finali

`/documentazione/relazioni-finali`

Mostra per ogni sezione/discipline pertinente:

- classe;
- stato di readiness;
- eventuale documento esistente e sua versione;
- ultima revisione;
- prossima azione umana.

Nessun codice CAN o UUID al primo livello.

### 14.3 Superficie focalizzata di sezione

`/documentazione/relazioni-finali/<sectionId>`

Sequenza cognitiva:

1. **Dove sono?** — Relazione finale · Tecnologia · 2C · 2026/27.
2. **Che cosa sa già il sistema?** — fatti disponibili e fonti.
3. **Che cosa manca?** — massimo elenco prioritario di integrazioni reali.
4. **Che cosa faccio adesso?** — una sola azione primaria coerente con lo stato.

Azioni primarie per stato:

- `DATI_INSUFFICIENTI` → **Controlla ciò che manca**;
- `PRONTA_PER_BOZZA` → **Crea bozza**;
- `RICHIEDE_INTEGRAZIONI` → **Completa la relazione**;
- `PRONTA_PER_REVISIONE` → **Rivedi la versione**;
- `VALIDATA` → **Finalizza**;
- `FINALE` → **Esporta / consulta versione finale**.

Dettagli tecnici e provenienza sono accessibili su richiesta, non competono con l'azione primaria.

### 14.4 Editor

L'editor deve riusare il paradigma X5:

- titolo;
- contenuto modificabile;
- salvataggio come nuova versione immutabile;
- cronologia;
- indicazione chiara delle modifiche non salvate;
- controllo di concorrenza.

La verticale dovrà valutare se il textarea Markdown attuale è sufficiente o se il documento richiede una superficie a blocchi più strutturata. La scelta dell'editor non deve cambiare il modello di versionamento.

## 15. Evidenza visibile, senza sovraccarico

Per ogni sezione significativa del documento deve essere possibile aprire **Perché compare qui?** e vedere, in forma umana:

- dati registrati che la supportano;
- eventuale fonte istituzionale;
- eventuale formulazione proposta;
- eventuale campo compilato dal docente.

Questa vista è diagnostica e di fiducia, non deve diventare un pannello tecnico sempre aperto.

## 16. Privacy e minimizzazione

La verticale parte da un principio restrittivo:

- nessun dato nominativo degli studenti è necessario per produrre la Relazione finale di classe;
- osservazioni supportate sono `CLASS` o `ANONYMOUS_GROUP`;
- nessuna inferenza su salute, BES/DSA, disabilità o altre categorie sensibili;
- nessuna acquisizione automatica di dati sensibili da documenti Knowledge;
- eventuale futura documentazione individuale è fuori perimetro e richiederà specifica privacy dedicata;
- il bundle passato a un provider generativo contiene soltanto i dati minimi necessari alla sezione richiesta.

## 17. Esportazione

DOC-04 riusa il contratto X5B:

- si esporta **una versione salvata**;
- l'apertura dell'anteprima non produce write;
- versione corrente e versioni storiche restano distinguibili;
- versione, anno scolastico e provenienza essenziale sono visibili;
- resa A4 e stampa/salvataggio PDF riusano il renderer già qualificato, generalizzandolo oltre `UDA`.

### Fuori perimetro iniziale

- generazione nativa DOCX non ancora verificata nel runtime corrente;
- scrittura automatica su Drive;
- invio e-mail;
- protocollazione;
- firma digitale.

Qualunque esportazione/salvataggio verso Drive è una `WRITE_EXTERNAL` e richiederà una tranche separata con conferma esplicita.

## 18. Template di istituto

La Relazione finale deve poter adottare un modello fornito dall'istituto senza farne una nuova autorità curricolare.

Approccio previsto:

- template importato/conservato in Knowledge con provenienza;
- associazione esplicita del template alla classe di documento `FINAL_REPORT`;
- struttura/placeholder interpretati da un adapter di template;
- contenuti del documento sempre versionati nel motore Documentazione;
- cambio template non riscrive retroattivamente una versione già finalizzata.

La prima verticale può partire dal template interno canonico se nessun modello d'istituto è configurato, ma deve dichiararlo chiaramente.

## 19. Coerenza temporale e snapshot

Una Relazione finale non deve cambiare silenziosamente perché le fonti cambiano dopo la creazione della bozza.

Regola:

- la pagina di readiness legge lo stato corrente;
- **Crea bozza** cattura il manifest degli input usati;
- una funzione **Aggiorna dai dati registrati** può proporre un nuovo confronto tra snapshot della versione e fonti correnti;
- l'aggiornamento non modifica la versione esistente: produce una nuova versione dopo conferma;
- una versione finalizzata resta legata alle fonti/snapshot che la sostenevano al momento della finalizzazione.

## 20. Correzioni e supersessione delle TeachingSession

Poiché `TeachingSession` può avere `supersedes_session_id`, il bundle deve usare soltanto la versione effettiva della catena di registrazione.

Il calcolo di:

- numero sessioni;
- minuti svolti;
- evidenze;
- osservazioni;

non deve sommare sia la sessione superseded sia la sua sostituzione.

Questa regola deve avere test dedicati.

## 21. Coerenza tra Piano ed evidenza reale

Il bundle deve segnalare almeno:

- blocco dichiarato `SVOLTO` senza TeachingSession allocata, se tale incoerenza è significativa per il contesto;
- TeachingSession allocata a un blocco ancora `PIANIFICATO`;
- sessioni non allocate;
- blocchi `RIMODULATO`, `RECUPERATO`, `ANNULLATO`;
- differenze fra durata pianificata e durata effettivamente registrata quando disponibili.

Questi elementi sono **segnalazioni di controllo**, non mutazioni automatiche.

DOC-04 non corregge il Piano e non registra retroattivamente lezioni per rendere «pulita» la relazione.

## 22. Educazione civica e attività trasversali

La verticale non deve assumere un monte ore disciplinare autonomo di Educazione civica né inventare una quota per materia.

La Relazione finale può includere attività di Educazione civica soltanto quando:

- sono esplicitamente collegate/registrate; oppure
- il docente le aggiunge e conferma.

La contabilizzazione istituzionale complessiva resta nel dominio appropriato e non viene reinterpretata da DOC-04.

## 23. Error handling e fail-closed

Il sistema deve fallire in modo comprensibile quando:

- `sectionId` non appartiene al workspace/anno corrente;
- manca un'identità disciplinare coerente;
- il Piano canonico è assente o non valido;
- una fonte Knowledge richiesta non appartiene al workspace;
- una generazione versionata non è disponibile;
- una versione documentale richiesta non esiste;
- il documento è stato modificato altrove dopo l'apertura;
- il template configurato non è leggibile.

Comportamento:

- nessun fallback verso dati di un'altra sezione;
- nessuna scelta automatica di una fonte «simile»;
- nessuna perdita della bozza locale in caso di conflitto;
- indicazione dell'azione correttiva più vicina al compito umano.

## 24. Sicurezza e writer boundary

Le nuove scritture seguono il modello X5:

- RLS deny-by-default;
- lettura limitata ai membri del workspace;
- creazione/salvataggio/finalizzazione tramite application boundary/RPC dedicati;
- direct write revocata alle tabelle documentali;
- validazione server-side di workspace, anno, sezione, disciplina e versione attesa;
- controllo di concorrenza ottimistico;
- nessuna write implicita del Copilota;
- nessuna write sui domini sorgente durante la composizione.

La finalizzazione deve richiedere un'azione umana esplicita e una preview dell'effetto: «questa versione diventa la versione finale corrente».

## 25. Perimetro DOC-04 pilota

### In scope

- nuova superficie `Documentazione`;
- catalogo minimo con `Relazione finale`;
- sezione/classe come verticale primaria;
- evidence bundle reale;
- readiness deterministica;
- creazione di una bozza versionata;
- editing e nuove versioni;
- manifest di provenienza per versione;
- validazione e finalizzazione umane;
- export PDF/stampa riusando X5B;
- desktop e mobile;
- test di sicurezza, coerenza, accessibilità e journey.

### Out of scope

- Programmazione annuale completa;
- Programma svolto autonomo;
- verbali/Collegio/dipartimento;
- documentazione individuale alunni;
- firma digitale;
- protocollo;
- invio automatico;
- DOCX nativo finché non viene progettato e qualificato;
- migrazione del vecchio SchoolDocs come runtime;
- qualunque modifica automatica a Piano, UDA o TeachingSession.

## 26. Scomposizione tecnica successiva alla specifica

La futura implementazione, se autorizzata dopo Human Review e piano dedicato, dovrebbe essere divisa in tranche indipendenti:

- **DOC-01A — Generalizzazione authoring X5**  
  Estendere il dominio documentale senza cambiare il comportamento UDA esistente.

- **DOC-04A — Evidence bundle + readiness**  
  Read-only, nessuna nuova bozza: prova che i dati reali sono componibili correttamente.

- **DOC-04B — Apertura e versionamento Relazione finale**  
  Nuovo `document_kind`, contesto sezione/disciplina, manifest input.

- **DOC-04C — Revisione, validazione e finalizzazione**  
  Decisioni umane auditabili e versioni finali immutabili.

- **DOC-04D — Export generalizzato**  
  Riuso X5B per `FINAL_REPORT`.

- **DOC-04E — Integrazione esperienza**  
  `/documentazione`, ingressi da Classe/Piano/Home, responsive.

- **DOC-04F — Certificazione**  
  E2E, RLS, race/concurrency, accessibilità, mobile, export, provenance e Human Review.

Nessuna tranche è autorizzata da questo documento: richiedono un piano di implementazione successivo all'approvazione della specifica.

## 27. Acceptance criteria funzionali

La verticale è accettabile quando:

1. un docente può aprire `Relazione finale` per una sezione canonica senza digitare codici tecnici;
2. il sistema mostra dati disponibili e mancanti senza inventare una percentuale arbitraria;
3. il bundle distingue previsto, registrato, derivato e giudizio umano;
4. sessioni superseded non vengono doppio-conteggiate;
5. sessioni senza Bxx restano visibili senza creare un'allocazione fittizia;
6. una bozza conserva il manifest preciso degli input usati;
7. modificare una fonte dopo la bozza non cambia retroattivamente la versione salvata;
8. ogni salvataggio crea una nuova versione immutabile;
9. un conflitto concorrente non sovrascrive il lavoro precedente;
10. la validazione/finalizzazione richiede decisione umana esplicita;
11. la finalizzazione non modifica Piano, TeachingSession, UDA o Knowledge;
12. una versione finale precedente resta consultabile dopo una revisione successiva;
13. l'export usa una versione salvata ed espone chiaramente versione/anno;
14. il sistema funziona senza provider AI;
15. l'assistenza generativa, se disponibile, non presenta inferenze come fatti;
16. nessun dato nominativo degli studenti entra automaticamente nella relazione;
17. la UI mobile conserva una sola azione primaria coerente con lo stato;
18. la nuova superficie non altera la membership della barra mobile inferiore senza decisione separata.

## 28. Acceptance criteria di qualità e governance

Gate minimi futuri:

- unit test del compositore e readiness;
- test deterministici dei calcoli;
- regressione completa X5A/X5B UDA;
- RLS e cross-workspace isolation;
- optimistic concurrency;
- fail-closed su sezione/anno/disciplina;
- snapshot/provenance immutabile;
- test session supersession;
- test sessioni allocate/non allocate;
- test assenza AI/provider;
- test `PROPOSED` vs `TEACHER_CONFIRMED`;
- test finalizzazione solo umana;
- WCAG 2.2 AA pertinente;
- browser journey desktop/mobile;
- stampa A4/PDF;
- Human Visual Acceptance;
- review indipendente prima dell'integrazione.

## 29. Verticale pilota di accettazione

Il pilot deve usare una sezione reale del workspace di prova con:

- Piano annuale canonico presente;
- almeno un blocco in stato non `PIANIFICATO`;
- almeno due TeachingSession, di cui una con allocazione Bxx;
- almeno una sessione/evidenza non allocata oppure un caso esplicito di rimodulazione;
- almeno una osservazione di classe o gruppo anonimo;
- almeno una fonte Knowledge verificata;
- nessun dato nominativo studente.

Journey:

```text
Documentazione
→ Relazioni finali
→ classe
→ verifica dati disponibili/mancanti
→ crea bozza
→ completa giudizi professionali
→ salva v2
→ controlla provenienza
→ valida
→ finalizza
→ esporta PDF
→ riapre v1/v2/finale e verifica storia
```

## 30. Decisioni aperte da risolvere nel piano, non nella UI

1. **Struttura del manifest:** tabella relazionale per source refs vs snapshot JSON normalizzato. Raccomandazione: riferimenti relazionali + payload snapshot minimo, evitando copie integrali dei domini.
2. **Editor:** mantenere Markdown X5 nella prima tranche oppure introdurre blocchi strutturati. Raccomandazione: non cambiare editor finché DOC-04A non dimostra un limite reale del Markdown corrente.
3. **Template di istituto:** formato iniziale supportato e mapping dei placeholder. Da progettare come tranche successiva se il pilot non ne ha bisogno.
4. **Disciplina:** usare `teaching_disciplines.id` come binding esplicito e non testo libero.
5. **Finalizzazione multipla:** mantenere storia di più versioni finali con una sola finale corrente.

## 31. Decisioni già congelate da questa specifica

Se approvata, la specifica congela i seguenti principi:

- **Documentazione è parte di DOCENTE OS**, non un'applicazione separata;
- **Relazione finale è la prima verticale**;
- **riuso/generalizzazione X5**, nessun secondo motore documentale;
- **nessuna duplicazione degli owner esistenti**;
- **evidence bundle read-only e ricostruibile**;
- **manifest di provenienza per ogni versione composta**;
- **versioni immutabili**;
- **giudizi professionali distinti dai fatti documentati**;
- **AI opzionale e subordinata**;
- **validazione/finalizzazione esclusivamente umane**;
- **privacy by default senza dati nominativi studenti**;
- **export iniziale tramite il percorso PDF/stampa già qualificato**;
- **nessun nuovo slot nella bottom navigation nella verticale iniziale**;
- **nessuna implementazione prima di piano e Human Review della specifica**.
