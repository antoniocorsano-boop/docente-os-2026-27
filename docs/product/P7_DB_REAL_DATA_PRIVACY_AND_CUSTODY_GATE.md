# P7 — Classificazione prudenziale dei dati e autorizzazione alla copia reale

**Data:** 06/11/2026  
**Progetto candidato:** `gnshgapmwyjamhmlikeg` (Beta Docente OS)  
**Esito:** `RB-02=HOLD / DATA_TREAT_AS_PERSONAL_PENDING_ATTESTATION / REAL_BACKUP_FORBIDDEN`

## RB-02 — Esame dei controlli R2 successivo alla verifica UE

**Verifiche confermate dall'utente (06/11/2026):** progetto personale, dati reali propri dichiarati, bucket `docente-os-backup-eu` con giurisdizione **Unione europea**, URL pubblico di sviluppo disabilitato e nessun dominio personalizzato. Nessun record personale è stato esaminato.

**Evidenza tecnica verificata sul ramo main:** il workflow `.github/workflows/p7-db-r2-main-certification.yml` utilizza R2 esclusivamente quando avviato manualmente da `main` per dati sintetici. Le credenziali non sono disponibili nelle richieste di modifica. Lo script `.github/scripts/p7-db-r2-main-synthetic-rehearsal.sh` usa il prefisso `rehearsal/`, non `production/`, e verifica l'eliminazione dell'oggetto fittizio dopo il test.

### Condizioni ancora da attestare

| Verifica | Evidenza necessaria | Stato |
|---|---|---|
| Giurisdizione R2 UE | Impostazioni del contenitore, conferma umana | PASS |
| Esposizione pubblica | URL di sviluppo disabilitato e assenza di domini | PASS visivo |
| Regola di blocco degli oggetti | Screenshot del 06/11/2026: regola `production-backup-90d` comparsa nell'elenco alle 15:48; riapertura dal menu della regola esistente alle 15:52 con interruttore abilitato, prefisso esatto `production/`, durata `90` giorni. Controllo **visivo della configurazione salvata**; non è stata effettuata una prova di immutabilità su un oggetto reale. | `RB02_R2_BUCKET_LOCK_SAVED_CONFIG=PASS_VISUAL / OBJECT_LOCK_EFFECTIVENESS=NOT_TESTED` |
| Regola di scadenza | Presenza di una regola di ciclo di vita per lo stesso prefisso e durata approvata | NON VERIFICATA |
| Permessi del processo R2 | Conferma di autorizzazione limitata al contenitore richiesto e assenza di privilegi amministrativi non necessari | NON VERIFICATI |
| Condizioni e conservazione dei dati personali | Ricevuta di decisione personale con perimetro e durata | NON APPROVATA |
| Recupero crittografico indipendente | Recupero su secondo Android e custodia della password cartacea in luogo separato, attestati dal custode il 07/11/2026 | `RB-03=PASS_CUSTODIAN_ATTESTED` |

**Distinzione tecnica:** una regola di blocco impedisce l'eliminazione anticipata, ma non prova la cancellazione automatica alla sua scadenza. Una regola di ciclo di vita separata può definire la cancellazione, nel rispetto del blocco. La regola è stata verificata anche riaprendone il dettaglio dall'elenco: nome, prefisso completo, durata e interruttore sono coerenti con la configurazione prevista. La prova **visiva** non dimostra tuttavia l'effettiva resistenza alla cancellazione/sovrascrittura su oggetti reali, né la presenza di una regola di scadenza automatica.

**Controllo richiesto:** leggere soltanto le sezioni delle impostazioni R2 relative a regole di blocco e ciclo di vita degli oggetti. Non modificare o rimuovere regole, non aprire credenziali, non avviare upload di dati reali.

**Fonti tecniche:** https://developers.cloudflare.com/r2/buckets/bucket-locks/ e https://developers.cloudflare.com/r2/buckets/object-lifecycles/ .

**Esito complessivo RB-02:** HOLD, anche con giurisdizione UE confermata. Nessuna esportazione reale è autorizzata.

---

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

## 3. Custodia della chiave — collaudo completato dal custode (07/11/2026)

L'utente ha successivamente **scelto di usare Termux su due smartphone Android sotto il proprio controllo**, superando la precedente preferenza per il percorso senza Termux. Il programma `age-keygen` del primo telefono presentava un errore; il collaudo interoperabile con `rage-keygen` e `age` è stato eseguito con dati sintetici e ha avuto esito PASS. La chiave privata permanente è custodita nella directory privata del primo smartphone; una copia cifrata `recovery.age` è stata trasferita al secondo. L'utente ha confermato la decifratura autonoma della copia e del testo sintetico di verifica sul secondo dispositivo e, il 07/11/2026, **la conservazione cartacea separata della password**.

**Esito:** `RB-03=PASS_CUSTODIAN_ATTESTED`, con grado di prova esplicitamente basato su screenshot e attestazioni dell'utente. La prova non è una verifica remota dei dispositivi né dimostra la custodia a tempo indeterminato; preservare almeno una copia di recupero cifrata sul secondo smartphone e non esportare mai l'identità privata in chiaro. Le credenziali, la password e la chiave privata non sono state acquisite dal repository.

**Separazione dei requisiti:** il PASS di RB-03 non attribuisce al custode autorizzazioni ulteriori a esportare dati personali/scolastici. `RB-02=HOLD`, fino alla decisione sul trattamento, sulla destinazione R2, sui privilegi e sulla durata di conservazione. `RB-04/05=HOLD` fino alla qualifica tecnica dei processi reali. Il documento di riferimento per i dettagli di custodia resta [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md).

## 4. Stato dei controlli

| Controllo | Esito |
|---|---|
| Collegamento URL pubblico configurato Render Beta→Supabase | `RB-01=PASS_RENDER_PUBLIC_CONFIG` |
| Classificazione prudenziale del contenuto | `ASSUMED_PROTECTED`, senza leggere contenuti |
| Autorizzazione per backup reale su R2 | **RB-02 HOLD** |
| Generazione, custodia e recupero della chiave privata | **RB-03 PASS_CUSTODIAN_ATTESTED** (07/11/2026) |
| Perimetro completo, credenziali di lettura e procedure di recupero | **RB-04/05 HOLD** |
| Copia reale cifrata e ripristino indipendente | **RB-06/07 NON ESEGUITI** |
| Revisione e autorizzazione alla migrazione 0104 | **RB-08 HOLD** |

Non effettuare export Supabase, upload di copie reali su R2, migrazione `0104`, merge su `develop` o deploy Beta a seguito di questo documento.

**Riferimenti:** [P7_DB_REAL_BACKUP_ACTIVATION_GATE.md](./P7_DB_REAL_BACKUP_ACTIVATION_GATE.md), [P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md](./P7_DB_KEY_CUSTODY_RECOVERY_PROTOCOL.md) e [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups).
