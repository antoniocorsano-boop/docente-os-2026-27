# DOCENTE OS — Quadro di stato e maturazione V1

**Data:** 27 ottobre 2026  
**Baseline integrata:** `develop@489d8ee67b16db304ede71be94241739d0fa0a79`  
**Classificazione:** M4 — Advanced Controlled Production Pilot  
**Direzione:** completion and maturation mode

## 1. Decisione corrente

DOCENTE OS non apre un nuovo feature train. Il programma concentra il lavoro sulla maturazione dei journey già disponibili:

`Teacher Moment → contesto → prossimo passo → copilota → conferma umana → traccia`

## 2. Orario e runtime

Il filone #760 → #761 → #763 è chiuso sul Beta corrente.

- #760 ha corretto la selezione della versione Orario effettiva sulla data operativa.
- #761 ha corretto la risoluzione della cella ricorrente verso la prossima occorrenza concreta, mantenendo identità esatta di versione e slot e la semantica canonica Calendar / Temporal Projection.
- candidate finale #761: `df7cbfd3f2b662590cabc30d40efb1d9ffd5c434`.
- merge #761: `5112ac255c936f4becf0de80dd14a4bebdde6df3`.
- sul merge #761 P6 Render Beta è PASS; il successivo RED HVA è stato classificato come race del test harness mobile week/day, non come nuovo difetto prodotto.
- #763 ha corretto solo il test harness, senza modifiche a codice prodotto, dati o migrazioni.
- candidate #763: `ee1191f0a419e79a30ccad75fb9da6fbe77a8e47`.
- merge corrente: `489d8ee67b16db304ede71be94241739d0fa0a79`.

Sul merge corrente Product CI, X3, Human Interaction Model, TERM-01 e HVA sono PASS. Render Beta ha effettuato l'auto-deploy del medesimo commit ed è `live`.

**Conclusione:** Task 1 Orario CLOSED. Task 2 runtime/P6 CLOSED per il blocker che impediva il freeze RC. Non esiste evidenza corrente che giustifichi una nuova patch `/knowledge` o un allentamento dei budget.

## 3. Production provenance

Production resta separata dal Beta e non ha auto-deploy.

La receipt storica registra la promozione certificata del 25 agosto sul candidate `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`.

Il provider mostra però come deploy Production attualmente live il commit `7fa8deae375bc15b4386d17c97b1809f49488b98`, attivato manualmente il 17 settembre 2026. Sullo stesso SHA diversi gate risultano PASS, mentre lo status storico `hva/runtime` risulta failure.

Classificazione: **PRODUCTION_PROVENANCE_DRIFT**.

Questo finding:

- non prova da solo un difetto funzionale della Production corrente;
- non autorizza rollback o redeploy;
- non blocca il Beta;
- richiede ricostruzione delle evidence e dell'autorità del deploy prima della nuova RC e, in ogni caso, prima di qualsiasi futura promozione Production.

Production resta immutata durante la riconciliazione.

## 4. Release engineering

Sono già state emesse `v0.1.0-rc.1` e `v0.1.0-rc.2`. Dopo rc.2 sono avvenute modifiche applicative sostanziali; la policy vieta di spostare lo SHA di una RC esistente.

Se il perimetro resta `0.1.0`, il prossimo candidato sarà presumibilmente `0.1.0-rc.3`, ma questa PR **non crea né certifica** la nuova RC.

Prima del freeze servono:

1. stato, piano e changelog coerenti con `develop@489d8ee6…`;
2. riconciliazione del `PRODUCTION_PROVENANCE_DRIFT`;
3. scelta di un exact `develop` SHA immutabile;
4. matrice dei gate, known residuals e rollback target espliciti.

## 5. Gap residui V1

| Blocco | Gap |
|---|---|
| Release governance | Production provenance + freeze nuova RC |
| Daily Teaching Loop | QL-1 HUMAN_USE |
| Knowledge / Materials | QL-3 end-to-end |
| Governed Copilot | QL-4 + HUMAN_USE |
| Observe → Registra | browser/mobile + recovery + HUMAN_USE |
| Android/PWA | real-device qualification |
| Accessibility | WCAG manuale + assistive technology |
| Security maturity | ASVS requirement-level |
| Operability | SLI/SLO + support/recovery loop |
| General maturity | sustained pilot + decisione V1 |

## 6. Sequenza bloccante aggiornata

`Orario/runtime closed → release-governance reconciliation → RC freeze → QL-1 HUMAN_USE → QL-3 → QL-4 → Observe/Registra → Android Reality → M5 assurance → sustained pilot → V1 decision`

Voice/STT, Tier 2, multi-user e institutional expansion restano fuori dal release core finché non vengono esplicitamente ri-autorizzati.

## 7. Stato canonico

**M4 ADVANCED CONTROLLED PRODUCTION PILOT / develop@489d8ee6… / BETA LIVE + POST-MERGE QUALIFIED / ORARIO-RUNTIME BLOCKER CLOSED / PRODUCTION PROVENANCE RECONCILIATION REQUIRED / RC FREEZE NEXT AFTER RECONCILIATION.**
