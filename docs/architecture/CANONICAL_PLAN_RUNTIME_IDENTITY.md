# Canonical Plan Runtime Identity — CPRI-01

## Stato

Contratto architetturale per separare l'identità logica portabile dei piani canonici dalla loro materializzazione runtime in Docente OS.

Baseline di diagnosi: PR #692 `feat/uda-atlas-material-binding` @ `4a468f0d475eaccca1018bc6b89dbfaec858f3a9`.

Questo documento non autorizza ancora modifiche runtime né HVA. La sua approvazione chiude STEP A e abilita soltanto la successiva implementazione TDD dello STEP B.

## Problema

`CAN-PLAN-1`, `CAN-PLAN-2` e `CAN-PLAN-3` sono identità logiche del canone annuale. Nel modello corrente `CANONICAL_PLAN_SOURCES` associa però a ciascun codice un `assetId` e un `generationId` incorporati nel codice applicativo.

Questi UUID appartengono a specifiche righe `knowledge_assets` / `knowledge_processing_generations` e quindi a uno specifico workspace. Non sono identità universali del CAN-PLAN.

I trigger e i vincoli database che impediscono riferimenti cross-workspace sono corretti e devono restare fail-closed. Il difetto è nel modello di identità applicativo, non nelle protezioni DB.

La PR #692 ha già introdotto un resolver transitorio che, dato `workspace + academicYear + CAN-PLAN-x`, cerca un asset locale tramite `source_metadata.canonicalExecCode`. Questa direzione dimostra che la risoluzione deve essere workspace-local, ma il metadata JSON non costituisce una authority definitiva: non ha unicità DB, può essere assente e oggi il runtime HVA non contiene record materializzati con quel contratto.

## Authority e identità

### Identità logica canonica

L'identità portabile è esclusivamente:

```text
CAN-PLAN-1
CAN-PLAN-2
CAN-PLAN-3
```

Il codice CAN-PLAN identifica il piano canonico indipendentemente dal workspace in cui viene materializzato.

### Identità di materializzazione runtime

`asset_id` e `generation_id` identificano righe locali del database Knowledge.

Sono validi solo nel contesto:

```text
workspace_id
academic_year_id
canonical_plan_code
```

Non devono essere:

- incorporati come authority nel codice;
- copiati da un workspace a un altro;
- usati come identificatori canonici portabili;
- utilizzati come fallback quando il binding locale manca.

### Significato di generation_id

`generation_id` è sempre una identità locale della materializzazione Knowledge.

Quando compare in una recipe, in una provenance o in una registrazione di esecuzione, rappresenta la specifica generazione locale usata nel workspace/anno in quel momento. Non rappresenta una revisione canonica portabile di `CAN-PLAN-x`.

Conseguenza: `PLAN_GUIDED_UDA` può verificare un `generationId` soltanto rispetto al binding runtime dello stesso workspace/anno. Non può confrontarlo con un UUID globale incorporato nel modello.

## Binding governato

La forma minima dell'authority runtime è:

```text
canonical_plan_runtime_bindings

workspace_id
academic_year_id
canonical_plan_code
asset_id
generation_id
created_at
updated_at
```

Vincolo di identità:

```text
UNIQUE (workspace_id, academic_year_id, canonical_plan_code)
```

Il binding non contiene il contenuto del Piano annuale e non diventa autorità curricolare. L'autorità resta `CAN-PLAN-x`; il binding dichiara quale materializzazione Knowledge valida appartiene a quel workspace e anno scolastico.

## Invarianti database obbligatorie

Una riga di binding è valida solo se tutte le condizioni seguenti sono vere:

1. `workspace_id` esiste ed è il workspace proprietario della materializzazione.
2. `academic_year_id` appartiene allo stesso workspace.
3. `canonical_plan_code` è un codice CAN-PLAN supportato dal contratto corrente.
4. `asset_id` appartiene allo stesso `workspace_id` e `academic_year_id`.
5. `generation_id` appartiene ad `asset_id`.
6. la generazione appartiene allo stesso workspace.
7. la generazione è `SUCCEEDED`.
8. non può esistere un secondo binding attivo per la stessa tripla `workspace + academicYear + canonicalPlanCode`.

Queste invarianti devono essere protette dal database, non soltanto dal codice applicativo.

## Writer boundary / provisioning

I consumer applicativi non possono creare o correggere autonomamente il binding durante una lettura o una scrittura didattica.

Sono vietati:

- auto-binding tramite scansione di `source_metadata`;
- scelta del “primo asset compatibile”;
- fallback agli UUID storici;
- creazione di fixture HVA speciali;
- copia di binding tra workspace.

Il binding viene creato o aggiornato soltanto da un percorso di provisioning/ingestion governato, dopo che la sorgente canonica è stata materializzata e la generazione ha stato `SUCCEEDED`.

Un aggiornamento del binding deve essere esplicito. La comparsa di una nuova generazione Knowledge non sposta automaticamente il binding.

## Read contract

Tutti i consumer runtime usano un solo resolver concettuale:

```text
resolveCanonicalPlanRuntimeSource({
  workspaceId,
  academicYearId,
  canonicalPlanCode
})
```

Esito valido:

```text
{
  code: CAN-PLAN-x,
  assetId: <workspace-local UUID>,
  generationId: <workspace-local UUID>
}
```

Esiti non validi:

- binding assente;
- binding duplicato/ambiguo;
- asset cross-workspace o cross-year;
- generation cross-asset/cross-workspace;
- generation non `SUCCEEDED`;
- asset/generation eliminati o non più referenziabili.

Qualunque esito non valido produce fail-closed. Nessun consumer può sostituire il risultato con UUID incorporati o metadata JSON.

## Semantica storica

Il binding indica la materializzazione runtime corrente del CAN-PLAN per un workspace/anno.

Le registrazioni storiche (`annual_plan_block_progress`, teaching sessions, allocations, lesson design/provenance) mantengono gli UUID con cui furono effettivamente create.

Quando il binding viene aggiornato a una nuova generazione:

- i record storici non vengono riscritti;
- il nuovo lavoro usa il nuovo binding;
- la lettura di record storici continua a riferirsi alla generazione registrata in origine;
- eventuali riconciliazioni devono essere esplicite e non implicite.

## Relazione con source_metadata.canonicalExecCode

`source_metadata.canonicalExecCode` può restare temporaneamente utile per discovery, migrazione o provisioning.

Non è una authority perché:

- è un campo JSON;
- il runtime corrente può non contenerlo;
- non garantisce unicità per workspace/anno;
- la concorrenza di ingestion può produrre candidati multipli;
- diversi consumer legacy non lo usano;
- trasformarlo implicitamente in authority sposterebbe il debito invece di eliminarlo.

Dopo STEP B i consumer runtime non devono dipendere da questo metadata per risolvere CAN-PLAN.

## Consumer inventory

Inventario verificato sulla baseline e sui file toccati dalla PR #692.

| Consumer | Uso attuale | Classe | Contratto futuro |
|---|---|---|---|
| `product/src/app/piano-annuale/model.ts` | `CAN-PLAN-x` + asset/generation UUID hard-coded | authority legacy | deve conservare solo identità logica/struttura del piano; nessuna authority runtime UUID |
| `product/src/app/piano-annuale/actions.ts` | salva/resetta progress con asset/generation hard-coded | runtime-materialization | risolvere binding workspace/anno prima di save/reset |
| `product/src/app/piano-annuale/AnnualPlanClient.tsx` | usa generation statica in chiavi cache/progress e provenance UI | client/runtime coupling | ricevere identità/stato risolto dal server; nessuna dipendenza da UUID compilati nel client |
| `product/src/app/feedback/actions.ts` | filtra progress con generation hard-coded | runtime-materialization | usare la materializzazione risolta per lo stesso workspace/anno |
| `product/src/app/classi/[sectionId]/lezioni/actions.ts` | generation/asset hard-coded per duplicate guard, provenance, allocations | runtime-materialization critica | resolver unico prima di registrazione; allocation e provenance usano la materializzazione locale |
| `product/src/app/classi/class-workspace-model.ts` | filtra progress per generation hard-coded | presentation helper con coupling runtime | ricevere generation/identity risolta come input; il helper non apre una lookup autonoma |
| `product/src/app/classi/[sectionId]/page.tsx` | generation hard-coded per allocation totals e progress registrato | runtime-materialization | risolvere una volta lato route e passare l'identità ai helper |
| `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx` | usa il nuovo resolver metadata-based per design/progress | transitional | mantenere forma workspace-local ma sostituire backend con binding governato |
| `product/src/app/progetta/atlas/ritorno/actions.ts` | usa il nuovo resolver metadata-based prima della RPC atomica | transitional | mantenere flusso e atomicità; sostituire backend con binding governato |
| `product/src/core/application/human-task-content-pipeline.ts` | usa `CANONICAL_PLAN_SOURCES[grade].code` come `planSourceCode` | logical-only | dipendere da una mappa di codici/logical identity, non da una struttura che contiene UUID |
| `product/src/core/application/human-task-plan-guided-uda-projection-recipe.ts` | confronta `code + generationId` con il modello hard-coded | runtime-materialization / semantic seam | code = identità logica; generationId = evidenza locale da verificare contro il binding attivo dello stesso workspace/anno |
| `product/src/core/infrastructure/supabase/supabase-canonical-plan-source-repository.ts` | scansione `source_metadata.canonicalExecCode`, `.limit(2)` | transitional resolver | leggere `canonical_plan_runtime_bindings`; nessun metadata scan come authority |
| `product/src/app/classi/class-workspace-model.test.ts` | fixture con UUID canonici reali | test/fixture debt | UUID sintetici locali espliciti; nessuna dipendenza dai valori reali incorporati |
| `product/src/app/piano-annuale/model.test.ts` | verifica UI/provenance che espone `source.generationId` | test/contract debt | verificare provenance/materializzazione runtime senza assumere generation globale |
| `docs/architecture/TIMETABLE_CANONICAL_SPEC.md` | parla di `CANONICAL_PLAN_SOURCES` “già presenti nel runtime” | documentation debt | chiarire CAN-PLAN logical identity + governed runtime binding |

### Consumer non da migrare automaticamente

Le normali provenance di sorgenti UDA/PACK che contengono `assetId`/`generationId` non sono, per questo solo motivo, parte di CPRI-01. Gli UUID delle sorgenti Knowledge sono legittimi quando descrivono la materializzazione realmente consumata. La migrazione riguarda l'uso degli UUID CAN-PLAN come authority universale.

## Stato delle superfici Atlas nella PR #692

La correzione già presente in PR mantiene correttamente:

- scelta esplicita della lezione;
- contesto workspace/anno;
- costruzione di `lessonContext` con UUID risolti a runtime;
- singola operazione atomica `acceptAtlasMaterialBundle` / RPC;
- assenza di mutazioni implicite a UDA, Piano annuale e Calendario.

La modifica necessaria in STEP B è sostituire la fonte dell'identità runtime, non cambiare questi confini funzionali.

## Failure contract

Messaggi utente possono restare descrittivi, ma il comportamento interno deve distinguere almeno:

- `CANONICAL_PLAN_BINDING_MISSING`
- `CANONICAL_PLAN_BINDING_INVALID`
- `CANONICAL_PLAN_BINDING_AMBIGUOUS` (solo durante transizione/migrazione; la tabella finale lo impedisce per vincolo unico)
- `CANONICAL_PLAN_GENERATION_NOT_READY`
- `CANONICAL_PLAN_CONTEXT_MISMATCH`

Tutti sono blocking per le scritture che richiedono un CAN-PLAN materializzato.

## Preflight obbligatorio prima di HVA

HVA può partire soltanto quando un controllo unico dimostra:

1. exact head candidato congelato;
2. test/typecheck/lint/build verdi;
3. schema runtime richiesto installato;
4. RPC `accept_atlas_material_bundle(...)` presente;
5. workspace e academic year attivi risolti;
6. sezione target appartenente allo stesso contesto;
7. un solo binding per il CAN-PLAN richiesto;
8. asset del binding coerente con workspace/anno;
9. generation coerente con asset/workspace e `SUCCEEDED`;
10. lesson projection/design context coerente con la stessa materializzazione;
11. assenza di dipendenze runtime residue dagli UUID CAN-PLAN hard-coded.

Un solo controllo fallito produce `BLOCKED`. Browser Certification/HVA non deve essere usato per scoprire schema, provisioning o identity mismatch.

## Non-obiettivi

CPRI-01 non:

- modifica il contenuto dei CAN-PLAN;
- crea nuove UDA;
- cambia la sequenza dei 33 blocchi / 66 ore;
- modifica l'autorità curricolare;
- cambia il modello Atlas MaterialBundle;
- modifica HR-02 atomicità;
- sostituisce le protezioni multi-workspace esistenti;
- promuove la PR #692 o esegue merge.

## Criteri di accettazione STEP A

STEP A è accettato quando:

- questo contratto è presente nella branch della PR #692;
- l'inventario consumer è esplicito;
- `CAN-PLAN-x` è definito come unica identità logica portabile;
- `asset_id`/`generation_id` sono definiti come materializzazione locale;
- `source_metadata.canonicalExecCode` è dichiarato non-authoritative;
- binding, invarianti, writer boundary, storia e failure contract sono definiti;
- HVA è esplicitamente bloccato fino al preflight dello STEP C.
