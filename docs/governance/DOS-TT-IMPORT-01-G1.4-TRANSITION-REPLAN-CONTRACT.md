# DOS-TT-IMPORT-01 / G1.4 — Contratto governato di transizione temporale e ripianificazione

Stato: DRAFT — GOVERNANCE FIRST
Baseline: `develop@89826e4e6ff9e82dcf0c8105595ce36723941eea`
Dipendenze: G1.2 e G1.3 integrate. Nessuna applicazione runtime o ripianificazione è autorizzata da questo documento.

## 1. Scopo

G1.4 governa ciò che accade **dopo** che un nuovo quadro orario settimanale è stato acquisito e revisionato secondo G1.3: transizione dalla versione precedente alla nuova versione a partire da `effective_from` e gestione delle lezioni già pianificate interessate dal cambio di orario.

G1.4 non interpreta il documento sorgente e non ridefinisce le personalizzazioni delle celle dell'orario.

Flusso canonico:

`candidato G1.3 revisionato -> bozza G1.2 -> anteprima transizione -> impatto sulle lezioni future -> risoluzione conflitti -> conferma docente -> attivazione versione -> ripianificazione governata`

## 2. Invarianti

1. **Storia immutabile.** Nessuna lezione o attività con collocazione anteriore a `effective_from` viene spostata, ricreata, cancellata o reinterpretata dalla transizione.
2. **Stato storico preservato.** Svolto, pianificato, materiali, note, collegamenti curricolari e altre evidenze pregresse non vengono riscritti retroattivamente.
3. **Teacher-first.** Il docente vede l'impatto prima dell'applicazione e decide sui casi non deterministici.
4. **Versionamento temporale.** La nuova `TimetableVersion` inizia a `effective_from`; la precedente viene chiusa al confine immediatamente precedente secondo la semantica temporale del dominio, senza sovrapposizioni né vuoti artificiali.
5. **Termine aperto.** La nuova versione mantiene `effective_to = null` finché non arriva una successiva versione o un altro confine governato.
6. **Identità didattica preservata.** Una lezione futura già pianificata non viene trattata come contenuto nuovo solo perché cambia giorno/ora.
7. **No silent drop.** Nessuna lezione futura pianificata può scomparire perché il nuovo quadro offre meno slot o una corrispondenza non è determinabile.
8. **No silent duplication.** Una transizione non può duplicare una lezione già pianificata.
9. **Personalizzazioni fuori dal mapping strutturale.** Teoria, disegno, disposizione e altre qualificazioni della cella non determinano l'importazione; se già associate a una lezione futura, vengono preservate come attributi della lezione quando compatibili e non reinterpretate dal nuovo documento.
10. **Atomicità logica.** Attivazione della versione e ripianificazione approvata devono produrre uno stato coerente; un fallimento non deve lasciare metà transizione applicata.
11. **Idempotenza.** Ripetere la stessa transizione approvata non deve creare ulteriori spostamenti, duplicati o mutazioni.
12. **Nessun DOS-A1.** G1.4 non autorizza decisioni didattiche autonome.

## 3. Confine temporale

`effective_from` è il confine canonico.

- prima di `effective_from`: dominio storico, non modificabile da G1.4;
- da `effective_from` in avanti: dominio potenzialmente interessato dalla nuova versione;
- la versione precedente viene chiusa in funzione dell'inizio della nuova versione;
- la nuova versione resta aperta (`effective_to = null`);
- l'eventuale termine generale delle attività didattiche appartiene al calendario/anno scolastico e non viene duplicato come data inventata nel contratto di importazione.

La transizione deve fallire se `effective_from` non è risolto o se produce intervalli di validità incoerenti.

## 4. Oggetto della ripianificazione

Sono candidate alla ripianificazione soltanto le **lezioni già pianificate e non storiche** la cui collocazione dipende da slot della versione precedente a partire da `effective_from`.

Non sono candidate automaticamente:

- lezioni già svolte;
- lezioni anteriori a `effective_from`;
- eventi di calendario non appartenenti al quadro delle lezioni;
- attività prive di relazione con gli slot modificati;
- contenuti didattici non ancora associati a una specifica lezione temporale.

## 5. Identità didattica da preservare

Lo spostamento temporale deve preservare, ove presenti e compatibili:

- identificatore stabile della lezione;
- classe/sezione e disciplina/incarico;
- sequenza didattica e posizione logica;
- obiettivi e riferimenti curricolari;
- contenuti e attività previste;
- materiali e risorse collegate;
- note/preparazione docente;
- eventuali qualificazioni personali già associate alla lezione;
- provenance e collegamenti ad Arena/Atlas secondo i contratti vigenti;
- stato della lezione, salvo una transizione di stato esplicitamente richiesta da altro contratto.

La ripianificazione modifica la **collocazione temporale**, non il significato didattico della lezione.

## 6. Matching tra vecchio e nuovo quadro

Il motore di transizione deve produrre un piano puro prima di ogni scrittura.

Classi minime di esito:

- `UNCHANGED_SLOT` — stessa collocazione strutturale;
- `MOVED_SLOT` — slot equivalente spostato;
- `REMOVED_SLOT_WITH_TARGET` — slot precedente non esiste ma è individuabile una nuova collocazione univoca compatibile;
- `REMOVED_SLOT_NO_TARGET` — nessuna nuova collocazione disponibile;
- `MULTIPLE_TARGETS` — più collocazioni plausibili;
- `CAPACITY_CONFLICT` — il nuovo quadro non offre capacità sufficiente per tutte le lezioni pianificate;
- `ASSIGNMENT_CONFLICT` — classe/incarico non coerente;
- `OUTSIDE_TRANSITION_SCOPE` — elemento non interessato.

Il matching deve privilegiare identità di classe/incarico, ordine didattico e sequenza temporale. Non può usare semplicemente la posizione della cella o un'etichetta visuale come unica prova di equivalenza.

## 7. Regole di ripianificazione deterministica

Una lezione può essere proposta come ripianificata automaticamente nell'anteprima solo se:

1. appartiene al dominio futuro (`>= effective_from`);
2. esiste un unico slot nuovo compatibile;
3. classe/incarico sono coerenti;
4. non si crea collisione con altra lezione/evento governato;
5. l'ordine relativo della sequenza didattica non viene invertito in modo incoerente;
6. non viene superata la capacità disponibile del nuovo quadro;
7. candidato, vecchia versione, nuova versione e pianificazione non sono cambiati dopo il calcolo.

`automaticamente` significa **proposta automatica**, non applicazione automatica. L'applicazione richiede il gate previsto dalla governance.

## 8. Conflitti e casi non deterministici

Devono essere sottoposti al docente almeno:

- riduzione del numero di ore disponibili;
- più slot nuovi equivalenti;
- nessuno slot compatibile;
- cambio di classe/incarico;
- collisione con impegni già presenti;
- sequenza didattica che non può essere mantenuta;
- lezione futura già modificata manualmente dopo la generazione dell'anteprima;
- qualsiasi divergenza tra revisioni/fingerprint utilizzati per il piano e stato corrente.

Il sistema deve proporre opzioni comprensibili senza cancellare contenuti. Il docente può confermare uno spostamento, scegliere una diversa collocazione, lasciare la lezione da ripianificare oppure escluderla dalla transizione quando il dominio lo consente.

## 9. Anteprima di transizione

Prima dell'applicazione il docente deve vedere almeno:

- data di entrata in vigore;
- versione precedente -> nuova versione;
- numero di slot invariati, spostati, aggiunti e rimossi;
- numero di lezioni future non interessate;
- numero di lezioni ripianificabili deterministicamente;
- numero e natura dei conflitti;
- per ogni lezione interessata: collocazione attuale -> proposta;
- evidenza chiara che le lezioni precedenti a `effective_from` non saranno toccate;
- avviso se restano lezioni senza collocazione risolta.

La vista deve privilegiare eccezioni e conflitti, evitando una lista indistinta dell'intero anno.

## 10. Piano di transizione

Il piano deve essere versionato e contenere almeno:

- `transition_id` / `client_request_id` idempotente;
- `previous_timetable_version_id` e revisione/fingerprint;
- `next_timetable_version_id` e revisione/fingerprint;
- `effective_from`;
- snapshot/revisione della pianificazione considerata;
- operazioni di chiusura/attivazione versione;
- operazioni di ripianificazione con `lesson_id`, vecchia collocazione e nuova collocazione;
- disposizioni esplicite sui conflitti risolti dal docente;
- conteggi di controllo;
- receipt finale.

Il piano diventa obsoleto se uno degli snapshot governati cambia prima dell'applicazione.

## 11. Atomicità, concorrenza e rollback

La materializzazione deve garantire che:

- nessuna nuova versione risulti attiva se la parte obbligatoria della transizione fallisce;
- nessuna lezione risulti spostata se l'attivazione della versione non è completata coerentemente;
- retry con lo stesso `client_request_id` restituisca lo stesso esito o la receipt precedente;
- revision mismatch produca conflitto e nessuna scrittura parziale;
- il rollback tecnico non significhi riscrittura della storia già consolidata: riguarda soltanto una transazione non completata.

## 12. Relazione con calendario e altre superfici

G1.4 governa il legame tra **versione dell'orario** e **lezioni pianificate**. Non autorizza automaticamente modifiche a:

- impegni personali;
- riunioni;
- scadenze;
- circolari;
- eventi istituzionali non-lezione;
- programmazioni/UDA come contenuto didattico;
- pubblicazioni Atlas.

Se una lezione ripianificata è rappresentata anche in una vista calendario, tale vista deve riflettere la nuova collocazione tramite la stessa identità della lezione, non tramite duplicazione dell'evento.

## 13. Casi di prova governati G1.4

La materializzazione deve rendere eseguibili almeno questi casi:

1. nuova versione con `effective_from` valido -> precedente chiudibile e nuova attivabile;
2. nuova versione con `effective_to = null`;
3. lezione precedente a `effective_from` -> invariata;
4. lezione già svolta -> invariata;
5. lezione futura su slot invariato -> nessuno spostamento;
6. lezione futura con unico slot equivalente spostato -> proposta di ripianificazione;
7. due slot equivalenti -> conflitto, nessuna scelta silenziosa;
8. nessuno slot equivalente -> lezione preservata ma non collocata automaticamente;
9. riduzione ore settimanali -> nessuna lezione cancellata;
10. aumento ore settimanali -> nessuna lezione inventata;
11. collisione con altra lezione -> conflitto;
12. collisione con evento governato -> conflitto/avviso secondo dominio;
13. cambio classe/incarico -> nessun remapping silenzioso;
14. sequenza didattica preservabile -> ordine mantenuto;
15. sequenza non preservabile -> revisione docente;
16. materiali/obiettivi/note -> preservati nello spostamento;
17. personalizzazione della lezione -> preservata, non reinterpretata;
18. lesson_id -> invariato nello spostamento;
19. stessa transizione ritentata -> idempotente;
20. pianificazione mutata dopo anteprima -> piano obsoleto e nessuna applicazione;
21. vecchia versione mutata -> conflitto;
22. nuova versione mutata -> conflitto;
23. applicazione fallita -> nessuno stato parziale osservabile;
24. receipt già presente -> retry sicuro;
25. nessuna lezione interessata -> sola transizione di versione, se valida;
26. eventi non-lezione -> non modificati;
27. vista calendario -> stessa lezione, nuova collocazione, nessun duplicato;
28. successivo nuovo orario -> chiude la versione corrente al nuovo confine senza riscrivere la storia;
29. fine attività didattiche senza nuovo orario -> nessuna data finale inventata da G1.4;
30. DOS-A1 -> non attivato.

## 14. Non-obiettivi

G1.4 non autorizza:

- parser/OCR o interpretazione del documento sorgente;
- modifica delle personalizzazioni delle celle;
- generazione autonoma di lezioni mancanti;
- cancellazione autonoma di lezioni eccedenti;
- modifica retroattiva dello storico;
- ripianificazione di riunioni/scadenze/circolari;
- pubblicazione Atlas;
- DOS-A1.

## 15. Gate per la materializzazione

Prima del runtime devono essere verificati:

- compatibilità con `TimetableVersion`, modello delle lezioni e calendario corrente;
- definizione precisa della semantica di chiusura della versione precedente;
- identità stabile della lezione e campi da preservare;
- algoritmo di matching deterministico e casi fail-closed;
- atomicità/idempotenza/concorrenza;
- anteprima teacher-first accessibile e fruibile su smartphone;
- materializzazione dei casi 1–30;
- review indipendente del contratto;
- decisione umana finale.

**HOLD_RUNTIME / HOLD_PRODUCTION_APPLY / HOLD_REPLAN** resta attivo fino al completamento dei gate.