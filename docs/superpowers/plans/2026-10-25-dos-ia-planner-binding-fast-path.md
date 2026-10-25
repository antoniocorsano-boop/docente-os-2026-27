# DOS-IA Planner Binding Fast Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ridurre il costo server di `/planner` sostituendo il bundle completo di preparazione con un resolver governato minimale `lessonLogicalId -> blockId`.

**Architecture:** Il nuovo loader legge una sola volta Piano annuale, cattedre e discipline, risolve le sorgenti canoniche per i soli gradi necessari e restituisce solo `TodayIALessonBundle`. `buildTodayIAProjection` resta invariato e conserva i fallback `CLASS/ORARIO` quando il binding non è qualificabile.

**Tech Stack:** Next.js 16, TypeScript, Supabase repositories, Node test runner, Playwright/P6.

**Spec:** `docs/superpowers/specs/2026-10-25-dos-ia-planner-binding-fast-path-design.md`

## Global Constraints

- Non aumentare `P6_ROUTE_BUDGET_MS=2500` o `P6_P95_BUDGET_MS=1800`.
- Nessuna nuova persistenza, mutation, schema change o tenant/fixture mutation.
- Fail closed se sezione/cattedra/disciplina/source/next block non sono qualificabili.
- Non cambiare il contratto `TodayIALessonBundle` o `buildTodayIAProjection`.
- Il loader completo di preparazione resta disponibile per Copilota/Lezione/Materiali.

## Review Focus

- Lezione senza sectionId: nessun binding, fallback invariato.
- Cattedra non confermata: nessun binding.
- Disciplina inattiva/non supportata: nessun binding.
- Più lezioni dello stesso grado: source canonicale risolta una sola volta.
- Nessun next block: nessun binding, senza eccezioni o route inventate.

---

### Task 1: Pin del fast path

**Files:**
- Modify: `product/src/app/api/assistant/today-context-loader-contract.test.ts`

**Interfaces:**
- Consumes: sorgente `product/src/app/planner/page.tsx`.
- Produces: contratto che vieta a `/planner` `loadLessonPreparationBundlesForLessons` e richiede il nuovo loader minimale.

- [ ] **Step 1:** aggiungere un test sorgente che richieda import/chiamata `loadTodayLessonBindings` e `assert.doesNotMatch` sul loader completo.
- [ ] **Step 2:** eseguire il test e verificare RED causale perché il nuovo loader non esiste/non è usato.
- [ ] **Step 3:** commit test-only RED.

### Task 2: Resolver governato minimale

**Files:**
- Create: `product/src/app/api/assistant/today-lesson-binding-loader.ts`
- Create: `product/src/app/api/assistant/today-lesson-binding-loader-contract.test.ts`
- Modify: `product/src/app/planner/page.tsx`

**Interfaces:**
- Produces: `loadTodayLessonBindings(input: { workspaceId: string; academicYearId: string; lessons: HomeDailyLesson[] }): Promise<TodayIALessonBundle[]>`.
- Consumes: `SupabaseAnnualPlanExecutionRepository`, `SupabaseTeachingAssignmentReader`, `SupabaseTeacherSettingsRepository`, `SupabaseCanonicalPlanSourceRepository`, `buildClassWorkspaceLearningFocus`.

- [ ] **Step 1:** aggiungere test per prerequisiti fail-closed, assenza dipendenze pesanti e deduplicazione sorgente per grado.
- [ ] **Step 2:** verificare RED.
- [ ] **Step 3:** implementare il loader minimo e sostituire il loader completo in `/planner`.
- [ ] **Step 4:** eseguire i test mirati e poi la suite prodotto; verificare GREEN.
- [ ] **Step 5:** commit GREEN.

### Task 3: Performance qualification

**Files:** nessuna modifica prevista salvo finding causali.

- [ ] **Step 1:** aprire PR stacked verso `feat/dos-ia-product-reset`.
- [ ] **Step 2:** verificare Product CI/lint/policy sul nuovo exact SHA.
- [ ] **Step 3:** eseguire P6/CV2 con budget invariati.
- [ ] **Step 4:** se P6 è GREEN, verificare HVA/WCAG/X3/X4; se RED, diagnosticare prima di qualsiasi ulteriore patch.
