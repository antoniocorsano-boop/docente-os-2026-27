# DOS-TT-IMPORT-01 / G1.3 — Contratto governato di acquisizione e proposta

Stato: DRAFT — GOVERNANCE FIRST
Baseline: `develop@8cda35d2ea52fe442e71994c2fda90ea1559d2fc`
Dipendenza: G1.2 integrata; applicazione migrazioni in produzione non autorizzata da questo documento.

## 1. Scopo

G1.3 definisce il confine tra un documento di orario fornito dal docente e il candidato governato già materializzato da G1.2. L'obiettivo è consentire a Docente OS di acquisire un nuovo orario, estrarne una proposta verificabile e mostrare le differenze rispetto alla bozza corrente, senza alcuna scrittura implicita.

Flusso canonico:

`fonte -> acquisizione -> estrazione -> normalizzazione -> proposta -> revisione docente -> piano esplicito -> G1.2 apply-to-draft`

Ogni passaggio prima dell'ultimo è non distruttivo. G1.3 non applica direttamente modifiche a `timetable_slots`.

## 2. Invarianti

1. **Teacher-first.** Il docente mantiene la decisione finale. Nessuna estrazione equivale ad approvazione.
2. **No implicit write.** Upload, fotografia, PDF, estrazione, normalizzazione, confronto e anteprima non modificano l'orario attivo né la bozza.
3. **Draft only.** L'unico confine di scrittura successivo resta `apply_timetable_import_to_draft(...)` di G1.2.
4. **Fonte istituzionale, non autorità automatica.** La provenienza del documento è conservata come evidenza; non attribuisce automaticamente stato definitivo.
5. **Provvisorietà esplicita.** Se la fonte è provvisoria, il candidato mantiene `source_is_provisional=true`; l'interfaccia deve renderlo percepibile prima della conferma.
6. **Minimizzazione.** Non persistere nomi del docente ricavati dalla fonte quando non necessari al contratto. Nessun `source_teacher_label`.
7. **Ambiguità visibile.** Valori incerti non vengono inventati: diventano `REVIEW_REQUIRED`/`UNRESOLVED` con evidenza e avviso.
8. **Identità separata.** L'identità del documento acquisito (`source_fingerprint`) è distinta dall'identità semantica del candidato normalizzato (`candidate_fingerprint`).
9. **Tracciabilità minimizzata.** Ogni riga proposta deve poter essere ricondotta all'evidenza minima necessaria tramite `evidence_ref`, senza trasformare il riferimento in un archivio parallelo della fonte.
10. **Completezza prima della sottrazione.** L'assenza di un elemento dalla fonte non autorizza neppure la proposta di rimozione finché ambito e completezza della fonte non sono attestati.
11. **Effettività esplicita.** La data da cui l'orario dovrebbe valere è dato governato, con provenienza e stato di revisione; non viene inferita silenziosamente.
12. **Nessun DOS-A1.** G1.3 non autorizza capacità operative autonome.

## 3. Input ammessi

G1.3 deve progettare un adattatore di acquisizione indipendente dal formato. Formati previsti:

- PDF testuale;
- immagine/fotografia;
- immagine derivata da scansione;
- tabella strutturata, se disponibile.

Il formato non deve modificare il contratto di uscita. Il parser specifico è sostituibile e versionato tramite `parser_version`; le regole contestuali della fonte sono versionate tramite `source_profile_version`.

## 4. Vocabolario minimo dell'orario

La normalizzazione deve distinguere almeno:

- `LESSON` — lezione associabile a un incarico didattico;
- `CLASS_PRESENCE` — presenza in classe non rappresentabile correttamente come normale lezione;
- `DISPOSITION` — disposizione;
- `RECEPTION` — ricevimento;
- `OTHER` — attività riconosciuta ma non classificabile nelle precedenti categorie.

Le abbreviazioni della fonte sono **dati di input**, non valori canonici. Per il caso reale corrente:

- `T` indica **teoria** e, quando associata a classe/disciplina coerenti, confluisce normalmente in `LESSON`;
- `D` indica **sostegno** nel documento corrente e non deve essere interpretato automaticamente come una generica lettera D: l'associazione deve essere supportata dall'evidenza della fonte e dal contesto;
- `DIS` indica **disposizione** e normalizza in `DISPOSITION`.

Le regole di abbreviazione devono essere configurabili per profilo della fonte e non codificate come assunzioni universali.

## 5. Identità, fingerprint e idempotenza

G1.3 usa due impronte con scopi distinti.

### 5.1 `source_fingerprint`

Identifica i byte/logica della fonte acquisita per deduplicazione tecnica. Deve essere calcolata su una rappresentazione canonica del contenuto sorgente dopo sole trasformazioni tecniche dichiarate che non ne alterano il significato (per esempio normalizzazione deterministica dei metadati di trasporto). Il formato e la versione dell'algoritmo devono essere registrati.

`source_fingerprint` **non** definisce equivalenza semantica: un PDF e una fotografia dello stesso orario possono avere impronte sorgente diverse.

### 5.2 `candidate_fingerprint`

Identifica la semantica normalizzata del candidato e consente di riconoscere acquisizioni semanticamente equivalenti anche provenienti da formati diversi. La serializzazione canonica deve includere, in ordine deterministico:

- versione dello schema del candidato;
- `source_profile_version` che governa le abbreviazioni/interpretazioni;
- `effective_from` quando risolto;
- `source_scope` canonico;
- `source_completeness` quando attestato;
- per ciascuna riga, ordinata per chiave temporale e identità canonica: giorno, ordinal/intervallo, `proposed_slot_kind`, identificatori risolti necessari (`resolved_section_id`, `resolved_assignment_id`) oppure etichette minimizzate quando l'identificatore non esiste, e attributi canonici necessari per `CLASS_PRESENCE`.

Sono esclusi dal `candidate_fingerprint` i dati non semantici o instabili: `confidence`, `evidence_ref`, coordinate/ritagli, messaggi diagnostici, timestamp di acquisizione, ordine originario delle righe e metadati del file.

`parser_version` è registrato nella provenance ma non entra nell'impronta semantica se produce esattamente lo stesso candidato canonico; `source_profile_version` entra invece nell'impronta perché può modificare il significato delle abbreviazioni.

La funzione di canonicalizzazione e l'algoritmo di hash devono essere versionati. A parità di schema/profilo e semantica, PDF, immagine o tabella devono produrre lo stesso `candidate_fingerprint`. Un cambiamento semantico deve produrre un'impronta diversa.

## 6. Contratto di acquisizione ed estrazione

A livello di candidato sono governati almeno:

- `parser_version`;
- `source_profile_version`;
- `source_fingerprint`;
- `candidate_fingerprint` dopo normalizzazione;
- `source_is_provisional`;
- `source_scope` — ambito che la fonte dichiara/copre (per esempio docente, settimana, sede o altro perimetro necessario), espresso senza dati personali superflui;
- `source_completeness`: `COMPLETE | PARTIAL | UNKNOWN`;
- `source_completeness_provenance`: evidenza dichiarativa o decisione del docente che consente di attestare `COMPLETE`; l'estrattore non presume completezza dalla sola forma tabellare;
- `effective_from`: data candidata oppure `null`;
- `effective_from_provenance`: posizione/affermazione della fonte o decisione esplicita del docente;
- `effective_from_review_state`: `AUTO_RESOLVED | REVIEW_REQUIRED`.

Se `effective_from` manca, è ambiguo o è soltanto dedotto da contesto non governato, deve essere `null` con `REVIEW_REQUIRED`. Il docente può risolverlo esplicitamente prima della generazione del piano. Nessuna data viene assunta in base alla data di caricamento.

Per ogni cella/riga rilevante l'estrattore produce una struttura intermedia con almeno:

- `source_row_key` stabile nella stessa fonte;
- giorno della settimana candidato;
- ordinal/ora candidato;
- `start_time` e `end_time` quando disponibili o derivabili da una griglia verificata;
- etichetta classe originale minimizzata;
- codice/etichetta attività originale minimizzato;
- `proposed_slot_kind` canonico o `null`;
- eventuale `resolved_section_id`;
- eventuale `resolved_assignment_id`;
- per `CLASS_PRESENCE`, `proposed_manual_class_label` e `proposed_presence_kind` quando noti;
- `confidence`: `HIGH | MEDIUM | LOW | UNRESOLVED`;
- `review_state`: `AUTO_RESOLVED | REVIEW_REQUIRED` in fase di estrazione;
- `evidence_ref`;
- `warnings[]` strutturati.

`AUTO_RESOLVED` significa soltanto che il sistema dispone di evidenza sufficiente per proporre il mapping; non equivale a conferma del docente.

## 7. Evidenza, minimizzazione e retention

`evidence_ref` è un riferimento opaco a un'evidenza minimizzata, non il contenuto della fonte. Può riferire soltanto uno dei seguenti artefatti, secondo necessità:

- coordinate/pagina/cella all'interno della fonte ancora disponibile;
- estratto testuale minimo necessario a spiegare il mapping;
- identificatore di una decisione esplicita del docente che ha risolto un'ambiguità.

Regole obbligatorie:

1. non conservare ritagli di immagine o testo più ampi di quanto necessario alla revisione;
2. non duplicare il documento sorgente dentro l'evidenza;
3. eliminare o rendere non risolvibile l'evidenza derivata dalla fonte quando termina la retention della fonte, salvo la minima receipt decisionale necessaria a dimostrare cosa il docente ha confermato;
4. la receipt decisionale successiva può conservare valori canonici e decisioni, ma non il documento/ritaglio originario;
5. la durata concreta della fonte e degli estratti deve essere configurata e documentata prima della materializzazione; il valore predefinito deve essere il minimo compatibile con revisione e recupero da errore;
6. dopo l'eliminazione della fonte, l'interfaccia deve distinguere chiaramente `EVIDENCE_EXPIRED` da un'evidenza mai esistita; l'eliminazione non modifica retroattivamente la decisione già registrata.

Nessun nome del docente o altro dato personale estratto viene conservato se non strettamente necessario al perimetro; ove possibile il perimetro usa identificatori locali già presenti in Docente OS anziché testo della fonte.

## 8. Regole di risoluzione

Una riga può essere `AUTO_RESOLVED` solo quando tutti gli elementi necessari all'operazione proposta sono deterministici rispetto alla fonte e al contesto Docente OS.

Deve essere `REVIEW_REQUIRED` quando si verifica almeno una delle condizioni seguenti:

- classe non risolta univocamente;
- abbreviazione sconosciuta o polisemica;
- orario/posizione non determinabile;
- conflitto tra etichetta della fonte e incarichi del docente;
- più incarichi compatibili;
- attività non riconducibile con sicurezza a una categoria canonica;
- fonte parziale, tagliata o visivamente ambigua;
- valore derivato con confidenza inferiore alla soglia governata;
- `effective_from` mancante o ambiguo quando necessario all'applicazione.

`UNRESOLVED` non può diventare un'operazione `ADD`, `MOVE` o `CHANGE` senza intervento esplicito del docente.

## 9. Confronto con la bozza e semantica delle rimozioni

Il comparatore è puro: riceve candidato + snapshot della bozza e restituisce una proposta di differenze. Non scrive sul database dell'orario.

Categorie di differenza:

- `UNCHANGED` -> proposta `KEEP`;
- `NEW` -> proposta `ADD`;
- `MOVED` -> proposta `MOVE`;
- `CHANGED` -> proposta `CHANGE`;
- `MISSING_FROM_SOURCE` -> stato informativo di confronto;
- `AMBIGUOUS` -> nessuna operazione applicabile finché non revisionata;
- `IGNORED` -> `IGNORE` esplicito.

Il matching deve preferire identità didattica e collocazione temporale governate rispetto al semplice testo visualizzato.

### 9.1 Regola fail-closed per `REMOVE`

`MISSING_FROM_SOURCE` può diventare **proposta** `REMOVE` soltanto se tutte le condizioni seguenti sono vere:

1. `source_completeness = COMPLETE`;
2. la completezza è supportata da `source_completeness_provenance` valida o confermata esplicitamente dal docente;
3. lo slot corrente appartiene integralmente a `source_scope`;
4. il candidato non presenta ambiguità che possano spiegare l'assenza;
5. la revisione di candidato e bozza è ancora quella usata dal comparatore.

Con `PARTIAL` o `UNKNOWN`, oppure fuori dall'ambito attestato, `MISSING_FROM_SOURCE` resta puramente informativo e **non può generare `REMOVE`**. Anche quando la proposta `REMOVE` è ammessa, non è mai preselezionata e richiede conferma esplicita del docente come già imposto da G1.2.

## 10. Anteprima docente

Prima di produrre il piano applicabile, l'interfaccia deve mostrare in forma compatta:

- fonte e stato provvisorio/definitivo dichiarato;
- ambito della fonte e stato di completezza (`COMPLETE/PARTIAL/UNKNOWN`);
- `effective_from` e relativo stato di revisione;
- numero di righe riconosciute;
- invariati, aggiunti, spostati, modificati, mancanti e ambigui;
- per ogni differenza, valore attuale -> valore proposto;
- motivazione/evidenza per gli elementi ambigui;
- controllo esplicito del docente su ogni riga che richiede revisione;
- avviso specifico prima di qualsiasi `REMOVE` e indicazione del perché la rimozione è proponibile.

Non è sufficiente una lunga lista indistinta: la vista deve privilegiare le eccezioni e consentire di comprendere rapidamente cosa cambierà.

## 11. Piano applicabile

Solo dopo la revisione viene prodotto il `p_operations` consumabile da G1.2. Ogni riga candidata deve avere esattamente una disposizione esplicita coerente con il contratto G1.2.

Il generatore del piano deve fallire chiuso se:

- esistono righe `REVIEW_REQUIRED` non risolte;
- esistono righe `UNRESOLVED`;
- `effective_from` necessario è nullo o ancora `REVIEW_REQUIRED`;
- manca una disposizione per una riga candidata;
- una rimozione non è stata esplicitamente confermata;
- una rimozione deriva da fonte `PARTIAL`, `UNKNOWN` o da slot fuori `source_scope`;
- la revisione del candidato o della bozza è cambiata dopo la generazione dell'anteprima.

## 12. Casi di prova governati G1.3

La materializzazione successiva deve trasformare questi casi in fixture/golden/reference evidence eseguibili, non considerarli soddisfatti dalla sola presenza nel documento:

1. PDF testuale leggibile con sole lezioni.
2. Immagine leggibile dello stesso orario -> normalizzazione semanticamente equivalente.
3. `T` riconosciuto come teoria nel profilo della fonte corrente.
4. `D` riconosciuto come sostegno solo con profilo/evidenza coerenti.
5. `DIS` -> `DISPOSITION`.
6. Abbreviazione sconosciuta -> `REVIEW_REQUIRED`.
7. Classe univoca -> risoluzione proposta.
8. Classe ambigua -> nessuna scelta automatica.
9. Riga senza orario determinabile -> non applicabile.
10. Riga con intervallo temporale invalido -> rigetto.
11. Lezione senza incarico risolto -> non applicabile.
12. Presenza in classe non-lezione -> `CLASS_PRESENCE`, senza incarico artificiale.
13. Fonte provvisoria -> indicatore preservato fino all'anteprima.
14. Stessi byte riacquisiti -> stesso `source_fingerprint`.
15. PDF e immagine semanticamente equivalenti -> `source_fingerprint` diversi ammessi, stesso `candidate_fingerprint` richiesto a parità di schema/profilo.
16. Cambiamento semantico -> nuovo `candidate_fingerprint`.
17. Cambio della sola `confidence`/evidenza -> `candidate_fingerprint` invariato.
18. Cambio di `source_profile_version` -> identità semantica distinta.
19. Evidenza minima associata a ogni riga proposta e nessuna duplicazione indiscriminata della fonte.
20. Fonte eliminata a fine retention -> `EVIDENCE_EXPIRED`, receipt decisionale minima preservata.
21. Confronto invariato -> `KEEP`.
22. Nuova attività -> `ADD`.
23. Spostamento -> `MOVE`.
24. Variazione sostanziale -> `CHANGE`.
25. Elemento assente da fonte `UNKNOWN/PARTIAL` -> nessuna proposta `REMOVE`.
26. Elemento assente da fonte `COMPLETE` ma fuori `source_scope` -> nessuna proposta `REMOVE`.
27. Elemento assente da fonte `COMPLETE`, dentro scope e senza ambiguità -> `REMOVE` proponibile ma non preselezionata.
28. `REMOVE` senza conferma -> piano non generabile/apply rifiutato.
29. Riga ambigua non revisionata -> piano incompleto e bloccato.
30. Tutte le righe risolte -> piano completo compatibile con G1.2.
31. Mutazione della bozza dopo l'anteprima -> conflitto, nessuna applicazione.
32. Mutazione del candidato dopo l'anteprima -> revisione obsoleta, nessuna applicazione.
33. Acquisizione/anteprima non modifica `timetable_slots`.
34. Nessun nome docente superfluo persistito dalla fonte.
35. Nessun percorso alternativo bypassa `apply_timetable_import_to_draft(...)`.
36. Errore parser -> candidato non READY e feedback comprensibile al docente.
37. `effective_from` presente e univoco nella fonte -> proposta con provenance.
38. `effective_from` assente/ambiguo -> `null` + `REVIEW_REQUIRED`, nessuna inferenza dalla data di caricamento.
39. Risoluzione esplicita del docente di `effective_from` -> provenance decisionale registrata.
40. Completezza non attestabile dalla sola forma tabellare -> `UNKNOWN` fino a evidenza/decisione valida.

## 13. Non-obiettivi G1.3

Non sono autorizzati in questa fase:

- applicazione delle migrazioni G1.2 in produzione;
- attivazione automatica di un nuovo orario;
- pubblicazione automatica;
- sincronizzazione autonoma con fonti esterne;
- modifica automatica di calendario, lezioni o programmazioni;
- DOS-A1;
- conservazione indiscriminata del documento sorgente.

## 14. Gate per la materializzazione

Prima di implementare parser/interfaccia/runtime devono essere verificati:

- compatibilità del contratto con G1.2;
- schema/versionamento di `source_fingerprint` e `candidate_fingerprint` e relativa canonicalizzazione;
- minimizzazione, retention ed expiry dell'evidenza;
- `source_scope` e attestazione di `source_completeness` prima di ogni possibile rimozione;
- provenance/review di `effective_from`;
- assenza di scritture implicite;
- accessibilità dell'anteprima e delle differenze;
- comportamento smartphone;
- materializzazione eseguibile dei casi 1–40;
- review indipendente sul nuovo exact head finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY** fino al completamento dei gate e alla decisione umana prevista dalla governance.
