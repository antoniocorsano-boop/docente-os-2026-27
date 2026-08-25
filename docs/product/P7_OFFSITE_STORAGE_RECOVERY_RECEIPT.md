# DOCENTE OS — P7 Off-site Storage Recovery Receipt

Stato: **PASS REHEARSAL / PERSISTENT DESTINATION NOT YET APPROVED**

## Evidenza primaria

- PR implementazione: #197
- merge: `5f1c91030b921e1c495d88a6ff1b656290208dfe`
- workflow: `P7 Off-site Storage Recovery`
- run: `32842616571`
- head certificato: `9c792f4e6c98943f4c3c1414cde073f603587319`
- source job: `97785243034`
- restore job: `97785811124`

## Rehearsal verificato

Il gate usa due runner GitHub distinti e due stack Supabase Storage freschi.

1. Runner A crea un oggetto binario sintetico in Storage, ne verifica i byte e lo esporta in una copia indipendente.
2. La copia viene trasferita come GitHub Actions Artifact.
3. L'oggetto sorgente viene cancellato e la perdita viene verificata.
4. Lo stack Storage sorgente viene distrutto.
5. Runner B scarica l'artifact indipendente su un host distinto.
6. Viene avviato un nuovo stack Supabase Storage vuoto.
7. L'oggetto viene ripristinato dalla copia off-site di rehearsal.
8. Il file ripristinato viene nuovamente scaricato e confrontato byte-per-byte e tramite SHA-256.

Esito:

- separate runner boundary: **true**;
- fresh restore Storage service: **true**;
- source object deleted: **true**;
- source loss verified: **true**;
- binary restore verified: **true**;
- SHA-256 verified: **true**;
- byte length verified: **true**;
- byte length: `131071`;
- object SHA-256: `ab2f638970566aaf3f495b7a3860612f7bd91a2afe5d837e835a27f11ba811be`;
- artifact SHA-256: `139bac8e78baf46e4b9161f1ae294cde4ee76f86b437332c54a549200952c75d`.

## Isolamento

- dati esclusivamente sintetici;
- Beta toccato: **false**;
- Production toccata: **false**;
- dati professionali reali usati: **false**.

## Limite deliberato

L'artifact GitHub usato dal rehearsal ha retention di un giorno ed è una superficie di prova, non una destinazione approvata per futuri documenti professionali reali.

Per questo il risultato chiude la domanda tecnica «sappiamo esportare, perdere e ripristinare correttamente un oggetto binario Storage da una copia indipendente?» con **PASS**, ma non autorizza a usare GitHub Actions Artifact come backup operativo Production.

Resta da scegliere e configurare una destinazione off-site persistente, cifrata e privacy-appropriata prima dell'activation con dati reali.
