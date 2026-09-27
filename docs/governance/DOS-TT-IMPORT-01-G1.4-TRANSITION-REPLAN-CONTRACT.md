# DOS-TT-IMPORT-01 / G1.4 — Contratto governato di transizione temporale e ripianificazione

Stato: DRAFT — GOVERNANCE FIRST
Baseline: `develop@89826e4e6ff9e82dcf0c8105595ce36723941eea`
Dipendenze: G1.2 e G1.3 integrate. Nessuna applicazione runtime o ripianificazione è autorizzata da questo documento.
Riferimento architetturale: `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`.

## 1. Scopo

G1.4 governa ciò che accade **dopo** che un nuovo quadro orario settimanale è stato acquisito e revisionato secondo G1.3: transizione dalla versione precedente alla nuova versione a partire da `effective_from` e gestione delle sessioni didattiche future già pianificate interessate dal cambio di orario.

G1.4 non interpreta il documento sorgente, non ridefinisce le personalizzazioni delle celle e non presume che lo slot ricorrente sia la lezione concreta.

Flusso canonico:

`candidato G1.3 revisionato -> bozza G1.2 -> anteprima transizione -> verifica storia eseguita -> nuove occorrenze future -> impatto sulle sessioni pianificate -> risoluzione sole eccezioni -> conferma docente -> attivazione versione + creazione bozza successiva -> ripianificazione governata`

## 2. Modello canonico vincolante

G1.4 adotta la separazione già definita dalla specifica canonica dell'orario:

`TimetableVersion -> TimetableSlot ricorrente -> Occorrenza reale -> Sessione didattica -> CAN-PLAN/attuazione`

### 2.1 Slot ricorrente

`TimetableSlot.id` identifica il pattern settimanale appartenente a una specifica `TimetableVersion`. Non è l'identità di una lezione concreta e non deve essere riutilizzato come tale.

### 2.2 Occorrenza reale

L'occorrenza è la materializzazione temporale di uno slot in una data concreta, derivata almeno da:

`versione attiva + slot ricorrente + data/calendario + eccezioni`

La sua identità logica canonica è `slot_id + local_date` o un riferimento stabile equivalente definito in materializzazione. Un cambio di versione può quindi cambiare l'identità dell'occorrenza futura senza cambiare il significato didattico della sessione che vi era pianificata.

### 2.3 Sessione didattica

La sessione didattica è l'unità che porta il significato del lavoro del docente: sequenza/piano, contenuti, obiettivi, materiali, note, preparazione e stato di attuazione. G1.4 richiede una **identità persistente della sessione** prima del runtime, ma non assume che nel runtime corrente esista già un campo denominato `lesson_id` con questa semantica.

Il nome e lo schema fisico dell'identificatore saranno definiti nella materializzazione dopo verifica del modello persistente. Il contratto governa la semantica: **spostare una sessione futura non significa crearne una nuova**.

## 3. Invarianti

1. **Storia immutabile.** Nessuna occorrenza/sessione già eseguita o consolidata viene spostata, ricreata, cancellata, reinterpretata o resa temporalmente incoerente dalla transizione, indipendentemente dalla posizione rispetto a un `effective_from` proposto.
2. **Stato storico preservato.** Svolto, materiali, note, collegamenti curricolari e altre evidenze pregresse non vengono riscritti retroattivamente.
3. **Teacher-first.** Il docente vede un riepilogo comprensibile prima dell'applicazione e interviene soltanto sui casi non deterministici.
4. **Versionamento temporale.** La nuova `TimetableVersion` inizia a un `effective_from` valido; la precedente viene chiusa al confine coerente immediatamente precedente, senza sovrapposizioni, vuoti artificiali o invalidazione di storia eseguita.
5. **Termine aperto.** La nuova versione mantiene `effective_to = null` finché non arriva una successiva versione o un altro confine governato.
6. **Identità didattica preservata.** Una sessione futura già pianificata non viene trattata come contenuto nuovo solo perché cambia giorno/ora o occorrenza di appoggio.
7. **No silent drop.** Nessuna sessione futura pianificata può scomparire perché il nuovo quadro offre meno capacità o una corrispondenza non è determinabile.
8. **No silent duplication.** Una transizione non può duplicare una sessione già pianificata.
9. **Personalizzazioni fuori dal mapping strutturale.** Teoria, disegno, disposizione e altre qualificazioni non determinano il parsing/importazione. Gli attributi didattici già associati a una sessione vengono preservati quando compatibili e non reinterpretati dal nuovo documento.
10. **Atomicità logica.** Attivazione della versione, ripianificazione approvata e predisposizione della bozza successiva devono produrre uno stato coerente; un fallimento non deve lasciare metà transizione applicata.
11. **Idempotenza forte.** Un `client_request_id` identifica un solo piano canonico: soltanto il replay esatto dello stesso piano può restituire la receipt precedente; il riuso della chiave con un piano diverso deve fallire senza scritture.
12. **Nessun DOS-A1.** G1.4 non autorizza decisioni didattiche autonome.
13. **Eccezioni, non amministrazione.** Nel percorso ordinario il docente non gestisce identificatori, fingerprint, revisioni o liste tecniche: il sistema mostra solo il risultato e le eventuali eccezioni da decidere.
14. **Nessuna sessione orfana.** Dopo l'attivazione, ogni sessione interessata deve avere una nuova occorrenza valida oppure uno stato persistente governato di non-collocazione; se tale stato non è materializzato, l'attivazione resta bloccata finché il conflitto non è risolto.
15. **Continuità della modifica dell'orario.** L'attivazione deve lasciare disponibile una nuova `TimetableVersion` in stato `DRAFT`, derivata dalla versione appena attivata e popolata con la copia dei relativi slot, in coerenza con il ciclo di vita corrente. La bozza successiva è infrastruttura di editing, non una nuova decisione didattica.

## 4. Confine temporale e protezione della storia eseguita

`effective_from` è il confine canonico **solo se compatibile con la storia già consolidata**.

- prima di `effective_from`: dominio storico, non modificabile da G1.4;
- da `effective_from` in avanti: dominio potenzialmente interessato dalla nuova versione soltanto per elementi non già eseguiti/consolidati;
- la versione precedente viene chiusa in funzione dell'inizio della nuova versione;
- la nuova versione resta aperta (`effective_to = null`);
- l'eventuale termine generale delle attività didattiche appartiene al calendario/anno scolastico e non viene duplicato come data inventata nel contratto di importazione.

Prima di rendere applicabile il piano, G1.4 deve calcolare un **executed-history boundary**: la massima data/occorrenza consolidata rilevante per l'ambito della transizione, secondo gli stati canonici della sessione.

Regole obbligatorie:

1. se `effective_from` non interseca alcuna sessione già eseguita/consolidata, la transizione può proseguire;
2. se `effective_from` è retrodatato e la chiusura della versione precedente renderebbe una sessione già eseguita incompatibile con la validità temporale del proprio slot/versione, **l'attivazione è bloccata**;
3. il sistema non sposta automaticamente `effective_from` e non riscrive la storia per far quadrare il nuovo orario;
4. un eventuale meccanismo futuro di split/retifica storica richiede un contratto separato e non è autorizzato da G1.4;
5. l'interfaccia presenta il problema in termini semplici, ad esempio: **“Questa data comprende lezioni già svolte. Scegli una data di entrata in vigore successiva.”**

La transizione deve inoltre fallire se `effective_from` non è risolto o se produce intervalli di validità incoerenti.

## 5. Oggetto della ripianificazione

Sono candidate alla ripianificazione soltanto le **sessioni didattiche future già pianificate e non consolidate** la cui occorrenza/collocazione dipende da slot della versione precedente a partire da `effective_from`.

Non sono candidate automaticamente:

- sessioni già svolte o comunque consolidate;
- sessioni anteriori a `effective_from`;
- eventi di calendario non appartenenti al quadro delle lezioni;
- attività prive di relazione con gli slot modificati;
- contenuti didattici non ancora associati a una specifica sessione temporale.

Il cambio d'orario rigenera/deriva le occorrenze future secondo la nuova versione; solo successivamente le sessioni già pianificate vengono riallineate alle nuove occorrenze compatibili.

## 6. Identità e contenuto da preservare

Lo spostamento temporale deve preservare, ove presenti e compatibili:

- identità persistente della sessione didattica, una volta materializzata;
- classe/sezione e disciplina/incarico;
- sequenza didattica e posizione logica;
- obiettivi e riferimenti curricolari;
- contenuti e attività previste;
- materiali e risorse collegate;
- note/preparazione docente;
- eventuali qualificazioni personali già associate alla sessione;
- provenance e collegamenti ad Arena/Atlas secondo i contratti vigenti;
- stato della sessione, salvo una transizione di stato esplicitamente richiesta da altro contratto.

Non deve essere preservato artificialmente l'identificatore del vecchio `TimetableSlot` o della vecchia occorrenza quando la nuova versione genera un nuovo pattern/una nuova occorrenza.

La ripianificazione modifica la **collocazione temporale della sessione**, non il suo significato didattico.

## 7. Matching tra vecchio e nuovo quadro

Il motore di transizione deve produrre un piano puro prima di ogni scrittura.

Classi minime di esito:

- `UNCHANGED_OCCURRENCE` — collocazione strutturale equivalente;
- `MOVED_OCCURRENCE` — nuova occorrenza univocamente equivalente;
- `REMOVED_OCCURRENCE_WITH_TARGET` — vecchia occorrenza non più disponibile ma esiste una nuova occorrenza univoca compatibile;
- `REMOVED_OCCURRENCE_NO_TARGET` — nessuna nuova collocazione disponibile;
- `MULTIPLE_TARGETS` — più collocazioni plausibili;
- `CAPACITY_CONFLICT` — il nuovo quadro non offre capacità sufficiente per tutte le sessioni pianificate;
- `ASSIGNMENT_CONFLICT` — classe/incarico non coerente;
- `OUTSIDE_TRANSITION_SCOPE` — elemento non interessato.

Il matching deve privilegiare identità di classe/incarico, data/ordine didattico, sequenza temporale e capacità disponibile. Non può usare `TimetableSlot.id`, la posizione della cella o un'etichetta visuale come unica prova di equivalenza.

## 8. Regole di ripianificazione deterministica

Una sessione può essere proposta come riallineata automaticamente nell'anteprima solo se:

1. appartiene al dominio futuro (`>= effective_from`) e non è già eseguita/consolidata;
2. esiste una sola nuova occorrenza compatibile;
3. classe/incarico sono coerenti;
4. non si crea collisione con altra sessione/evento governato;
5. l'ordine relativo della sequenza didattica non viene invertito in modo incoerente;
6. non viene superata la capacità disponibile del nuovo quadro;
7. vecchia versione, nuova versione, calendario/eccezioni e pianificazione non sono cambiati dopo il calcolo.

`automaticamente` significa **proposta automatica e precomputata**, non decisione didattica autonoma. L'applicazione resta soggetta al gate previsto dalla governance.

## 9. Conflitti, stato non collocato e casi non deterministici

Devono essere sottoposti al docente almeno:

- riduzione del numero di ore disponibili;
- più occorrenze nuove equivalenti;
- nessuna occorrenza compatibile;
- cambio di classe/incarico;
- collisione con impegni già presenti;
- sequenza didattica che non può essere mantenuta;
- sessione futura già modificata manualmente dopo la generazione dell'anteprima;
- qualsiasi divergenza tra revisioni/fingerprint utilizzati per il piano e stato corrente.

Il sistema non deve chiedere al docente di comprendere la causa tecnica. Deve presentare una decisione concreta alla volta, ad esempio: **“Questa lezione non trova una sola nuova collocazione. Scegli quando mantenerla.”**

Per ogni conflitto che impedisce una collocazione valida sono ammesse soltanto due famiglie di esito governato:

1. **risolto prima dell'attivazione** — il docente sceglie una nuova occorrenza valida e il piano registra la disposizione;
2. **non collocato esplicitamente** — solo se la materializzazione introduce uno stato persistente canonico, ad esempio `UNSCHEDULED_REPLAN_REQUIRED`, distinto da cancellazione e da sessione pianificata, visibile al docente e recuperabile nel flusso ordinario.

Fino a quando tale stato persistente non è definito e implementato, **qualsiasi sessione senza target valido blocca l'attivazione**. Non è ammesso “escludere” o “lasciare da ripianificare” una sessione mantenendola agganciata a un'occorrenza/versione non più valida.

Nessuna scelta elimina il contenuto didattico per effetto implicito.

## 10. Percorso utente minimo

Il percorso ordinario target è:

1. **Carica il nuovo orario** (G1.3).
2. **Indica il docente/cognome**, quando necessario alla selezione della fonte (G1.3).
3. **Controlla il quadro riconosciuto**.
4. **Conferma o indica “Valido dal …”** (`effective_from`).
5. Docente OS verifica che la data non intersechi storia eseguita e calcola l'impatto senza scrivere.
6. Se non ci sono eccezioni, mostra un riepilogo breve, ad esempio: **“Il nuovo orario entra in vigore il 28 settembre. 6 lezioni future saranno riallineate. Nessun contenuto sarà perso. Le lezioni già svolte non cambiano.”**
7. **Conferma**.

Se `effective_from` interseca storia eseguita, il sistema non espone concetti tecnici: chiede una data successiva compatibile. Se esistono altri conflitti, il percorso aggiunge soltanto il numero minimo di decisioni necessarie. Le informazioni tecniche restano disponibili come dettaglio secondario e non sono prerequisito per l'azione.

Obiettivo di usabilità: nel caso ordinario, dopo il caricamento/selezione della fonte, il docente deve poter completare la transizione con **una verifica sintetica e una conferma**, senza amministrare manualmente le singole lezioni.

## 11. Anteprima di transizione

Prima dell'applicazione l'interfaccia deve mostrare in primo livello:

- data di entrata in vigore;
- esito sintetico del riconoscimento;
- numero di sessioni future riallineate;
- numero di sessioni che richiedono una scelta;
- messaggio esplicito che storico e contenuti non saranno modificati;
- eventuale blocco comprensibile se la data proposta interseca storia già eseguita.

Solo su richiesta/dettaglio mostra:

- versione precedente -> nuova versione;
- slot/occorrenze invariati, spostati, aggiunti e rimossi;
- per ogni sessione interessata: collocazione attuale -> proposta;
- motivazione tecnica/evidenza.

La vista deve privilegiare **eccezioni e azioni necessarie**, evitare una lista indistinta dell'intero anno ed essere fruibile rapidamente anche su smartphone.

## 12. Piano di transizione e digest canonico

Il piano deve essere versionato e contenere almeno:

- `transition_id` / `client_request_id` idempotente;
- `plan_schema_version`;
- `plan_digest_schema_version`, che identifica la forma canonica del payload sottoposto a digest;
- `plan_digest`, calcolato esclusivamente sul **digest preimage** definito sotto;
- `previous_timetable_version_id` e revisione/fingerprint;
- `next_timetable_version_id` e revisione/fingerprint;
- `effective_from`;
- riferimento/revisione dell'`executed_history_boundary` verificato;
- snapshot/revisione di calendario, eccezioni e pianificazione considerati;
- operazioni di chiusura/attivazione versione;
- operazione di creazione della **successor draft** dalla versione appena attivata e copia completa degli slot della versione attiva nella nuova bozza;
- operazioni di riallineamento riferite alla **identità persistente della sessione** e alle vecchie/nuove collocazioni, senza imporre il nome fisico `lesson_id`;
- disposizioni esplicite sui conflitti risolti dal docente;
- eventuali disposizioni `UNSCHEDULED_REPLAN_REQUIRED` solo quando tale stato sarà materializzato e autorizzato;
- conteggi di controllo;
- receipt finale legata a `client_request_id + plan_digest`.

### 12.1 Digest preimage non ricorsivo

Il `plan_digest` **non** è calcolato serializzando l'oggetto piano finale così come memorizzato. È calcolato su un payload canonico versionato, denominato logicamente `PlanDigestPayload`, costruito prima dell'applicazione.

`PlanDigestPayload` include tutte e sole le decisioni e precondizioni che determinano gli effetti della transizione, comprese:

- versione dello schema del piano e del digest;
- identificativi/revisioni/fingerprint delle versioni precedente e successiva;
- `effective_from` ed `executed_history_boundary`;
- snapshot/revisioni di calendario, eccezioni e pianificazione;
- chiusura/attivazione della versione;
- creazione della successor draft e copia degli slot dalla versione attivata;
- riallineamenti delle sessioni e risoluzioni esplicite dei conflitti;
- eventuali disposizioni governate di non-collocazione;
- conteggi/precondizioni che incidono sull'applicazione.

`PlanDigestPayload` esclude esplicitamente:

- `plan_digest` stesso;
- la receipt finale e qualsiasi suo campo;
- timestamp, identificativi o metadati generati soltanto dopo l'applicazione;
- stato/esito runtime derivato dall'esecuzione.

La serializzazione canonica deve essere deterministica e versionata: stesso `PlanDigestPayload` produce lo stesso digest; qualsiasi variazione di una decisione o precondizione applicabile produce un digest diverso. Client e boundary di applicazione devono derivare il digest dalla **stessa specifica di `PlanDigestPayload`**, non da rappresentazioni locali differenti.

Il piano diventa obsoleto se uno degli snapshot governati cambia prima dell'applicazione.

## 13. Atomicità, concorrenza, idempotenza e rollback

La materializzazione deve garantire che, nella stessa unità atomica governata:

- la versione precedente venga chiusa e la nuova versione attivata coerentemente;
- le sessioni approvate vengano riallineate;
- venga creata una sola successor `DRAFT` derivata dalla versione appena attivata;
- tutti gli slot della versione appena attivata vengano copiati nella successor draft preservando i campi strutturali necessari all'editing successivo;
- nessuna nuova versione risulti attiva se una parte obbligatoria della transizione, inclusa la predisposizione della successor draft, fallisce;
- nessuna sessione risulti spostata se l'attivazione della versione non è completata coerentemente;
- non possa essere osservata una successor draft vuota o parziale come esito di una transizione dichiarata riuscita;
- un primo uso di `client_request_id` registri in modo atomico anche il `plan_digest` canonico;
- retry con lo stesso `client_request_id` **e lo stesso `plan_digest`** restituisca lo stesso esito o la receipt precedente senza rieseguire mutazioni né creare una seconda successor draft;
- riuso dello stesso `client_request_id` con `plan_digest` diverso produca `IDEMPOTENCY_KEY_REUSE_MISMATCH` (o errore canonico equivalente) e **nessuna scrittura**;
- revision mismatch produca conflitto e nessuna scrittura parziale;
- executed-history mismatch dopo l'anteprima produca piano obsoleto e nessuna scrittura;
- il rollback tecnico non significhi riscrittura della storia già consolidata: riguarda soltanto una transazione non completata.

La materializzazione deve restare compatibile con la semantica del ciclo di vita corrente definita in `product/supabase/migrations/0025_timetable_lifecycle.sql`: l'implementazione può evolvere, ma non può perdere la proprietà per cui l'orario appena attivato costituisce la base della successiva bozza modificabile usata da `/orario`.

## 14. Relazione con calendario e altre superfici

G1.4 governa il legame tra **versione dell'orario, occorrenze e sessioni didattiche pianificate**. Non autorizza automaticamente modifiche a:

- impegni personali;
- riunioni;
- scadenze;
- circolari;
- eventi istituzionali non-lezione;
- programmazioni/UDA come contenuto didattico;
- pubblicazioni Atlas.

Se una sessione ripianificata è rappresentata anche in una vista calendario, tale vista deve riflettere la nuova collocazione tramite la stessa identità persistente della sessione, non tramite duplicazione dell'evento.

## 15. Casi di prova governati G1.4

La materializzazione deve rendere eseguibili almeno questi casi:

1. nuova versione con `effective_from` valido e nessuna storia eseguita intersecata -> precedente chiudibile e nuova attivabile;
2. nuova versione con `effective_to = null`;
3. sessione precedente a `effective_from` -> invariata;
4. sessione già svolta -> invariata e temporalmente coerente con la versione storica;
5. `effective_from` retrodatato che interseca sessioni già eseguite -> attivazione bloccata;
6. data proposta incompatibile con storia eseguita -> feedback semplice e richiesta di nuova data, nessuna correzione silenziosa;
7. sessione futura su occorrenza equivalente -> nessuno spostamento didattico;
8. sessione futura con unica nuova occorrenza equivalente -> proposta di riallineamento;
9. due occorrenze equivalenti -> conflitto, nessuna scelta silenziosa;
10. nessuna occorrenza equivalente e nessuno stato persistente non-collocato materializzato -> attivazione bloccata;
11. stato `UNSCHEDULED_REPLAN_REQUIRED` materializzato e autorizzato -> sessione preservata, visibile e recuperabile senza vecchia occorrenza invalida;
12. riduzione ore settimanali -> nessuna sessione cancellata e conflitti irrisolti bloccano l'attivazione salvo stato non-collocato governato;
13. aumento ore settimanali -> nessuna sessione inventata;
14. collisione con altra sessione -> conflitto;
15. collisione con evento governato -> conflitto/avviso secondo dominio;
16. cambio classe/incarico -> nessun remapping silenzioso;
17. sequenza didattica preservabile -> ordine mantenuto;
18. sequenza non preservabile -> revisione docente;
19. materiali/obiettivi/note -> preservati nello spostamento;
20. personalizzazione della sessione -> preservata, non reinterpretata;
21. identità persistente della sessione -> invariata nello spostamento;
22. `TimetableSlot.id` vecchio -> non richiesto come identità della sessione dopo il cambio versione;
23. identità della vecchia occorrenza -> non riutilizzata artificialmente se la nuova versione genera una nuova occorrenza;
24. stessa transizione, stesso `client_request_id` e stesso `plan_digest` -> replay idempotente;
25. stesso `client_request_id` con piano/digest diverso -> `IDEMPOTENCY_KEY_REUSE_MISMATCH`, nessuna scrittura e nessuna receipt fuorviante;
26. pianificazione mutata dopo anteprima -> piano obsoleto e nessuna applicazione;
27. storia eseguita mutata dopo anteprima -> piano obsoleto e nessuna applicazione;
28. vecchia versione mutata -> conflitto;
29. nuova versione mutata -> conflitto;
30. calendario/eccezioni mutati -> piano obsoleto;
31. applicazione fallita -> nessuno stato parziale osservabile;
32. receipt già presente per replay esatto -> retry sicuro;
33. nessuna sessione interessata -> sola transizione di versione, se valida;
34. eventi non-lezione -> non modificati;
35. vista calendario -> stessa sessione, nuova collocazione, nessun duplicato;
36. successivo nuovo orario -> chiude la versione corrente al nuovo confine senza riscrivere la storia;
37. fine attività didattiche senza nuovo orario -> nessuna data finale inventata da G1.4;
38. percorso ordinario -> riepilogo sintetico + una conferma, senza esposizione di identificatori tecnici;
39. un solo conflitto -> una sola decisione esplicita mostrata al docente;
40. molti elementi invariati -> non richiedono conferme individuali;
41. dettaglio tecnico -> secondario e non necessario per completare il percorso ordinario;
42. smartphone -> percorso completo senza dipendere da tabella larga o scorrimento orizzontale obbligatorio;
43. storico -> messaggio percepibile che conferma la non modifica;
44. contenuti/materiali -> messaggio percepibile che conferma la preservazione;
45. conflitto senza target -> non può produrre sessione orfana;
46. attivazione con conflitti irrisolti e senza stato non-collocato governato -> bloccata;
47. receipt -> contiene/lega il `plan_digest` applicato;
48. `PlanDigestPayload` identico -> digest identico indipendentemente da receipt/timestamp post-applicazione;
49. modifica di una decisione/precondizione applicabile -> digest diverso;
50. `plan_digest` non appartiene al proprio preimage e non genera ricorsione;
51. attivazione riuscita -> esiste una sola successor `DRAFT` con copia completa degli slot della versione appena attivata;
52. fallimento durante creazione/copia della successor draft -> nessuna attivazione/ripianificazione parziale osservabile;
53. replay idempotente -> non crea una seconda successor draft;
54. apertura successiva di `/orario` -> la bozza modificabile deriva dall'orario appena attivato, non è vuota per perdita della base;
55. DOS-A1 -> non attivato.

## 16. Non-obiettivi

G1.4 non autorizza:

- parser/OCR o interpretazione del documento sorgente;
- modifica delle personalizzazioni delle celle;
- generazione autonoma di sessioni mancanti;
- cancellazione autonoma di sessioni eccedenti;
- modifica retroattiva dello storico;
- correzione automatica di un `effective_from` che interseca storia eseguita;
- split/retifica della storia già consolidata;
- ripianificazione di riunioni/scadenze/circolari;
- pubblicazione Atlas;
- introduzione implicita di un `lesson_id` senza contratto persistente verificato;
- DOS-A1.

## 17. Gate per la materializzazione

Prima del runtime devono essere verificati:

- compatibilità con `TimetableVersion` e `TimetableSlot` correnti;
- compatibilità con `TIMETABLE_CANONICAL_SPEC` e modello temporale/calendario corrente;
- compatibilità con la semantica di successor draft del ciclo di vita corrente (`0025_timetable_lifecycle.sql`) e con il consumo della bozza da parte di `/orario`;
- definizione/materializzazione della **identità persistente della sessione didattica**, distinta da slot e occorrenza;
- definizione canonica degli stati che rendono una sessione **eseguita/consolidata** e calcolo dell'`executed_history_boundary`;
- campi didattici da preservare durante il riallineamento;
- definizione precisa della semantica di chiusura della versione precedente;
- algoritmo di matching deterministico tra vecchie e nuove occorrenze e casi fail-closed;
- decisione esplicita sullo stato persistente `UNSCHEDULED_REPLAN_REQUIRED` (o equivalente): se non materializzato, i conflitti senza target restano bloccanti;
- specifica versionata di `PlanDigestPayload`, con inclusioni/esclusioni esplicite e serializzazione canonica deterministica;
- verifica che `plan_digest`, receipt e dati post-applicazione siano esclusi dal digest preimage;
- binding atomico `client_request_id + plan_digest` e rifiuto del key reuse mismatch;
- creazione atomica della successor draft e copia completa degli slot della versione attivata;
- idempotenza della successor draft: nessun duplicato al replay;
- atomicità/idempotenza/concorrenza dell'intera transizione;
- anteprima teacher-first a divulgazione progressiva;
- percorso ordinario completabile con riepilogo sintetico + conferma;
- accessibilità e fruibilità smartphone senza tabella tecnica obbligatoria;
- materializzazione dei casi 1–55;
- nuova review indipendente del contratto sul nuovo exact head;
- decisione umana finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN** resta attivo fino al completamento dei gate.