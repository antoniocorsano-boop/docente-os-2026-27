# CPRI-01 — Canonical Plan Runtime Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** estrarre CPRI dalla PR #692 e introdurre una singola authority runtime provider-neutral per risolvere `CAN-PLAN-x` in `assetId/generationId` locali al workspace/anno, senza dipendenze Studio Atlas.

**Architecture:** `CAN-PLAN-x` resta identità logica portabile. I consumer runtime risolvono un binding governato `(workspace_id, academic_year_id, canonical_plan_code) → (asset_id, generation_id)`. Prima di creare/provisionare binding su un ambiente viene eseguito un preflight read-only; la migration non viene usata per scoprire ambiguità.

**Tech Stack:** Next.js/TypeScript, Supabase/PostgreSQL, SQL contract tests, Node test runner, GitHub Actions.

**Spec:** `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md`

## Global Constraints

- Baseline iniziale: `develop@7ac09a8795d93cc9a950083cda8b01d5d1407257`; rifissare l'exact baseline prima dell'esecuzione.
- PR #692 resta `QUALIFIED_REFERENCE / ARCHITECTURE_FREEZE / NOT_INTEGRATION_CANDIDATE`.
- Nessuna dipendenza Studio Atlas, MaterialBundle o runtime handoff in CPRI-01.
- `CAN-PLAN-x` è l'unica identità logica portabile.
- `asset_id` e `generation_id` sono materializzazioni workspace/year-local.
- Nessun UUID CAN-PLAN statico può restare authority runtime.
- `source_metadata.canonicalExecCode` è ammesso solo per preflight/provisioning transitorio, mai per read authority runtime.
- Nessun consumer può auto-bindare durante una normale lettura/scrittura didattica.
- Binding assente/invalido/context-mismatch/generation non `SUCCEEDED` => fail-closed.
- Una nuova generazione Knowledge non sposta implicitamente il binding.
- Record storici non vengono riscritti quando cambia il binding corrente.
- Nessuna riduzione di RLS, FK, trigger o isolamento workspace/anno.
- TDD RED → GREEN per ogni modifica comportamentale.
- Nessun merge automatico e nessuna promozione Beta prima di exact-head certification + independent review + Human Review applicabile.

## Review Focus

- **Dati legacy ambigui:** due asset nello stesso workspace/anno con lo stesso `canonicalExecCode` devono produrre `BLOCKED` nel preflight, non una scelta arbitraria. Test ownership: Task 1.
- **Cross-workspace/cross-year:** un asset o generation di un altro contesto non può essere bindato né risolto. Test ownership: Task 2.
- **Generation non pronta:** `PENDING/FAILED` non può essere bindata o restituita come runtime source. Test ownership: Task 2/3.
- **Consumer residuo:** nessun percorso in scope può continuare a leggere asset/generation UUID da `CANONICAL_PLAN_SOURCES`. Test ownership: Task 5.
- **Storia:** aggiornare il binding non deve riscrivere progress/session/provenance storici. Test ownership: Task 2/4.

---

### Task 1: Data-readiness preflight prima della migration

**Files:**
- Create: `product/scripts/experience/cpri-data-readiness-preflight.mjs`
- Create: `product/scripts/experience/cpri-data-readiness-preflight.test.mjs`
- Modify: `.github/workflows/product-ci.yml`
- Modify: `product/package.json`

**Interfaces:**
- Consumes: dati esistenti `knowledge_assets`, `knowledge_processing_generations`, workspace/academic year; transitional metadata `source_metadata.canonicalExecCode` solo in modalità read-only.
- Produces: comando che emette un risultato stabile `READY | BLOCKED` con conteggi/classificazioni `MISSING | AMBIGUOUS | GENERATION_MISSING | GENERATION_NOT_SUCCEEDED | CONTEXT_MISMATCH`.

- [ ] **Step 1: scrivere i test RED del classificatore**

Testare almeno:

```text
single valid candidate -> READY
2 candidates same context/code -> AMBIGUOUS/BLOCKED
candidate without current generation -> GENERATION_MISSING/BLOCKED when required
generation != SUCCEEDED -> GENERATION_NOT_SUCCEEDED/BLOCKED
asset/generation context mismatch -> CONTEXT_MISMATCH/BLOCKED
```

- [ ] **Step 2: eseguire il test e verificare RED**

Run: `cd product && node --test scripts/experience/cpri-data-readiness-preflight.test.mjs`

Expected: FAIL perché il classificatore/preflight non esiste.

- [ ] **Step 3: implementare il classificatore read-only**

Esporre una funzione pura testabile, ad esempio:

```ts
classifyCanonicalPlanCandidateSet(input): CpriReadinessResult
```

Il comando runtime può usare Supabase, ma nessun path del preflight deve scrivere dati.

- [ ] **Step 4: integrare il preflight nella CI come controllo non distruttivo**

Il test del classificatore è obbligatorio in Product CI. L'esecuzione contro un ambiente reale resta un gate di promotion, non deve richiedere secret aggiuntivi nei test locali.

- [ ] **Step 5: verificare GREEN**

Run: test focused + script lint/typecheck applicabile.

Expected: PASS.

- [ ] **Step 6: commit**

Commit suggerito: `test: add CPRI data readiness preflight`

---

### Task 2: Database authority per il binding CPRI

**Files:**
- Create: `product/supabase/migrations/0098_canonical_plan_runtime_identity.sql` **solo se 0098 è ancora libero sulla baseline rifissata; altrimenti usare il prossimo numero libero**
- Create: `product/supabase/tests/canonical_plan_runtime_identity_behavior.sql`
- Modify: `product/supabase/tests/runtime-release-contract.sql`
- Modify: `product/src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: risultato `READY` del preflight per la promotion dell'ambiente; schema Knowledge esistente.
- Produces: `canonical_plan_runtime_bindings` e writer governato service-role-only.

- [ ] **Step 1: scrivere RED SQL contract**

Dimostrare con test che oggi mancano:

```text
UNIQUE(workspace, academicYear, canonicalPlanCode)
workspace/year integrity
asset workspace/year integrity
generation -> asset/workspace integrity
generation status SUCCEEDED
identity immutability
member read / no authenticated write
service-role governed bind/upsert
```

- [ ] **Step 2: eseguire migration/test replay e verificare RED**

Run: usare il runner SQL canonico del repository che include `runtime-release-contract.sql`.

Expected: FAIL per tabella/funzioni mancanti.

- [ ] **Step 3: creare la tabella e le invarianti**

Schema minimo:

```text
canonical_plan_runtime_bindings(
  id,
  workspace_id,
  academic_year_id,
  canonical_plan_code,
  asset_id,
  generation_id,
  created_at,
  updated_at
)
```

- [ ] **Step 4: introdurre writer governato**

Funzione proposta:

```text
bind_canonical_plan_runtime_source(
  workspace_id,
  academic_year_id,
  canonical_plan_code,
  asset_id,
  generation_id
) -> binding_id
```

EXECUTE solo a `service_role`; nessun self-bind da consumer authenticated.

- [ ] **Step 5: non includere backfill discovery cieco nella migration**

La migration può creare struttura e primitive di provisioning; l'ambiente viene provisionato solo dopo preflight `READY` con input esplicito/governato. Se viene mantenuta una utility di backfill, deve richiedere dati già classificati e non scegliere autonomamente candidati ambigui.

- [ ] **Step 6: aggiornare types e runtime contract**

- [ ] **Step 7: verificare GREEN**

Run: migration replay + focused SQL behavior contract.

Expected: PASS.

- [ ] **Step 8: commit**

Commit suggerito: `feat: add governed canonical plan runtime bindings`

---

### Task 3: Repository resolver unico

**Files:**
- Create: `product/src/core/infrastructure/supabase/supabase-canonical-plan-source-repository.ts`
- Create: `product/src/core/infrastructure/supabase/canonical-plan-runtime-identity.test.ts`

**Interfaces:**
- Consumes:

```ts
type CanonicalPlanSourceLookup = {
  workspaceId: string
  academicYearId: string
  code: string
}
```

- Produces:

```ts
type CanonicalPlanRuntimeSource = {
  code: string
  assetId: string
  generationId: string
}

class SupabaseCanonicalPlanSourceRepository {
  resolve(input: CanonicalPlanSourceLookup): Promise<CanonicalPlanRuntimeSource | null>
}
```

- [ ] **Step 1: scrivere RED repository tests**

Testare: valid binding, missing binding, invalid asset context, invalid generation context, non-`SUCCEEDED`, code trimming/canonicalization.

- [ ] **Step 2: eseguire RED**

Run: focused Node/TS test command secondo il runner corrente.

Expected: FAIL perché il repository non esiste su `develop`.

- [ ] **Step 3: implementare resolver DB-binding-only**

Il resolver legge `canonical_plan_runtime_bindings` e verifica che asset/generation siano ancora coerenti. Nessun metadata scan e nessun fallback statico.

- [ ] **Step 4: verificare GREEN**

- [ ] **Step 5: commit**

Commit suggerito: `feat: resolve canonical plans from governed runtime binding`

---

### Task 4: Separare identità logica da UUID nel modello Piano annuale

**Files:**
- Modify: `product/src/app/piano-annuale/model.ts`
- Modify: `product/src/app/piano-annuale/model.test.ts`
- Modify: `product/src/core/application/human-task-content-pipeline.ts`
- Modify: `product/src/core/application/human-task-plan-guided-uda-projection-recipe.ts`
- Modify: relativi test della projection recipe/pipeline.

**Interfaces:**
- Consumes: logical `CAN-PLAN-x`; runtime identity viene fornita separatamente quando necessaria.
- Produces: mapping grade → logical canonical plan code senza `assetId/generationId` statici.

- [ ] **Step 1: scrivere RED che vieta UUID statici nel logical model**

Asserire che il modello canonico espone codice/struttura ma non runtime UUID authority.

- [ ] **Step 2: eseguire RED**

Expected: FAIL sulla baseline perché `CANONICAL_PLAN_SOURCES` contiene UUID reali incorporati.

- [ ] **Step 3: introdurre mapping logical-only**

Nome preferito, da mantenere coerente nei consumer:

```ts
CANONICAL_PLAN_CODES: Record<GradeKey, 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'>
```

Se il modello deve conservare metadati strutturali, nessun campo deve essere interpretato come runtime UUID authority.

- [ ] **Step 4: aggiornare pipeline/recipe**

`generationId` della recipe, quando richiesto, viene trattato come evidenza locale e confrontato con identity risolta del medesimo workspace/anno, non con un UUID globale compilato.

- [ ] **Step 5: verificare GREEN**

- [ ] **Step 6: commit**

Commit suggerito: `refactor: separate CAN-PLAN logical and runtime identity`

---

### Task 5: Migrare tutti i runtime consumers in scope

**Files:**
- Modify: `product/src/app/piano-annuale/actions.ts`
- Modify: `product/src/app/piano-annuale/AnnualPlanClient.tsx`
- Modify: `product/src/app/feedback/actions.ts`
- Modify: `product/src/app/classi/[sectionId]/lezioni/actions.ts`
- Modify: `product/src/app/classi/class-workspace-model.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: relativi test/fixture.
- Explicitly exclude: `product/src/app/progetta/atlas/**` e qualunque file provider-specifico della #692.

**Interfaces:**
- Consumes: `SupabaseCanonicalPlanSourceRepository.resolve(...)` oppure `CanonicalPlanRuntimeSource` già risolto dal route/server boundary.
- Produces: nessun runtime consumer in scope legge UUID da un logical model statico.

- [ ] **Step 1: creare un inventory regression test/search guard**

Il guard deve fallire se, nei percorsi in scope, ricompare l'uso di static `assetId/generationId` associati a `CAN-PLAN-x`.

- [ ] **Step 2: verificare RED sulla baseline**

Expected: FAIL con i consumer legacy individuati.

- [ ] **Step 3: migrare prima i server/action boundary**

Risoluzione una volta per workspace/anno/code; passare l'identità risolta ai helper/presentation layer quando pratico.

- [ ] **Step 4: migrare helper/client state**

Cache/progress keys e filtering non devono dipendere da UUID compilati.

- [ ] **Step 5: aggiornare fixture con UUID sintetici locali**

Nessun test deve dipendere dagli UUID canonici reali storici.

- [ ] **Step 6: verificare focused suites**

- [ ] **Step 7: commit**

Commit suggerito: `refactor: migrate CAN-PLAN runtime consumers to CPRI`

---

### Task 6: Documentazione, runtime preflight e full qualification

**Files:**
- Modify: `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`
- Modify: `docs/architecture/CANONICAL_PLAN_RUNTIME_IDENTITY.md` solo per eventuali delta emersi dall'implementazione, senza allargare il contratto.
- Create or reuse: `product/scripts/experience/cpri-runtime-preflight.mjs`
- Add tests for the runtime preflight.

**Interfaces:**
- Consumes: schema CPRI installato e binding provisionati.
- Produces: `READY | BLOCKED` prima di qualsiasi HVA dipendente da CPRI.

- [ ] **Step 1: scrivere RED runtime-preflight tests**

Verificare almeno:

```text
schema missing -> BLOCKED
binding missing -> BLOCKED
asset/year mismatch -> BLOCKED
generation non-SUCCEEDED -> BLOCKED
valid binding -> READY
static UUID consumer detected -> BLOCKED
```

- [ ] **Step 2: implementare runtime preflight**

Il preflight non scrive dati.

- [ ] **Step 3: aggiornare la documentazione canonica**

`TIMETABLE_CANONICAL_SPEC.md` deve parlare di logical CAN-PLAN + governed runtime binding, non di UUID “già presenti nel runtime”.

- [ ] **Step 4: eseguire full local/repository qualification**

Run: focused tests, full Product CI suite, typecheck, lint, production build, SQL migration replay/runtime-release contract.

Expected: tutti PASS sullo stesso exact head.

- [ ] **Step 5: Architecture Readiness Gate**

Confermare:

```text
provider-specific coupling = 0
unauthorized cross-product runtime = 0
static CAN-PLAN runtime UUID authority = 0
metadata scan runtime authority = 0
CPRI SQL/domain mismatch = 0
preflight missing from CI/promotion path = 0
```

- [ ] **Step 6: independent review**

Fresh review sull'exact head della tranche; nessun PASS ereditato dalla #692.

- [ ] **Step 7: Human Review applicabile**

Se la tranche non modifica resa/UX, classificare correttamente l'impatto; se il processo richiede Human Review finale, riferirla allo stesso exact head.

- [ ] **Step 8: commit di closeout documentale solo se necessario**

Non modificare codice dopo la review finale senza ricertificare.

## Completion Contract

CPRI-01 è completo solo quando:

1. preflight dati reali è `READY` prima della promotion;
2. binding governato è la sola authority runtime CAN-PLAN;
3. resolver unico è attivo;
4. tutti i consumer in scope sono migrati;
5. nessun file Atlas/provider-specifico è necessario a CPRI;
6. nessun UUID CAN-PLAN statico resta runtime authority;
7. migration replay e Product CI sono verdi sull'exact head;
8. fresh independent review è pulita;
9. Human Review applicabile è sullo stesso exact head;
10. solo dopo questi gate la tranche può essere proposta per integrazione autonoma.
