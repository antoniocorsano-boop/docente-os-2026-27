# Template Coherence Audit — Relazione finale del docente

Data audit: 2026-10-07  
Stato: **REVIEW_REQUIRED / PILOT DOC-TPL-01**  
Template sorgente: `Relazione finale del docente.docx`  
Contesto: I.C. “don Lorenzo Milani”, A.S. 2025/2026  
Scopo: primo audit reale per il futuro motore `DOC-TPL-01`

## 1. Regola dell'audit

Questo documento **non corregge** il modello dell'istituto e non dichiara che una scelta formale sia errata solo perché migliorabile.

Distingue:

- **fedeltà alla sorgente**;
- **coerenza interna**;
- **chiarezza semantica**;
- **raccordo con gli altri documenti**;
- **necessità/privacy dei dati**;
- **qualità della struttura di rendering**.

Ogni finding richiede Human Review prima di tradursi in una modifica del template.

## 2. Evidenza strutturale rilevata

Il DOCX contiene:

- 4 pagine renderizzate;
- una copertina istituzionale con immagine/logo composito;
- 5 tabelle principali;
- più griglie con caselle di scelta;
- campi testuali liberi;
- aree data/firma;
- 3 elementi drawing collegati a una risorsa immagine;
- nessun Word Content Control (`w:sdt`) rilevato.

Conclusione tecnica: il file è un **layout documentale reale**, non un semplice testo lineare. L'importer deve quindi trattare tabelle, immagini, sezioni e anchor di rendering come elementi di prima classe.

## 3. Struttura semantica osservata

### Pagina 1 — Copertina

- identità grafica dell'istituto;
- titolo `Relazione finale del docente`;
- anno scolastico;
- classe;
- sezione;
- docente.

### Pagina 2 — Profilo e percorso

- titolo interno `Relazione finale disciplinare e per competenze`;
- ordine di scuola;
- anno;
- classe;
- disciplina;
- docente;
- profilo della classe;
- composizione;
- analisi della situazione;
- contenuti effettivamente svolti;
- conoscenze / abilità / competenze;
- risultati;
- traguardi di competenze perseguiti.

### Pagina 3 — Scelte professionali e valutazione

- competenze sviluppate;
- materiale didattico;
- piattaforme/canali;
- metodologie e strategie inclusive;
- andamento didattico generale;
- modalità di verifica.

### Pagina 4 — Chiusura

- luogo/data;
- firma docente.

## 4. Esito sintetico

```text
Institution Fidelity: PASS come sorgente acquisita
Document Coherence: REVIEW_REQUIRED
Privacy Readiness: REVIEW_REQUIRED
Template Activation: NOT AUTHORIZED
```

Non sono emersi blocker tali da rendere il documento inutilizzabile come sorgente. Sono però presenti ambiguità e inefficienze sufficienti a impedire una trasformazione automatica in template `ACTIVE` senza revisione.

## 5. Findings

### TCA-01 — Doppia titolazione da chiarire

**Severity:** MINOR  
**Category:** INTERNAL_COHERENCE  
**Status:** OPEN

La copertina usa `Relazione finale del docente`; la scheda interna usa `Relazione finale disciplinare e per competenze`.

Possibili interpretazioni:

1. titolo generale + sottotitolo tecnico intenzionale;
2. fusione di due modelli originariamente distinti;
3. duplicazione redazionale.

**Raccomandazione:** non eliminare nulla automaticamente. In Human Review decidere se modellare `document_title` + `form_title` oppure normalizzare la denominazione in una nuova versione.

### TCA-02 — Identità disciplinare non uniforme tra copertina e scheda

**Severity:** MINOR  
**Category:** DATA_COHERENCE  
**Status:** OPEN

La copertina espone anno, classe, sezione e docente, ma non la disciplina. La scheda interna richiede anche `Disciplina`.

**Raccomandazione:** nel modello semantico `discipline` deve essere un solo field canonico; il renderer decide in quali punti mostrarlo. Verificare se l'assenza in copertina è intenzionale.

### TCA-03 — `Risultati` semanticamente non definito

**Severity:** MAJOR  
**Category:** TERMINOLOGICAL_COHERENCE  
**Status:** OPEN

`Risultati` è una sezione autonoma ma il template non specifica se debba contenere:

- raggiungimento degli obiettivi;
- esiti di apprendimento;
- sintesi valutativa;
- distribuzione dei livelli;
- giudizio complessivo.

Questa ambiguità impedisce di assegnare in sicurezza una `source_policy` automatica.

**Raccomandazione:** prima dell'attivazione definire `purpose`, `value_policy` e provenienza consentita. Fino ad allora classificare il campo come `TEACHER_INPUT / TO_VERIFY`.

### TCA-04 — Rapporto tra contenuti, conoscenze/abilità/competenze e traguardi non esplicitato

**Severity:** MAJOR  
**Category:** SEMANTIC_COHERENCE  
**Status:** OPEN

Il modello presenta consecutivamente:

- `Contenuti effettivamente svolti`;
- `Conoscenze, Abilità e Competenze del piano di lavoro svolto`;
- `Traguardi di competenze perseguiti`.

Le tre aree sono plausibili, ma il template non dichiara la relazione tra esse e non impedisce duplicazioni.

**Raccomandazione:** nel template strutturato assegnare purpose distinti e una regola di non-sovrapposizione:

```text
executed_content = cosa è stato svolto
knowledge_skills_competences = struttura disciplinare degli apprendimenti trattati
competence_targets = traguardi perseguiti, non esiti automaticamente raggiunti
```

La formulazione finale richiede comunque Human Review.

### TCA-05 — Raccordo con Programmazione e Programma svolto debole

**Severity:** MAJOR  
**Category:** INTER_DOCUMENT_COHERENCE  
**Status:** OPEN

Il modello richiede contenuti effettivamente svolti ma non include un controllo esplicito di coerenza con:

- Programmazione disciplinare/annuale;
- Programma svolto.

Nei documenti adattati successivamente è comparso un raccordo più esplicito; ciò dimostra che il bisogno è reale, ma non autorizza a modificare il modello sorgente senza decisione.

**Raccomandazione:** `DOC-TPL-01` deve supportare una sezione/constraint `FINAL_COHERENCE` opzionale e versionabile. DOC-04 dovrà mostrare eventuali discrepanze anche se il renderer istituzionale non le stampa.

### TCA-06 — Campi aggregati BES / Stranieri richiedono policy esplicita

**Severity:** MAJOR  
**Category:** PRIVACY_NECESSITY  
**Status:** OPEN

La tabella di composizione prevede conteggi per `BES` e `Stranieri`.

Il fatto che il campo sia presente nel modello non costituisce autorizzazione alla raccolta o all'auto-compilazione da dati individuali.

**Raccomandazione:** classificare inizialmente:

```text
class.composition.bes_count      SENSITIVE_AGGREGATE / RESTRICTED
class.composition.foreign_count  SENSITIVE_AGGREGATE / RESTRICTED
```

Consentire solo input aggregato esplicito finché non esiste una policy dedicata. Nessun nominativo deve entrare nel documento.

### TCA-07 — Opzioni metodologiche e materiali con copertura limitata

**Severity:** MINOR  
**Category:** COMPLETENESS  
**Status:** OPEN

Il modello offre liste predefinite relativamente ristrette. Nelle relazioni adattate in seguito sono state usate opzioni ulteriori (es. didattica laboratoriale, problem solving, esercitazioni grafiche, schemi/mappe, recupero).

**Raccomandazione:** non allargare automaticamente il modello ufficiale. Nel motore rappresentare queste aree come `MULTI_SELECT + OTHER_TEXT`, così una versione futura può ampliare le opzioni senza cambiare la chiave semantica.

### TCA-08 — Lista `Competenze sviluppate` da verificare rispetto al canone adottato

**Severity:** MINOR  
**Category:** INSTITUTIONAL_ALIGNMENT  
**Status:** OPEN

La lista del template sorgente e quella presente in versioni adattate successive non sono identiche.

**Raccomandazione:** il motore non deve hard-codificare l'elenco. Deve trattarlo come `option_set` versionato del template e conservare la versione esatta adottata dall'istituto.

Nessuna conclusione normativa viene assunta in questo audit.

### TCA-09 — Quarta pagina quasi vuota

**Severity:** MINOR  
**Category:** RENDER_COHERENCE  
**Status:** OPEN

La resa osservata produce una quarta pagina contenente sostanzialmente solo luogo/data e firma.

Può essere una scelta intenzionale, ma è inefficiente e aumenta la fragilità della paginazione quando i campi vengono popolati.

**Raccomandazione:** il renderer deve distinguere `intentional_page_break` da layout accidentale. Verificare in Human Review se la firma debba rimanere su pagina separata.

### TCA-10 — Nessun anchor semantico nativo nel DOCX

**Severity:** MAJOR  
**Category:** TEMPLATE_TECHNICAL_READINESS  
**Status:** OPEN

Il file non contiene Word Content Controls rilevabili. Campi e caselle sono quindi rappresentati principalmente attraverso testo, tabelle e simboli.

**Raccomandazione:** non usare coordinate o ricerca testuale fragile come contratto runtime. Durante la normalizzazione creare anchor strutturati governati (`content controls`, bookmark o mapping equivalente) senza alterare la sorgente originale.

### TCA-11 — Identità istituzionale da canonicalizzare senza alterare il brand

**Severity:** MINOR  
**Category:** TERMINOLOGICAL_COHERENCE  
**Status:** OPEN

La sorgente grafica di copertina rappresenta l'identità dell'istituto; altri documenti Drive mostrano varianti testuali nella denominazione/capitalizzazione.

**Raccomandazione:** introdurre una chiave canonica `institution.display_name` e mantenere separati:

- valore dati canonico;
- asset grafico/wording del template;
- eventuale denominazione storica della singola sorgente.

Non normalizzare automaticamente il testo del modello istituzionale.

## 6. Mapping semantico iniziale

| Area sorgente | Section key proposta | Campo/policy iniziale |
|---|---|---|
| Anno scolastico | `IDENTITY` | `academic_year.label / AUTO_DOCUMENTED` |
| Classe / Sezione | `IDENTITY` | `class.label / AUTO_DOCUMENTED` |
| Disciplina | `IDENTITY` | `discipline.label / AUTO_DOCUMENTED` |
| Docente | `IDENTITY` | `teacher.display_name / AUTO_DOCUMENTED` |
| Alunni/Femmine/Maschi/Ripetenti | `CLASS_COMPOSITION` | aggregati; source policy da definire |
| BES/Stranieri | `CLASS_COMPOSITION` | `RESTRICTED` |
| Tipologia classe | `CLASS_ANALYSIS` | `TEACHER_CONFIRMATION` |
| Livello classe | `CLASS_ANALYSIS` | `TEACHER_CONFIRMATION` |
| Ritmo di lavoro | `CLASS_ANALYSIS` | `TEACHER_CONFIRMATION` |
| Clima relazionale | `CLASS_ANALYSIS` | `TEACHER_CONFIRMATION` |
| Contenuti svolti | `EXECUTED_CONTENT` | `DERIVED + TEACHER_CONFIRMATION` |
| Conoscenze/Abilità/Competenze | `KNOWLEDGE_SKILLS_COMPETENCES` | composizione da piano/programma + conferma |
| Risultati | `RESULTS` | `TO_VERIFY / TEACHER_INPUT` finché non chiarito |
| Traguardi perseguiti | `COMPETENCE_TARGETS` | da programmazione + conferma |
| Competenze sviluppate | `KEY_COMPETENCES` | `MULTI_SELECT / TEACHER_CONFIRMATION` |
| Materiali | `MATERIALS` | evidenze/materiali + conferma |
| Canali | `COMMUNICATION_CHANNELS` | `TEACHER_CONFIRMATION` |
| Metodologie | `METHODOLOGIES` | `TEACHER_CONFIRMATION` |
| Andamento generale | `GENERAL_PROGRESS` | `TEACHER_INPUT` o proposta assistita |
| Modalità verifica | `ASSESSMENT_METHODS` | evidenze + conferma |
| Data/firma | `SIGNATURE` | data + azione finale umana |

## 7. Raccordo con documenti reali collegati

### Programma svolto

Il documento reale di Tecnologia IIIC 2025/26 contiene un elenco sintetico di contenuti, attività operative, Educazione civica/orientamento, data e firma.

Implicazione: `Programma svolto` è un artefatto distinto e più strettamente rendicontativo; la Relazione finale può leggerlo o confrontarlo, ma non deve inglobarlo come se fosse la stessa cosa.

### Programmazione annuale

La programmazione 2026/27 contiene finalità, fonti, progressione per classi, attività, evidenze, metodologie, valutazione e una checklist di coerenza.

Implicazione: la Relazione finale deve poter verificare coerenza rispetto alla programmazione, ma non copiare sezioni progettuali non necessarie alla rendicontazione finale.

## 8. Decisione del pilot

**REVIEW_REQUIRED.**

Il template è una sorgente valida e preziosa per il pilot, ma non deve essere pubblicato direttamente come `ACTIVE` nel futuro motore.

Prima dell'attivazione vanno decisi almeno:

1. significato di `Risultati`;
2. rapporto fra contenuti / K-S-C / traguardi;
3. policy dei campi aggregati sensibili;
4. trattamento della doppia titolazione;
5. gestione della pagina firma;
6. option set delle competenze/metodologie;
7. raccordo con Programmazione e Programma svolto.

## 9. Effetto su DOC-04

DOC-04 non deve hard-codificare la struttura osservata.

La verticale deve chiedere a DOC-TPL-01:

```text
template attivo
→ section schema
→ field schema
→ value/privacy policies
→ render profile
```

e produrre contenuti/provenienza coerenti con il template scelto.

## 10. Nessuna implementazione

Questo audit costituisce evidenza di progettazione. Non autorizza modifiche al file Drive, al DOCX sorgente o al runtime.