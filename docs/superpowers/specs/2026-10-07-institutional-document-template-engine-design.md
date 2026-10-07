# DOCENTE OS — Institutional Document Template Engine

Data: 2026-10-07  
Stato: **DESIGN SPEC / HUMAN REVIEW REQUIRED / NO IMPLEMENTATION AUTHORIZED**  
Codice di lavoro: **DOC-TPL-01**  
Branch: `docs/doc-04-relazione-finale-design`

## 1. Scopo

Definire un motore unico per **studiare, migliorare, progettare, strutturare, versionare e usare** template documentali istituzionali in DOCENTE OS.

I documenti presenti in Drive sono **sorgenti di riferimento**, non vincoli grafici da riprodurre alla lettera. Servono a comprendere:

- funzione del documento;
- prassi dell'istituto;
- informazioni richieste;
- strutture ricorrenti;
- tabelle o checklist utili;
- identità visiva essenziale.

Da queste sorgenti DOCENTE OS deve poter produrre un **template canonico migliorato**, coerente, leggibile e uniforme. Se un documento necessario non esiste ancora, lo stesso canone deve permettere di progettarlo da zero.

Il primo caso reale resta la **Relazione finale del docente** dell'I.C. “don Lorenzo Milani”; il motore dovrà supportare anche Programmazione annuale, Programma svolto, UDA nella resa istituzionale, verbali, relazioni, schede di validazione e altri documenti professionali.

## 2. Principio architetturale

La regola fondamentale è:

> **La sorgente documenta la prassi; il template canonico rappresenta la migliore forma documentale approvata.**

Non si persegue la fedeltà geometrica al vecchio file. Si preservano invece:

- funzione istituzionale;
- significato delle informazioni;
- identità dell'istituto;
- eventuali elementi formali realmente necessari;
- provenienza della revisione.

La forma può essere migliorata: sezioni riordinate, duplicazioni eliminate, tabelle ridisegnate, campi accorpati, spaziature corrette e formulazioni rese più chiare.

Pipeline canonica:

```text
Sorgente/e istituzionali
→ comprensione della funzione
→ analisi strutturale e semantica
→ Document Quality Review
→ proposta di struttura migliorata
→ mapping dati/privacy
→ preview documentale
→ Human Review
→ template canonico attivo
```

Per un documento mancante:

```text
Funzione istituzionale richiesta
→ analisi dei documenti collegati
→ progettazione struttura
→ Document Quality Review
→ preview
→ Human Review
→ template canonico attivo
```

## 3. Separazione obbligatoria: sorgente vs template canonico

DOC-TPL-01 distingue due oggetti concettuali.

### 3.1 `TemplateSourceRevision`

Conserva l'evidenza storica/importata:

```text
id
workspace_id
source_asset_ref
source_revision_ref?
source_kind
source_fingerprint
captured_at
classification
```

Classificazioni possibili:

```text
INSTITUTION_OFFICIAL
INSTITUTION_WORKING_DRAFT
TEACHER_ADAPTED
HISTORICAL_REFERENCE
UNKNOWN
```

La sorgente non viene modificata automaticamente.

### 3.2 `DocumentTemplate`

È il modello canonico migliorato e utilizzabile:

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
source_revision_refs[]
render_profile
created_at
created_by
approved_at?
approved_by?
```

`status`:

```text
DRAFT
QUALITY_REVIEWED
REVIEW_REQUIRED
ACTIVE
RETIRED
BLOCKED
```

Regole:

- `ACTIVE` richiede Human Review;
- una nuova sorgente non modifica un template attivo;
- il miglioramento produce una nuova versione del template;
- ogni documento generato conserva internamente il riferimento alla versione template usata;
- la provenienza tecnica non compare nel documento finale.

## 4. Famiglie documentali

La ricerca in Drive conferma almeno queste famiglie:

- Relazione finale;
- Programma svolto;
- Programmazione annuale;
- UDA/progettazione in forma istituzionale;
- verbali e documenti dipartimentali;
- schede di validazione;
- materiali collegiali e relazioni.

Il motore deve modellare funzioni differenti senza imporre una struttura unica.

Esempio:

- **Programmazione annuale** = progettazione e pianificazione;
- **Programma svolto** = rendicontazione sintetica di ciò che è stato effettivamente svolto;
- **Relazione finale** = lettura professionale del percorso e dei suoi esiti;
- **Verbale** = registrazione ordinata di fatti, decisioni e responsabilità.

## 5. Alternative architetturali

### A — Hard-code per documento

**Respinta.** Duplica logiche e impedisce coerenza fra famiglie.

### B — DOCX con soli placeholder

**Respinta come architettura primaria.** Può essere un formato di compatibilità, ma non governa semantica, qualità, privacy, versionamento o documenti mancanti.

### C — Schema semantico + canone documentale + renderer

**Raccomandata.**

DOCENTE OS conserva internamente struttura e mapping; il renderer produce il documento istituzionale approvato.

## 6. Institutional Document Design Canon

Ogni template attivo deve rispettare queste regole.

### 6.1 Funzione prima della forma

Ogni sezione deve avere uno scopo documentale riconoscibile. Nessuna sezione viene mantenuta soltanto perché esisteva nel Word precedente.

### 6.2 Una informazione, un posto

Evitare duplicazioni fra sezioni equivalenti. Se due informazioni hanno funzioni diverse, la differenza deve essere esplicita.

### 6.3 Tabelle solo quando migliorano la comprensione

Usare tabelle per:

- confronti;
- corrispondenze;
- dati strutturati;
- sintesi di elementi omogenei;
- griglie realmente funzionali.

Non usare tabelle come sostituto di un testo professionale che richiede argomentazione.

### 6.4 Testo per giudizi professionali

Andamento, valutazione complessiva, motivazioni, criticità e considerazioni finali devono avere spazio testuale adeguato, eventualmente guidato.

### 6.5 Checklist per vere selezioni multiple

Materiali, metodologie e modalità di verifica possono usare checklist quando la selezione è informativa. Deve essere possibile integrare con testo libero se il dominio lo richiede.

### 6.6 Economia documentale

Evitare:

- doppie intestazioni senza funzione;
- pagine quasi vuote;
- grandi spazi fissi non necessari;
- sezioni rituali prive di contenuto;
- ripetizioni dello stesso dato;
- griglie create solo per imitare il file sorgente.

### 6.7 Coerenza interdocumentale

Ogni famiglia deve dichiarare cosa legge dai documenti a monte e cosa produce per quelli a valle, evitando copie ridondanti.

### 6.8 Stile istituzionale uniforme

Intestazione, titoli, tabelle, date, firme, spaziature e gerarchia tipografica devono appartenere a un sistema coerente dell'istituto.

### 6.9 Linguaggio scolastico-professionale

Il documento deve essere comprensibile a docenti, dirigenza e organi collegiali senza conoscere DOCENTE OS.

## 7. Regola assoluta: nessun riferimento tecnico nel documento finale

Il documento esportato non deve esporre il funzionamento interno del sistema.

Sono vietati nell'output professionale, salvo richiesta istituzionale esplicita e non tecnica:

- codici CAN;
- codici Bxx;
- UUID;
- nomi di tabelle o modelli dati;
- `TeachingSession`, `KnowledgeAsset` o equivalenti;
- nomi di stati interni come `AUTO_DOCUMENTED`, `DERIVED`, `PROPOSED`;
- nomi di workflow o pipeline;
- riferimenti a modelli di IA/provider;
- percorsi Drive interni;
- hash, fingerprint o versioni tecniche;
- formule come «generato automaticamente dal sistema»;
- provenance tecnica.

La provenienza resta disponibile **solo nella superficie di controllo interna**.

Il documento può mostrare esclusivamente informazioni professionalmente pertinenti, ad esempio:

- istituto;
- anno scolastico;
- classe/sezione;
- disciplina;
- docente;
- contenuti e valutazioni professionali;
- data e firma;
- eventuale versione documentale solo se l'istituto decide che abbia valore amministrativo.

## 8. Struttura semantica `TemplateSection`

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
render_role
```

`render_role` descrive la forma migliore, non coordinate del vecchio file:

```text
HEADING
PARAGRAPH
KEY_VALUE
TABLE
CHECKLIST
CALLOUT
SIGNATURE_BLOCK
```

## 9. Modello `TemplateField`

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

## 10. Chiavi semantiche stabili

Le chiavi interne non incorporano classe o anno.

Esempi:

```text
academic_year.label
class.label
discipline.label
teacher.display_name
class.profile.summary
learning.executed_content
learning.outcomes_summary
learning.competence_targets
methods.selected
assessment.methods
final.reflection
```

Queste chiavi **non vengono stampate**.

## 11. Politica del valore

Internamente ogni campo può essere:

```text
AUTO_DOCUMENTED
DERIVED
TEACHER_INPUT
TEACHER_CONFIRMATION
OPTIONAL_PROPOSAL
RESTRICTED
STATIC
```

Queste etichette servono al sistema e non compaiono mai nel documento.

## 12. Privacy class

Classi minime:

```text
PUBLIC_INSTITUTIONAL
PROFESSIONAL_CONTEXT
AGGREGATE_CLASS_DATA
SENSITIVE_AGGREGATE
PERSONAL_STUDENT_DATA
SPECIAL_CATEGORY_DATA
```

La presenza di un campo nella sorgente storica non costituisce da sola motivo sufficiente per mantenerlo nel template canonico.

Un dato viene mantenuto solo se:

1. serve realmente alla funzione del documento;
2. ha una policy compatibile;
3. è approvato nella Human Review del template.

## 13. Document Quality Review

Il precedente concetto di audit viene rifocalizzato sui problemi sostanziali.

Domande principali:

1. **Purpose** — il documento serve bene al proprio scopo?
2. **Information architecture** — le informazioni sono ordinate, non duplicate e leggibili?
3. **Semantic clarity** — i termini hanno significato chiaro e non sovrapposto?
4. **Representation** — tabella, checklist o testo sono usati dove realmente appropriato?
5. **Inter-document coherence** — il documento è coerente con quelli a monte/a valle senza duplicarli?
6. **Data necessity** — ogni informazione richiesta è necessaria?
7. **Privacy** — i dati richiesti sono appropriati e minimizzati?
8. **Institutional consistency** — stile e lessico sono coerenti con la famiglia documentale?
9. **Readability** — il documento è leggibile a schermo e in stampa?
10. **External purity** — l'output è privo di riferimenti tecnici?

Esito:

```text
PASS
PASS_WITH_NOTES
REVIEW_REQUIRED
BLOCKED
```

Dettagli puramente cosmetici diventano finding solo se incidono su leggibilità, funzione o resa professionale.

## 14. Modello `TemplateQualityFinding`

```text
id
template_id
code
severity
category
section_key?
summary
evidence
recommended_design_change
resolution_status
```

Severità:

```text
INFO
MINOR
MAJOR
BLOCKER
```

## 15. Importazione da documento esistente

Pipeline:

```text
DOCX/PDF/Google Doc
→ estrazione struttura utile
→ identificazione funzione/sezioni/campi
→ confronto con documenti collegati
→ proposta normalizzata
→ Document Quality Review
→ preview
→ Human Review
→ template canonico
```

Il parser non deve ricostruire pixel-per-pixel il file precedente.

## 16. Progettazione di documenti mancanti

DOC-TPL-01 deve supportare template senza sorgente preesistente.

Input minimi:

- funzione istituzionale;
- destinatari;
- informazioni necessarie;
- documenti a monte;
- documenti a valle;
- identità visiva dell'istituto;
- eventuali vincoli formali approvati.

Output:

- struttura semantica;
- scelta dei pattern di rappresentazione;
- campi e policy;
- preview;
- Quality Review;
- Human Review.

## 17. Renderer

Profili iniziali:

```text
DOCX_INSTITUTIONAL
PRINT_PDF
```

Il renderer deve preservare **identità e qualità istituzionale**, non gli errori di impaginazione della sorgente.

Deve gestire:

- logo e intestazione;
- gerarchia tipografica;
- tabelle responsive alla quantità di contenuto;
- checklist;
- paragrafi professionali;
- interruzioni di pagina intelligenti;
- blocco data/firma;
- margini e spaziature uniformi.

## 18. Template Builder v1

Il builder non è un word processor generale.

Funzioni:

1. importa una o più sorgenti oppure parte da un nuovo documento;
2. identifica la funzione documentale;
3. propone/mostra la struttura semantica;
4. permette di eliminare, accorpare o riordinare sezioni;
5. permette di scegliere il pattern di resa per ogni sezione;
6. mappa i campi alle fonti;
7. assegna privacy/value policy;
8. esegue Document Quality Review;
9. mostra una preview priva di metadati tecnici;
10. registra Human Review;
11. pubblica una versione canonica.

## 19. Raccordo con X5 / Documentazione

```text
DOC-TPL-01
  progetta struttura e resa canonica

DOC-01 / X5 generalizzato
  possiede documenti e versioni compilate

DOC-04 Relazione finale
  compone contenuti professionali e provenienza interna

Renderer
  produce il documento istituzionale pulito
```

La versione template usata resta nel manifest interno; non viene stampata salvo scelta amministrativa esplicita.

## 20. Raccordo interdocumentale

```text
ANNUAL_PROGRAMMING
  reads CURRICULUM

PROGRAM_CARRIED_OUT
  reads ANNUAL_PLAN
  reads EXECUTION_EVIDENCE

FINAL_REPORT
  reads ANNUAL_PROGRAMMING
  reads PROGRAM_CARRIED_OUT
  reads EXECUTION_EVIDENCE
```

Il raccordo serve alla coerenza; non implica copia integrale dei documenti a monte.

## 21. Regole verificabili automaticamente

Il sistema può controllare:

- campi obbligatori senza fonte/policy;
- duplicazioni di field key;
- sezioni vuote obbligatorie;
- incompatibilità privacy;
- riferimenti a fonti inesistenti;
- token tecnici residui nell'output;
- codici interni, UUID o provenance tecnica presenti nella preview;
- template attivo senza Human Review;
- documenti generati senza versione template associata internamente.

## 22. Human Review

La revisione umana giudica soprattutto:

- adeguatezza della struttura;
- chiarezza del lessico;
- opportunità delle tabelle;
- equilibrio fra sintesi e completezza;
- qualità istituzionale della resa;
- coerenza con le prassi della scuola;
- assenza di tecnicismi visibili.

## 23. Acceptance criteria DOC-TPL-01

1. una sorgente Drive può essere acquisita senza modificarla;
2. il template canonico può discostarsi dalla forma sorgente quando ciò migliora il documento;
3. ogni modifica di struttura mantiene tracciabile la provenienza interna;
4. tabelle/checklist/testo sono scelti in base alla funzione;
5. un documento mancante può essere progettato senza sorgente preesistente;
6. il Quality Review individua duplicazioni e ambiguità sostanziali;
7. un template `ACTIVE` richiede Human Review;
8. i dati sensibili non vengono mantenuti per inerzia storica;
9. il motore non dipende da AI;
10. Relazione finale, Programma svolto e Programmazione annuale sono modellabili come famiglie distinte;
11. il renderer produce un documento professionale coerente con l'identità dell'istituto;
12. **nessun riferimento tecnico interno compare nell'output finale**;
13. nessuna verticale hard-codifica il layout di un singolo file;
14. una nuova versione del template non altera documenti già finalizzati;
15. il documento esportato resta comprensibile autonomamente fuori da DOCENTE OS.

## 24. Pilot

Primo pilot: **Relazione finale**.

Output richiesti:

- analisi della sorgente 2025/26;
- proposta di struttura migliorata;
- mapping semantico;
- privacy review;
- preview professionale senza riferimenti tecnici;
- confronto motivato sorgente → versione migliorata;
- Human Review.

Il pilot non deve limitarsi a rendere digitale il vecchio Word.

## 25. Dipendenza DOC-04

Dipendenza canonica:

```text
DOC-TPL-01 → DOC-01/X5 → DOC-04
```

DOC-04 usa il template canonico approvato; non replica la struttura storica del DOCX.

## 26. Implementazione

**NON AUTORIZZATA da questa specifica.**

Dopo Human Review sarà necessario un piano separato con TDD, compatibilità X5, template registry, quality rules, builder, renderer e pilot end-to-end.