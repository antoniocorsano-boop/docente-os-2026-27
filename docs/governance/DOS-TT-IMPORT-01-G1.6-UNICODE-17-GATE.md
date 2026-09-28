# DOS-TT-IMPORT-01 — G1.6-A Unicode 17 gate

Stato: `OPEN_P1 / PREVIEW_ONLY / FAIL_CLOSED`.

Questo gate governa l'ultimo P1 di G1.6-A. Non autorizza G1.6-B, apply o replan.

## Decisione

`TT-TEACHER-NORM-1` sarà indipendente dall'Unicode del runtime. Unicode 17.0.0 è una dipendenza di generazione/verifica, non una dipendenza operativa richiesta al docente.

## Definition of Done

Il P1 può essere chiuso soltanto quando un exact head contiene contemporaneamente:

- dataset Unicode 17.0.0 fissato e verificabile per NFC e full non-Turkic case folding;
- generatore deterministico;
- artefatto statico versionato;
- implementazione NFC senza `String.normalize()` nel percorso autorevole;
- full case folding C+F senza `toLowerCase()`/`toLocaleLowerCase()` nel percorso autorevole;
- esclusione esplicita delle regole Turkic T;
- test `NormalizationTest.txt` Unicode 17.0.0;
- test delle espansioni multi-code-point del case folding;
- test di input Unicode scalare non valido → fail-closed;
- prova che il prodotto non effettua rete per normalizzare;
- prova che una modifica manuale dell'artefatto/digest viene rilevata;
- Product CI e gate di sicurezza PASS;
- revisione tecnica indipendente PASS.

## Anti-falso-verde

La sola costante `17.0.0`, il superamento delle fixture applicative o l'uso delle API Unicode del motore non costituiscono prova di conformità. Finché la Definition of Done non è completa, la sola funzione esportabile resta `normalizeTeacherLabelPreview` e G1.6-A resta aperta.
