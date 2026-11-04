# CURR-DELIVERY-02 — Lettura governata della release Arena, senza file sul dispositivo

**Stato:** implementazione applicativa in bozza; canale di pubblicazione **non ancora configurato**. Coordinamento: TRAMA [#302](https://github.com/antoniocorsano-boop/trama-ecosistema/issues/302) e [#301](https://github.com/antoniocorsano-boop/trama-ecosistema/issues/301). Dipende dalla PR Docente OS #786.

## Fonte e autorità

L'unico riferimento di lavoro è il master Arena `CAN-CURR-MASTER-00@1.3`, revisione **27**, **PROVVISORIO / NON VIGENTE / NON APPROVATO**. La release completa già emessa e collaudata separatamente in Arena ha:
- versione 1.3, 113 segmenti, 566 nodi, 103 collegamenti;
- identificativo dichiarato Arena `ics-lorenzo-milani`, **non prova di attestazione del workspace**;
- impronta contenuto `fnv1a:99c4ccc3`, impronta strutturale `8588371c`;
- **SHA-256 esatto del file integrale:** `de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809` (ricevuta Arena PR #350).

L'SHA-256 è il controllo crittografico del file esatto già qualificato; l'impronta strutturale FNV-1a è un controllo di coerenza del contratto e **non** sostituisce la prova di origine. Nessun testo integrale del master né file della release viene copiato nel repository.

## Contratto di lettura dell'applicazione

L'adattatore server `readProvisionalArenaReferenceForClass` usa esclusivamente la sessione Supabase dell'utente: **nessuna chiave segreta o service role**. Le variabili d'ambiente del **solo server** sono:

- `ARENA_VERTICAL_RELEASE_BUCKET`: nome di un bucket Supabase Storage **privato, autorizzato e protetto da policy RLS**;
- `ARENA_VERTICAL_RELEASE_OBJECT_KEY`: percorso interno di un oggetto immutabile della release completa, non URL;
 
Non sono precompilate: il codice **non sostiene che l'archivio esista**. In assenza di configurazione, la pagina mostra che la consegna automatica non è ancora disponibile. Il docente può comunque aprire il documento Drive e, dove previsto, verificare il file Arena sul proprio dispositivo.

### Gate di sola lettura

1. Sessione reale autenticata (non anonima), contesto workspace e anno corrente verificati.
2. La classe è presente nel workspace e l'assegnazione del docente collega esplicitamente **Tecnologia** a quella sezione.
3. Le variabili server sono impostate da un processo autorizzato e non dipendono da query string, file, stato del browser o richieste dell'utente.
4. Download mediante client Supabase di sessione e **RLS Storage**, senza bypass privilegiato.
5. Limite dimensionale 2 MB e corrispondenza **SHA-256 byte-per-byte** con il file Arena reale già collaudato.
6. Verifica integrale di schema, fonte, revisione, anno, impronte e 113 ambiti; applicabilità I **IN2025**, II/III **IN2012**.
7. Presentazione del solo segmento della classe come **PROVVISORIO / NON VIGENTE**; nessuna ricevuta, adozione o scrittura.
8. In caso di fonte assente, non leggibile, alterata o di identità di classe incoerente: **fallimento chiuso**. Non usare copie alternative non qualificate.

### Prerequisiti di pubblicazione non soddisfatti

- L'operatore di Arena deve autorizzare e materializzare un **mezzo di trasporto**, non una seconda fonte autorevole. Non pubblicare il master integralmente in GitHub o in un bucket pubblico.
- Configurare il bucket **privato** con controllo `storage.objects` per il minimo insieme di utenti/docenti autorizzati; verificare le negazioni fuori workspace. Un semplice `TO authenticated` **non** basta a delimitare l'accesso.
- Depositare soltanto il file originale della release già collaudata, verificando SHA-256 **prima e dopo** il trasferimento e registrando la ricevuta dell'operazione.
- Configurare lato server bucket e percorso esatto; nessuna chiave personale o servizio a pagamento obbligatorio.
- Verificare le autorizzazioni reali in Supabase e in una sessione docente, i casi consentiti/negati e i percorsi smartphone **senza file**.
- Completare le revisioni indipendenti, Human Product Review e gate exact-head prima di distribuire.

## Confini preservati

Il percorso ECO-02 2C, la baseline `7bb48175`, la ricevuta P7 del 21/09/2026, le tre estensioni e i materiali storici non sono modificati. L'identità `ics-lorenzo-milani` dichiarata nel file non è un'attestazione dell'istituto `AVIC849003`; il flusso istituzionale della PR #785 resta **separato e disabilitato**. Un curricolo provvisorio consultato dal docente non diventa vigente o adottato.
