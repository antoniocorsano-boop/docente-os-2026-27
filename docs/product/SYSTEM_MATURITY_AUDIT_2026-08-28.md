# DOCENTE OS — System Maturity Audit

Data: 2026-08-28  
Baseline auditata: `develop` @ `1462e02be5cc4c9d211a57db8178bb60b7bf0d22`

## Classificazione

Maturità corrente: **M4 — CONTROLLED PRODUCTION PILOT**.

DOCENTE OS non è più una Beta puramente tecnica: dispone di Production separata, promozione a SHA immutabile, recovery rehearsal, security/RLS, ricevute di ammissione dati reali e capability core già BETA-PROVEN. Resta deliberatamente limitato a `SINGLE_OWNER_PILOT` e a `TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

## Scala

- M0 — concept/research
- M1 — working prototype
- M2 — engineered alpha
- M3 — controlled beta
- M4 — controlled production pilot
- M5 — generally distributable mature product

## Scorecard

| Dimensione | Score / 5 | Evidenza sintetica |
|---|---:|---|
| Architettura | 4.5 | ADR, confini verticali, canonical documentation hierarchy |
| Persistenza e integrità | 4.6 | Supabase/Postgres/Storage/RLS, append-only receipts, idempotenza |
| Security | 4.5 | operational security gates, fail-closed boundaries, no anonymous privileged writes |
| Recovery/continuity | 4.6 | DB restore, Auth recovery, off-site recovery, retention lock |
| CI / release governance | 4.6 | immutable SHA promotion, Product CI e gate permanenti |
| Human authority | 4.5 | preview → explicit confirmation → consequential write |
| Human interaction | 4.1 | HVA + HIM foundation + Human Task modeling |
| Privacy | 3.8 | Tier 1 admitted; Tier 2 intentionally NOT_ADMITTED |
| Multi-user readiness | 2.3 | signup e onboarding multi-tenant OFF |
| Interoperabilità Arena | 3.5 | handoff/revalidation/feedback contracts mature; runtime transport absent |

## Capability maturate dopo lo status del 26 agosto

Lo stato canonico precedente non includeva ancora completamente le tranche seguenti, ora presenti in `develop`:

- Human Interaction Model v1 installabile e gate dedicato;
- interoperabilità Arena v2 con provisional/approved applicability e coverage gate;
- persistenza append-only della baseline curricolare e revalidation su curriculum APPROVED;
- textbook domain T1/T2 con discovery MIM e conferma docente;
- LessonDesignExtension nel vero Lesson Workspace;
- primo design tool locale deterministico con `PROPOSED → ACCEPTED` esplicito;
- feedback curricolare inverso Docente OS → Arena con privacy `PROFESSIONAL_NON_PERSONAL` e conferma docente.

## Finding A — Canonical status drift

Severità: **SIGNIFICANT / NON-RUNTIME-BLOCKING**.

`PROJECT_STATUS_CURRENT.md` è datato 2026-08-26 e non riflette tutte le macro-capability sopra elencate. Poiché il repository lo definisce fonte sintetica autorevole, deve essere riallineato prima di ulteriori decisioni di maturità.

## Finding B — E2E environment coupling

Sul commit auditato alcuni gate post-merge risultano rossi (`ops-security/supabase`, P6, K1, X4). Il log del gate sicurezza mostra `TypeError: fetch failed` verso il Supabase E2E, non una violazione RLS osservata. Questo è coerente con un ambiente E2E non raggiungibile/pausato e va classificato separatamente da una regressione di prodotto.

Regola di maturità: un ambiente E2E deliberatamente spento non deve far sembrare il prodotto regressivo; i gate devono distinguere `ENVIRONMENT_UNAVAILABLE` da `PRODUCT_FAILURE` oppure l'ambiente deve essere attivo durante la certificazione.

## Finding C — Repository hygiene

Le PR storiche rimaste aperte ma superate da tranche successive devono essere chiuse come `SUPERSEDED` quando verificato, così `open` torna a significare lavoro realmente candidato al merge.

## Residui verso M5

DOCENTE OS non può essere classificato M5 finché non esistono evidenze sufficienti per almeno:

1. onboarding e gestione multi-user deliberatamente autorizzati;
2. privacy lifecycle completo qualora si voglia ammettere Tier 2;
3. sustained pilot evidence nel normale ciclo scolastico;
4. recovery e supportability esercitati su incidenti reali o rehearsal periodici;
5. interop runtime con Arena, se viene scelta come requisito di prodotto e non soltanto come handoff locale.

## Decisione audit

**M4 confermato.**

La priorità immediata non è aggiungere feature: è consolidare lo stato canonico, rendere non ambigui i gate dipendenti dall'ambiente E2E e avviare sustained pilot evidence.