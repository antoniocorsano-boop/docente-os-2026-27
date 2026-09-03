# LOCAL OPERATIONAL AGENDA — RECOVERY HOTFIX V1

**Stato:** HOTFIX PROPOSED  
**Origine:** finding Codex post-merge su DOS-S2 / PR #257  
**Ambito:** recovery di un backup valido quando il record IndexedDB corrente è corrotto

## Problema

Il percorso di import valida correttamente il backup prima del `replace`, ma il `replace` rileggeva il record IndexedDB corrente tramite il validatore completo dello stato. Se quel record era corrotto, la validazione falliva prima del `put`, rendendo inutilizzabile proprio il percorso di recovery proposto dall'interfaccia.

## Correzione

Il `replace` non usa più lo stato corrente come premessa del ripristino. Dal record esistente recupera soltanto il metadato di concorrenza necessario a mantenere la barriera cross-tab:

- record legacy senza alcun marker `storageRecordVersion` → generazione corrente `0`;
- record con `storageRecordVersion = 1` e `restoreGeneration` valida → la generazione viene preservata e incrementata dal ripristino;
- record con marker `storageRecordVersion` presente ma versione sconosciuta/corrotta → recovery fail-closed;
- record V1 con `restoreGeneration` corrotta → recovery fail-closed, perché non è possibile stabilire in sicurezza la generazione rispetto a eventuali schede già aperte.

Un envelope non riconosciuto non viene mai reinterpretato come payload legacy: questo impedisce di azzerare la generazione e di rendere nuovamente valida una scheda stale.

Il contenuto importato continua a essere validato integralmente prima della sostituzione. Nessun dato del payload locale corrotto viene promosso o copiato nel backup valido.

## Invarianti

1. un backup valido può sostituire uno stato locale corrotto;
2. una `restoreGeneration` valida non viene azzerata durante il recovery;
3. le schede ferme alla generazione precedente restano stale dopo il ripristino;
4. una generazione corrotta non viene inventata o normalizzata silenziosamente;
5. una versione storage sconosciuta o corrotta non viene trattata come legacy;
6. il formato backup `DOCENTE_OS_OPERATIONAL_AGENDA` V1 resta invariato;
7. il confine local-only di DOS-S2 resta invariato: nessuna scrittura canonica automatica viene introdotta.
