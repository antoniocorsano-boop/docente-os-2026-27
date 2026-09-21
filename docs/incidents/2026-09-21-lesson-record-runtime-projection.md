# Incidente Beta — registrazione lezione / runtime projection parity

Data: 2026-09-21

## Evidenza

Nel collaudo mobile post-merge di ECO-02/P9, la schermata **Registra** ha mostrato il messaggio React minificato `#441` dopo l'azione **Registra e torna alla classe**.

I log Render alle 16:21 Europe/Rome hanno registrato:

- `Human-task lesson projection is not available for this block`
- digest `61800489`

## Causa

La pagina della lezione risolveva correttamente i blocchi runtime con `resolveRuntimeHumanTaskLessonProjection(...)`.

La Server Action `recordLessonExecution(...)` usava invece `resolveHumanTaskLessonProjection(...)`, creando una divergenza tra ciò che la pagina poteva mostrare e ciò che il salvataggio poteva registrare.

## Correzione

- la Server Action usa lo stesso runtime resolver della pagina;
- se neppure il runtime resolver trova la proiezione, il flusso resta fail-closed;
- test di contratto impedisce future divergenze page/action;
- l'interfaccia non espone più messaggi tecnici React: in caso di errore di produzione mostra un messaggio umano e preserva i dati inseriti.

## Design classification

`COMPATIBLE` — stessa superficie, stesso spazio di errore, nessun nuovo token, layout o componente di navigazione.

## Confini

La correzione non modifica Arena, la baseline curricolare, il lifecycle P9, DOS-A1, schema DB o dati personali.
