# DOS-CRM Audit — Oggi / Today + Next

Data: **2026-09-30**  
Capability ID: `DOS-TODAY-NEXT`  
Baseline auditata: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Esito: **CRL 4 — INTEGRATED / CURRENT**

## 1. Perimetro

La capability comprende:
- Home giornaliera / Daily Cockpit;
- Teacher Moment;
- focus Adesso/Prossimo;
- timeline di giornata;
- priorità fra lezione corrente, prossima, da registrare e Planner;
- integrazione Orario + Calendario via Temporal Projection;
- TeachingSession/closure state;
- preparazione del prossimo momento;
- accessi contestuali a classe, lezione e materiali.

## 2. Evidence verificata

- `docs/product/HOME_DAILY_COCKPIT_CANONICAL_SPEC.md`, CANONICAL e aggiornato con pilot evidence 2026-09-24;
- `docs/product/TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`;
- `product/src/app/page.tsx`, con composizione runtime reale di Orario, Calendario, Planner, Piano annuale, TeachingSession e risorse;
- `product/src/core/presentation/home-daily-context.ts` + test;
- `teacher-moment.ts` + test;
- `today-copilot-context.ts` + test;
- PR #390 — V1-A Teacher Moment + Today/Next, merged;
- PR #490 — uso dell'Orario in vigore quando il Calendario non classifica il giorno, merged;
- PR #481 — preparazione pacchetti lezioni di domani, merged;
- PR #568 — consolidamento navigazione/pilot evidence, merged.

## 3. Valutazione per asse

| Asse | Livello | Evidenza / limite |
| --- | ---: | --- |
| **F** | **5** | il resolver runtime compone le fonti reali e produce una Next Best Action utilizzabile |
| **UX** | **4** | specifica teacher-first/mobile-first forte e pilot evidence incorporata; resta però storica evidence FRICTION/REWORK_REQUIRED e manca una nuova HUMAN_USE conclusiva dell'intero cockpit corrente |
| **D** | **5** | nessuna nuova fonte di verità; composizione read-only di fonti canoniche, TeachingSession e Temporal Projection |
| **S** | **5** | nessuna write implicita; privacy Tier-1, fail-closed su ambiguità, separazione authority preservata |
| **I** | **5** | integra Orario, Calendario, Planner, Piano, TeachingSession, Lesson Preparation e risorse senza duplicare domini |
| **Q** | **4** | test dedicati e PR qualificate esistono, ma manca un roll-up corrente unico di tutti gli scenari HDC su exact SHA |
| **O** | **4** | Home è runtime reale; manca receipt operativa recente che dimostri stabilità dell'intero ciclo prima/durante/tra/dopo le lezioni su mobile/PWA |
| **K** | **5** | canonical spec dettagliata, ipotesi UX esplicite, acceptance e regole di evoluzione consolidate |

## 4. CRL complessivo

**CRL 4 — INTEGRATED**

Gli assi UX, Q e O limitano il livello. Il cockpit non viene promosso a CRL 5 finché la revisione successiva ai finding HUMAN_USE non è dimostrata con una prova end-to-end coerente sulla baseline corrente.

## 5. Gap verso CRL 5

1. HUMAN_USE conclusiva sulla Home corrente in più momenti professionali.
2. Browser/interaction qualification unificata per gli scenari prima/durante/tra/dopo e giorno senza lezioni.
3. Receipt mobile/PWA che dimostri assenza di overflow, CTA primaria leggibile e recovery/fallback coerenti.

## 6. Criterio di promozione

Per CRL 5:
- eseguire `DOS-TODAY-NEXT-QUALIFICATION` su exact SHA;
- verificare almeno gli acceptance scenario della canonical spec;
- chiudere o riclassificare i finding HUMAN_USE storici;
- Browser Certification mobile/desktop;
- nessun HIGH/CRITICAL aperto nel perimetro.

Per CRL 6:
- uso quotidiano ripetuto con evidence longitudinali di riduzione della ricostruzione manuale del contesto e recovery stabile.

## 7. Decisione

`DOS-TODAY-NEXT` passa da `NEEDS_REAUDIT / STALE` a:

`CRL 4 / INTEGRATED / CURRENT`.
