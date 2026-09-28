# TT-TEACHER-NORM-1 — Unicode 17.0.0

Questo confine impedisce che la normalizzazione del cognome dipenda implicitamente dalla versione Unicode del runtime.

## Autorità

Versione fissata: Unicode 17.0.0.

La materializzazione definitiva deve essere generata esclusivamente dai dati Unicode 17.0.0 e deve produrre un artefatto TypeScript statico, importabile dal prodotto senza rete e senza dipendenze Unicode a runtime.

Dati necessari:

- decomposizioni canoniche;
- Canonical Combining Class;
- Composition Exclusions;
- algoritmo Hangul normativo;
- CaseFolding status C + F (full, non-Turkic); status T escluso;
- White_Space già fissato dal contratto G1.5.

## Regole di sicurezza

1. È vietato dichiarare conforme `TT-TEACHER-NORM-1` se il percorso autorevole usa `String.prototype.normalize`, `toLowerCase`, `toLocaleLowerCase` o API equivalenti dipendenti dal runtime.
2. Il generatore è uno strumento di sviluppo: nessun download o pacchetto Unicode è necessario nel browser del docente.
3. L'artefatto generato è versionato nel repository e contiene `UNICODE_VERSION = '17.0.0'` e un digest del dataset/generatore.
4. La CI deve rigenerare/verificare deterministicamente l'artefatto oppure confrontarne il digest con il manifest governato.
5. Le prove di conformità devono includere NormalizationTest 17.0.0 e casi di full case folding con espansioni multi-code-point.
6. Qualunque mismatch, dato mancante o versione differente fallisce chiuso.

## Stato

`MATERIALIZATION_IN_PROGRESS / PREVIEW_ONLY`.

Il file `timetable-teacher-evidence.ts` mantiene deliberatamente `normalizeTeacherLabelPreview` finché l'artefatto Unicode 17 completo e le prove di conformità non sono presenti. Nessun alias `normalizeTeacherLabel` può essere introdotto prima del gate.
