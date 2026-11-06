# P7-DB-REAL-READINESS-01 — Preparazione alla copia del database reale

**Stato:** `ENGINEERING_PREPARATION / SYNTHETIC_ONLY / REAL_EXPORT_HOLD`.

## Fatti verificati (06/11/2026)

- Il flusso GitHub Actions → cifratura `age` → Cloudflare R2 → download → ripristino sintetico ha esito **PASS**: [run #42172909680](https://github.com/antoniocorsano-boop/docente-os-2026-27/actions/runs/42172909680). Il file R2 sintetico è stato cancellato e la cancellazione verificata prima della ricevuta PASS.
- Il progetto Supabase esaminato, in regione `eu-west-1`, è attivo: PostgreSQL **17.6**, circa **53 MB**, **62 tabelle public** e **190 politiche RLS public** alla rilevazione.
- La migrazione `0104` non è applicata; risulta l'ultima `0103_material_reference_safety`. Il servizio Render Beta è collegato al ramo `develop`, ma **l'identità del progetto Supabase usato dalla Beta non è ancora stata attestata direttamente dalla configurazione Render**. La disponibilità di un progetto Supabase collegato all'utente non prova il collegamento.
- La precedente prova sintetica R2 usava PostgreSQL 16. Questo incremento introduce una prova **PostgreSQL 17** prima di qualunque esportazione reale.

## Oggetto della PR

- Script `.github/scripts/p7-db-real-readiness-pg17.sh`: due database effimeri PostgreSQL 17; due righe fittizie; `pg_dump -Fc` convogliato **direttamente nella cifratura `age`**, senza creare un archivio non cifrato sul disco del runner; successiva decifratura in memoria tramite condotto verso `pg_restore`; verifica esatta di `row_id:marker`; rifiuto di chiave sbagliata.
- Workflow `.github/workflows/p7-db-real-readiness-pg17.yml`: solo `pull_request` contro `main`, `permissions: contents: read`, **nessun segreto** Supabase o R2, **nessun `workflow_dispatch`**, nessun collegamento di rete al database reale.
- Questo lavoro certifica la **compatibilità degli strumenti PG17 e la tecnica di cifratura durante l'esportazione**, non la recuperabilità di Supabase.

## Requisiti vincolanti prima di esportare dati professionali

1. **Identità dell'origine.** Verificare tramite la configurazione privata di Render che l'URL del Supabase usato dalla Beta corrisponda al progetto atteso. Non pubblicare segreti, password o URL autenticati nei log, nelle issue o nella chat. La sola presenza di un database accessibile non costituisce prova.
2. **Contesto privacy.** Accertare titolarità e autorizzazione al trattamento dei dati del progetto, base giuridica, condizioni contrattuali della destinazione Cloudflare R2, accessi e conservazione. La prova sintetica non autorizza il caricamento di dati personali.
3. **Identità di cifratura recuperabile.** Generare e custodire la chiave privata `age` fuori da GitHub, dal runner e dal bucket R2, con una procedura di recupero indipendente approvata. GitHub potrà ricevere *solo il destinatario pubblico*. Una chiave effimera generata e distrutta nel job **non rende recuperabile una copia reale**.
4. **Credenziali di origine protette.** Collegare al processo di backup soltanto le credenziali PostgreSQL autorizzate per la lettura, evitando privilegi eccessivi. Non usare password in comandi mostrati nei registri, né inserirle nel repository pubblico.
5. **Perimetro corretto dell'esportazione.** Un dump `public` **non comprende automaticamente** gli utenti `auth`, gli oggetti binari di `storage`, ruoli, estensioni, segreti di configurazione, chiavi API o tutto lo storico delle migrazioni. Stabilire cosa deve essere recuperabile prima di definire il dump come copia di sicurezza della Beta. Le indicazioni Supabase sulla CLI raccomandano l'esportazione distinta di ruoli, schema e dati, con esclusione di alcuni schemi gestiti; non sostituire questo metodo con un dump PostgreSQL completo non verificato.
6. **Ripristino indipendente.** Dimostrare decifratura e ricostruzione in un ambiente isolato e protetto, con verifica di dati, strutture, integrità referenziale, politiche di sicurezza, ruoli e configurazioni rilevanti. Conservare soltanto ricevute non sensibili.
7. **Revisione umana finale.** Approvare la copia realmente ripristinabile prima della modifica DDL `0104` e di qualsiasi promozione Beta.

## Decisione tecnica provvisoria

Utilizzare GitHub Actions come esecutore temporaneo **solo dopo** la verifica delle condizioni precedenti, strumenti PostgreSQL 17 coerenti con il server e **cifratura prima dell'upload R2**. Privilegiare il trasferimento del solo cifrato, accessi minimi, prefisso protetto e prova di recupero indipendente.

**Vietato in questa PR:** export reale, accesso alle credenziali Supabase, upload R2, ripristino con dati scolastici, merge su `develop`, migrazione `0104`, deploy Beta e utilizzo di servizi a pagamento.

## Condizione di uscita

Questo incremento è qualificato quando il test PostgreSQL 17 **RED → GREEN** raggiunge PASS sull'exact head e una revisione indipendente convalida le esclusioni. La preparazione del backup reale rimane distinta e **non autorizzata dall'esito del test sintetico**.

Fonti ufficiali di riferimento:
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — Restore a Platform Project to Self-Hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
- [Supabase — CLI db dump](https://supabase.com/docs/reference/cli/supabase-db-dump)
