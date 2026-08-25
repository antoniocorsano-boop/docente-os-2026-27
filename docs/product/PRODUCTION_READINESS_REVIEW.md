# DOCENTE OS — Production Readiness Review

Stato: **REVIEW CURRENT / INACTIVE PRODUCTION PROVISIONED / ACTIVATION HOLD**

Questa review distingue la chiusura dei rehearsal tecnici di recovery dall'autorizzazione a usare Production con dati professionali reali.

## Decisione corrente

- **Production activation:** HOLD.
- **Inactive Production provisioning:** COMPLETE.
- **Scope futuro autorizzabile:** `SINGLE_OWNER_PILOT` / `named_owner_only`.
- **Real user data accepted:** false.
- **Production e Beta:** separati per applicazione, Supabase, DB, Auth, Storage e segreti.

## Evidenze soddisfatte

- P7-A: contratto Beta → Production e gate `production-promotion/contract`.
- P7-B: topologia Production separata.
- P7-C: specifica infrastrutturale e gate `production-infrastructure/spec`.
- P7-E: Render / Frankfurt.
- P7-F: Supabase Production separato, schema-ready e senza dati applicativi reali.
- P7-F2: Render Production provisionato inattivo; `Production Runtime Smoke` run `32836204567`: PASS.
- `DB_LOGICAL_RESTORE`: PASS, run `32837945388`.
- `SUPABASE_AUTH_SERVICE_RECOVERY`: PASS, run `32841165988`.
- `INCIDENT_ESCALATION_MINIMUM`: PASS; rehearsal issue #193 owner-visible e chiuso `completed`.
- `OFFSITE_STORAGE_RECOVERY_REHEARSAL`: **PASS**, run `32842616571`.

Il rehearsal Storage ha usato due runner GitHub distinti e due stack Supabase Storage freschi. Il runner A ha creato e verificato un oggetto binario sintetico, ne ha prodotto una copia indipendente, ha cancellato la sorgente e distrutto lo stack. Il runner B ha scaricato la copia su un host diverso, avviato un nuovo Storage vuoto, ripristinato l'oggetto e verificato byte e SHA-256.

Evidenza Storage:

- source job `97785243034`: PASS;
- restore job `97785811124`: PASS;
- confine tra runner distinti: verificato;
- source loss: verificata;
- fresh restore Storage: verificato;
- binary restore: verificato;
- byte length: `131071`;
- SHA-256 oggetto: `ab2f638970566aaf3f495b7a3860612f7bd91a2afe5d837e835a27f11ba811be`;
- Beta/Production toccati: false;
- dati reali usati: false.

Ricevute canoniche:

- `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`;
- `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`;
- `docs/product/P7_INCIDENT_ESCALATION_REHEARSAL_RECEIPT.md`;
- `docs/product/P7_SUPABASE_AUTH_RECOVERY_RECEIPT.md`;
- `docs/product/P7_OFFSITE_STORAGE_RECOVERY_RECEIPT.md`.

## Blocker prima dell'attivazione con dati reali

Il percorso tecnico di backup/perdita/restore Storage è provato. Resta **un solo blocker operativo di destinazione**:

### Off-site Storage persistent destination

Stato: **NOT CONFIGURED / BLOCKER**.

L'artifact GitHub usato dal rehearsal ha retention di un giorno ed è deliberatamente una superficie di prova. Non è approvato come deposito operativo di documenti professionali reali.

Prima dell'activation occorre scegliere, configurare e verificare una destinazione off-site:

- persistente;
- cifrata;
- indipendente dal Supabase Production;
- privacy-appropriata per i dati professionali previsti;
- con retention e accesso controllati;
- con restore verificabile.

## Recovery tecnici chiusi

- `DB_LOGICAL_RESTORE` — **PASS**.
- `SUPABASE_AUTH_SERVICE_RECOVERY` — **PASS**.
- `OFFSITE_STORAGE_RECOVERY_REHEARSAL` — **PASS**.
- `INCIDENT_ESCALATION_MINIMUM` — **PASS**.

La prova Storage non autorizza l'uso di GitHub Actions Artifact come backup Production reale.

## Watch non bloccanti per il pilot

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion dopo evidenza sufficiente di export/recovery.

## Stato di promozione applicativa

La Production inattiva durante il runtime smoke serviva il commit applicativo `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`. Production non segue automaticamente `develop`: ogni allineamento richiede SHA immutabile certificato e decisione umana esplicita.

## Regola operativa

Nessun elemento di questa review autorizza:

- uso di dati reali;
- migrazione automatica Beta → Production;
- riuso di credenziali Beta;
- signup pubblico;
- onboarding multi-tenant;
- auto-deploy Production;
- ampliamento delle write capability AI.

## Prossimo gate

`P7-OFFSITE-STORAGE-DESTINATION`: scegliere e verificare la destinazione off-site persistente e privacy-appropriata.

Dopo quel gate servirà una nuova review e una **decisione umana esplicita** prima di qualsiasi activation del pilot. Production resta **HOLD**.
