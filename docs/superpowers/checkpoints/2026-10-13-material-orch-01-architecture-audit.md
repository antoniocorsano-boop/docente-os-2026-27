# MATERIAL-ORCH-01 — Audit architetturale e decisione di fase

> [!IMPORTANT]
> **SUPERSEDED / HISTORICAL EVIDENCE / NON-NORMATIVE.** Questo documento conserva l'audit originario che ha motivato la separazione della PR #692, ma **non rappresenta più l'architettura approvata corrente** di MATERIAL-ORCH-01. Le sezioni che seguono su `MaterialTaskRequest`, `MaterialCandidateBundle`, lifecycle materiale parallelo, `DOS.STUDIO_ATLAS.MATERIAL_HANDOFF` e relative tranche descrivono una direzione **pre-v2** e non devono essere usate come contratto di implementazione o fonte di autorità.
>
> La direzione normativa corrente è definita da:
> - `docs/superpowers/specs/2026-10-13-material-orchestration-design.md` — design v2.2;
> - `docs/superpowers/plans/2026-10-13-material-core-01-canonical-material-acceptance.md`;
> - `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md`;
> - `docs/superpowers/plans/2026-10-13-cpri-01-canonical-plan-runtime-identity.md`;
> - `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`.
>
> In caso di conflitto, **prevalgono sempre i documenti correnti sopra elencati**. In particolare: nessun protocollo Atlas parallelo, nessun capability ID provider-specifico canonico, shared capability subordinata a OR-07 `PROPOSE_ONLY`, e materiali accettati instradati attraverso Knowledge/canonical content → typed `LessonDesignExtension` → `LessonPreparationManifest.materialSlots`.

**Data:** 2026-10-13  
**Baseline canonica di partenza:** `develop@7ac09a8795d93cc9a950083cda8b01d5d1407257`  
**Riferimento qualificato ma non integrabile:** PR #692 `feat/uda-atlas-material-binding`  
**Stato storico della decisione al momento dell'audit:** `SUPERSEDED_PRE_V2 / HISTORICAL_EVIDENCE / IMPLEMENTATION_RESTRUCTURE_REQUIRED`

## 1. Decisione esecutiva

La PR #692 non deve più essere trattata come una normale candidata al merge né come una branch da correggere finding-per-finding.

Stato canonico della #692 per questa fase:

`QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`

La branch conserva valore come sorgente qualificata di contratti, test, correzioni e lezioni apprese, ma non è più il veicolo di integrazione.

Vincoli immediati:

- nessun nuovo fix reattivo sulla #692;
- nessun merge della #692;
- nessuna promozione Supabase Beta delle migration 0098–0100 provenienti dalla #692;
- nessuna attivazione runtime Studio Atlas derivata implicitamente dalla sola configurazione di deploy;
- nessun PASS ereditato da head precedenti per nuove tranche.

## 2. Motivo della ristrutturazione

La #692 ha accumulato responsabilità che appartengono a confini architetturali diversi:

1. **CPRI — Canonical Plan Runtime Identity**: identità logica `CAN-PLAN-x` e materializzazione runtime workspace/anno;
2. **Material Acceptance Core**: accettazione, idempotenza, deduplicazione, lifecycle e associazione dei materiali alla lezione;
3. **Studio Atlas handoff**: protocollo cross-product per produrre candidati materiali;
4. **Runtime authorization**: decisione governata se e quando Docente OS possa attivare il collegamento operativo verso Studio Atlas;
5. **UX Material Task**: il compito docente “Prepara materiali”, che non deve coincidere con un singolo provider.

La loro coesistenza nella stessa PR produce una superficie di review troppo ampia. Ogni finding locale modifica l'exact head e riapre test e review su confini non direttamente correlati.

La causa strutturale del ciclo “finding → fix → nuova review → nuovo finding” è quindi **scope coupling**, non semplice insufficienza dei singoli correttivi.

## 3. Elementi già validi da preservare

L'audit non invalida il lavoro già svolto. Devono essere riutilizzati selettivamente:

- `CAN-PLAN-1/2/3` come identità logiche portabili;
- `asset_id` e `generation_id` come identità locali di materializzazione Knowledge;
- risoluzione workspace/year-local fail-closed;
- ambiguità trattata come errore, mai come scelta del “primo candidato”;
- persistenza bundle atomica;
- idempotenza esplicita;
- dedupe key canonicalizzata al boundary di persistenza;
- validazione server/database del payload;
- nessuna mutazione implicita di UDA, Piano annuale o Calendario;
- scelta esplicita del docente prima dell'associazione alla lezione;
- exact-head certification, migration replay, Browser Certification, HVA, WCAG, P6, X3/X4, K1, X5/X5B e P7 come infrastruttura di qualificazione.

## 4. Finding architetturali

### A1 — CPRI non appartiene alla feature Atlas

CPRI è infrastruttura trasversale di Docente OS. Viene usata da Piano annuale, Classi, Lezioni, assistente, feedback, provenance e futuri flussi Materiali/Documentazione.

Deve essere una tranche autonoma e provider-neutral.

### A2 — Governance runtime non può essere sostituita da una variabile di deploy

Il contratto di ecosistema mantiene `DOS-A1 = RUNTIME_DEFERRED` finché una capacità cross-product non viene esplicitamente autorizzata.

Una configurazione tipo `STUDIO_ATLAS_RUNTIME_AUTHORIZATION=AUTHORIZED` può essere un interruttore tecnico fail-closed, ma non può diventare la fonte di autorità.

Ordine canonico:

`governance authorization → capability manifest → deployment enablement → effective runtime capability`

Mai il contrario.

### A3 — Il task utente è “Prepara materiali”, non “Apri Atlas”

Docente OS deve modellare l'intento professionale, non il provider.

Flusso target:

`UDA/lezione → Prepara materiali → Riutilizza | Adatta | Crea nuovo → eventuale Studio Atlas → anteprima → accettazione docente → associazione alla lezione`

Questo preserva il principio “riuso prima della generazione”.

### A4 — `artifactKind` e `audience` devono essere separati

Il tipo dell'artefatto non determina automaticamente il destinatario.

Esempio di contratto target:

```text
MaterialCandidateItem
  candidateId / dedupeKey
  artifactKind: PRESENTATION | WORKSHEET | GUIDE | RUBRIC | ...
  audience: TEACHER | STUDENT | MIXED
  title
  description?
  artifactRef
  previewRef?
  provenance
```

### A5 — `previewRef` non è identità durevole

Devono essere separati:

- `artifactRef`: identità stabile dell'artefatto;
- `previewRef`: anteprima opzionale;
- `provenance`: provider/origine/versione/digest quando applicabile.

Docente OS deve poter sapere cosa è stato accettato anche se Studio Atlas non fosse disponibile.

### A6 — Il database deve risolvere o verificare il contesto, non fidarsi del chiamante

Una RPC `SECURITY DEFINER` non dovrebbe ricevere un'intera catena di identificatori e considerarli coerenti solo perché il server applicativo li ha passati.

Principio target:

`minimal input identity → authoritative DB resolution → transactional validation → persistence`

Forma auspicabile, da validare in progettazione:

```text
accept_material_bundle(
  lesson_block_id,
  bundle,
  idempotency_key
)
```

Gli identificatori derivabili devono essere risolti dal database; quelli non derivabili devono essere verificati esplicitamente nella stessa transazione.

### A7 — La strategia di qualificazione deve seguire i confini

Ogni tranche futura deve avere un solo confine architetturale principale e quattro livelli di prova:

1. contratto/invarianti;
2. boundary dati e autorizzazione;
3. comportamento applicativo;
4. certificazione di sistema solo quando pertinente.

Browser/HVA non deve essere usato per scoprire errori di schema, provisioning o identity mismatch.

## 5. Architettura target MATERIAL-ORCH-01 — contenuto storico superseded

> **Nota:** la rappresentazione seguente è conservata esclusivamente per spiegare l'evoluzione dell'audit. Non è un'architettura implementabile né una fonte di autorità dopo il design v2.2.

```text
TRAMA GOVERNANCE
      │
      ▼
Governed Capability Authorization
      │
      ▼
DOCENTE OS — Material Task
      │
      ├── Riutilizza
      ├── Adatta
      └── Crea nuovo
               │
               ▼
        MaterialTaskRequest v1
               │
               ▼
        Provider Adapter
        (Studio Atlas solo se autorizzato)
               │
               ▼
      MaterialCandidateBundle v1
               │
               ▼
DOCENTE OS — review/accettazione docente
               │
               ▼
Authoritative Material Acceptance Boundary
               │
               ├── ArtifactReference / snapshot
               ├── provenance
               └── LessonMaterialBinding
```

Studio Atlas produce **candidati**. Docente OS resta autorità sull'accettazione, sulla lezione e sulla persistenza professionale.

## 6. Lifecycle pre-v2 — contenuto storico superseded

> **Nota:** questo lifecycle parallelo è superseded. Il design corrente riusa il lifecycle canonico di `LessonDesignExtension` e deriva `LessonPreparationManifest.materialSlots`.

```text
CANDIDATE
  ↓
REVIEWED
  ↓
ACCEPTED
  ↓
AVAILABLE_FOR_LESSON
```

L'uso effettivo è uno stato/evidenza successiva:

`USED_IN_TEACHING_SESSION`

Invariante storico ancora valido: **ACCEPTED non significa USED**.

## 7. Capability governance pre-v2 — contenuto storico superseded

> **Nota:** `DOS.STUDIO_ATLAS.MATERIAL_HANDOFF` non è un capability ID canonico. La direzione corrente usa il boundary OR-07 `SharedCapabilityRequest/Result`, provider-neutral e `PROPOSE_ONLY`; ogni futura estensione semantica cross-system richiede il normale processo di governed-memory TRAMA.

Capacità proposta storicamente:

`DOS.STUDIO_ATLAS.MATERIAL_HANDOFF`

Stati concettuali storici:

- `DISABLED`
- `QUALIFIED`
- `AUTHORIZED`

Effettiva attivazione runtime proposta storicamente:

```text
effectiveCapability = governanceAuthorized AND deploymentEnabled
```

Resta valido il principio che né manifest governato né configurazione di deploy, isolatamente, possono aprire il boundary.

## 8. Decomposizione pre-v2 — contenuto storico superseded

> **Nota:** l'ordine seguente è storico. L'ordine operativo corrente è quello pubblicato nel design v2.2 e nella descrizione aggiornata della PR #703.

### Tranche 0 — MATERIAL-ORCH-01 Design

Solo specifica, authority matrix, contratti, lifecycle, capability model e criteri di accettazione.

### Tranche 1 — CPRI-01

Solo Canonical Plan Runtime Identity. Nessun Atlas, nessun materiale.

### Tranche 2 — MATERIAL-CORE-01

Dominio provider-neutral e authoritative material acceptance core.

### Tranche 3 — MATERIAL-TASK-UX-01

UX “Prepara materiali” con `Riutilizza | Adatta | Crea nuovo`.

### Tranche 4 — ATLAS-MATERIAL-ADAPTER-01

Solo adapter `MaterialTaskRequest ↔ MaterialCandidateBundle`.

### Tranche 5 — DOS-A1 Material Handoff Authorization

Decisione di governance separata; solo dopo di essa l'adapter può diventare runtime-operativo.

## 9. Architecture Readiness Gate

Prima della review indipendente di ogni tranche, il gate deve intercettare almeno:

- runtime capability non autorizzata;
- provider specifico usato come identità canonica;
- `SECURITY DEFINER` con contesto fidato ma non verificato;
- contratto dominio diverso dal contratto SQL;
- test presente ma non incluso in CI;
- migration senza data-readiness preflight quando necessaria;
- `ACCEPTED` confuso con `USED`;
- dipendenza da UUID CAN-PLAN incorporati nel codice runtime.

## 10. Criterio di uscita storico MATERIAL-ORCH-01

> **Nota:** questo elenco è conservato come evidenza dell'audit originario. I criteri di uscita correnti sono definiti dai documenti normativi v2.2 richiamati all'inizio.

La fase, secondo l'audit originario, poteva dirsi conclusa solo quando:

- CPRI è separato e qualificato;
- il contratto materiali è provider-neutral;
- Docente OS conserva l'autorità sulla persistenza;
- nessuna scrittura implicita modifica UDA/Piano/Calendario;
- riuso precede generazione;
- Studio Atlas è sostituibile come adapter;
- esiste una `ArtifactReference` durevole;
- `ACCEPTED` è distinto da `USED`;
- il database risolve/verifica il contesto autorevole;
- il runtime cross-product è autorizzato dalla governance;
- exact-head certification è verde;
- una fresh independent review non produce finding rilevanti;
- Human Review si riferisce allo stesso exact head.

## 11. Prossimo passo storico — superseded

> **Nota:** i passi sotto descrivono la sequenza prevista al momento dell'audit e non autorizzano attività correnti. L'ordine corrente è quello del design v2.2 e della PR #703 aggiornata.

1. salvare questa baseline;
2. produrre la specifica MATERIAL-ORCH-01;
3. produrre un piano separato per CPRI-01 dalla baseline `develop`;
4. non modificare il runtime della #692;
5. eseguire CPRI-01 solo come tranche autonoma dopo la specifica di fase.
