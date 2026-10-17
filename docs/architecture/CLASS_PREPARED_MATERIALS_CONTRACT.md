# Class Prepared Materials Contract

## Stato

**Versione 2 — MATERIAL-CORE-01.** Il contratto descrive come Docente OS presenta e riconferma i materiali didattici predisposti per una classe senza trasformare metadati legacy in verità canonica.

## Scopo

Un materiale predisposto per una classe resta un asset Knowledge con `contentCategory=TEACHING_RESOURCE` e `sourceMetadata.docenteOsResource=CLASS_LESSON_MATERIAL`. I metadati di importazione continuano a descrivere provenienza e contesto operativo, ma non costituiscono autorità di accettazione.

Il contratto separa quindi tre piani:

1. **evidenza storica/importata**, conservata in `KnowledgeAsset.sourceMetadata`;
2. **collegamento didattico canonico**, rappresentato da `LessonMaterialBindingV1` dentro una `LessonDesignExtension` accettata;
3. **verifica del contenuto**, risolta sulla versione Knowledge esatta mediante digest canonico.

## Metadati legacy: evidenza storica, non autorità

I campi già presenti restano conservati, inclusi quando disponibili:

- `provider`, `resourceKind`, `audience`, `targetDate`;
- `canonicalBlockId` e `canonicalBinding`;
- `classroomSteps` e `classroomSupport`;
- `approvalState`, inclusi i valori storici `PENDING_HUMAN` e `APPROVED`.

`approvalState=APPROVED` **non è autorità canonica** per lo stato corrente. Non viene cancellato né riscritto: resta evidenza storica della precedente procedura. Analogamente, `canonicalBlockId` è un indizio di lookup per ritrovare la lezione; non prova da solo che il materiale sia oggi accettato per quella lezione.

## Autorità canonica corrente

Un materiale è **Confermato** soltanto quando esistono congiuntamente:

- una `LessonDesignExtension` con stato `ACCEPTED` nel contesto esatto di spazio di lavoro, anno scolastico, sezione, asset del Piano canonico, generazione del Piano, blocco e proiezione;
- un payload tipizzato `LessonMaterialBindingV1`;
- un riferimento al contenuto esatto (`assetId`, `generationId`, `contentDigest`);
- una rilettura della stessa generazione Knowledge tramite il port canonico di sola lettura;
- una risoluzione del contenuto con stato **`READY`**, cioè digest coincidente e contenuto effettivamente verificabile.

Il provider esterno, il nome del file, l'URL o una stringa nei metadati non possono sostituire questa catena di evidenze.

## Proiezione per l'interfaccia

La presentazione usa tre soli stati professionali:

- **Predisposto** — non esiste ancora una binding canonica accettata e i metadati legacy non dichiarano una precedente approvazione;
- **Da riconfermare** — esiste una precedente indicazione legacy `APPROVED`, oppure esiste una binding tipizzata accettata la cui verifica corrente non è `READY`;
- **Confermato** — esiste una binding `LessonMaterialBindingV1` accettata e la risoluzione del contenuto esatto è `READY`.

Di conseguenza, una precedente `APPROVED` non viene promossa automaticamente a `Confermato`.

## Riconferma docente limitata

Quando l'evidenza legacy non è sufficiente, il cockpit **In classe** può offrire una riconferma esplicita e circoscritta al singolo materiale e alla singola lezione.

La riconferma:

- richiede un gesto esplicito del docente;
- richiede al docente di scegliere **funzione nella lezione**, **formato** e **destinatari**; nessuno di questi dati viene inferito dai metadati legacy;
- usa `canonicalBlockId` solo per ritrovare il blocco, quindi ricostruisce server-side Piano canonico e proiezione correnti;
- richiede una `currentGenerationId` Knowledge e calcola il digest sul contenuto realmente letto;
- passa attraverso il confine applicativo canonico di accettazione, che rilegge e verifica nuovamente il contenuto;
- scrive esclusivamente nello stato applicativo canonico già esistente delle `lesson_design_extensions`;
- non modifica `KnowledgeAsset.sourceMetadata` e quindi preserva la storia dell'importazione;
- è idempotente sul medesimo materiale, versione e contesto didattico;
- fallisce in modo chiuso quando versione o contenuto non sono verificabili.

Non sono previsti modifica massiva, migrazione distruttiva o **nessuna auto-conferma** dei record legacy.

## Contenuti non verificabili

Un materiale senza generazione Knowledge corrente, con generazione non riuscita, snapshot assente, identità incoerente o contenuto non verificabile non può diventare `Confermato`. L'interfaccia mantiene lo stato non canonico e richiede prima una versione Knowledge verificabile.

Questo principio impedisce di inventare digest, collegamenti provider o provenienze mancanti.

## Indipendenza dal provider

La conferma canonica dipende dal contenuto e dal contesto didattico, non dal fornitore. Eventuali campi provider nei metadati legacy o nella provenienza tipizzata sono descrittivi e non sono fonte di autorità.

## Vincoli invarianti

- nessun secondo store di accettazione;
- nessuna tabella nuova per la riconferma legacy;
- nessuna mutazione automatica dei metadati storici;
- nessuna deduzione di ruolo, formato o destinatari dal solo legacy;
- nessun `Confermato` senza binding accettata e contenuto `READY`;
- nessun provider esterno può promuovere autonomamente un materiale.
