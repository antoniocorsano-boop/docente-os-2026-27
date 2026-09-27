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
8. **Idempotenza.** La stessa fonte normalizzata deve produrre un'impronta stabile; riacquisizioni equivalenti non devono generare candidati concorrenti indistinguibili.
9. **Tracciabilità.** Ogni riga proposta deve poter essere ricondotta alla porzione della fonte che l'ha generata tramite `evidence_ref` o equivalente minimizzato.
10. **Nessun DOS-A1.** G1.3 non autorizza capacità operative autonome.

## 3. Input ammessi

G1.3 deve progettare un adattatore di acquisizione indipendente dal formato. Formati previsti:

- PDF testuale;
- immagine/fotografia;
- immagine derivata da scansione;
- tabella strutturata, se disponibile.

Il formato non deve modificare il contratto di uscita. Il parser specifico è sostituibile e versionato tramite `parser_version`.

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

Le regole di abbreviazione devono essere configurabili per fonte/parser e non codificate come assunzioni universali.

## 5. Contratto di estrazione

Per ogni cella/riga rilevante l'estrattore produce una struttura intermedia con almeno:

- `source_row_key` stabile nella stessa fonte;
- giorno della settimana candidato;
- ordinal/ora candidato;
- `start_time` e `end_time` quando disponibili o derivabili da una griglia verificata;
- etichetta classe originale minimizzata;
- codice/etichetta attività originale;
- `proposed_slot_kind` canonico o `null`;
- eventuale `resolved_section_id`;
- eventuale `resolved_assignment_id`;
- per `CLASS_PRESENCE`, `proposed_manual_class_label` e `proposed_presence_kind` quando noti;
- `confidence`: `HIGH | MEDIUM | LOW | UNRESOLVED`;
- `review_state`: `AUTO_RESOLVED | REVIEW_REQUIRED` in fase di estrazione;
- `evidence_ref`;
- `warnings[]` strutturati.

`AUTO_RESOLVED` significa soltanto che il sistema dispone di evidenza sufficiente per proporre il mapping; non equivale a conferma del docente.

## 6. Regole di risoluzione

Una riga può essere `AUTO_RESOLVED` solo quando tutti gli elementi necessari all'operazione proposta sono deterministici rispetto alla fonte e al contesto Docente OS.

Deve essere `REVIEW_REQUIRED` quando si verifica almeno una delle condizioni seguenti:

- classe non risolta univocamente;
- abbreviazione sconosciuta o polisemica;
- orario/posizione non determinabile;
- conflitto tra etichetta della fonte e incarichi del docente;
- più incarichi compatibili;
- attività non riconducibile con sicurezza a una categoria canonica;
- fonte parziale, tagliata o visivamente ambigua;
- valore derivato con confidenza inferiore alla soglia governata.

`UNRESOLVED` non può diventare un'operazione `ADD`, `MOVE` o `CHANGE` senza intervento esplicito del docente.

## 7. Confronto con la bozza

Il comparatore è puro: riceve candidato + snapshot della bozza e restituisce una proposta di differenze. Non scrive sul database dell'orario.

Categorie di differenza:

- `UNCHANGED` -> proposta `KEEP`;
- `NEW` -> proposta `ADD`;
- `MOVED` -> proposta `MOVE`;
- `CHANGED` -> proposta `CHANGE`;
- `MISSING_FROM_SOURCE` -> possibile `REMOVE`, mai preselezionata come decisione distruttiva;
- `AMBIGUOUS` -> nessuna operazione applicabile finché non revisionata;
- `IGNORED` -> `IGNORE` esplicito.

Il matching deve preferire identità didattica e collocazione temporale governate rispetto al semplice testo visualizzato.

## 8. Anteprima docente

Prima di produrre il piano applicabile, l'interfaccia deve mostrare in forma compatta:

- fonte e stato provvisorio/definitivo dichiarato;
- data di efficacia candidata;
- numero di righe riconosciute;
- invariati, aggiunti, spostati, modificati, mancanti e ambigui;
- per ogni differenza, valore attuale -> valore proposto;
- motivazione/evidenza per gli elementi ambigui;
- controllo esplicito del docente su ogni riga che richiede revisione;
- avviso specifico prima di qualsiasi `REMOVE`.

Non è sufficiente una lunga lista indistinta: la vista deve privilegiare le eccezioni e consentire di comprendere rapidamente cosa cambierà.

## 9. Piano applicabile

Solo dopo la revisione viene prodotto il `p_operations` consumabile da G1.2. Ogni riga candidata deve avere esattamente una disposizione esplicita coerente con il contratto G1.2.

Il generatore del piano deve fallire chiuso se:

- esistono righe `REVIEW_REQUIRED` non risolte;
- esistono righe `UNRESOLVED`;
- manca una disposizione per una riga candidata;
- una rimozione non è stata esplicitamente confermata;
- la revisione del candidato o della bozza è cambiata dopo la generazione dell'anteprima.

## 10. Casi di prova governati G1.3

La materializzazione successiva deve coprire almeno questi casi:

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
14. Stessa fonte riacquisita -> impronta stabile/idempotenza.
15. Fonte modificata -> nuova impronta.
16. Evidenza associata a ogni riga proposta.
17. Confronto invariato -> `KEEP`.
18. Nuova attività -> `ADD`.
19. Spostamento -> `MOVE`.
20. Variazione sostanziale -> `CHANGE`.
21. Elemento assente dalla nuova fonte -> proposta di possibile rimozione, non applicazione automatica.
22. `REMOVE` senza conferma -> piano non generabile/apply rifiutato.
23. Riga ambigua non revisionata -> piano incompleto e bloccato.
24. Tutte le righe risolte -> piano completo compatibile con G1.2.
25. Mutazione della bozza dopo l'anteprima -> conflitto, nessuna applicazione.
26. Mutazione del candidato dopo l'anteprima -> revisione obsoleta, nessuna applicazione.
27. Acquisizione/anteprima non modifica `timetable_slots`.
28. Nessun nome docente superfluo persistito dalla fonte.
29. Nessun percorso alternativo bypassa `apply_timetable_import_to_draft(...)`.
30. Errore parser -> candidato non READY e feedback comprensibile al docente.

## 11. Non-obiettivi G1.3

Non sono autorizzati in questa fase:

- applicazione delle migrazioni G1.2 in produzione;
- attivazione automatica di un nuovo orario;
- pubblicazione automatica;
- sincronizzazione autonoma con fonti esterne;
- modifica automatica di calendario, lezioni o programmazioni;
- DOS-A1;
- conservazione indiscriminata del documento sorgente.

## 12. Gate per la materializzazione

Prima di implementare parser/interfaccia/runtime devono essere verificati:

- compatibilità del contratto con G1.2;
- minimizzazione e retention della fonte;
- modello di evidenza per PDF/immagini;
- idempotenza dell'impronta normalizzata;
- assenza di scritture implicite;
- accessibilità dell'anteprima e delle differenze;
- comportamento smartphone;
- casi negativi 1–30;
- review indipendente sull'exact head finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY** fino al completamento dei gate e alla decisione umana prevista dalla governance.
