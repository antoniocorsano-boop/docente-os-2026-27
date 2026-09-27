# DOS-TT-IMPORT-01 — G1.6-A Unicode 17 deterministic materialization

## Stato

`P1_OPEN / FAIL_CLOSED / NO_RUNTIME_CLAIM`

Questo documento isola l'ultimo P1 della slice G1.6-A. Non modifica `HOLD_PRODUCTION_APPLY` o `HOLD_REPLAN` e non autorizza G1.6-B.

## Riferimento normativo

La materializzazione deve essere derivata esclusivamente dai dati Unicode 17.0.0 versionati. Per il case folding, la fonte canonica è `CaseFolding.txt` 17.0.0 con mapping **C + F** e senza mapping Turkic `T`. Per NFC servono i dati normativi di decomposizione canonica, Canonical Combining Class e composition exclusion, con algoritmo Hangul canonico. La conformità deve essere verificata contro `NormalizationTest.txt` 17.0.0.

Fonti versionate di riferimento:

- Unicode Standard 17.0.0 / UAX #15;
- Unicode Character Database 17.0.0;
- `UnicodeData.txt` 17.0.0;
- `CompositionExclusions.txt` / proprietà di full composition exclusion 17.0.0;
- `CaseFolding.txt` 17.0.0;
- `NormalizationTest.txt` 17.0.0.

## Decisione di implementazione

Non è ammesso chiudere il P1 sostituendo il full case folding con `toLowerCase()`, `toUpperCase().toLowerCase()` o altra euristica. Non è ammesso dichiarare Unicode 17.0.0 sulla sola base della versione del motore JavaScript.

La soluzione deve essere **code-generated da dati 17.0.0 congelati**, con output versionato e verificabile. Il generatore deve produrre almeno:

1. mapping di decomposizione canonica;
2. Canonical Combining Class non-zero;
3. coppie di composizione NFC, escluse quelle vietate dalla full composition exclusion;
4. full default case folding non-Turkic (status C + F; T escluso);
5. metadati di provenienza e digest degli input.

Il runtime applica: validazione scalar-value → NFC 17.0.0 → spazi governati → trim/compressione → full default case folding 17.0.0 → mapping apostrofi/trattini. Poiché il case folding può alterare la normalizzazione, i test devono verificare esplicitamente i casi canonici rilevanti e l'idempotenza richiesta dal contratto.

## Gate obbligatori

Il P1 può essere chiuso solo quando:

- l'artefatto generato è presente nel repository o prodotto in modo riproducibile da input versionati e verificati;
- nessun dato Unicode viene recuperato dinamicamente nel browser/runtime docente;
- i test G1.6 sono inclusi realmente in `npm test` / Product CI;
- full case folding copre espansioni multi-code-point (es. sharp-s) e casi in cui lowercase non equivale al case folding;
- la normalizzazione supera le fixture ufficiali Unicode 17.0.0 pertinenti e una suite di conformance sufficientemente completa;
- un cambio degli input/digest/versione Unicode provoca gate FAIL;
- revisione tecnica indipendente PASS su un nuovo exact head.

## Rilievo emerso durante la materializzazione

La suite `timetable-teacher-evidence.test.ts` era stata creata ma non era elencata nello script `product:test`; quindi i precedenti Product CI verdi non dimostravano l'esecuzione di quella suite. Il file è ora inserito esplicitamente nel comando `npm test`. Questo rilievo impedisce di usare i PASS precedenti come prova di qualificazione G1.6-A: la qualificazione riparte dal nuovo exact head.
