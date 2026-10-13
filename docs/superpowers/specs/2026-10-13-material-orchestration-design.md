# MATERIAL-ORCH-01 — Governed Material Orchestration Design

**Status:** `DESIGN_BASELINE / HUMAN_REVIEW_REQUIRED`  
**Audit source:** `docs/superpowers/checkpoints/2026-10-13-material-orch-01-architecture-audit.md`  
**Baseline:** `develop@7ac09a8795d93cc9a950083cda8b01d5d1407257`

## 1. Obiettivo

Definire un'architettura stabile per la preparazione, produzione, revisione, accettazione e associazione dei materiali didattici in Docente OS, separando nettamente:

- identità canonica del Piano annuale;
- dominio dei materiali;
- provider di produzione;
- persistenza autorevole;
- autorizzazione runtime cross-product.

La specifica elimina il coupling strutturale emerso nella PR #692 e consente tranche piccole, indipendenti e qualificabili.

## 2. Principi non negoziabili

1. Docente OS modella il **compito professionale** “Prepara materiali”, non il provider.
2. Studio Atlas propone candidati; non diventa autorità su UDA, Piano annuale, lezione, Calendario o persistenza professionale.
3. Nessuna scrittura implicita.
4. Il docente accetta esplicitamente il materiale e la lezione di destinazione.
5. Riuso e adattamento vengono prima della generazione di nuovo contenuto.
6. CPRI è provider-neutral e vive fuori dal dominio Atlas.
7. `artifactKind` e `audience` sono dimensioni indipendenti.
8. `artifactRef` è durevole; `previewRef` è opzionale.
9. `ACCEPTED` non equivale a `USED_IN_TEACHING_SESSION`.
10. Il database risolve o verifica il contesto autorevole prima di persistire.
11. La configurazione di deploy non costituisce autorità di governance.
12. Ogni tranche ha un solo confine architetturale principale.

## 3. Authority matrix

| Area | Authority | Non-authority |
|---|---|---|
| Curricolo di istituto | Arena / contratti governati applicabili | Studio Atlas, MaterialBundle |
| Identità logica Piano annuale | `CAN-PLAN-x` | UUID Knowledge |
| Materializzazione runtime CAN-PLAN | binding workspace/anno governato in Docente OS | UUID compilati nel codice, metadata JSON |
| UDA/documento | Docente OS | Studio Atlas |
| Lezione | Docente OS | Studio Atlas |
| Materiale candidato | provider/adapter come proposta | persistenza professionale |
| Accettazione materiale | docente + Docente OS | provider |
| Persistenza materiale | Docente OS | Studio Atlas |
| Uso reale del materiale | TeachingSession/evidenza durevole | semplice stato `ACCEPTED` |
| Autorizzazione handoff | governance TRAMA | environment variable |
| Enablement tecnico | configurazione deploy | governance |

## 4. Componenti architetturali

### 4.1 CPRI — Canonical Plan Runtime Identity

Input logico:

```text
workspaceId
academicYearId
canonicalPlanCode
```

Output runtime:

```text
assetId
generationId
```

Invarianti:

- `CAN-PLAN-x` è l'identità logica portabile;
- `assetId`/`generationId` sono locali al workspace/anno;
- nessun consumer risolve authority tramite scansione JSON metadata;
- binding assente, invalido o ambiguo produce fail-closed;
- una nuova generazione Knowledge non sposta implicitamente il binding.

CPRI non conosce Studio Atlas né il dominio materiali.

### 4.2 Material Task

Intento utente canonico:

`PREPARE_MATERIALS`

Percorsi consentiti:

```text
REUSE_EXISTING
ADAPT_EXISTING
CREATE_NEW
```

Studio Atlas può implementare `CREATE_NEW` o `ADAPT_EXISTING` tramite adapter, ma non è codificato nell'intento canonico.

### 4.3 MaterialTaskRequest v1

Forma concettuale:

```text
MaterialTaskRequestV1
  version: 1
  task: PREPARE_MATERIALS
  lessonContext
    lessonBlockId
    sectionRef
    canonicalPlanCode?
    udaDocumentRef?
  requestedMode: REUSE_EXISTING | ADAPT_EXISTING | CREATE_NEW
  constraints
  returnContractVersion
```

Vincoli:

- nessun dato studente necessario al flusso;
- nessun token/API key nel payload;
- identificatori tecnici cross-product ridotti al minimo;
- il provider non riceve authority per modificare risorse Docente OS.

### 4.4 MaterialCandidateBundle v1

```text
MaterialCandidateBundleV1
  version: 1
  bundleId
  producer
  items[]
```

Ogni item:

```text
MaterialCandidateItemV1
  candidateId
  dedupeKey
  artifactKind
  audience
  title
  description?
  artifactRef
  previewRef?
  provenance
```

`artifactKind` minimo iniziale:

```text
PRESENTATION
WORKSHEET
GUIDE
RUBRIC
OTHER
```

`audience`:

```text
TEACHER
STUDENT
MIXED
```

Il mapping provider-specifico resta nell'adapter.

### 4.5 ArtifactReference v1

```text
ArtifactReferenceV1
  provider
  artifactId
  revision?
  integrityDigest?
```

Requisiti:

- stabile abbastanza da ricostruire quale artefatto è stato accettato;
- non coincidente con `previewRef`;
- nessuna URL pubblica considerata identità canonica;
- il riferimento non concede authority al provider.

Quando applicabile, Docente OS può materializzare uno snapshot durevole dell'artefatto accettato.

### 4.6 Provenance

La provenance deve conservare almeno:

```text
producer
contractVersion
producedAt?
sourceRefs?
```

Non deve contenere informazioni tecniche destinate all'output professionale del docente.

## 5. Lifecycle

Lifecycle del candidato/materiale:

```text
CANDIDATE
  ↓
REVIEWED
  ↓
ACCEPTED
  ↓
AVAILABLE_FOR_LESSON
```

Lifecycle d'uso:

```text
AVAILABLE_FOR_LESSON
  ↓
USED_IN_TEACHING_SESSION
```

L'ultimo passaggio richiede una receipt/evidenza durevole collegata alla TeachingSession pertinente.

## 6. Authoritative Material Acceptance Boundary

### 6.1 Obiettivo

Persistenza atomica e fail-closed dei materiali accettati dal docente.

### 6.2 Principio “resolve, do not trust”

L'RPC non deve considerare autorevoli relazioni dichiarate dal chiamante se possono essere risolte o verificate nel database.

Forma target preferita:

```text
accept_material_bundle(
  p_lesson_block_id uuid,
  p_bundle jsonb,
  p_idempotency_key text
)
```

Questa firma è una decisione di design da validare durante MATERIAL-CORE-01 rispetto allo schema reale; l'invariante obbligatoria è la minimizzazione degli input autorevoli.

### 6.3 Verifiche transazionali obbligatorie

Prima della scrittura il boundary deve dimostrare, nello stesso contesto transazionale:

- utente autenticato autorizzato per il workspace;
- lesson block esistente e appartenente al workspace/anno/sezione corretti;
- eventuale CAN-PLAN risolto tramite CPRI;
- bundle conforme al contratto supportato;
- `dedupeKey` canonicalizzata;
- `artifactRef` valido;
- nessun controllo/carattere vietato nei locator/riferimenti testuali destinati alla navigazione;
- duplicate/semantic retry gestiti in modo deterministico;
- nessuna persistenza parziale del bundle;
- nessuna mutazione implicita a UDA/Piano/Calendario.

### 6.4 Idempotenza

Un retry semanticamente identico può restituire il risultato già accettato.

Un conflitto con payload semanticamente diverso deve fallire chiuso.

La canonicalizzazione usata dalla lookup deve coincidere con quella usata dall'indice di unicità.

## 7. Provider Adapter

Interfaccia concettuale:

```text
prepareMaterials(request: MaterialTaskRequestV1)
  -> MaterialCandidateBundleV1
```

L'adapter:

- traduce il contratto canonico nel protocollo del provider;
- valida il ritorno;
- non persiste direttamente materiale autorevole;
- non modifica UDA/Piano/Calendario;
- non decide la lezione di destinazione;
- non diventa authority sui CAN-PLAN.

Studio Atlas è il primo adapter previsto, non l'unico modello possibile.

## 8. UX canonica

Punto di ingresso:

**Prepara materiali**

Gerarchia iniziale:

1. materiali già disponibili/pertinenti;
2. `Riutilizza`;
3. `Adatta`;
4. `Crea nuovo`;
5. eventuale provider, solo quando necessario e autorizzato.

Il nome Studio Atlas può comparire quando utile a spiegare lo strumento, ma non sostituisce l'intento principale.

Dopo il ritorno di candidati:

1. anteprima;
2. selezione esplicita;
3. scelta/verifica lezione pertinente;
4. `Associa alla lezione`;
5. persistenza atomica;
6. read-after-write dalla lezione canonica.

## 9. Runtime capability governance

Capability canonica proposta:

`DOS.STUDIO_ATLAS.MATERIAL_HANDOFF`

Stati:

```text
DISABLED
QUALIFIED
AUTHORIZED
```

Effettiva apertura runtime:

```text
effectiveCapability =
  governanceState == AUTHORIZED
  AND deploymentEnabled == true
```

Requisiti:

- una environment variable può solo restringere/abilitare tecnicamente una capacità già autorizzata;
- una environment variable non può trasformare `RUNTIME_DEFERRED` in autorizzazione;
- CI deve fallire se un percorso runtime cross-product diventa raggiungibile senza manifest governato compatibile.

## 10. Migrazioni e data readiness

Prima di applicare una migration che materializza binding o invariant forti su dati esistenti:

1. eseguire un preflight read-only;
2. classificare `READY | BLOCKED`;
3. riportare candidati mancanti, duplicati, ambigui o incoerenti;
4. non usare la migration come strumento di discovery;
5. non introdurre fixture HVA speciali per superare il gate.

## 11. Decomposizione di implementazione

### CPRI-01

Solo identità runtime CAN-PLAN.

### MATERIAL-CORE-01

Solo dominio provider-neutral + persistence boundary.

### MATERIAL-TASK-UX-01

Solo esperienza “Prepara materiali”.

### ATLAS-MATERIAL-ADAPTER-01

Solo protocol adapter.

### DOS-A1 Material Handoff Authorization

Solo decisione/governance + capability manifest + abilitazione controllata.

Nessuna tranche può assorbire retroattivamente responsabilità di una tranche successiva.

## 12. Architecture Readiness Gate

Prima della independent review di ogni tranche devono essere verificati:

- nessun provider specifico nell'identità canonica;
- nessun runtime cross-product non autorizzato;
- nessun `SECURITY DEFINER` che accetta contesto non risolto/non verificato come authority;
- dominio e SQL semanticamente allineati;
- test di boundary realmente inclusi nella CI;
- migrazioni con preflight quando toccano dati esistenti;
- `ACCEPTED` distinto da `USED`;
- nessun UUID CAN-PLAN statico usato come runtime authority.

## 13. Criteri di accettazione della specifica

La specifica è pronta per l'esecuzione quando:

- authority matrix accettata;
- CPRI separato da Atlas;
- contratti MaterialTaskRequest/MaterialCandidateBundle/ArtifactReference congelati almeno semanticamente;
- lifecycle congelato;
- principle `resolve, do not trust` accettato;
- capability model accettato;
- decomposizione delle tranche accettata;
- #692 mantenuta frozen come reference, non candidata all'integrazione.

## 14. Non-obiettivi

Questa specifica non:

- autorizza Studio Atlas a runtime;
- modifica il contenuto del curricolo;
- modifica i CAN-PLAN;
- esegue migration;
- promuove Supabase Beta;
- esegue merge;
- crea un nuovo modello parallelo di lezioni o documenti;
- introduce dati studente nel protocollo materiali.
