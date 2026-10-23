# HVA Fixture Hardening — Implementation Plan

**Goal:** rendere la qualificazione HVA deterministica e non dipendente dall’ordine dei test o da stato accidentale del tenant, senza modificare comportamento prodotto, timetable ACTIVE o dati studenti.

**Architecture:** la baseline `Oggi` diventa una fixture tecnica stabile e read-only durante la suite; ogni test che scrive possiede dati distinti e li ripristina/elimina senza toccare la baseline di altri journey. Il clock HVA resta allineato server/browser finché il journey temporale usa un server condiviso. TRAMA-PW classifica `product/e2e/**` come infrastruttura di test, non come write surface utente.

**Tech stack:** Next.js 16, Playwright, Node 22 `node:test`, Supabase AAL2/RLS, GitHub Actions.

## Task 1 — TRAMA-PW riconosce E2E come test infrastructure

**Files:**
- Modify: `tools/trama-perceptible-write/lib.test.mjs`
- Modify: `tools/trama-perceptible-write/lib.mjs`

1. Aggiungere un test RED: una `.update()` in `product/e2e/experience/global-setup.mjs` non è una mutation candidate; la stessa scrittura in codice prodotto resta mutation candidate.
2. Eseguire `node --test tools/trama-perceptible-write/lib.test.mjs` e verificare RED.
3. Estendere soltanto la regola di esclusione dei path di test a `e2e`.
4. Rieseguire i self-test TRAMA-PW e verificare GREEN.

## Task 2 — Oggi usa una baseline HVA stabile e preflight read-only

**Files:**
- Create: `product/e2e/support/hva-today-fixture.mjs`
- Create: `product/e2e/support/hva-today-fixture.test.mjs`
- Modify: `product/e2e/experience/global-setup.mjs`
- Modify: `product/package.json`

1. Scrivere test RED per il validator puro: disciplina `Tecnologia` attiva, assignment `CONFIRMED`, slot ACTIVE lunedì 08:00–09:00; rifiutare assignment PROVISIONAL, disciplina inattiva e riuso del marker Libri.
2. Implementare validator e preflight AAL2 read-only.
3. Rimuovere da `global-setup` rinomina/attivazione disciplina, update assignment e teardown Today.
4. Collegare il test helper a `npm test`.
5. Verificare che il preflight fallisca in modo diagnostico sul drift anziché alterare il tenant.

## Task 3 — Libri possiede la propria fixture

**Files:**
- Modify: `product/e2e/experience/textbooks.spec.mjs`

1. Rendere la selezione della cattedra specifica per **marker + disciplina `Tecnologia HVA Libri`**, non per marker soltanto.
2. Verificare che la fixture dedicata possa essere creata/confermata e poi riportata a PROVISIONAL/inattiva senza toccare la cattedra Oggi.

## Task 4 — Journey registrati creano realmente i propri dati

**Files:**
- Create/modify support fixture under `product/e2e/support/`
- Modify: `product/e2e/experience/task-centric-register-continue.spec.mjs`
- Modify: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`

1. Riutilizzare il percorso di registrazione/governed persistence già esistente, non inventare record fuori contratto.
2. Creare una TeachingSession occurrence-bound B01 run-scoped per il test e restituire `sectionId`, `localDate`, `occurrenceLogicalId`.
3. Eliminare/ripristinare esclusivamente i record creati dalla fixture.
4. Eliminare la dipendenza da TeachingSession preesistenti nella 2C.

## Task 5 — Ripristino una tantum della baseline tecnica HVA

**Data scope:** solo workspace/account tecnico HVA; nessun dato studenti.

1. Sul solo assignment usato dallo slot ACTIVE canonico, portare `status` a `CONFIRMED` e sostituire il vecchio marker Libri con `HVA · Oggi · Cattedra canonica`.
2. Lasciare `Tecnologia` attiva e non modificare lo slot ACTIVE.
3. Lasciare `Tecnologia HVA Libri` separata e inattiva fuori dal relativo test.
4. Verificare la baseline con query read-only.

## Task 6 — Qualificazione exact-head e controllo drift

1. Product CI e self-test TRAMA-PW sullo stesso SHA.
2. HVA completa: `Oggi → lezione immediata` PASS mobile+desktop; legacy Registra/Conduci PASS; nessun hydration/console error.
3. Postflight DB: baseline Oggi invariata, fixture Libri separata, nessuna TeachingSession run-scoped residua.
4. Verificare gli altri gate critici sullo stesso SHA.
5. Fermarsi prima di merge, Beta promotion o deploy.