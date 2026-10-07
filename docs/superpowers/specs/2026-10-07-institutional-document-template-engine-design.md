# DOCENTE OS — Institutional Document Template Engine

Data: 2026-10-07  
Stato: **DESIGN SPEC / HUMAN REVIEW REQUIRED / NO IMPLEMENTATION AUTHORIZED**  
Codice di lavoro: **DOC-TPL-01**  
Branch: `docs/doc-04-relazione-finale-design`

## 1. Scopo

Definire un motore unico per acquisire, analizzare, validare, strutturare, versionare e usare **template documentali istituzionali** in DOCENTE OS.

Il motore nasce dal caso reale della **Relazione finale del docente** dell'I.C. “don Lorenzo Milani”, ma deve supportare nel tempo anche Programmazione annuale, Programma svolto, verbali, relazioni, schede di validazione e altri documenti professionali.

DOC-TPL-01 non produce ancora documenti finali e non implementa editor o renderer. Congela i contratti necessari affinché le verticali documentali successive possano usare modelli istituzionali senza hard-code per singolo file.

## 2. Principio architetturale

La semantica del documento appartiene a DOCENTE OS; la forma documentale appartiene al template istituzionale.

Un file DOCX/PDF/Google Doc trovato in Drive non diventa automaticamente un template valido. Deve attraversare:

```text
Sorgente istituzionale
→ acquisizione
→ analisi strutturale
→ audit di coerenza
→ mappatura semantica
→ privacy/provenienza
→ preview
→ Human Review
→ attivazione
```

Il sistema deve poter preservare fedelmente un modello istituzionale e, separatamente, segnalare che quel modello presenta incoerenze o aree migliorabili.

## 3. Requisiti derivati dai documenti reali

La ricerca in Drive mostra già famiglie diverse:

- Relazione finale del docente;
- Programma svolto;
- Programmazione annuale;
- documenti dipartimentali e schede di validazione.

Queste famiglie hanno strutture, finalità e granularità differenti. Il motore non può quindi ridursi a una sostituzione di stringhe `[[PLACEHOLDER]]`.

La storia precedente Excel → Word dimostra però un requisito utile: ogni campo documentale deve poter dichiarare **origine, significato e destinazione**.

## 4. Alternative esaminate

### A — Template hard-coded per tipo documento

Ogni verticale codifica il proprio layout e i propri campi.

**Respinta:** scala male, duplica logiche e rende fragile il rapporto con i modelli di istituto.

### B — DOCX con segnaposto testuali

Il DOCX resta sorgente e DOCENTE OS sostituisce token tipo `[[CLASS_NAME]]`.

**Respinta come architettura primaria:** utile come compatibilità/import, ma insufficiente per validazione semantica, tipi di campo, provenienza, privacy, versioni e audit.

### C — Template semantico strutturato + renderer istituzionale

Il template viene normalizzato in schema semantico, mantenendo il file istituzionale come fonte di resa/document fidelity.

**Raccomandata.**

## 5. Capability owner

DOC-TPL-01 possiede esclusivamente:

- identità del template;
- tipo documentale;
- versione del template;
- struttura semantica;
- definizione dei campi;
- regole di mapping;
- riferimento al file sorgente/rendering;
- esito dell'audit;
- stato di attivazione;
- provenienza e impronta della sorgente.

Non possiede:

- dati di classe;
- Piano annuale;
- TeachingSession;
- UDA;
- Knowledge;
- dati studenti;
- contenuti professionali del documento compilato.

## 6. Modello logico `DocumentTemplate`

```text
id
workspace_id?
institution_scope
kind
name
version
status
valid_from?
valid_to?
source_asset_ref
source_revision_ref?
source_fingerprint
render_profile
created_at
created_by
approved_at?
approved_by?
```

`status`:

```text
DRAFT
AUDITED
REVIEW_REQUIRED
ACTIVE
RETIRED
BLOCKED
```

Regole:

- `ACTIVE` richiede Human Review;
- la modifica della sorgente dopo l'attivazione non muta il template attivo: produce una nuova revisione candidata;
- i documenti generati conservano il riferimento esatto alla versione template usata.

## 7. Struttura semantica `TemplateSection`

Ogni template è scomposto in sezioni ordinabili:

```text
id
template_id
section_key
ordinal
label
purpose
required
repeatable
visibility_rule?
render_anchor?
```

Una sezione deve descrivere **funzione documentale**, non coordinate grafiche.

Esempi per Relazione finale:

```text
IDENTITY
CLASS_PROFILE
CLASS_COMPOSITION
CLASS_ANALYSIS
EXECUTED_CONTENT
KNOWLEDGE_SKILLS_COMPETENCES
RESULTS
COMPETENCE_TARGETS
KEY_COMPETENCES
MATERIALS
COMMUNICATION_CHANNELS
METHODOLOGIES
GENERAL_PROGRESS
ASSESSMENT_METHODS
FINAL_COHERENCE
SIGNATURE
```

## 8. Modello `TemplateField`

```text
id
template_id
section_key
field_key
label
field_type
required
cardinality
value_policy
privacy_class
validation_rule?
source_policy?
render_anchor?
help_text?
```

Tipi minimi:

```text
TEXT_SHORT
TEXT_LONG
NUMBER
DATE
BOOLEAN
SINGLE_SELECT
MULTI_SELECT
CHECKLIST
TABLE
REPEATING_GROUP
DERIVED_VALUE
DERIVED_TEXT
STATIC_TEXT
IMAGE
SIGNATURE
```

## 9. Chiavi semantiche stabili

Le chiavi non devono incorporare anno o sezione.

Da evitare:

```text
IIIC_LIV_AVANZATO
IA_PARAGRAFO_CONCLUSIVO_DATI
```

Da preferire:

```text
class.students.total
class.composition.repeaters
class.profile.type
class.profile.level
class.profile.work_pace
class.profile.relational_climate
learning.executed_content
learning.results
learning.competence_targets
methods.selected
assessment.methods
final.coherence_status
```

Classe, anno e disciplina appartengono al **context binding**, non al nome del campo.

## 10. Politica del valore

Ogni campo dichiara come può ottenere un valore:

```text
AUTO_DOCUMENTED
DERIVED
TEACHER_INPUT
TEACHER_CONFIRMATION
OPTIONAL_PROPOSAL
RESTRICTED
STATIC
```

Regole:

- `AUTO_DOCUMENTED`: solo da owner canonico verificabile;
- `DERIVED`: regola deterministica testabile;
- `TEACHER_INPUT`: il docente compila;
- `TEACHER_CONFIRMATION`: il sistema può precompilare ma serve conferma;
- `OPTIONAL_PROPOSAL`: eventuale AI, mai fatto autoritativo;
- `RESTRICTED`: richiede policy dedicata e non entra automaticamente nel bundle;
- `STATIC`: parte del modello istituzionale.

## 11. Privacy class

Classi minime:

```text
PUBLIC_INSTITUTIONAL
PROFESSIONAL_CONTEXT
AGGREGATE_CLASS_DATA
SENSITIVE_AGGREGATE
PERSONAL_STUDENT_DATA
SPECIAL_CATEGORY_DATA
```

Per DOC-TPL-01 il template può **descrivere** campi sensibili presenti nel modello originale, ma la loro compilazione automatica resta bloccata finché una policy verticale non la autorizza.

Nessuna presenza di un campo nel DOCX equivale ad autorizzazione al trattamento.

## 12. Template Coherence Audit

Ogni template candidato deve superare un audit formale.

### 12.1 Dimensioni

1. **Purpose coherence** — le sezioni sono pertinenti alla funzione dichiarata?
2. **Internal coherence** — esistono duplicazioni, contraddizioni o sovrapposizioni?
3. **Sequential coherence** — l'ordine riflette una progressione professionale comprensibile?
4. **Terminological coherence** — termini come contenuti, conoscenze, abilità, competenze, traguardi, risultati sono usati in modo distinto?
5. **Data coherence** — ogni campo ha fonte, derivazione o responsabilità umana definita?
6. **Inter-document coherence** — il template si raccorda correttamente con i documenti upstream/downstream?
7. **Privacy necessity** — ogni dato richiesto è necessario e trattabile?
8. **Render coherence** — struttura visiva e struttura semantica concordano?
9. **Completeness** — manca qualche elemento essenziale allo scopo?
10. **Redundancy/YAGNI** — esistono sezioni rituali o duplicate prive di funzione chiara?

### 12.2 Esito

```text
PASS
PASS_WITH_NOTES
REVIEW_REQUIRED
BLOCKED
```

Un finding non autorizza una correzione automatica del documento istituzionale.

## 13. Modello `TemplateAuditFinding`

```text
id
template_id
code
severity
category
section_key?
summary
evidence
recommendation
resolution_status
resolved_by?
resolved_at?
```

Severità:

```text
INFO
MINOR
MAJOR
BLOCKER
```

Stato:

```text
OPEN
ACCEPTED_AS_IS
RESOLVED_IN_NEW_TEMPLATE_VERSION
NOT_APPLICABLE
```

## 14. Fedeltà istituzionale vs coerenza

DOC-TPL-01 separa due gate:

### Gate A — Institution Fidelity

Verifica che il template digitale rappresenti fedelmente il modello sorgente: logo, intestazioni, sezioni, tabelle, campi, firma e impaginazione rilevante.

### Gate B — Document Coherence

Verifica che il modello sia internamente comprensibile e adeguato allo scopo.

Un template può essere:

```text
FIDELITY = PASS
COHERENCE = REVIEW_REQUIRED
```

In quel caso DOCENTE OS conserva il modello fedele ma non nasconde i rilievi.

## 15. Importazione DOCX

La prima versione non deve tentare un editor Word completo.

Pipeline proposta:

```text
DOCX sorgente
→ parser struttura
→ paragrafi / tabelle / immagini / sezioni / caselle
→ rilevazione campi candidati
→ mapping umano a section_key / field_key
→ audit
→ preview
→ attivazione
```

Il parser può riconoscere automaticamente struttura fisica, ma **non deve inventare semantica**.

## 16. Rendering profile

Il motore distingue schema semantico e renderer.

Profilo iniziale:

```text
DOCX_INSTITUTIONAL
PRINT_PDF
```

La sorgente DOCX può essere normalizzata con anchor strutturati. Dove possibile si preferiscono content controls/tag o bookmark governati rispetto a token testuali fragili.

Il renderer deve preservare:

- logo/immagini;
- tabelle;
- bordi e celle;
- gerarchia tipografica rilevante;
- paginazione intenzionale;
- campi firma/data;
- caselle/selection state.

## 17. Template Builder v1

Il primo builder non è un word processor.

Funzioni necessarie:

1. importa una sorgente;
2. mostra struttura rilevata;
3. permette di definire sezioni semantiche;
4. permette di mappare campi;
5. assegna value policy e privacy class;
6. esegue audit di coerenza;
7. mostra preview con dati campione;
8. registra Human Review;
9. attiva una versione.

Fuori scope iniziale:

- progettazione grafica libera da zero;
- collaboration editor complesso;
- modifica completa del DOCX dall'interfaccia;
- AI che decide autonomamente la struttura.

## 18. Raccordo con X5 / Documentazione

DOC-TPL-01 non sostituisce X5.

```text
DOC-TPL-01
  definisce struttura, campi e resa

DOC-01 / X5 generalizzato
  possiede documenti e versioni compilate

DOC-04 Relazione finale
  compone evidence bundle e contenuti professionali

Renderer
  materializza la versione usando il template esatto
```

Il `DocumentTemplateVersionRef` deve entrare nel manifest di ogni versione documentale prodotta.

## 19. Raccordo interdocumentale

Il template può dichiarare dipendenze semantiche:

```text
FINAL_REPORT
  reads PROGRAMMING
  reads PROGRAM_CARRIED_OUT
  reads EXECUTION_EVIDENCE

PROGRAM_CARRIED_OUT
  reads ANNUAL_PLAN
  reads TEACHING_SESSION

ANNUAL_PROGRAMMING
  reads CURRICULUM
```

Le dipendenze non implicano copia o write sugli owner sorgente.

## 20. Coherence rules machine-checkable vs human

### Deterministiche

- campo required senza source policy;
- field key duplicata;
- sezione required priva di campi/contenuto;
- render anchor mancante;
- mapping verso owner inesistente;
- template attivo senza source fingerprint;
- duplicazione esatta di sezione;
- presenza di campo `PERSONAL_STUDENT_DATA` in una verticale che lo vieta.

### Human Review

- chiarezza semantica di “Risultati”;
- pertinenza delle sezioni;
- correttezza della sequenza professionale;
- adeguatezza del lessico istituzionale;
- opportunità di mantenere una duplicazione formale;
- qualità della resa grafica.

## 21. Versionamento

Distinguere sempre:

```text
Template Version
Document Version
Source File Revision
```

Un documento finalizzato non cambia quando viene pubblicata una nuova versione del template.

## 22. Stato della sorgente

Una sorgente può essere classificata:

```text
INSTITUTION_OFFICIAL
INSTITUTION_WORKING_DRAFT
TEACHER_ADAPTED
HISTORICAL_REFERENCE
UNKNOWN
```

La classificazione deve essere esplicita; il nome del file non basta.

## 23. Acceptance criteria DOC-TPL-01

1. un DOCX reale può essere acquisito senza modificarne l'originale;
2. struttura fisica e semantica restano distinte;
3. sezioni e campi hanno chiavi stabili;
4. ogni campo ha value policy e privacy class;
5. l'audit produce finding tracciabili;
6. fidelity e coherence sono gate distinti;
7. `ACTIVE` richiede Human Review;
8. una nuova revisione della sorgente non modifica il template attivo;
9. una versione documento conserva il template esatto usato;
10. il motore non dipende da AI;
11. i token legacy possono essere importati ma non sono il contratto canonico;
12. il motore supporta almeno Relazione finale, Programma svolto e Programmazione annuale come famiglie modellabili;
13. nessun campo sensibile viene auto-compilato solo perché presente nel template;
14. il rendering conserva gli elementi istituzionali essenziali;
15. nessuna verticale deve hard-codificare il layout del singolo istituto.

## 24. Pilot

Primo pilot: `Relazione finale del docente.docx` dell'I.C. “don Lorenzo Milani”.

Output del pilot:

- schema strutturale;
- audit di coerenza;
- mapping iniziale section/field keys;
- classificazione privacy;
- elenco dei finding;
- decisione Human Review sul template sorgente;
- nessuna generazione runtime prima dell'approvazione del piano.

## 25. Dipendenza DOC-04

DOC-04 resta la prima verticale documentale, ma non deve incorporare un proprio sistema di template.

Dipendenza canonica proposta:

```text
DOC-TPL-01 → DOC-01/X5 → DOC-04
```

DOC-04 possiede contenuto e workflow della Relazione finale; DOC-TPL-01 possiede struttura e resa del modello istituzionale.

## 26. Implementazione

**NON AUTORIZZATA da questa specifica.**

Dopo Human Review della presente specifica sarà necessario un piano separato con TDD, migrazioni compatibili con X5, parser/importer, audit engine, template registry, renderer contract e pilot end-to-end.