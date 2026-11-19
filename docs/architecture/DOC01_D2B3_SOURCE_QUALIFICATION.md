# DOC-01/D2b3a — Qualificazione delle fonti didattiche per la documentazione

19 novembre 2026. Base develop `93542e06975c09f5fdafd375d72dde927fa2669d`. Registro Docente #357, `f17302f9fffe1c39c08ccda3fd9e8367a0e50dc7`, 7/7 PASS. Raccordo con DOC-01 #171. Intervento esclusivamente di prova, senza modifiche del runtime.

## Fonti già presenti
Il Piano annuale governa blocchi, UDA, pacchetti, periodi e generazioni; la KB governa i documenti correnti indicizzati. Riusare `extractCanonicalUda`, `extractCanonicalPack`, `compileHumanTaskContentCandidate` e la provenienza nativa, non un nuovo parser o un secondo archivio. UDA: sezioni numerate, heading, contenuto, listItems. PACK: sezioni tipizzate (TASK_BRIEF, RUBRIC, TEACHER_GUIDE, STUDENT_SHEET, OBSERVATION_TOOL ecc.), materials, methodNote, evidence. I campi possono mancare; un titolo, un'attività o un ranking non equivalgono a un compito o a una metodologia espliciti. Il modello delle proiezioni Human Task è un derivato per blocco e non un documento annuale. Il registry develop include copertura parziale di seconda e terza; non inferire completezza dalle proiezioni della prima. Le 23 risorse PACK e i 25 collegamenti sono dichiarati nel documento di copertura storico, non un inventario live verificato.

## Mappa proposta
- Compiti significativi: sezione UDA esplicita o TASK_BRIEF pertinente, non qualsiasi prodotto/attività. Se le due fonti divergono, docente sceglie o motiva un raccordo.
- Metodologie: sezione UDA esplicita e/o methodNote del PACK pertinente, senza deduzioni dalle fasi.
- Strumenti e risorse: materials espliciti e risorse tipizzate, distinguere disponibilità da scelta e uso.
- Modalità di verifica: sezione UDA esplicita e/o strumento di verifica esplicitamente classificato e selezionato. Una rubrica descrive criteri, non dimostra una prova svolta; non generare quesiti mancanti.
- Rubriche/criteri ed evidenze previste: mantenere come fonti separate, non trasformare in valutazioni o osservazioni reali. D3 governa le evidenze.
- Conservare granularità UDA/blocco, classe, anno, disciplina, piano/generazione, sorgente asset/generazione corrente, sezione/voce, selezione e approvazione docente. Pacchetto condiviso non produce doppia imputazione; criteri collegiali non vengono derivati dalla fonte didattica. Solo contenuti professionali non personali, previa verifica. Nessun automatismo su campi riservati.

## Prove e limiti
Quattro prove sintetiche aggiunte alla suite canonica human-task-content-pipeline.test.ts già registrata: sezioni UDA esplicite, tipi e campi PACK, lacune non ricostruite, cambio generazione e gate HUMAN_REVIEW_REQUIRED. Nessun nuovo parser, nessun export o produttore operativo. Il candidato non promuove contenuti; non verifica adozione scolastica. Le prove non attestano qualità/completezza delle fonti reali, e la qualificazione exact-SHA è ancora necessaria. Non confondere disponibilità del meccanismo con trasferimento funzionante.

## Passo seguente
D2b3b: progettare il supplemento versionato del produttore già previsto dalle #770/#774/#775, ancora non integrate alla verifica corrente. Prima verificare gli esiti esatti e la disponibilità della fonte corrente; allineare i riferimenti UDA selezionati della proiezione V1 con asset/generazione e campi esplicitamente riesaminati, senza introdurre una via di export concorrente. Raccordo Registro D2a/D2b1: scelta esplicita, campi mancanti o da riesaminare, distinzione pianificato/svolto. Il contributo CdC rimane disciplinare. Il ciclo D3 può essere studiato separatamente, senza dipendenza da importazione curricolare non ancora autorizzata.

## Confini
Nessuna modifica runtime, fonte canonica, migrazione, dati reali, rete, persistenza, pubblicazione, merge o deploy. Nessun costo. Il gate operativo di Docente OS non viene superato da questa prova. Lo stato corrente di rilascio non è attestato: il riferimento PROJECT_STATUS_CURRENT.md indicato da PROJECT_HEALTH.md non era disponibile al ref verificato. Il lavoro resta test-only e non apre un ciclo di rilascio.