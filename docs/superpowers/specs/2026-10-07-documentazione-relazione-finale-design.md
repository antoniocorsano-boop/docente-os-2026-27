# DOCENTE OS — Documentazione professionale e verticale Relazione finale

Data: 2026-10-07  
Stato: **DESIGN SPEC / HUMAN REVIEW REQUIRED / NO IMPLEMENTATION AUTHORIZED**  
Codice di lavoro: **DOC-04**  
Baseline di progetto: `develop@4c3c7f7d0bd4ad56d9d1427f141a8a4ec9283b84`

## 1. Decisione proposta

DOCENTE OS introduce una capability denominata **Documentazione** per trasformare dati, fonti, attività ed evidenze già posseduti dai domini canonici in documenti professionali del docente, senza duplicare le source of truth sottostanti.

La prima verticale proposta è **Relazione finale**, perché attraversa l'intera catena professionale:

`curricolo/programmazione → Piano annuale → attività realmente svolte → evidenze → scostamenti → giudizio professionale → documento finale`

Non viene ricostruito SchoolDocs come applicazione separata. Vengono recuperati i principi utili emersi nel lavoro storico — provenienza, versionamento, composizione, revisione umana e distinzione fra canone e attuazione — integrandoli nel runtime corrente di DOCENTE OS.

La verticale deve restare pienamente utilizzabile senza provider generativi: raccolta dati, controllo di completezza, composizione strutturale, editing, versionamento, validazione ed esportazione sono funzioni del prodotto.

## 2. Obiettivo umano

A fine anno il docente non deve ricostruire a memoria mesi di attività né copiare informazioni che DOCENTE OS possiede già.

Partendo da «Devo preparare la relazione finale della 2C», la superficie deve rispondere a:

1. **Quali dati possiedo già?**
2. **Che cosa manca davvero?**
3. **Quali affermazioni derivano da registrazioni verificabili?**
4. **Quali parti richiedono un giudizio professionale del docente?**
5. **Quale versione sto revisionando?**
6. **Che cosa sto validando come definitivo?**
7. **Da quali fonti deriva la versione esportata?**

Il tempo del docente deve concentrarsi sulla **valutazione professionale e sulla revisione**, non sulla ricostruzione amministrativa.

## 3. Confini canonici da preservare

### 3.1 Proprietà dei dati

- **Classe/sezione**: registro canonico delle sezioni.
- **Piano annuale e stato B01–B33**: dominio Piano annuale.
- **Esecuzione reale**: `TeachingSession`, allocazioni ed evidenze.
- **UDA/progettazione**: Progetta/Knowledge secondo i contratti correnti.
- **Fonti importate**: `KnowledgeAsset` e relative generazioni.
- **Impostazioni professionali e istituto**: impostazioni del workspace.
- **Documentazione**: soltanto identità del documento composto, versioni, struttura semantica della versione, manifest di provenienza, decisioni di validazione/finalizzazione ed export della versione scelta.

Documentazione può **leggere e comporre**, ma non acquisisce il diritto di modificare gli owner sorgente.

### 3.2 Canone vs accaduto

Il Piano annuale descrive il percorso programmato e il suo stato professionale. `TeachingSession` descrive ciò che è stato realmente registrato dal docente, con data, durata, note, provenienza ed eventuale allocazione ai blocchi.

La Relazione finale compone le due prospettive senza sostituirne una con l'altra:

- una `TeachingSession` non rende automaticamente `SVOLTO` un Bxx;
- un Bxx `SVOLTO` non autorizza a inventare dettagli di una sessione non registrata;
- sessioni diagnostiche, di recupero o trasversali possono esistere senza allocazione Bxx;
- gli scostamenti restano scostamenti e non riscrivono retroattivamente il canone.

### 3.3 Decisione umana

Validare o finalizzare una Relazione finale è una **decisione professionale/istituzionale umana**. L'assistenza può leggere, sintetizzare e proporre, ma non può validare o finalizzare autonomamente.

## 4. Infrastruttura esistente da riusare

X5 fornisce già:

- `authored_documents` e `authored_document_versions`;
- versioni immutabili;
- concorrenza ottimistica;
- RLS per workspace;
- scritture tramite boundary dedicati;
- fonte UDA originale immutata;
- cronologia versioni;
- esportazione da versione salvata;
- anteprima A4 e stampa/salvataggio PDF.

DOC-04 **generalizza X5** e non crea un secondo motore documentale.

Limiti attuali: `document_kind` accetta solo `UDA`, `source_asset_id` è obbligatorio e il repository espone un flusso UDA-specifico. Una Relazione finale deriva invece da più owner e da un contesto `anno + sezione + disciplina`.

## 5. Alternative esaminate

### A — Nuovo archivio `final_reports`

Più semplice localmente, ma duplica versionamento, RLS, concorrenza, export e provenienza.

**Respinta.**

### B — Relazione generata al volo senza persistenza

Evita nuove tabelle, ma non conserva la versione realmente revisionata né il contesto delle fonti usate.

**Respinta.**

### C — Generalizzazione X5 + struttura semantica + manifest per versione

Un solo motore documentale, con versionamento esistente e tracciabilità degli input.

**Raccomandata.**

## 6. Nuovo confine di capability proposto

**Documentazione professionale** diventa owner soltanto di:

- identità del documento composto;
- tipo e contesto professionale;
- versioni immutabili del contenuto;
- struttura semantica delle sezioni della versione;
- manifest degli input/provenienza della versione;
- decisioni umane di validazione/finalizzazione;
- proiezione di export.

Non possiede sezioni, Piano, TeachingSession, osservazioni, evidenze, UDA, Knowledge, curricolo, Orario o Calendario.

Questa è una **estensione esplicita della Capability Ownership Map** e deve essere approvata prima dell'implementazione.

Il read model di preparazione deve essere ricostruibile dagli owner sottostanti. Il documento revisionato, invece, è un nuovo artefatto professionale e va persistito perché contiene interventi e decisioni umane non ricostruibili deterministicamente.

## 7. Modello documentale

### 7.1 Generalizzazione `authored_documents`

Modello concettuale:

```text
id
workspace_id
academic_year_id
document_kind
source_asset_id?          # richiesto per UDA
section_id?               # richiesto per FINAL_REPORT
teaching_discipline_id?   # richiesto per FINAL_REPORT
title
current_version_no
created_by
created_at
updated_at
```

Tipi autorizzati nel pilot:

```text
UDA
FINAL_REPORT
```

Invarianti:

- `UDA` mantiene il contratto X5 attuale e richiede `source_asset_id`;
- `FINAL_REPORT` richiede anno, sezione e disciplina coerenti nello stesso workspace;
- una relazione è unica per `workspace + anno + sezione + disciplina + tipo`;
- la sola navigazione non crea un documento;
- l'apertura/creazione richiede un'azione esplicita del docente.

### 7.2 `authored_document_versions`

Il testo salvato resta immutabile:

```text
id
document_id
version_no
title
body_markdown
created_by
created_at
```

Ogni salvataggio crea una nuova versione e conserva la concorrenza ottimistica X5.

### 7.3 Struttura semantica della versione

La sola stringa Markdown non è sufficiente per una Relazione finale tracciabile. Serve una struttura immutabile associata alla versione, senza obbligare subito a sostituire l'editor.

Modello logico:

```text
version_id
section_key
ordinal
title
content_markdown
content_classification
```

Esempi `section_key`:

```text
HEADER
PLANNING_REFERENCE
EXECUTION
DEVIATIONS
METHODS_TOOLS
EVIDENCE_ASSESSMENT
CLASS_PROGRESS
INCLUSION
CIVIC_EDUCATION
FINAL_REFLECTION
NEXT_YEAR
```

`content_classification`:

```text
DOCUMENTED
DERIVED
TEACHER_CONFIRMED
PROPOSED
TO_VERIFY
MIXED
```

Il `body_markdown` può restare la serializzazione completa compatibile con X5/export. Le sezioni forniscono invece il livello minimo necessario per spiegare **perché un contenuto compare** e per legarlo alle fonti.

Per il pilot la tracciabilità è richiesta a livello di **sezione semantica**, non di singola frase: evita una granularità artificiale e mantiene gestibile l'editing.

### 7.4 Manifest di provenienza per versione/sezione

Ogni versione possiede un **Document Source Manifest**. Le singole voci possono essere collegate all'intera versione o a una `section_key`.

Campi logici:

```text
version_id
section_key?
source_kind
source_ref
source_version_ref?
role
captured_at
source_fingerprint?
summary_snapshot?
```

`source_kind` minimo:

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

Il manifest non copia gli owner sottostanti come nuovo archivio. Registra i riferimenti e un **payload snapshot minimo** sufficiente a spiegare la versione salvata anche se lo stato corrente cambia.

Per fonti versionabili si fissa la generazione/versione esatta, non solo l'identificatore logico corrente.

Una versione derivata da una precedente **eredita la provenienza rilevante** e aggiunge le nuove fonti o gli interventi `TEACHER_INPUT`; non deve perdere la catena di origine.

### 7.5 Decisioni di validazione/finalizzazione

Il contenuto di una versione non viene mutato per cambiarne lo stato. Si usa un registro separato:

```text
document_version_id
decision = VALIDATED | FINALIZED
actor_id
decided_at
note?
```

Regole:

- `VALIDATED`: il docente attesta di avere revisionato professionalmente quella versione;
- `FINALIZED`: quella versione diventa la finale corrente;
- per modificare una finale si crea una nuova versione;
- una nuova finalizzazione rende la precedente una **finale storica**, senza cancellarla o modificarla;
- nessun modello generativo può scrivere `VALIDATED` o `FINALIZED`.

## 8. `FinalReportEvidenceBundle`

Prima della bozza il sistema costruisce un read model **non persistente**:

```text
context
  workspace, anno, docente, istituto, sezione, disciplina

planned
  piano canonico, UDA/nuclei, blocchi attesi

executed
  stato Piano, TeachingSession, minuti, sessioni allocate/non allocate, scostamenti

observed
  osservazioni classe/gruppo anonimo, evidence references

institutionalSources
  curricolo verificato, template selezionato, Knowledge pertinente verificato

humanRequired
  quadro classe
  giudizio metodologico
  valutazione complessiva
  motivazione professionale degli scostamenti
  sintesi inclusione
  sintesi educazione civica
  riflessione finale
  indicazioni per l'anno successivo

missingInformation
provenance
```

Il bundle è una **proiezione**: nessun secondo database di Piano, lezioni o evidenze.

## 9. Classificazione delle informazioni

### DOCUMENTED

Fatto supportato da record persistente o fonte versionata: classe, disciplina, data/durata di una sessione, stato Bxx, UDA, evidenza registrata, generazione Knowledge.

### DERIVED

Calcolo deterministico e testabile: conteggi per stato, minuti validi, distribuzione temporale, confronto previsto/eseguito, elenco scostamenti.

### TEACHER_CONFIRMED

Giudizio o interpretazione esplicitamente assunta dal docente: andamento della classe, efficacia metodologica, valutazione complessiva, ragioni pedagogiche, indicazioni future.

### PROPOSED

Testo proposto da un sistema assistivo e non ancora assunto dal docente.

### TO_VERIFY

Informazione incompleta, incoerente o priva di fonte sufficiente.

### MIXED

Sezione che combina fatti documentati e formulazioni professionali. La vista «Perché compare qui?» deve distinguere le parti di provenienza e ciò che è stato aggiunto/confermato dal docente.

## 10. Readiness senza percentuali cosmetiche

Nessun «87% completo» senza una metrica professionale definita.

Stati:

- **DATI_INSUFFICIENTI**;
- **PRONTA_PER_BOZZA**;
- **RICHIEDE_INTEGRAZIONI**;
- **PRONTA_PER_REVISIONE**;
- **VALIDATA**;
- **FINALE**.

La UI mostra sempre **gli elementi che determinano lo stato**.

## 11. Struttura semantica della Relazione finale

Il layout è configurabile e può adottare un template d'istituto esplicitamente selezionato. DOCENTE OS non assume l'esistenza di un unico modello nazionale.

Baseline:

1. **Intestazione** — istituto, anno, docente, disciplina, classe.
2. **Riferimento alla programmazione** — percorso, nuclei/UDA, eventuale curricolo istituzionale verificato.
3. **Sviluppo effettivo** — attività/UDA/blocchi attestati, periodizzazione, sessioni significative.
4. **Scostamenti e rimodulazioni** — previsto vs svolto, recuperi/rimodulazioni/annullamenti e motivazioni documentate o confermate.
5. **Metodologie, strumenti e ambienti** — da fonti confermate o compilazione docente; mai inferiti dalla sola presenza di un materiale.
6. **Evidenze e valutazione** — tipi di evidenze, criteri/rubriche se realmente collegati, giudizio complessivo umano.
7. **Partecipazione e andamento della classe** — osservazioni aggregate come supporto, senza trasformarle in esiti certi di apprendimento.
8. **Inclusione e adattamenti** — sintesi generale; nessuna acquisizione automatica di diagnosi, condizioni sanitarie o nomi di alunni.
9. **Educazione civica / trasversalità** — solo se esplicitamente registrata o aggiunta e confermata dal docente.
10. **Considerazioni finali e continuità** — criticità/punti di forza, nuclei da riprendere, indicazioni per l'anno successivo.

Il **Programma svolto** resta un documento distinto nella futura DOC-03. DOC-04 può usarne gli stessi fatti, ma non deve cancellare la distinzione fra i due artefatti.

## 12. Composizione deterministica

La prima bozza deve poter essere costruita senza AI.

Il compositore deterministico può:

- inserire intestazione e contesto;
- proiettare il percorso pianificato;
- ricavare stati Bxx e date disponibili;
- aggregare durate reali delle `TeachingSession` valide;
- distinguere sessioni allocate e non allocate;
- elencare scostamenti registrati;
- sintetizzare evidenze in forma strutturata;
- predisporre campi espliciti per i giudizi professionali mancanti.

La prosa narrativa può essere scritta dal docente o proposta dall'assistente a partire dallo stesso bundle tracciabile.

## 13. Ruolo dell'assistenza generativa

Può:

- spiegare cosa manca;
- sintetizzare fatti documentati;
- proporre formulazioni;
- confrontare previsto e registrato;
- segnalare incoerenze;
- proporre paragrafi indicando le evidenze usate.

Non può:

- inventare attività;
- dedurre esiti di apprendimento dalla copertura del Piano;
- trasformare osservazioni aggregate in voti/giudizi individuali;
- dichiarare svolta una parte non supportata;
- modificare Piano, TeachingSession, UDA o Knowledge durante la composizione;
- validare/finalizzare;
- eseguire scritture esterne senza conferma.

Il prodotto resta operativo con assistenza disabilitata.

## 14. Esperienza utente

### 14.1 Ingresso

Nuova superficie:

`/documentazione`

Non viene inizialmente aggiunta una sesta destinazione alla barra mobile inferiore. Accessi:

- menu/navigazione completa;
- Home quando esiste un compito pertinente;
- Classe;
- Piano annuale;
- richiami contestuali nel periodo di chiusura.

### 14.2 Elenco

`/documentazione/relazioni-finali`

Per ogni sezione/disciplina:

- classe;
- readiness;
- documento/versione esistente;
- ultima revisione;
- prossima azione umana.

Nessun UUID o codice CAN al primo livello.

### 14.3 Superficie focalizzata

`/documentazione/relazioni-finali/<sectionId>`

Mostra nell'ordine:

1. contesto: «Relazione finale · Tecnologia · 2C · 2026/27»;
2. ciò che il sistema sa;
3. ciò che manca;
4. una sola azione primaria.

Azione per stato:

- `DATI_INSUFFICIENTI` → **Controlla ciò che manca**;
- `PRONTA_PER_BOZZA` → **Crea bozza**;
- `RICHIEDE_INTEGRAZIONI` → **Completa la relazione**;
- `PRONTA_PER_REVISIONE` → **Rivedi la versione**;
- `VALIDATA` → **Finalizza**;
- `FINALE` → **Esporta / consulta versione finale**.

### 14.4 Editor

Riusa il paradigma X5:

- contenuto modificabile;
- salvataggio come nuova versione;
- cronologia;
- modifiche locali chiaramente indicate;
- concorrenza ottimistica.

Per DOC-04 il contenuto è organizzato per sezioni semantiche. Questo può essere realizzato inizialmente anche con controlli testuali/Markdown per sezione: non è necessario introdurre subito un nuovo editor a blocchi.

## 15. «Perché compare qui?»

Ogni sezione della relazione può aprire una vista leggera che mostra:

- fatti registrati di supporto;
- eventuale fonte istituzionale/template;
- eventuale testo proposto;
- interventi/conferme del docente;
- versione/generazione delle fonti quando rilevante.

È una funzione di fiducia e diagnosi, non un pannello tecnico sempre visibile.

## 16. Privacy e minimizzazione

- nessun dato nominativo studente è necessario per la Relazione finale di classe;
- osservazioni ammesse in composizione automatica: `CLASS` o `ANONYMOUS_GROUP`;
- nessuna inferenza su salute, BES/DSA, disabilità o altre categorie sensibili;
- nessuna acquisizione automatica di dati sensibili da Knowledge;
- documentazione individuale fuori perimetro;
- al provider generativo passa soltanto il minimo necessario alla sezione richiesta.

## 17. Esportazione

DOC-04 riusa X5B:

- export di una **versione salvata**;
- anteprima senza write;
- versioni storiche distinguibili;
- versione/anno/provenienza essenziale visibili;
- resa A4 e stampa/salvataggio PDF tramite renderer generalizzato.

Fuori dal pilot:

- DOCX nativo non ancora qualificato;
- salvataggio automatico su Drive;
- invio e-mail;
- protocollo;
- firma digitale.

Una futura scrittura verso Drive resta `WRITE_EXTERNAL` e richiede conferma immediatamente prima dell'effetto.

## 18. Template di istituto

Un template può essere conservato in Knowledge con provenienza e associato esplicitamente a `FINAL_REPORT`.

Regole:

- il template non diventa owner dei dati didattici;
- il cambio template non modifica versioni già salvate/finalizzate;
- se non è configurato un modello d'istituto, il sistema usa il template interno dichiarandolo chiaramente;
- il mapping di placeholder è una capability separata e può essere differita se non necessaria al pilot.

## 19. Coerenza temporale e snapshot

Una bozza non cambia silenziosamente quando cambiano le fonti.

- la readiness legge lo stato corrente;
- **Crea bozza** cattura manifest e snapshot minimo;
- **Aggiorna dai dati registrati** confronta snapshot della versione con fonti correnti;
- l'aggiornamento crea una nuova versione dopo conferma;
- la finale resta legata alle fonti che la sostenevano alla finalizzazione.

## 20. TeachingSession superseded

Poiché una sessione può supersederne un'altra, il bundle usa solo la catena effettiva corrente.

Non si devono doppio-conteggiare:

- sessioni;
- minuti;
- osservazioni;
- evidenze.

Test dedicato obbligatorio.

## 21. Coerenza Piano ↔ esecuzione reale

Segnalazioni minime:

- Bxx `SVOLTO` senza sessione allocata, quando significativo;
- sessione allocata a Bxx ancora `PIANIFICATO`;
- sessioni non allocate;
- Bxx `RIMODULATO`, `RECUPERATO`, `ANNULLATO`;
- differenze fra durata pianificata ed effettiva quando disponibili.

Sono controlli read-only: DOC-04 non corregge il Piano e non registra lezioni retroattive.

## 22. Educazione civica e trasversalità

DOC-04 non assume un monte ore disciplinare autonomo di Educazione civica.

Include attività civiche/trasversali soltanto se:

- esplicitamente registrate/collegate; oppure
- aggiunte e confermate dal docente.

Nessuna deduzione automatica dalla sola affinità tematica di una UDA.

## 23. Fail-closed

Fallire in modo esplicito se:

- la sezione è estranea al workspace/anno;
- manca una disciplina coerente;
- il Piano canonico richiesto è assente/non valido;
- una fonte Knowledge è fuori contesto;
- una generazione/versione richiesta non esiste;
- il documento è stato modificato altrove;
- il template non è leggibile.

Nessun fallback a una sezione/fonte «simile». Nessuna perdita della bozza locale in caso di conflitto.

## 24. Sicurezza e writer boundary

- RLS deny-by-default;
- lettura limitata ai membri del workspace;
- creazione/salvataggio/validazione/finalizzazione tramite boundary dedicati;
- direct write revocata;
- validazione server-side di workspace, anno, sezione, disciplina e versione attesa;
- concorrenza ottimistica;
- nessuna write implicita del Copilota;
- nessuna write sugli owner sorgente durante la composizione.

La finalizzazione richiede conferma esplicita con preview dell'effetto: **questa versione diventa la finale corrente**.

## 25. Perimetro pilot DOC-04

### In scope

- superficie `Documentazione`;
- catalogo minimo `Relazione finale`;
- sezione/disciplina come contesto;
- evidence bundle reale;
- readiness deterministica;
- bozza versionata e sezioni semantiche;
- manifest di provenienza;
- editing/versioni;
- validazione/finalizzazione umane;
- export PDF/stampa tramite X5B;
- desktop/mobile;
- sicurezza, accessibilità e journey.

### Out of scope

- Programmazione annuale completa;
- Programma svolto autonomo;
- verbali/Collegio/dipartimento;
- documenti individuali alunni;
- firma/protocollo;
- invio automatico;
- DOCX nativo;
- porting del runtime SchoolDocs;
- modifiche automatiche a Piano/UDA/TeachingSession.

## 26. Tranche future, solo dopo approvazione e piano

- **DOC-01A — Generalizzazione authoring X5**: estendere il dominio senza regressioni UDA.
- **DOC-04A — Evidence bundle + readiness**: verticale read-only sui dati reali.
- **DOC-04B — Bozza/versionamento**: `FINAL_REPORT`, sezioni, manifest.
- **DOC-04C — Validazione/finalizzazione**: decisioni umane auditabili.
- **DOC-04D — Export generalizzato**: riuso X5B.
- **DOC-04E — Esperienza**: Documentazione + ingressi contestuali.
- **DOC-04F — Certificazione**: E2E, RLS, concorrenza, accessibilità, mobile, export, provenance, Human Review.

Questa specifica **non autorizza l'implementazione**.

## 27. Criteri di accettazione funzionali

1. Il docente apre una relazione per una sezione canonica senza codici tecnici.
2. Dati disponibili/mancanti sono espliciti e non ridotti a percentuali arbitrarie.
3. Previsto, registrato, derivato, proposto e giudizio umano restano distinguibili.
4. Sessioni superseded non sono doppio-conteggiate.
5. Sessioni senza Bxx restano visibili senza allocazioni fittizie.
6. La bozza conserva manifest e snapshot minimo degli input.
7. Cambiare una fonte non modifica retroattivamente una versione salvata.
8. Ogni salvataggio crea una nuova versione immutabile.
9. La provenienza è ispezionabile almeno per sezione semantica.
10. Un conflitto concorrente non sovrascrive lavoro precedente.
11. Validazione e finalizzazione richiedono decisione umana.
12. Finalizzare non modifica Piano, TeachingSession, UDA o Knowledge.
13. Le finali storiche restano consultabili.
14. L'export usa una versione salvata e mostra chiaramente versione/anno.
15. Il prodotto funziona senza provider AI.
16. Una proposta AI non viene presentata come fatto o contenuto confermato.
17. Nessun dato nominativo studente entra automaticamente nella relazione.
18. Su mobile resta una sola azione primaria coerente con lo stato.
19. La verticale non modifica la membership della barra mobile inferiore.
20. Il percorso UDA X5A/X5B continua a funzionare invariato.

## 28. Gate di qualità e governance

Gate minimi futuri:

- unit test compositore/readiness;
- test calcoli deterministici;
- regressione X5A/X5B;
- RLS/cross-workspace isolation;
- optimistic concurrency;
- fail-closed sezione/anno/disciplina;
- snapshot/provenance immutabili;
- test supersession;
- test sessioni allocate/non allocate;
- test assenza AI;
- test `PROPOSED` vs `TEACHER_CONFIRMED`;
- test finalizzazione solo umana;
- WCAG 2.2 AA pertinente;
- journey desktop/mobile;
- export A4/PDF;
- Human Visual Acceptance;
- review indipendente prima dell'integrazione.

## 29. Pilot di accettazione

Usare una sezione reale del workspace di prova con:

- Piano canonico presente;
- almeno un Bxx non `PIANIFICATO`;
- almeno due TeachingSession, una allocata a Bxx;
- almeno una sessione non allocata oppure un caso di rimodulazione;
- almeno una osservazione di classe/gruppo anonimo;
- almeno una fonte Knowledge verificata;
- nessun dato nominativo studente.

Journey:

```text
Documentazione
→ Relazioni finali
→ classe/disciplina
→ verifica dati disponibili/mancanti
→ crea bozza
→ completa giudizi professionali
→ salva nuova versione
→ controlla «Perché compare qui?»
→ valida
→ finalizza
→ esporta PDF
→ riapre versioni storiche e finale
```

## 30. Decisioni di dettaglio da demandare al piano

1. **Persistenza del manifest**: riferimenti relazionali + snapshot JSON minimo raccomandati; niente copie integrali dei domini.
2. **Editor**: partire da sezioni Markdown compatibili con X5; introdurre editor a blocchi solo se il pilot dimostra un limite reale.
3. **Template istituto**: formato/placeholder come tranche dedicata se necessario.
4. **Disciplina**: binding tramite `teaching_disciplines.id`, non testo libero.
5. **Finale corrente**: determinata dalla decisione `FINALIZED` più recente; le precedenti restano finali storiche.

## 31. Decisioni congelate se la specifica viene approvata

- Documentazione è parte di DOCENTE OS, non un'app separata.
- Relazione finale è la prima verticale.
- Un solo motore documentale: generalizzazione X5.
- Nessuna duplicazione degli owner sorgente.
- Evidence bundle read-only e ricostruibile.
- Versioni immutabili.
- Struttura semantica della Relazione finale separata dal solo blob Markdown.
- Provenienza ispezionabile almeno per sezione.
- Giudizi professionali distinti dai fatti documentati.
- AI opzionale e subordinata.
- Validazione/finalizzazione esclusivamente umane.
- Privacy predefinita senza dati nominativi studenti.
- Export iniziale PDF/stampa tramite percorso X5B generalizzato.
- Nessun nuovo slot nella barra mobile inferiore nel pilot.
- Nessuna implementazione prima della Human Review di questa specifica e del successivo piano dedicato.
