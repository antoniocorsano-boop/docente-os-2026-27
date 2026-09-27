# DOS-TT-IMPORT-01 / G1.4 — Contratto governato di transizione temporale e ripianificazione

Stato: DRAFT — GOVERNANCE FIRST
Baseline: `develop@89826e4e6ff9e82dcf0c8105595ce36723941eea`
Dipendenze: G1.2 e G1.3 integrate. Nessuna applicazione runtime o ripianificazione è autorizzata da questo documento.
Riferimento architetturale: `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`.

## 1. Scopo

G1.4 governa ciò che accade **dopo** che un nuovo quadro orario settimanale è stato acquisito e revisionato secondo G1.3: transizione dalla versione precedente alla nuova versione a partire da `effective_from` e gestione delle sessioni didattiche future già pianificate interessate dal cambio di orario.

G1.4 non interpreta il documento sorgente, non ridefinisce le personalizzazioni delle celle e non presume che lo slot ricorrente sia la lezione concreta.

Flusso canonico:

`candidato G1.3 revisionato -> bozza G1.2 -> anteprima transizione -> nuove occorrenze future -> impatto sulle sessioni pianificate -> risoluzione sole eccezioni -> conferma docente -> attivazione versione -> ripianificazione governata`

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

1. **Storia immutabile.** Nessuna occorrenza/sessione con collocazione anteriore a `effective_from` viene spostata, ricreata, cancellata o reinterpretata dalla transizione.
2. **Stato storico preservato.** Svolto, materiali, note, collegamenti curricolari e altre evidenze pregresse non vengono riscritti retroattivamente.
3. **Teacher-first.** Il docente vede un riepilogo comprensibile prima dell'applicazione e interviene soltanto sui casi non deterministici.
4. **Versionamento temporale.** La nuova `TimetableVersion` inizia a `effective_from`; la precedente viene chiusa al confine coerente immediatamente precedente, senza sovrapposizioni né vuoti artificiali.
5. **Termine aperto.** La nuova versione mantiene `effective_to = null` finché non arriva una successiva versione o un altro confine governato.
6. **Identità didattica preservata.** Una sessione futura già pianificata non viene trattata come contenuto nuovo solo perché cambia giorno/ora o occorrenza di appoggio.
7. **No silent drop.** Nessuna sessione futura pianificata può scomparire perché il nuovo quadro offre meno capacità o una corrispondenza non è determinabile.
8. **No silent duplication.** Una transizione non può duplicare una sessione già pianificata.
9. **Personalizzazioni fuori dal mapping strutturale.** Teoria, disegno, disposizione e altre qualificazioni non determinano il parsing/importazione. Gli attributi didattici già associati a una sessione vengono preservati quando compatibili e non reinterpretati dal nuovo documento.
10. **Atomicità logica.** Attivazione della versione e ripianificazione approvata devono produrre uno stato coerente; un fallimento non deve lasciare metà transizione applicata.
11. **Idempotenza.** Ripetere la stessa transizione approvata non deve creare ulteriori spostamenti, duplicati o mutazioni.
12. **Nessun DOS-A1.** G1.4 non autorizza decisioni didattiche autonome.
13. **Eccezioni, non amministrazione.** Nel percorso ordinario il docente non gestisce identificatori, fingerprint, revisioni o liste tecniche: il sistema mostra solo il risultato e le eventuali eccezioni da decidere.

## 4. Confine temporale

`effective_from` è il confine canonico.

- prima di `effective_from`: dominio storico, non modificabile da G1.4;
- da `effective_from` in avanti: dominio potenzialmente interessato dalla nuova versione;
- la versione precedente viene chiusa in funzione dell'inizio della nuova versione;
- la nuova versione resta aperta (`effective_to = null`);
- l'eventuale termine generale delle attività didattiche appartiene al calendario/anno scolastico e non viene duplicato come data inventata nel contratto di importazione.

La transizione deve fallire se `effective_from` non è risolto o se produce intervalli di validità incoerenti.

## 5. Oggetto della ripianificazione

Sono candidate alla ripianificazione soltanto le **sessioni didattiche future già pianificate** la cui occorrenza/collocazione dipende da slot della versione precedente a partire da `effective_from`.

Non sono candidate automaticamente:

- sessioni già svolte;
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

1. appartiene al dominio futuro (`>= effective_from`);
2. esiste una sola nuova occorrenza compatibile;
3. classe/incarico sono coerenti;
4. non si crea collisione con altra sessione/evento governato;
5. l'ordine relativo della sequenza didattica non viene invertito in modo incoerente;
6. non viene superata la capacità disponibile del nuovo quadro;
7. vecchia versione, nuova versione, calendario/eccezioni e pianificazione non sono cambiati dopo il calcolo.

`automaticamente` significa **proposta automatica e precomputata**, non decisione didattica autonoma. L'applicazione resta soggetta al gate previsto dalla governance.

## 9. Conflitti e casi non deterministici

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

Il docente può confermare uno spostamento, scegliere una diversa collocazione, lasciare la sessione da ripianificare oppure escluderla dalla transizione quando il dominio lo consente. Nessuna scelta elimina il contenuto didattico per effetto implicito.

## 10. Percorso utente minimo

Il percorso ordinario target è:

1. **Carica il nuovo orario** (G1.3).
2. **Indica il docente/cognome**, quando necessario alla selezione della fonte (G1.3).
3. **Controlla il quadro riconosciuto**.
4. **Conferma o indica “Valido dal …”** (`effective_from`).
5. Docente OS calcola l'impatto senza scrivere.
6. Se non ci sono eccezioni, mostra un riepilogo breve, ad esempio: **“Il nuovo orario entra in vigore il 28 settembre. 6 lezioni future saranno riallineate. Nessun contenuto sarà perso. Le lezioni precedenti non cambiano.”**
7. **Conferma**.

Se esistono conflitti, il percorso aggiunge soltanto il numero minimo di decisioni necessarie. Le informazioni tecniche restano disponibili come dettaglio secondario e non sono prerequisito per l'azione.

Obiettivo di usabilità: nel caso ordinario, dopo il caricamento/selezione della fonte, il docente deve poter completare la transizione con **una verifica sintetica e una conferma**, senza amministrare manualmente le singole lezioni.

## 11. Anteprima di transizione

Prima dell'applicazione l'interfaccia deve mostrare in primo livello:

- data di entrata in vigore;
- esito sintetico del riconoscimento;
- numero di sessioni future riallineate;
- numero di sessioni che richiedono una scelta;
- messaggio esplicito che storico e contenuti non saranno modificati.

Solo su richiesta/dettaglio mostra:

- versione precedente -> nuova versione;
- slot/occorrenze invariati, spostati, aggiunti e rimossi;
- per ogni sessione interessata: collocazione attuale -> proposta;
- motivazione tecnica/evidenza.

La vista deve privilegiare **eccezioni e azioni necessarie**, evitare una lista indistinta dell'intero anno ed essere fruibile rapidamente anche su smartphone.

## 12. Piano di transizione

Il piano deve essere versionato e contenere almeno:

- `transition_id` / `client_request_id` idempotente;
- `previous_timetable_version_id` e revisione/fingerprint;
- `next_timetable_version_id` e revisione/fingerprint;
- `effective_from`;
- snapshot/revisione di calendario, eccezioni e pianificazione considerati;
- operazioni di chiusura/attivazione versione;
- operazioni di riallineamento riferite alla **identità persistente della sessione** e alle vecchie/nuove collocazioni, senza imporre il nome fisico `lesson_id`;
- disposizioni esplicite sui conflitti risolti dal docente;
- conteggi di controllo;
- receipt finale.

Il piano diventa obsoleto se uno degli snapshot governati cambia prima dell'applicazione.

## 13. Atomicità, concorrenza e rollback

La materializzazione deve garantire che:

- nessuna nuova versione risulti attiva se la parte obbligatoria della transizione fallisce;
- nessuna sessione risulti spostata se l'attivazione della versione non è completata coerentemente;
- retry con lo stesso `client_request_id` restituisca lo stesso esito o la receipt precedente;
- revision mismatch produca conflitto e nessuna scrittura parziale;
- il rollback tecnico non significhi riscrittura della storia già consolidata: riguarda soltanto una transazione non completata.

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

1. nuova versione con `effective_from` valido -> precedente chiudibile e nuova attivabile;
2. nuova versione con `effective_to = null`;
3. sessione precedente a `effective_from` -> invariata;
4. sessione già svolta -> invariata;
5. sessione futura su occorrenza equivalente -> nessuno spostamento didattico;
6. sessione futura con unica nuova occorrenza equivalente -> proposta di riallineamento;
7. due occorrenze equivalenti -> conflitto, nessuna scelta silenziosa;
8. nessuna occorrenza equivalente -> sessione preservata ma non collocata automaticamente;
9. riduzione ore settimanali -> nessuna sessione cancellata;
10. aumento ore settimanali -> nessuna sessione inventata;
11. collisione con altra sessione -> conflitto;
12. collisione con evento governato -> conflitto/avviso secondo dominio;
13. cambio classe/incarico -> nessun remapping silenzioso;
14. sequenza didattica preservabile -> ordine mantenuto;
15. sequenza non preservabile -> revisione docente;
16. materiali/obiettivi/note -> preservati nello spostamento;
17. personalizzazione della sessione -> preservata, non reinterpretata;
18. identità persistente della sessione -> invariata nello spostamento;
19. `TimetableSlot.id` vecchio -> non richiesto come identità della sessione dopo il cambio versione;
20. identità della vecchia occorrenza -> non riutilizzata artificialmente se la nuova versione genera una nuova occorrenza;
21. stessa transizione ritentata -> idempotente;
22. pianificazione mutata dopo anteprima -> piano obsoleto e nessuna applicazione;
23. vecchia versione mutata -> conflitto;
24. nuova versione mutata -> conflitto;
25. calendario/eccezioni mutati -> piano obsoleto;
26. applicazione fallita -> nessuno stato parziale osservabile;
27. receipt già presente -> retry sicuro;
28. nessuna sessione interessata -> sola transizione di versione, se valida;
29. eventi non-lezione -> non modificati;
30. vista calendario -> stessa sessione, nuova collocazione, nessun duplicato;
31. successivo nuovo orario -> chiude la versione corrente al nuovo confine senza riscrivere la storia;
32. fine attività didattiche senza nuovo orario -> nessuna data finale inventata da G1.4;
33. percorso ordinario -> riepilogo sintetico + una conferma, senza esposizione di identificatori tecnici;
34. un solo conflitto -> una sola decisione esplicita mostrata al docente;
35. molti elementi invariati -> non richiedono conferme individuali;
36. dettaglio tecnico -> secondario e non necessario per completare il percorso ordinario;
37. smartphone -> percorso completo senza dipendere da tabella larga o scorrimento orizzontale obbligatorio;
38. storico -> messaggio percepibile che conferma la non modifica;
39. contenuti/materiali -> messaggio percepibile che conferma la preservazione;
40. DOS-A1 -> non attivato.

## 16. Non-obiettivi

G1.4 non autorizza:

- parser/OCR o interpretazione del documento sorgente;
- modifica delle personalizzazioni delle celle;
- generazione autonoma di sessioni mancanti;
- cancellazione autonoma di sessioni eccedenti;
- modifica retroattiva dello storico;
- ripianificazione di riunioni/scadenze/circolari;
- pubblicazione Atlas;
- introduzione implicita di un `lesson_id` senza contratto persistente verificato;
- DOS-A1.

## 17. Gate per la materializzazione

Prima del runtime devono essere verificati:

- compatibilità con `TimetableVersion` e `TimetableSlot` correnti;
- compatibilità con `TIMETABLE_CANONICAL_SPEC` e modello temporale/calendario corrente;
- definizione/materializzazione della **identità persistente della sessione didattica**, distinta da slot e occorrenza;
- campi didattici da preservare durante il riallineamento;
- definizione precisa della semantica di chiusura della versione precedente;
- algoritmo di matching deterministico tra vecchie e nuove occorrenze e casi fail-closed;
- atomicità/idempotenza/concorrenza;
- anteprima teacher-first a divulgazione progressiva;
- percorso ordinario completabile con riepilogo sintetico + conferma;
- accessibilità e fruibilità smartphone senza tabella tecnica obbligatoria;
- materializzazione dei casi 1–40;
- review indipendente del contratto sul nuovo exact head;
- decisione umana finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN** resta attivo fino al completamento dei gate.