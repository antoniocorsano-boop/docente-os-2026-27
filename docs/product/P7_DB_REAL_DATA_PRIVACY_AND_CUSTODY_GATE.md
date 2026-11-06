# P7 — Classificazione prudenziale dei dati e autorizzazione alla copia reale

**Data:** 06/11/2026  
**Progetto candidato:** `gnshgapmwyjamhmlikeg` (Beta Docente OS)  
**Esito:** `RB-02=HOLD / DATA_TREAT_AS_PERSONAL_PENDING_ATTESTATION / REAL_BACKUP_FORBIDDEN`

## 1. Evidenze ottenute senza accedere ai contenuti

La verifica è stata eseguita mediante **sole interrogazioni aggregate**, senza leggere email, nomi, profili, informazioni sugli studenti, nomi di file o altri contenuti.

| Inventario | Quantità verificata |
|---|---:|
| Identità nello schema `auth` | 4 |
| Spazi di lavoro applicativi | 4 |
| Sessioni didattiche registrate | 6 |
| Oggetti presenti in Supabase Storage | 9 |
| Voci dello storico delle migrazioni | 113 |

Le quantità dimostrano che il progetto non è vuoto, ma **non permettono di distinguere dati inventati da persone reali**. La denominazione personale del progetto Supabase e l'utilizzo di una Beta non costituiscono prove che i dati siano fittizi.

**Classificazione conservativa:** trattare tutti i dati come **potenzialmente personali e/o scolastici**, fino a un'attestazione separata della loro natura. Non occorre ispezionare o pubblicare alcuna riga per adottare la misura cautelativa.

## 2. Decisione di trattamento (RB-02)

Prima di autorizzare l'upload di una copia reale su R2 occorre una decisione del soggetto titolato a disporre di tali dati. La decisione deve essere custodita **in sede riservata, non nel repository pubblico**, e attestare almeno:

1. Chi è il titolare del trattamento per le categorie di dati effettivamente presenti; quali soggetti sono autorizzati alla custodia e al recupero.
2. Se gli account, i documenti e le registrazioni riguardano persone reali (docenti, studenti, famiglie) oppure sono esclusivamente dati sintetici; in mancanza di prova, mantenere la classificazione prudenziale.
3. Necessità, finalità e base giuridica della copia di sicurezza; minimizzazione del contenuto effettivamente esportato.
4. Valutazione e approvazione di Cloudflare R2 quale destinazione, inclusi accordi, localizzazione, controlli d'accesso, durata di conservazione, cancellazione e ripristino.
5. Chi può attivare una copia, approvare un ripristino e riesaminare le ricevute; gestione di incidente, compromissione o mancato recupero.
6. Confini di `auth`, `public`, `private`, metadati Storage e **byte dei file Storage**, ruoli, migrazioni e dipendenze gestite. Nessuna delle classi può essere ritenuta automaticamente inclusa nel dump `public`.

Una copia in locale e una copia off-site cifrata non sono equivalenti dal punto di vista della protezione dei dati. La qualificazione tecnica del bucket R2 **con dati fittizi** non costituisce autorizzazione per materiale reale.

### Ricevuta minima, senza dati personali

```text
RB-02 — DECISIONE PRIVACY E BACKUP (senza segreti)
Data: __________
Progetto: Docente OS Beta
Classificazione: DATI SINTETICI ATTESTATI / POTENZIALMENTE PERSONALI / DATI REALI
Funzione autorizzante: __________
Titolarità e ruoli verificati: PASS / HOLD
Destinazione R2 e condizioni contrattuali valutate: PASS / HOLD
Periodo di conservazione e misure di cancellazione approvate: PASS / HOLD
Perimetro dati e motivazione della copia approvati: PASS / HOLD
Attestazione riservata disponibile: SÌ / NO
RB-02: PASS / HOLD
```

Fino a completa attestazione, **`RB-02=HOLD`**. Non acquisire copie dei documenti di autorizzazione nel repository pubblico.

## 3. Custodia della chiave senza Termux e senza PC dell'utente

Il protocollo Android/Termux già presente nella PR #795 è **una proposta opzionale, non adottata**. L'utente ha precedentemente escluso l'installazione di Termux sul proprio telefono; non bisogna proporgliela come requisito operativo né chiedergli di generare chiavi in chat.

**Percorso di riferimento proposto:** affidare l'attivazione della chiave a un **custode autorizzato**, mediante ambiente affidabile e già disponibile nell'organizzazione, con due copie indipendenti protette. Il custode deve dimostrare il recupero da una seconda copia, e comunica a GitHub **esclusivamente il destinatario pubblico `age1...`** dopo l'approvazione. Il controllo locale può essere eseguito dal custode in un ambiente qualificato, senza richiedere il PC personale dell'utente.

Se non esiste un custode autorizzato con un ambiente sicuro, `RB-03` resta **HOLD**: non generare la chiave privata dentro GitHub Actions, non inserirla in un account cloud generico in chiaro e non sostituire il recupero indipendente con la sola riuscita della prova sintetica.

**RB-02 e RB-03 sono distinti.** Anche se la chiave sarà custodita correttamente, il trasferimento di dati reali resta non autorizzato finché RB-02 non è PASS.

## 4. Stato dei controlli

| Controllo | Esito |
|---|---|
| Collegamento URL pubblico configurato Render Beta→Supabase | `RB-01=PASS_RENDER_PUBLIC_CONFIG` |
| Classificazione prudenziale del contenuto | `ASSUMED_PROTECTED`, senza leggere contenuti |
| Autorizzazione per backup reale su R2 | **RB-02 HOLD** |
| Generazione, custodia e recupero della chiave privata | **RB-03 HOLD** |
| Perimetro completo, credenziali di lettura e procedure di recupero | **RB-04/05 HOLD** |
| Copia reale cifrata e ripristino indipendente | **RB-06/07 NON ESEGUITI** |
| Revisione e autorizzazione alla migrazione 0104 | **RB-08 HOLD** |

Non effettuare export Supabase, upload di copie reali su R2, migrazione `0104`, merge su `develop` o deploy Beta a seguito di questo documento.

**Riferimenti:** [P7_DB_REAL_BACKUP_ACTIVATION_GATE.md](./P7_DB_REAL_BACKUP_ACTIVATION_GATE.md), [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md) e [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups).
