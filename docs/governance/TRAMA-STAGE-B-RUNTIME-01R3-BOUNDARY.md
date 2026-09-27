# RUNTIME-01R3 — boundary

Questa iterazione non autorizza il merge.

Il ramo contiene la protezione di persistenza, le nuove action con feedback e il controllo client. Il collegamento finale a `page.tsx` è deliberatamente escluso da questo exact head perché gli strumenti di scrittura disponibili sostituiscono il file intero e i tentativi di sostituzione hanno prodotto diff sproporzionati. La regola è quindi fail-closed: nessuna riscrittura ampia di `page.tsx` viene accettata.

Il collegamento finale dovrà modificare esclusivamente:

1. gli import delle due action legacy, sostituendoli con l'import di `TeachingAssignmentTransitionForm`;
2. il form `Conferma` con il componente in modalità `confirm`, usando `assignment.id`, `PROVISIONAL`, `assignment.updatedAt`;
3. il form `Rimetti da controllare` con il componente in modalità `reopen`, usando `assignment.id`, `CONFIRMED`, `assignment.updatedAt`.

Ogni diff che riformatti o modifichi altre parti di `page.tsx` è da respingere.
