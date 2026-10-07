# DOCENTE OS — Documentazione professionale e verticale Relazione finale

Data: 2026-10-07  
Stato: **DESIGN SPEC / HUMAN REVIEW REQUIRED / NO IMPLEMENTATION AUTHORIZED**  
Codice di lavoro: **DOC-04**  
Baseline di progetto: `develop@4c3c7f7d0bd4ad56d9d1427f141a8a4ec9283b84`

## 1. Decisione proposta

DOCENTE OS introduce una capability **Documentazione** che trasforma dati, attività, fonti ed evidenze già posseduti dai domini canonici in documenti professionali del docente.

La prima verticale resta **Relazione finale**:

`programmazione → attuazione reale → evidenze → giudizio professionale → relazione finale`

DOC-04 non possiede un proprio sistema di template. Dipende dal canone `DOC-TPL-01`, che definisce la struttura documentale approvata e la sua resa istituzionale.

Dipendenza:

```text
DOC-TPL-01 → DOC-01/X5 → DOC-04
```

## 2. Obiettivo umano

A fine anno il docente non deve ricostruire a memoria mesi di lavoro né copiare informazioni già presenti in DOCENTE OS.

Partendo da «Devo preparare la relazione finale della 2C», il sistema deve mostrare:

- ciò che è già documentato;
- ciò che può essere derivato con regole deterministiche;
- ciò che necessita di conferma;
- ciò che richiede un giudizio professionale;
- le eventuali incoerenze da controllare;
- la versione che il docente sta revisionando/finalizzando.

Il tempo del docente deve concentrarsi sulla revisione professionale, non sulla ricostruzione amministrativa.

## 3. Confini canonici

Restano owner:

- Classe/sezione → registro canonico delle sezioni;
- Piano annuale → percorso programmato e relativo stato professionale;
- TeachingSession/evidenze → attività realmente registrate;
- Progetta/Knowledge → UDA, progettazioni e fonti secondo i rispettivi contratti;
- Impostazioni → identità professionale e di istituto;
- DOC-TPL-01 → struttura e resa del template canonico;
- Documentazione/X5 → documento composto, versioni, provenienza interna e decisioni umane.

Documentazione legge e compone; non acquisisce il diritto di modificare gli owner sorgente.

## 4. Canone vs accaduto

Piano annuale e attività realmente registrate restano distinti.

Regole:

- una sessione non rende automaticamente «svolta» una parte del Piano;
- uno stato del Piano non autorizza a inventare una lezione non registrata;
- attività trasversali, recuperi e diagnostiche possono esistere senza associazione a un blocco del Piano;
- gli scostamenti restano visibili e non riscrivono retroattivamente il canone.

I codici tecnici usati per riconciliare questi domini sono **solo interni** e non compaiono mai nella Relazione finale.

## 5. Riutilizzo X5

X5 offre già:

- documenti e versioni;
- versioni immutabili;
- concorrenza ottimistica;
- RLS per workspace;
- cronologia;
- export da versione salvata;
- anteprima e stampa/PDF.

DOC-04 generalizza X5 senza creare un secondo motore documentale.

## 6. Modello documentale

### 6.1 Documento

```text
id
workspace_id
academic_year_id
document_kind
section_id
teaching_discipline_id
template_version_ref
current_version_no
title
created_by
created_at
updated_at
```

Per il pilot:

```text
FINAL_REPORT
```

La versione template è obbligatoria internamente ma non viene stampata nel documento professionale.

### 6.2 Versione

Ogni salvataggio produce una versione immutabile.

```text
id
document_id
version_no
title
body_markdown
created_by
created_at
```

### 6.3 Sezioni semantiche

La versione conserva anche la struttura per sezioni definita dal template canonico.

Esempio Relazione finale vNext:

```text
IDENTITY
CLASS_PROFILE
EXECUTED_PATH
OUTCOMES
METHODS_TOOLS_INCLUSION
ASSESSMENT
CIVIC_TRANSVERSAL
FINAL_REFLECTION
SIGNATURE
```

La struttura può evolvere tramite una nuova versione del template; i documenti già finalizzati non cambiano.

## 7. Manifest di provenienza interno

Ogni versione conserva internamente le fonti realmente utilizzate.

Il manifest può riferire:

- impostazioni;
- sezione;
- disciplina;
- Piano annuale;
- sessioni;
- osservazioni aggregate;
- evidenze;
- Knowledge/versioni;
- input del docente;
- template canonico.

La provenienza serve a fiducia, audit e aggiornamento; **non viene inserita nell'output professionale**.

## 8. `FinalReportEvidenceBundle`

Prima della bozza il sistema costruisce un read model non persistente:

```text
context
  istituto, anno, docente, classe, disciplina

planned
  programmazione/piano pertinente

executed
  attività e percorso realmente registrati

observed
  osservazioni aggregate ed evidenze pertinenti

institutionalSources
  template canonico e fonti verificate

humanRequired
  quadro professionale della classe
  esiti complessivi
  motivazioni degli scostamenti
  giudizio metodologico
  considerazioni finali

missingInformation
internalProvenance
```

Il bundle è una proiezione e non crea un secondo archivio.

## 9. Classificazione interna delle informazioni

Internamente DOCENTE OS distingue:

```text
DOCUMENTED
DERIVED
TEACHER_CONFIRMED
PROPOSED
TO_VERIFY
MIXED
```

Queste classificazioni non devono comparire nel documento esportato.

## 10. Readiness

Nessuna percentuale cosmetica.

Stati utente:

- Dati insufficienti;
- Pronta per bozza;
- Richiede integrazioni;
- Pronta per revisione;
- Validata;
- Finale.

La UI spiega sempre cosa manca per procedere.

## 11. Relazione finale — struttura canonica migliorata

DOC-04 adotta il template approvato da DOC-TPL-01, non replica il Word storico.

Baseline proposta per il pilot:

### 11.1 Intestazione istituzionale

- istituto;
- anno scolastico;
- classe/sezione;
- disciplina;
- docente.

### 11.2 Profilo e andamento della classe

- eventuali dati aggregati realmente necessari;
- breve quadro professionale su partecipazione, autonomia, ritmo e clima.

La descrizione non deve ridursi a etichette meccaniche quando è necessario un giudizio professionale.

### 11.3 Percorso didattico effettivamente svolto

Pattern preferito quando utile:

| Ambiti / nuclei | Conoscenze e contenuti | Abilità sviluppate | Competenze perseguite |
|---|---|---|---|

La tabella sintetizza il percorso effettivo e non copia integralmente Programmazione o Programma svolto.

### 11.4 Esiti del percorso

Sintesi professionale di:

- progressi complessivi;
- obiettivi raggiunti in modo differenziato;
- aspetti consolidati;
- aspetti da rafforzare;
- eventuali scostamenti rilevanti.

### 11.5 Metodologie, strumenti e inclusione

Checklist sintetica per gli elementi ricorrenti + breve testo quando necessario.

### 11.6 Verifica e valutazione

- modalità principali effettivamente utilizzate;
- evidenze raccolte;
- breve raccordo fra attività, obiettivi e valutazione.

### 11.7 Educazione civica e raccordi trasversali

Sezione condizionale, presente solo quando pertinente e documentata/confermata.

### 11.8 Considerazioni conclusive

- andamento complessivo;
- elementi significativi;
- criticità residue;
- eventuali indicazioni per la continuità.

### 11.9 Luogo, data e firma

Blocco finale compatto.

## 12. Programma svolto resta distinto

Il Programma svolto risponde alla domanda:

> **Che cosa è stato effettivamente svolto?**

La Relazione finale risponde invece a:

> **Come si è sviluppato il percorso e quali esiti professionali complessivi emergono?**

DOC-04 può leggere/confrontare il Programma svolto, ma non deve duplicarlo integralmente.

## 13. Programmazione annuale resta distinta

La Programmazione annuale è il documento progettuale a monte.

La Relazione finale ne verifica internamente la coerenza con l'attuazione, ma non riproduce finalità, fonti, rubriche o intere sezioni progettuali non necessarie alla funzione conclusiva.

## 14. Composizione deterministica

La prima bozza deve poter nascere senza AI.

Il compositore può:

- compilare l'intestazione;
- ricostruire il percorso effettivamente documentato;
- aggregare durate/sessioni valide senza doppio conteggio;
- distinguere attività riconciliate e non riconciliate;
- evidenziare scostamenti;
- proporre la matrice del percorso svolto;
- predisporre i campi di giudizio professionale mancanti.

Non può inventare attività o risultati.

## 15. Assistenza generativa

Può:

- sintetizzare dati documentati;
- proporre formulazioni;
- confrontare previsto e registrato;
- evidenziare incoerenze;
- aiutare a rendere il testo chiaro e istituzionale.

Non può:

- inventare attività/esiti;
- trasformare indicatori aggregati in giudizi individuali;
- modificare i domini sorgente;
- validare/finalizzare;
- introdurre nel documento metadati tecnici o riferimenti al proprio funzionamento.

Il prodotto resta operativo senza provider AI.

## 16. Esperienza utente

Ingresso:

```text
/documentazione
→ Relazioni finali
→ classe / disciplina
```

La superficie mostra:

1. contesto professionale;
2. dati disponibili;
3. dati mancanti;
4. preview del documento secondo il template canonico;
5. una sola azione primaria coerente con lo stato.

Non si aggiunge inizialmente una sesta destinazione alla barra mobile inferiore.

## 17. «Da dove viene?»

Internamente ogni sezione può aprire una vista di spiegabilità con le fonti di supporto.

Questa funzione è parte della UI di DOCENTE OS e **non viene stampata/esportata**.

## 18. Privacy e minimizzazione

- nessun nominativo studente nella Relazione finale di classe;
- osservazioni automatiche solo aggregate/classe/gruppo anonimo;
- nessuna acquisizione automatica di diagnosi o categorie sensibili;
- campi storici non necessari possono essere rimossi dal template canonico;
- dati aggregati sensibili richiedono decisione esplicita nel template;
- documentazione individuale fuori perimetro.

## 19. Educazione civica

DOC-04 non attribuisce un monte ore disciplinare autonomo.

Riporta attività civiche/trasversali solo quando risultano documentate o confermate dal docente.

## 20. Output professionale: zero riferimenti tecnici

Nel documento finale sono vietati:

- CAN e altri codici di dominio;
- Bxx;
- UUID;
- nomi di tabelle/database;
- nomi di entità software;
- stati interni del workflow;
- hash/fingerprint;
- percorsi Drive;
- versioni tecniche;
- provenance tecnica;
- nomi di provider/modelli AI;
- formule come «generato automaticamente».

Il documento deve essere autonomamente leggibile come normale documento dell'istituto.

## 21. Esportazione

DOC-04 usa il renderer previsto da DOC-TPL-01.

Output target:

- anteprima professionale;
- PDF/stampa;
- DOCX istituzionale quando la relativa tranche sarà qualificata.

L'export usa sempre una versione salvata del documento e una versione precisa del template, ma tali riferimenti restano interni salvo scelta amministrativa esplicita.

## 22. Coerenza temporale

Una bozza non cambia silenziosamente quando cambiano le fonti.

- Crea bozza → cattura manifest interno;
- Aggiorna dai dati registrati → confronta vecchio snapshot e stato corrente;
- conferma → nuova versione;
- finale precedente → resta storica e immutata.

## 23. Sessioni sostituite/corrette

Nel calcolo non vengono doppio-conteggiate sessioni superate da registrazioni successive.

La regola vale per:

- numero attività;
- durata;
- osservazioni;
- evidenze.

## 24. Controlli di coerenza

Segnalazioni interne possibili:

- parte del Piano dichiarata svolta senza evidenza corrispondente;
- attività registrata non ancora riconciliata con il Piano;
- attività trasversali/non allocate;
- rimodulazioni/recuperi/annullamenti;
- differenze significative tra previsto ed effettivo.

Sono controlli read-only e non compaiono con codici tecnici nel documento.

## 25. Validazione e finalizzazione

La validazione e la finalizzazione sono esclusivamente umane.

Una versione finalizzata non viene modificata. Una revisione successiva crea una nuova versione e, se approvata, una nuova finale corrente; le finali precedenti restano storiche.

## 26. Perimetro pilot

### In scope

- integrazione con DOC-TPL-01;
- evidence bundle;
- readiness;
- template Relazione finale migliorato;
- bozza versionata;
- provenienza interna;
- editing/revisione;
- validazione/finalizzazione;
- preview pulita;
- PDF/stampa;
- responsive/accessibilità;
- certificazione dell'assenza di metadati tecnici nell'output.

### Out of scope

- Programma svolto come verticale autonoma;
- Programmazione annuale come verticale autonoma;
- verbali/Collegio/dipartimento;
- documenti individuali;
- protocollo/firma digitale;
- invio automatico;
- migrazione del vecchio SchoolDocs come runtime.

## 27. Tranche future dopo approvazione e piano

- **DOC-TPL-01A** — registry/canone template + quality rules;
- **DOC-01A** — generalizzazione X5;
- **DOC-04A** — evidence bundle + readiness read-only;
- **DOC-04B** — bozza/versionamento secondo template canonico;
- **DOC-04C** — validazione/finalizzazione;
- **DOC-04D** — rendering/export pulito;
- **DOC-04E** — esperienza Documentazione e ingressi contestuali;
- **DOC-04F** — certificazione end-to-end.

## 28. Criteri di accettazione

1. Il docente apre la relazione senza codici tecnici.
2. Dati disponibili e mancanti sono espliciti.
3. Il template usato è quello canonico approvato, non una copia rigida del Word storico.
4. Il percorso effettivamente svolto è ricostruito senza inventare attività.
5. Sessioni sostituite non sono doppio-conteggiate.
6. Attività non riconciliate restano visibili internamente senza allocazioni fittizie.
7. La bozza conserva manifest e template version ref internamente.
8. Cambiare una fonte non modifica una versione salvata.
9. Ogni salvataggio crea una nuova versione immutabile.
10. La provenienza è ispezionabile nella UI ma assente nell'output.
11. Validazione/finalizzazione sono umane.
12. Il prodotto funziona senza AI.
13. Nessun dato nominativo studente entra automaticamente.
14. Tabelle e checklist sono usate solo quando utili.
15. Programma svolto e Programmazione restano documenti distinti.
16. Il percorso UDA X5A/X5B non regredisce.
17. Desktop e mobile mantengono una gerarchia chiara.
18. **L'output finale non contiene codici, UUID, nomi tecnici, provenance o riferimenti al sistema.**
19. Il documento finale è leggibile autonomamente come documento dell'I.C. “don Lorenzo Milani”.
20. Una nuova versione del template non altera relazioni già finalizzate.

## 29. Gate di qualità futuri

- test compositore/readiness;
- test calcoli deterministici;
- regressione X5;
- RLS/cross-workspace;
- concurrency;
- snapshot/provenance;
- test session supersession;
- privacy;
- test senza AI;
- test human-only finalization;
- scan automatico dell'output per riferimenti tecnici vietati;
- WCAG 2.2 AA pertinente;
- browser journey desktop/mobile;
- resa A4/PDF;
- Human Visual Acceptance;
- review indipendente.

## 30. Decisioni congelate se approvata

- Documentazione è parte di DOCENTE OS.
- Relazione finale è la prima verticale.
- DOC-TPL-01 governa struttura e resa.
- I modelli Drive sono sorgenti da analizzare e migliorare, non layout da copiare.
- X5 resta il motore di versionamento documentale.
- Programmazione, Programma svolto e Relazione finale mantengono funzioni distinte.
- Versioni e provenienza sono interne e immutabili.
- AI è opzionale e subordinata.
- Privacy by default.
- Validazione/finalizzazione esclusivamente umane.
- Nessun nuovo slot nella bottom navigation nel pilot.
- **Nessun riferimento tecnico compare nel documento finale.**
- Nessuna implementazione prima della Human Review delle specifiche e del successivo piano dedicato.