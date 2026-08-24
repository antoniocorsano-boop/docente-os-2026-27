# P2 — Restore rehearsal receipt

Data: 2026-08-24

## Esito

**BLOCKED_BY_PLAN — non eseguito sul Beta canonico.**

Il rehearsal era stato autorizzato dopo comunicazione del costo corrente del branch Supabase, pari a **€0,01344/ora**.

Sequenza eseguita:

1. costo branch riletto per l'organizzazione corrente: €0,01344/ora;
2. costo esplicitamente confermato;
3. richiesta di creazione del branch isolato `p2-restore-rehearsal-20260824` sul progetto Beta;
4. Supabase ha rifiutato la creazione con il vincolo: **Branching is supported only on the Pro plan or above**.

Nessun restore è stato eseguito sul database Beta reale e nessun dato applicativo è stato alterato.

## Stato P2

- Account recovery applicativo: **PASS**.
- Recovery runbook e `verify_restore.sql`: **PREPARED**.
- Manifest DB/Auth/Storage: **CAPTURED**.
- Restore rehearsal isolato: **BLOCKED_BY_PLAN**.
- Restore sul Beta canonico: **FORBIDDEN come scorciatoia di test**.

## Gate alternativo non distruttivo

Fino alla disponibilità di un ambiente isolato, `ops-health/render-beta` verifica anche:

- presenza sul login del percorso esplicito `Ho dimenticato la password`;
- presenza dell'azione `Invia collegamento di recupero`;
- protezione di `/imposta-password` quando manca una sessione verificata;
- normali probe Render, Auth e DB/RLS.

Questo gate aumenta l'evidenza sul recovery ma **non sostituisce** un restore rehearsal reale.

## Condizione per PASS restore

P2 restore potrà diventare `PASS` solo quando sarà disponibile un ambiente Supabase isolato e verranno verificati: migrazioni/schema, manifest DB/Auth, ACL/RLS/RPC, oggetti Storage e gate funzionali post-ripristino.
