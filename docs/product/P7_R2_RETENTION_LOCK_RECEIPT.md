# P7 — R2 Retention Lock Receipt

Stato: **PASS**

Gate: `OFFSITE_STORAGE_RETENTION_LOCK`

## Configurazione verificata

- provider: Cloudflare R2;
- bucket: `docente-os-backup-eu`;
- jurisdiction: EU;
- protected prefix: `production/`;
- policy: Bucket Lock;
- retention: 90 days.

## Evidenza runtime

Workflow `P7 R2 Retention Lock`, run `32891383829`, job `97943868034`: **PASS**.

Probe sintetico:

- key: `production/p7-retention-probe/32891383829/sentinel.bin`;
- byte length: `38`;
- SHA-256: `0f61c37e11d23342438df4d2b13a5da4e7d1f88e3378626ecd899090f7623e06`.

Sono stati verificati:

- upload iniziale consentito;
- sovrascrittura rifiutata da R2 con `ObjectLockedByBucketPolicy`;
- cancellazione rifiutata da R2 con `ObjectLockedByBucketPolicy`;
- oggetto originale ancora leggibile dopo i tentativi bloccati;
- byte e SHA-256 invariati.

## Safety

- dati sintetici soltanto;
- Beta non toccata;
- Production applicativa non toccata;
- nessun dato professionale reale usato;
- nessuna activation autorizzata.

Il probe resta intenzionalmente trattenuto dalla policy per il periodo configurato.
