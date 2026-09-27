# TRAMA Stage B — RUNTIME-01R3

## Scope

Materializzazione circoscritta della transizione di stato delle assegnazioni didattiche della Cattedra.

## Invarianti

- baseline: `60f2c0f7e7a0bf6de2b955ba0592ef34d90e5511`;
- nessuna migrazione dello schema;
- nessuna attivazione DOS-A1;
- nessuna promozione STABLE;
- nessuna modifica a `page.tsx` finché il collegamento non può essere prodotto e revisionato come diff chirurgico;
- il percorso esistente resta operativo durante la materializzazione incrementale.

## Materializzato

1. `setAssignmentStatus` usa compare-and-set su `id`, workspace, anno scolastico, stato atteso e `updated_at` atteso.
2. Un aggiornamento stale produce `TeachingAssignmentStaleConflictError` anziché sovrascrivere silenziosamente lo stato corrente.
3. È disponibile un controllo client dedicato con stato pending, blocco del doppio invio e feedback percettibile/accessibile.
4. Le nuove server action con feedback distinguono `success`, `conflict` ed `error`.
5. Le action legacy restano compatibili durante il collegamento incrementale e usano comunque una transizione compare-and-set sulla revisione riletta immediatamente prima della scrittura.

## Passo successivo vincolato

Collegare `TeachingAssignmentTransitionForm` ai soli due punti `Conferma` / `Rimetti da controllare` di `page.tsx`, passando `assignment.updatedAt`, senza riformattare o riscrivere il resto del file. Il diff deve essere ispezionato prima di qualunque merge.
