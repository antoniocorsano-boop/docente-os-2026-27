# DOCENTE OS — Institutional Document Template Engine

Data: 2026-10-09  
Stato: **DESIGN SPEC / REVIEW REMEDIATED / HUMAN REVIEW REQUIRED / NO IMPLEMENTATION AUTHORIZED**  
Codice di lavoro: **DOC-TPL-01**  
Branch: `docs/doc-04-relazione-finale-design`

## 1. Scopo

Definire un motore unico per studiare, migliorare, progettare, strutturare, versionare e usare modelli documentali istituzionali in DOCENTE OS.

I documenti esistenti sono **sorgenti di riferimento**, non layout da riprodurre alla lettera. Servono a comprendere funzione, prassi, informazioni necessarie, strutture ricorrenti e identità istituzionale. Da queste sorgenti DOCENTE OS produce una forma canonica migliorata, coerente, leggibile e uniforme. Se una famiglia documentale non esiste ancora, il canone deve permettere di progettarla da zero.

Primo pilot: **Relazione finale del docente**. Le stesse regole devono supportare Programmazione annuale, Programma svolto, UDA in forma istituzionale e successive famiglie approvate.

## 2. Principio architetturale

> **La sorgente documenta la prassi; la base istituzionale governa l’identità comune; il modello di famiglia governa la semantica specifica.**

Il motore separa obbligatoriamente quattro responsabilità:

```text
TemplateSourceRevision
        ↓
InstitutionalBaseVersion  +  DocumentTemplateVersion
        ↓                           ↓
      identità/resa comune     semantica di famiglia
                 ↘             ↙
              document version pin
                      ↓
                   renderer
```

Non si persegue fedeltà geometrica al vecchio file. Si preservano funzione istituzionale, significato delle informazioni, identità dell’Istituto, vincoli formali necessari e provenienza interna della revisione.

## 3. Sorgenti: `TemplateSourceRevision`

La sorgente è evidenza immutabile/importata:

```text
id
workspace_id
source_asset_ref?
source_revision_ref?
source_kind
source_fingerprint
captured_at
classification
```

Classificazioni:

```text
INSTITUTION_OFFICIAL
INSTITUTION_WORKING_DRAFT
TEACHER_ADAPTED
HISTORICAL_REFERENCE
UNKNOWN
```

Regole:

- una sorgente non viene modificata automaticamente;
- byte identici provenienti da asset/revisioni/kind differenti mantengono provenance distinta;
- una nuova sorgente non cambia automaticamente una base o un template attivi;
- la provenance tecnica non compare nel documento professionale.

## 4. Base istituzionale first-class

La **base grafica istituzionale condivisa** è un oggetto canonico autonomo. Non è duplicata dentro ciascun template di famiglia.

### 4.1 `InstitutionalBase`

Identità stabile della base dell’Istituto:

```text
id
workspace_id
name
status
current_version_no
active_version_no?
created_at
created_by
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

### 4.2 `InstitutionalBaseVersion`

Versione immutabile della resa comune:

```text
id
institutional_base_id
version_no
identity_profile
header_profile
footer_profile
typography_profile
page_geometry_profile
common_table_profile
signature_profile
accessibility_profile
source_revision_refs[]
created_at
created_by
```

La base governa almeno:

- denominazione e identità dell’Istituto;
- logo/marchio approvato;
- intestazione e piè di pagina;
- tipografia e gerarchia;
- margini e geometria A4;
- numerazione/interruzioni pagina;
- regole comuni per tabelle;
- blocchi data, luogo, firma;
- leggibilità, stampa e accessibilità;
- elementi cromatici istituzionali ammessi.

Regole:

- ogni modifica produce una nuova `InstitutionalBaseVersion`;
- `ACTIVE` richiede Quality Review + Human Review;
- una nuova versione non modifica retroattivamente documenti già salvati/finalizzati;
- una base `RETIRED` conserva lo storico ed è terminale/read-only per la stessa identità: nessuna nuova versione, Quality Review, attivazione, blocco, rimozione blocco o ulteriore retirement è consentita; restano ammessi soltanto read/snapshot storici autorizzati;
- l’utente ordinario non vede ID o numeri tecnici della base.

## 5. Modello di famiglia: `DocumentTemplate`

`DocumentTemplate` rappresenta la semantica specifica della famiglia documentale:

```text
id
workspace_id
kind
name
status
current_version_no
active_version_no?
created_at
created_by
```

Famiglie iniziali:

```text
ANNUAL_PROGRAMMING
UDA_INSTITUTIONAL
PROGRAM_CARRIED_OUT
FINAL_REPORT
```

Le famiglie restano semanticamente distinte:

- Programmazione annuale = progettazione e pianificazione;
- UDA = unità didattica/progettuale;
- Programma svolto = rendicontazione sintetica dell’effettivamente svolto;
- Relazione finale = lettura professionale del percorso e dei suoi esiti.

Il lifecycle della famiglia segue le stesse regole della base: `RETIRED` è terminale/read-only per la stessa identità e non può essere riaperto, ribloccato, revisionato o riattivato. Per una nuova vita istituzionale serve una nuova identità/template, non la mutazione di quello ritirato.

## 6. `DocumentTemplateVersion`

Versione immutabile della semantica di famiglia:

```text
id
template_id
version_no
schema_json
source_revision_refs[]
created_at
created_by
```

La versione definisce:

- sezioni semantiche;
- ordine/obbligatorietà;
- campi;
- regole condizionali;
- mapping alle fonti;
- value/privacy policy;
- render role semantici.

**Non** contiene una copia della base istituzionale.

## 7. Pinning obbligatorio delle due versioni

Ogni documento professionale/versione compilata deve conservare internamente **due pin distinti**:

```text
institutional_base_id
institutional_base_version_no
family_template_id
family_template_version_no
```

Regole:

1. anteprima, PDF e futuro DOCX della stessa versione documento usano gli stessi due pin;
2. una modifica futura della base non cambia documenti/versioni precedenti;
3. una modifica futura del template di famiglia non cambia documenti/versioni precedenti;
4. la ricostruzione storica deve poter risolvere entrambi i pin;
5. nessun renderer può sostituire silenziosamente uno dei due pin con la versione attiva corrente.

Questo è un requisito di identità/versionamento, non un dettaglio grafico.

## 8. Governance e lifecycle

Le azioni che cambiano la disponibilità istituzionale di una base/template hanno impatto sull’intero workspace e richiedono una capability esplicita.

Per v1 la capability canonica è:

```text
TEMPLATE_GOVERNANCE
```

Mapping ai ruoli workspace già esistenti:

```text
OWNER  → consentita
ADMIN  → consentita
MEMBER → negata
```

La capability `TEMPLATE_GOVERNANCE` è obbligatoria per:

```text
ACTIVATE
BLOCK
CLEAR_BLOCK
RETIRE
```

Regole:

- autenticazione + semplice membership non sono sufficienti per queste azioni;
- il trusted boundary/RPC ricalcola il ruolo corrente dal workspace e non si fida di un ruolo inviato dal client;
- Quality Review deterministica può essere eseguita senza trasferire authority istituzionale; l’attivazione resta comunque subordinata a Human Review e `TEMPLATE_GOVERNANCE`;
- ogni decisione lifecycle persiste actor, ruolo/capability effettiva, timestamp e nota/evidenza interna;
- `BLOCKED` esclude la base/template dai nuovi usi; `CLEAR_BLOCK` riporta soltanto a uno stato revisionabile, non direttamente ad `ACTIVE`;
- `RETIRED` è terminale/read-only per entrambe le famiglie di registry: `saveVersion`, `recordQualityReview`, `activate`, `block`, `clearBlock` e `retire` devono fallire **prima** di qualsiasi mutazione o nuova decisione;
- un `MEMBER` non può attivare, bloccare, sbloccare o ritirare una base/template neppure se appartiene allo stesso workspace;
- i read/snapshot storici restano regolati dalle normali policy di lettura e non riaprono il lifecycle.

## 9. Pipeline canonica

Per documento con sorgenti:

```text
sorgenti
→ analisi funzione/struttura
→ proposta InstitutionalBaseVersion (se necessario)
→ proposta DocumentTemplateVersion
→ Document Quality Review
→ preview con pin base+template
→ Human Review
→ attivazione esplicita da actor TEMPLATE_GOVERNANCE
```

Per famiglia mancante:

```text
funzione istituzionale
→ documenti a monte/a valle
→ struttura semantica
→ base istituzionale attiva
→ Quality Review
→ preview
→ Human Review
→ template attivo tramite TEMPLATE_GOVERNANCE
```

## 10. `TemplateSection`

```text
section_key
ordinal
label
purpose
required
repeatable
visibility_rule?
render_role
```

`render_role`:

```text
HEADING
PARAGRAPH
KEY_VALUE
TABLE
CHECKLIST
CALLOUT
SIGNATURE_BLOCK
```

La forma descrive il ruolo migliore, non coordinate del vecchio file.

## 11. `TemplateField`

```text
field_key
section_key
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

Value policy:

```text
AUTO_DOCUMENTED
DERIVED
TEACHER_INPUT
TEACHER_CONFIRMATION
OPTIONAL_PROPOSAL
RESTRICTED
STATIC
```

Privacy class:

```text
PUBLIC_INSTITUTIONAL
PROFESSIONAL_CONTEXT
AGGREGATE_CLASS_DATA
SENSITIVE_AGGREGATE
PERSONAL_STUDENT_DATA
SPECIAL_CATEGORY_DATA
```

Le etichette interne non compaiono nel documento professionale.

## 12. Chiavi semantiche e purezza esterna

Esempi interni:

```text
academic_year.label
class.label
discipline.label
teacher.display_name
class.profile.summary
learning.executed_content
learning.outcomes_summary
methods.selected
assessment.methods
final.reflection
```

Nell’output professionale sono vietati:

- codici CAN/Bxx;
- UUID;
- nomi di tabelle/entità software;
- stati interni;
- workflow/pipeline;
- provider/modelli IA;
- Drive path;
- hash/fingerprint;
- provenance tecnica;
- formule come «generato automaticamente».

La provenance resta disponibile soltanto nella superficie interna di controllo.

## 13. Document Quality Review

Il Quality Review verifica almeno:

1. purpose;
2. information architecture;
3. semantic clarity;
4. representation;
5. inter-document coherence;
6. data necessity;
7. privacy;
8. institutional consistency;
9. readability/accessibility;
10. external purity;
11. coerenza del pin `InstitutionalBaseVersion`;
12. coerenza del pin `DocumentTemplateVersion`.

Esiti:

```text
PASS
PASS_WITH_NOTES
REVIEW_REQUIRED
BLOCKED
```

L’attivazione della base o del template richiede review deterministica affidabile, decisione umana esplicita sulla stessa versione e actor con `TEMPLATE_GOVERNANCE`.

## 14. Builder v1

Il builder non è un word processor generale. Deve permettere di:

1. scegliere/analizzare sorgenti;
2. identificare funzione documentale;
3. selezionare o proporre la base istituzionale;
4. mostrare struttura semantica della famiglia;
5. accorpare/riordinare sezioni;
6. scegliere render role;
7. mappare campi/fonti/policy;
8. eseguire Quality Review;
9. mostrare preview con base+template esatti;
10. registrare Human Review;
11. pubblicare esplicitamente una nuova versione solo se l’actor possiede `TEMPLATE_GOVERNANCE`.

La UI quotidiana del docente sceglie il **tipo di documento**, non ID/versioni tecniche. I controlli `Attiva`, `Blocca`, `Rimuovi blocco`, `Ritira` non sono disponibili a `MEMBER`.

## 15. Renderer

Profili iniziali:

```text
PRINT_PDF
DOCX_INSTITUTIONAL   # tranche successiva quando qualificata
```

Il renderer riceve contenuto salvato + `InstitutionalBaseVersion` + `DocumentTemplateVersion` e non consulta implicitamente «la versione attiva di oggi» per ricostruire un documento storico.

Deve gestire identità, logo/intestazione, gerarchia tipografica, tabelle, checklist, paragrafi, page break, data/firma, margini e accessibilità.

## 16. Raccordo con X5 / Documentazione

```text
DOC-TPL-01
  possiede base istituzionale + template di famiglia + versioni

DOC-01 / X5
  possiede documenti compilati e versioni salvate
  pinna base_version + family_template_version

DOC-04
  compone contenuti/evidenze e decisioni professionali

Renderer
  produce output istituzionale pulito dai pin salvati
```

## 17. Raccordo interdocumentale

```text
ANNUAL_PROGRAMMING
  reads CURRICOLO APPLICABILE

PROGRAM_CARRIED_OUT
  reads ANNUAL_PROGRAMMING / ANNUAL_PLAN / EXECUTION_EVIDENCE

FINAL_REPORT
  reads ANNUAL_PROGRAMMING / PROGRAM_CARRIED_OUT / EXECUTION_EVIDENCE
```

Il raccordo non implica copia integrale e non trasferisce authority fra domini.

## 18. Regole verificabili automaticamente

Il sistema deve poter rilevare:

- duplicate/missing section/field keys;
- field schema malformati;
- privacy/value-policy incompatibili;
- source refs inesistenti;
- token tecnici nella preview;
- base/template attivi senza review valida;
- documento/versione senza entrambi i pin;
- mismatch fra schema kind/version e registry;
- tentativo di ricostruire un documento storico con base/template correnti anziché pinnati;
- lifecycle mutation richiesta da `MEMBER` o actor senza `TEMPLATE_GOVERNANCE`;
- qualsiasi mutazione richiesta su identità `RETIRED`.

## 19. Human Review

La Human Review giudica:

- adeguatezza struttura/lessico;
- opportunità di tabelle/checklist/testo;
- equilibrio sintesi/completezza;
- qualità istituzionale;
- coerenza con prassi scolastica;
- identità comune coerente fra famiglie;
- assenza di tecnicismi visibili.

La Human Review non sostituisce l’autorizzazione del trusted boundary: la pubblicazione/lifecycle istituzionale richiede comunque `TEMPLATE_GOVERNANCE`.

## 20. Acceptance criteria DOC-TPL-01

1. sorgenti acquisibili senza modifica;
2. provenance distinte preservate;
3. `InstitutionalBase` e `DocumentTemplate` sono identità separate;
4. entrambi hanno versioni immutabili e lifecycle governato;
5. ogni document version pinna esattamente una base version e una family-template version;
6. preview/export storico usa i pin salvati;
7. aggiornamenti base/template non alterano retroattivamente documenti precedenti;
8. template/base `ACTIVE` richiedono Quality Review + Human Review + `TEMPLATE_GOVERNANCE`;
9. `MEMBER` non può eseguire activate/block/clearBlock/retire;
10. dopo `RETIRED`, tutte le sei mutazioni `saveVersion`, `recordQualityReview`, `activate`, `block`, `clearBlock`, `retire` falliscono per base e family template senza cambiare stato/decision history;
11. read/snapshot storico exact-pin resta disponibile dopo block/retirement secondo le policy di lettura;
12. dati sensibili non sono mantenuti per inerzia storica;
13. motore non dipende da AI;
14. famiglie documentali restano semanticamente distinte;
15. output finale non contiene riferimenti tecnici;
16. nessuna verticale hard-codifica il layout di un singolo file;
17. output resta comprensibile fuori da DOCENTE OS.

## 21. Pilot

Pilot Relazione finale:

- analisi sorgente 2025/26;
- scelta/proposta base istituzionale;
- struttura migliorata di famiglia;
- mapping semantico/privacy;
- preview con pin base+template;
- confronto motivato;
- Human Review.

Il pilot non digitalizza semplicemente il vecchio Word.

## 22. Implementazione

**NON AUTORIZZATA da questa specifica.**

Dopo Human Review, la foundation runtime DOC-TPL-01 deve dimostrare con TDD che registry, repository, snapshot, preview e renderer trattano `InstitutionalBaseVersion` e `DocumentTemplateVersion` come pin separati; che lifecycle istituzionale è autorizzato solo da `TEMPLATE_GOVERNANCE` (`OWNER|ADMIN` in v1); che `RETIRED` è terminale/read-only per entrambe le identità; e che provenance/purezza dell’output restano preservate.
