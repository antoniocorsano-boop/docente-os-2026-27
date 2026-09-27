# DOS-TT-IMPORT-01 / G1.3 — Contratto governato di acquisizione e proposta

Stato: DRAFT — GOVERNANCE FIRST
Baseline: `develop@8cda35d2ea52fe442e71994c2fda90ea1559d2fc`
Dipendenza: G1.2 integrata; applicazione migrazioni in produzione non autorizzata da questo documento.

## 1. Scopo

G1.3 definisce il confine tra un documento di orario fornito dal docente e un nuovo **quadro orario settimanale candidato**. L'obiettivo è consentire a Docente OS di acquisire un documento istituzionale, individuare nel documento il docente richiesto, estrarre il suo quadro settimanale e proporlo per revisione senza alcuna scrittura implicita.

Flusso canonico:

`documento -> acquisizione -> selezione docente -> estrazione quadro settimanale -> normalizzazione strutturale -> proposta -> revisione docente -> piano esplicito -> G1.2 apply-to-draft`

Ogni passaggio prima dell'ultimo è non distruttivo. G1.3 non applica direttamente modifiche a `timetable_slots` e non modifica lezioni pianificate.

## 2. Invarianti

1. **Teacher-first.** Il docente mantiene la decisione finale. Nessuna estrazione equivale ad approvazione.
2. **No implicit write.** Upload, fotografia, PDF, ricerca del cognome, estrazione, normalizzazione, confronto e anteprima non modificano l'orario attivo né la bozza.
3. **Draft only.** L'unico confine di scrittura successivo resta `apply_timetable_import_to_draft(...)` di G1.2.
4. **Fonte istituzionale, non autorità automatica.** La provenienza del documento è conservata come evidenza; non attribuisce automaticamente stato definitivo.
5. **Provvisorietà esplicita.** Se la fonte è provvisoria, il candidato mantiene `source_is_provisional=true`; l'interfaccia deve renderlo percepibile prima della conferma.
6. **Cognome come selettore effimero.** Quando il documento contiene più docenti, l'utente può indicare il cognome/etichetta da cercare. Il valore serve a individuare la porzione pertinente della fonte e non diventa un attributo permanente dell'orario né viene conservato oltre quanto strettamente necessario alla revisione.
7. **Importazione strutturale, non specializzazione.** G1.3 acquisisce il quadro settimanale e non deve interpretare o imporre le personalizzazioni che Docente OS già consente sulle singole celle.
8. **Ambiguità visibile.** Valori strutturali incerti non vengono inventati: diventano `REVIEW_REQUIRED`/`UNRESOLVED` con evidenza e avviso.
9. **Identità separata.** L'identità del documento acquisito (`source_fingerprint`) è distinta dall'identità semantica del quadro settimanale candidato (`candidate_fingerprint`).
10. **Tracciabilità minimizzata.** Ogni riga proposta deve poter essere ricondotta all'evidenza minima necessaria tramite `evidence_ref`, senza trasformare il riferimento in un archivio parallelo della fonte.
11. **Completezza prima della sottrazione.** L'assenza di un elemento dalla fonte non autorizza neppure la proposta di rimozione finché ambito e completezza della porzione selezionata non sono attestati.
12. **Effettività esplicita e aperta.** Il nuovo quadro ha `effective_from`; G1.3 non richiede né inventa una data di termine. `effective_to` resta `null` finché una successiva versione dell'orario o altro confine governato ne determina la chiusura.
13. **Storia immutata.** L'introduzione di una nuova versione non riscrive la validità né lo stato delle attività anteriori alla sua entrata in vigore.
14. **Nessun DOS-A1.** G1.3 non autorizza capacità operative autonome.

## 3. Coerenza con l'orario esistente di Docente OS

Il modello corrente di Docente OS è già versionato: una `TimetableVersion` possiede `effectiveFrom` e `effectiveTo`, con `effectiveTo` nullable, e stati `DRAFT | ACTIVE | ARCHIVED`. Gli slot della versione sono celle settimanali ricorrenti. La griglia corrente permette inoltre al docente di aprire una cella e qualificarla/modificarla attraverso l'editor dell'orario.

G1.3 deve quindi **riusare** questo modello, non creare un secondo modello parallelo.

In particolare:

- il risultato dell'importazione è una nuova versione/bozza del quadro settimanale con `effective_from`;
- `effective_to` della nuova versione nasce `null`;
- la chiusura della versione precedente è responsabilità della transizione/attivazione governata, non dell'estrazione del documento;
- quando in futuro entrerà in vigore una nuova versione, il confine tra le versioni potrà determinare la fine della precedente senza chiedere oggi una data di termine sconosciuta;
- le opzioni di personalizzazione della cella restano responsabilità dell'editor dell'orario già esistente e non sono vincoli del parser G1.3.

## 4. Input ammessi e selezione del docente

G1.3 deve progettare un adattatore di acquisizione indipendente dal formato. Formati previsti:

- PDF testuale;
- immagine/fotografia;
- immagine derivata da scansione;
- tabella strutturata, se disponibile.

Il formato non deve modificare il contratto di uscita. Il parser specifico è sostituibile e versionato tramite `parser_version`.

Quando la fonte contiene più docenti:

1. il docente può fornire un `teacher_lookup_label` (tipicamente il cognome come appare nel documento);
2. il sistema cerca corrispondenze nella fonte;
3. una sola corrispondenza strutturalmente coerente può essere proposta;
4. zero corrispondenze o più corrispondenze plausibili producono `REVIEW_REQUIRED` e nessuna scelta silenziosa;
5. il valore digitato e le altre etichette nominative presenti nel documento non vengono trasferiti nel modello persistente dell'orario;
6. la receipt può registrare che la selezione è stata confermata dal docente senza conservare il cognome quando non necessario.

## 5. Semantica minima dell'importazione

G1.3 deve riconoscere **solo ciò che è necessario a costruire il quadro orario settimanale**:

- giorno della settimana;
- ordinal/fascia oraria;
- `start_time` e `end_time` quando disponibili o derivabili dalla scansione oraria verificata;
- classe/sezione o altra etichetta strutturale necessaria a identificare la cella;
- eventuale riferimento a un incarico già risolvibile in Docente OS;
- `effective_from` della nuova versione.

Non appartengono al contratto di importazione G1.3 le qualificazioni personali della singola cella, comprese distinzioni come teoria, disegno, disposizione o altre specializzazioni che il docente può effettuare successivamente nell'editor già presente.

La fonte può contenere abbreviazioni o annotazioni ulteriori: G1.3 non deve trasformarle in vincoli semantici se non sono necessarie per individuare correttamente la struttura del quadro. Possono essere ignorate oppure segnalate come informazione non importata, senza bloccare il caricamento quando la struttura è comunque determinabile.

## 6. Identità, fingerprint e idempotenza

G1.3 usa due impronte con scopi distinti.

### 6.1 `source_fingerprint`

Identifica la fonte acquisita per deduplicazione tecnica. Deve essere calcolata su una rappresentazione canonica del contenuto sorgente dopo sole trasformazioni tecniche dichiarate che non ne alterano il significato. Il formato e la versione dell'algoritmo devono essere registrati.

`source_fingerprint` non definisce equivalenza semantica: un PDF e una fotografia dello stesso orario possono avere impronte sorgente diverse.

### 6.2 `candidate_fingerprint`

Identifica la semantica normalizzata del **quadro settimanale strutturale**. La serializzazione canonica deve includere, in ordine deterministico:

- versione dello schema del candidato;
- `effective_from` quando risolto;
- `source_scope` canonico della porzione selezionata;
- `source_completeness` quando attestato;
- per ciascuna riga, ordinata per chiave temporale: giorno, ordinal/intervallo e identità strutturale della classe/sezione o incarico risolto.

Sono esclusi dal `candidate_fingerprint`:

- cognome/`teacher_lookup_label` e altre etichette nominative non necessarie;
- qualificazioni personali della cella;
- `confidence`, `evidence_ref`, coordinate/ritagli, diagnostica;
- timestamp di acquisizione, ordine originario delle righe e metadati del file;
- `effective_to`, che non appartiene al candidato G1.3.

`parser_version` è registrato nella provenance ma non entra nell'impronta semantica se produce lo stesso quadro canonico. La funzione di canonicalizzazione e l'algoritmo di hash devono essere versionati. A parità di quadro ed `effective_from`, PDF, immagine o tabella devono produrre lo stesso `candidate_fingerprint`.

## 7. Contratto di acquisizione ed estrazione

A livello di candidato sono governati almeno:

- `parser_version`;
- `source_fingerprint`;
- `candidate_fingerprint` dopo normalizzazione;
- `source_is_provisional`;
- `source_scope` — porzione della fonte attestata come riferita al docente selezionato e al periodo/settimana rappresentati, senza dati personali superflui;
- `source_completeness`: `COMPLETE | PARTIAL | UNKNOWN`;
- `source_completeness_provenance`;
- `effective_from`: data candidata oppure `null`;
- `effective_from_provenance`;
- `effective_from_review_state`: `AUTO_RESOLVED | REVIEW_REQUIRED`.

**Non esiste un `effective_to` richiesto dal candidato G1.3.**

Se `effective_from` manca, è ambiguo o è soltanto dedotto da contesto non governato, deve essere `null` con `REVIEW_REQUIRED`. Il docente può risolverlo esplicitamente prima della generazione del piano. Nessuna data viene assunta dalla data di caricamento.

Per ogni cella/riga rilevante l'estrattore produce almeno:

- `source_row_key` stabile nella stessa fonte;
- giorno della settimana candidato;
- ordinal/ora candidato;
- `start_time` e `end_time` quando disponibili o derivabili da una griglia verificata;
- etichetta classe originale minimizzata;
- eventuale `resolved_section_id`;
- eventuale `resolved_assignment_id`;
- `confidence`: `HIGH | MEDIUM | LOW | UNRESOLVED`;
- `review_state`: `AUTO_RESOLVED | REVIEW_REQUIRED`;
- `evidence_ref`;
- `warnings[]` strutturati.

`AUTO_RESOLVED` significa soltanto che il sistema dispone di evidenza sufficiente per proporre la struttura; non equivale a conferma del docente.

## 8. Evidenza, minimizzazione e retention

`evidence_ref` è un riferimento opaco a un'evidenza minimizzata, non il contenuto della fonte. Può riferire, secondo necessità, coordinate/pagina/cella nella fonte ancora disponibile, un estratto testuale minimo o una decisione esplicita del docente.

Regole obbligatorie:

1. non conservare ritagli o testo più ampi di quanto necessario alla revisione;
2. non duplicare il documento sorgente dentro l'evidenza;
3. eliminare o rendere non risolvibile l'evidenza derivata dalla fonte quando termina la retention, salvo la minima receipt decisionale necessaria;
4. la receipt può conservare valori canonici e decisioni, ma non il documento/ritaglio originario;
5. la durata concreta della fonte e degli estratti deve essere configurata e documentata prima della materializzazione;
6. dopo l'eliminazione della fonte, distinguere `EVIDENCE_EXPIRED` da evidenza mai esistita;
7. `teacher_lookup_label` e le altre etichette nominative non devono sopravvivere alla finestra necessaria alla selezione/revisione salvo necessità esplicita e governata.

## 9. Regole di risoluzione

Una riga può essere `AUTO_RESOLVED` solo quando gli elementi **strutturali** necessari sono deterministici rispetto alla fonte e al contesto Docente OS.

Deve essere `REVIEW_REQUIRED` quando si verifica almeno una delle condizioni seguenti:

- selezione del docente assente o ambigua;
- classe non risolta univocamente quando necessaria;
- orario/posizione non determinabile;
- più incarichi compatibili quando l'incarico è necessario;
- fonte parziale, tagliata o visivamente ambigua;
- valore strutturale con confidenza inferiore alla soglia governata;
- `effective_from` mancante o ambiguo.

Annotazioni della fonte relative a specializzazioni della cella non generano di per sé `REVIEW_REQUIRED` se il quadro strutturale è determinabile.

## 10. Confronto con la bozza e rimozioni

Il comparatore è puro: riceve candidato + snapshot della bozza e restituisce una proposta di differenze strutturali. Non scrive sul database dell'orario.

Categorie:

- `UNCHANGED` -> `KEEP`;
- `NEW` -> `ADD`;
- `MOVED` -> `MOVE`;
- `CHANGED` -> `CHANGE`;
- `MISSING_FROM_SOURCE` -> stato informativo;
- `AMBIGUOUS` -> nessuna operazione applicabile;
- `IGNORED` -> `IGNORE`.

`MISSING_FROM_SOURCE` può diventare proposta `REMOVE` soltanto quando `source_completeness = COMPLETE`, la completezza è attestata, lo slot appartiene integralmente a `source_scope`, non esistono ambiguità pertinenti e le revisioni sono correnti. Con `PARTIAL`, `UNKNOWN` o fuori scope resta informativo. Anche quando proponibile, `REMOVE` richiede conferma esplicita.

## 11. Validità temporale e storia

Il quadro importato definisce una nuova versione con **inizio di validità** e termine aperto:

- `effective_from` è obbligatorio prima dell'applicazione;
- `effective_to = null` per la nuova versione finché non esiste un successivo confine governato;
- G1.3 non chiede all'utente di prevedere quando l'orario terminerà;
- l'arrivo di un successivo orario, provvisorio o definitivo, fornirà un nuovo `effective_from`; la transizione potrà chiudere coerentemente l'intervallo della versione precedente;
- in assenza di una versione successiva, la validità può proseguire fino al confine dell'anno/attività didattica definito dal modello temporale generale, senza inventare oggi una data nel documento importato;
- nessuna operazione G1.3 modifica retroattivamente celle, lezioni o stati anteriori a `effective_from`.

La **ripianificazione delle lezioni future** conseguente a una nuova versione è un problema distinto dal parsing/importazione. Deve essere governata da un confine successivo: preservare identità e contenuto delle lezioni già pianificate, lasciare intatta la storia precedente a `effective_from` e sottoporre al docente i conflitti non deterministici. G1.3 non implementa né autorizza tale ripianificazione.

## 12. Anteprima docente

Prima del piano applicabile l'interfaccia deve mostrare in forma compatta:

- fonte e stato provvisorio/definitivo dichiarato;
- conferma della porzione/docente individuato senza persistenza nominativa superflua;
- ambito e completezza (`COMPLETE/PARTIAL/UNKNOWN`);
- `effective_from` e relativo stato di revisione;
- numero di celle riconosciute;
- invariati, aggiunti, spostati, modificati, mancanti e ambigui;
- per ogni differenza, valore attuale -> valore proposto;
- motivazione/evidenza per gli elementi ambigui;
- controllo esplicito del docente sugli elementi da revisionare;
- avviso specifico prima di qualsiasi `REMOVE`.

Le specializzazioni personali della cella non devono appesantire questa anteprima.

## 13. Piano applicabile

Solo dopo la revisione viene prodotto il `p_operations` consumabile da G1.2.

Il generatore fallisce chiuso se:

- esistono elementi strutturali `REVIEW_REQUIRED` non risolti o `UNRESOLVED`;
- `effective_from` è nullo o ancora `REVIEW_REQUIRED`;
- manca una disposizione necessaria per una riga candidata;
- una rimozione non è stata esplicitamente confermata;
- una rimozione deriva da fonte `PARTIAL`, `UNKNOWN` o fuori `source_scope`;
- candidato o bozza sono cambiati dopo l'anteprima.

## 14. Casi di prova governati G1.3

La materializzazione successiva deve trasformare almeno questi casi in fixture/golden/reference evidence eseguibili:

1. documento con più docenti + cognome univoco -> porzione corretta proposta;
2. cognome assente -> `REVIEW_REQUIRED`;
3. cognome con più corrispondenze plausibili -> nessuna scelta automatica;
4. `teacher_lookup_label` non persistito nel modello dell'orario;
5. PDF testuale leggibile -> quadro settimanale strutturale;
6. immagine dello stesso orario -> quadro semanticamente equivalente;
7. annotazioni come teoria/disegno/disposizione non necessarie alla struttura -> non bloccano l'importazione e non diventano vincoli del candidato;
8. classe univoca -> risoluzione proposta;
9. classe ambigua -> revisione richiesta;
10. riga senza fascia determinabile -> non applicabile;
11. intervallo temporale invalido -> rigetto;
12. fonte provvisoria -> indicatore preservato;
13. stessi byte -> stesso `source_fingerprint`;
14. formati diversi ma stesso quadro -> stesso `candidate_fingerprint` a parità di `effective_from`;
15. cambiamento strutturale -> nuovo `candidate_fingerprint`;
16. cambio di sola evidenza/confidenza -> fingerprint invariato;
17. evidenza minima, nessuna duplicazione della fonte;
18. fonte eliminata -> `EVIDENCE_EXPIRED`, receipt minima preservata;
19. confronto invariato -> `KEEP`;
20. nuova cella -> `ADD`;
21. spostamento -> `MOVE`;
22. variazione strutturale -> `CHANGE`;
23. assenza da fonte `UNKNOWN/PARTIAL` -> nessun `REMOVE`;
24. assenza da fonte `COMPLETE` ma fuori scope -> nessun `REMOVE`;
25. assenza da fonte completa, dentro scope, senza ambiguità -> `REMOVE` proponibile ma non preselezionata;
26. `REMOVE` senza conferma -> piano bloccato;
27. mutazione bozza dopo anteprima -> conflitto;
28. mutazione candidato dopo anteprima -> conflitto;
29. acquisizione/anteprima non modifica `timetable_slots`;
30. nessun percorso alternativo bypassa `apply_timetable_import_to_draft(...)`;
31. errore parser -> candidato non READY e feedback comprensibile;
32. `effective_from` univoco -> proposta con provenance;
33. `effective_from` assente/ambiguo -> `null + REVIEW_REQUIRED`, nessuna inferenza dalla data di caricamento;
34. risoluzione esplicita di `effective_from` -> provenance decisionale;
35. nuova versione -> `effective_to = null` senza richiesta di data finale;
36. successivo orario -> il nuovo `effective_from` fornisce il confine necessario alla successiva transizione, senza riscrivere la storia;
37. attività anteriori a `effective_from` -> nessuna modifica di collocazione o stato da G1.3;
38. personalizzazione esistente della cella -> fuori dal dominio del parser G1.3;
39. quadro importato -> compatibile con il modello `TimetableVersion`/slot già esistente;
40. nessuna ripianificazione di lezioni future eseguita implicitamente durante acquisizione/anteprima.

## 15. Non-obiettivi G1.3

Non sono autorizzati:

- applicazione delle migrazioni G1.2 in produzione;
- attivazione automatica del nuovo orario;
- interpretazione obbligatoria delle personalizzazioni delle celle;
- richiesta/invenzione di `effective_to` per il nuovo orario;
- ripianificazione implicita delle lezioni future;
- pubblicazione o sincronizzazione autonoma;
- modifica automatica di calendario, lezioni o programmazioni;
- DOS-A1;
- conservazione indiscriminata del documento sorgente o dei nominativi presenti.

## 16. Gate per la materializzazione

Prima di implementare parser/interfaccia/runtime devono essere verificati:

- compatibilità con il modello corrente `TimetableVersion` + slot e con G1.2;
- selezione nominativa effimera e minimizzazione;
- schema/versionamento di fingerprint e canonicalizzazione;
- retention/expiry dell'evidenza;
- `source_scope` e `source_completeness`;
- provenance/review di `effective_from`;
- `effective_to` non richiesto in G1.3 e chiusura demandata alla transizione di versione;
- assenza di scritture implicite;
- accessibilità e comportamento smartphone dell'anteprima;
- materializzazione eseguibile dei casi 1–40;
- definizione separata del contratto di transizione/ripianificazione prima di qualunque modifica automatica alle lezioni future;
- nuova review indipendente sul nuovo exact head finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN** fino al completamento dei gate e alla decisione umana prevista dalla governance.
