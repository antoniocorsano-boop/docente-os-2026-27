# P7 — Off-site Storage Persistent Destination

**Esito:** PASS_WITH_RESIDUAL

La destinazione persistente off-site per i backup Storage è ora configurata e provata su **Cloudflare R2**, bucket privato `docente-os-backup-eu`, giurisdizione **EU**.

## Evidenza certificata

Workflow: **P7 Off-site Storage Destination**  
Run: **32888249839**  
Head: `acb1ae25654bb94d3df31500973531f49d2a09ec`

- `export-to-r2` — PASS — job `97933720676`
- `restore-from-r2` — PASS — job `97934645052`
- mezzo off-site dichiarato e verificato: `CLOUDFLARE_R2_EU_PERSISTENT`
- sorgente Storage effimera distrutta prima del restore
- copia locale del runner rimossa dopo l'upload
- secondo runner indipendente usato per il download
- Storage di restore fresco
- verifica binaria, byte length e SHA-256 — PASS
- byte length: `131071`
- SHA-256: `76e1460fbc7ca78e0f86c2aad8b7dd93b9cac0d2372f032f30c1e790301575f7`
- oggetti sintetici della prova rimossi al termine

## Sicurezza

La prova ha usato esclusivamente dati sintetici. Beta e Production non sono state toccate e nessun dato professionale reale è stato utilizzato. Le credenziali R2 restano esterne al repository e limitate al bucket dedicato.

## Residuo

`OFFSITE_STORAGE_PERSISTENT_DESTINATION` non è più un blocker.

Resta un solo blocker operativo prima di una decisione umana di attivazione:

`OFFSITE_STORAGE_RETENTION_LOCK = NOT_CONFIGURED`

Occorre configurare e verificare una politica esplicita di retention/Bucket Lock sul bucket R2 prima di autorizzare dati professionali reali.

**Production Activation resta HOLD.**
