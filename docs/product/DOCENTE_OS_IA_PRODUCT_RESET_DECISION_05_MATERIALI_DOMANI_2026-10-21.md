# DOCENTE OS — IA Product Reset — Decisione 05: Materiali di domani

Data: 2026-10-21
Stato: APPROVATA
Branch: `docs/dos-ia-product-reset`

## Decisione

`Materiali di domani` non è una destinazione primaria e non compare in `Oggi`.

Ha una sola casa stabile:

```text
Altro -> Materiali e fonti -> Materiali di domani
```

Può inoltre essere richiamato contestualmente da `Orario` quando il docente consulta il giorno successivo o una lezione futura pertinente.

Principio:

> Una capability ha una sola casa stabile, ma può avere accessi contestuali intelligenti.

## Conseguenze

- nessuna nuova voce nella navigazione primaria;
- nessuna duplicazione dentro `Oggi`;
- la panoramica multi-lezione dei pacchetti di domani resta disponibile;
- i materiali della singola lezione restano invece capability contestuali del workspace `Lezione`;
- l'accesso da `Orario` non cambia la natura dei materiali né rende Orario proprietario della capability;
- provenienza, stato di approvazione, blocchi fail-closed e versioning restano invariati.

## Relazione con il decision log principale

Questa decisione integra `DOCENTE_OS_IA_PRODUCT_RESET_DECISION_LOG_2026-10-21.md` e chiude la questione aperta relativa alla collocazione di `Materiali di domani`. Verrà consolidata nella specifica canonica finale prima di qualsiasi implementazione.

Implementazione: NON AUTORIZZATA.
Merge/deploy: NON AUTORIZZATI.
