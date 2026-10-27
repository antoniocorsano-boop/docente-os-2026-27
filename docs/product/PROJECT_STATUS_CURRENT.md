# DOCENTE OS — Stato corrente canonico

Data: **2026-10-27**  
Stato documento: **CURRENT / CANONICAL — V1 MATURATION**

## 1. Baseline corrente

Current repository/runtime line:

`develop@489d8ee67b16db304ede71be94241739d0fa0a79`

Il Beta Render serve lo stesso exact commit dopo auto-deploy conseguente al merge #763.

Il prodotto resta classificato **M4 — Advanced Controlled Production Pilot**. La decisione `M5 / V1 generally distributable` non è stata presa.

## 2. Decisione di programma

DOCENTE OS è in **completion and maturation mode**.

Formula:

`Teacher Moment → contesto → prossimo passo → copilota → conferma umana → traccia`

Regola:

> maturare ciò che esiste prima di ampliare il perimetro funzionale.

Nessun nuovo feature train importante precede la chiusura della maturazione V1.

## 3. Stato del blocker Orario/runtime

Il filone #760 → #761 → #763 è chiuso per il blocker pre-RC:

- #760: effective-date Orario corretto;
- #761: cella ricorrente risolta verso la prossima occorrenza concreta mantenendo exact timetable version + slot identity e Temporal Projection canonica;
- merge #761: `5112ac255c936f4becf0de80dd14a4bebdde6df3`;
- P6 Render Beta: PASS sul merge #761;
- HVA post-merge #761: RED classificato come race del test harness, non nuovo difetto prodotto;
- #763: repair test-harness-only;
- merge #763/current develop: `489d8ee67b16db304ede71be94241739d0fa0a79`;
- post-merge Product CI, X3, Human Interaction Model, TERM-01 e HVA: PASS;
- Beta: exact commit corrente live.

Non è autorizzata una nuova patch `/knowledge` senza nuova evidence causale; i budget restano invariati.

## 4. Release governance

Sono già state emesse:

- `v0.1.0-rc.1`;
- `v0.1.0-rc.2`.

Dopo rc.2 sono avvenute modifiche applicative sostanziali. Una RC esistente non può cambiare SHA. Se il perimetro resta `0.1.0`, il prossimo candidato sarà presumibilmente `0.1.0-rc.3`, ma non è ancora congelato.

La riconciliazione della provenienza Production prevista dalla sequenza di programma del 27 ottobre è completata. Il prossimo passo è il freeze della nuova RC exact-SHA.

## 5. Production provenance reconciled

Production resta separata dal Beta e con auto-deploy disabilitato.

Ultimo SHA Production canonicamente certificato e promosso:

`db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`

Evidence:

- decisione umana esplicita del 25/08/2026;
- Production Runtime Smoke `32903982577` PASS;
- release receipt canonica.

Runtime Production osservato il 27/10/2026:

`7fa8deae375bc15b4386d17c97b1809f49488b98`

Questo SHA è live a seguito di deploy manuale del 17/09/2026, ma la ricostruzione non ha trovato una decisione di promozione Production né un Production Runtime Smoke specifici. La PR sorgente #502 era esplicitamente scoped al Beta; inoltre lo SHA conserva uno storico `hva/runtime = failure`.

Classificazione:

`LIVE_SHA_NOT_CANONICALLY_CERTIFIED`

Non viene dedotto un difetto funzionale della Production corrente e non è autorizzato alcun rollback/redeploy. La distinzione tra **live** e **certificato/promosso** è ora registrata in:

`ops/production-provenance-reconciliation-2026-10-27.json`

`db3d4ab…` resta il precedente SHA certificato noto. La sua compatibilità come rollback target della nuova RC deve essere verificata al freeze insieme alla migration inventory.

## 6. Capability disponibili da maturare

Sono già presenti fondazioni significative per:

- Account e MFA/AAL2;
- Classi/cattedra;
- Orario e Calendario/Temporal Projection;
- Today/Next e Teacher Moment;
- Lesson Brief;
- Piano annuale/UDA;
- TeachingSession e registrazione;
- Observation/Evidence;
- Conoscenza/KB e Materiali;
- Contextual Copilot;
- PWA/device intake;
- provenance, RLS, governance, design system e release assurance.

Il V1 deve orchestrare e qualificare queste capability, non riscriverle da zero.

## 7. HUMAN_USE

La principale evidence negativa storica resta **FRICTION / REWORK_REQUIRED**. I successivi miglioramenti tecnici e UX non trasformano automaticamente quella evidence in PASS.

Il prossimo gate di prodotto dopo il freeze RC è QL-1 HUMAN_USE task-based:

`Oggi → Lezione → Materiali → Registra → prossimo passo/domani`

## 8. Sequenza V1 corrente

1. Orario repair — **COMPLETE**;
2. runtime/P6 blocker — **COMPLETE**;
3. Production provenance reconciliation — **COMPLETE**;
4. nuova RC exact-SHA — **NEXT**;
5. QL-1 HUMAN_USE;
6. QL-3 Knowledge → Lesson → Materials;
7. QL-4 Governed Copilot;
8. Observe → Registra → Next;
9. Android Reality / PWA;
10. M5 assurance;
11. sustained pilot;
12. decisione formale V1 READY / V1 REWORK.

## 9. Non-obiettivi del release core corrente

- Voice/STT: **DEFERRED**;
- Tier 2 / dati scolastici personali: fuori baseline;
- multi-user e institutional administration: programma separato;
- nuove feature autonome non richieste da finding professionali reali.

## 10. Invarianti permanenti

- `TeachingSession` è la ricevuta autorevole di ciò che è realmente accaduto;
- `AnnualPlanBlockProgress` resta una decisione professionale distinta;
- Orario e Calendario mantengono autorità distinte e sono composti da Temporal Projection;
- Arena mantiene l'autorità curricolare/istituzionale;
- DOCENTE OS governa il lavoro operativo del docente;
- AI non scrive direttamente nel dominio;
- sicurezza, RLS, AAL2, privacy, provenance, idempotenza e human authority restano non negoziabili;
- Production non viene promossa automaticamente perché `develop` o Beta sono verdi.

## 11. Fonti operative

- `docs/product/DOCENTE_OS_SYSTEM_STATUS_2026-10-27.md`;
- `docs/superpowers/plans/2026-10-27-docente-os-v1-maturation-plan.md`;
- `docs/product/RELEASE_ENGINEERING_CANONICAL.md`;
- `ops/production-promotion-contract.json`;
- `ops/production-readiness-review.json`;
- `ops/production-release-receipt.json`;
- `ops/production-provenance-reconciliation-2026-10-27.json`;
- `docs/product/CAPABILITY_READINESS_CURRENT.md`;
- `ops/capability-readiness.json`.

## 12. Stato sintetico

**M4 ADVANCED CONTROLLED PRODUCTION PILOT / develop@489d8ee6… / BETA LIVE + QUALIFIED / PRODUCTION PROVENANCE RECONCILED / NEW RC FREEZE NEXT / HUMAN_USE AFTER RC.**
