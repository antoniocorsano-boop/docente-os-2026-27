# P7 / T2B — Retention e cancellazione applicativa

Stato: **REHEARSAL IN PROGRESS / TIER 2 NOT ADMITTED**

T2B distingue la cancellazione dei dati live dalla retention dei backup. La cancellazione applicativa rimuove i dati dal database e dallo Storage operativi; non tenta di alterare retroattivamente i backup R2 protetti dal Bucket Lock.

## Semantica

- dati live: cancellazione dal DB e dagli oggetti Storage interessati;
- identità Auth: non cancellata automaticamente da un purge dei dati applicativi;
- backup: copie storiche non attive, soggette alla retention già certificata;
- restore: il servizio non può essere riaperto finché non sono state riconciliate le cancellazioni avvenute dopo il backup ripristinato;
- recovery: modello forward-reconciliation, non rollback distruttivo dei backup.

## Rehearsal DB

Su Production vuota è stato creato esclusivamente un dataset sintetico composto da workspace, membership, anno scolastico e task. La cancellazione del workspace sintetico ha riportato a zero tutte le righe della catena. Nessun dato reale è stato letto o modificato.

## Rehearsal Storage

La prova successiva usa l'identità tecnica autenticata e le policy Storage reali: crea un workspace sintetico, carica un sentinel nel bucket `knowledge-assets`, verifica integrità, lo cancella come owner e verifica l'assenza. Il workspace di prova viene poi rimosso dall'operatore per UUID e marker esatti e Production deve tornare application-empty.

T2B potrà diventare `SATISFIED` solo dopo il PASS della prova Storage e il cleanup verificato. Il Tier 2 resta comunque `NOT_ADMITTED`.
