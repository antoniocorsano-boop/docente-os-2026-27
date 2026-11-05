# P7-DB-R2-MAIN-01 — Collaudo di copia cifrata su Cloudflare R2 senza Termux

**Stato:** proposta in revisione. **Dati esclusivamente sintetici. Nessun backup del database reale.**

## Contesto e motivazione

Il repository Docente OS ha `main` come ramo predefinito. Il ramo `develop` è collegato alla distribuzione automatica di Render Beta, ancora bloccata dalla discrepanza tra migrazioni `0103` e `0104` (issue [#792](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/792)).

La [PR #793](https://github.com/antoniocorsano-boop/docente-os-2026-27/pull/793) qualifica il percorso PostgreSQL sintetico locale con cifratura `age` e ripristino. Questo incremento *separato* porta il solo collaudo in un ramo derivato da `main`, affinché il trasferimento R2 possa essere **avviato manualmente da GitHub dopo la revisione e un'eventuale integrazione in `main`**, senza aggiornare `develop` né modificare la Beta.

## Ambito tecnico

- Flusso: `.github/workflows/p7-db-r2-main-certification.yml`.
- Procedura: `.github/scripts/p7-db-r2-main-synthetic-rehearsal.sh`.
- Un database PostgreSQL 16.6 *temporaneo*, composto da due righe sintetiche `row_id:marker`.
- Esportazione con `pg_dump -Fc` client PostgreSQL 16, cifratura `age` con identità effimera, confronto byte e SHA-256 del **solo cifrato**, decifratura e ripristino in un secondo database temporaneo.
- In modalità R2: caricamento del **solo file cifrato** nel bucket privato `docente-os-backup-eu`, prefisso `rehearsal/p7-db-synthetic-main/<run_id>/`; scaricamento, confronto integrità, ripristino, verifica identificativi e contenuti, eliminazione R2 **prima** della ricevuta `PASS`.

## Confini di sicurezza e attivazione

| Evento | Prova locale | Prova R2 | Credenziali R2 |
|---|---|---|---|
| Richiesta di modifica verso `main` | Sì | **No** | **Non disponibili al job locale** |
| `push` su `main` | No | **No** | Non utilizzate |
| Avvio manuale su `main`, `transfer=local` | Sì | No | Non disponibili al job locale |
| Avvio manuale su `main`, `transfer=r2` | Sì | Sì, dopo il primo PASS | Soltanto nel job R2 |

Il processo R2 rifiuta esecuzioni diverse da `workflow_dispatch` su `refs/heads/main`; impone `PGHOST=127.0.0.1`, `PGPORT=5432`, `PGUSER=postgres`, password locale fittizia, `P7_SYNTHETIC_ONLY=yes`, bucket atteso e prefisso `rehearsal/`. Nessuna stringa di connessione del database Supabase reale è prevista, ammessa o richiesta.

La cancellazione R2 è parte del contratto di accettazione: **non stampare PASS finché la cancellazione non è riuscita**. Un errore attiva un ulteriore tentativo durante la pulizia finale e impedisce il PASS.

- Nessun allegato GitHub con dump o chiave privata.
- Nessuna applicazione della migrazione `0104`.
- Nessuna scrittura o esportazione dal database scolastico; nessuna modifica a Render.
- Nessuna chiave esterna da chiedere in chat; si riutilizzano esclusivamente i segreti R2 già configurati sul repository.

## Modalità di prova

**Fase A (questa richiesta):** acquisire un `PASS` dei test locali sul commit esatto e una revisione di sicurezza e correttezza. La richiesta rimane **Draft**, senza merge.

**Fase B (richiede integrazione in `main` approvata separatamente):** GitHub → Actions → **P7 Database R2 Synthetic Certification (main)** → Run workflow → selezionare `main` e `transfer=r2`. Acquisire due esiti PASS (locale e R2), cancellazione riuscita, hash del cifrato sintetico e prova di ripristino.

**Nota:** esiste sul ramo `main` un flusso GitHub Pages attivato da `push`; un eventuale merge potrebbe aggiornarne il contenuto statico, ma **non** attiva il ramo `develop` né il servizio Render Beta. Tale effetto va comunque valutato prima del merge.

## Cosa NON dimostra questa prova

- Non crea né certifica una copia del Supabase reale.
- Non dimostra il ripristino completo di Auth, Storage, ruoli, estensioni o metadati delle migrazioni.
- Non fornisce una chiave permanente di recupero per dati scolastici.
- Non autorizza trattamento o trasferimento di dati personali reali verso GitHub/R2.
- Non chiude i gate privacy, recuperabilità e autorizzazione DDL della [#792](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/792).

**Gate successivo dopo R2 sintetico PASS:** progettare e qualificare una copia reale cifrata con identità di recupero custodita fuori da GitHub, verificare il ripristino e ottenere l'autorizzazione specifica prima di procedere con `0104` e il rilascio Beta.
