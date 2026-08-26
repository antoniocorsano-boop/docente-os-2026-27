# DOCENTE OS — Settings Experience Contract

Data: 2026-08-26  
Stato: **CANONICAL / PRODUCT CONTRACT**  
Compatibilità: **COMPATIBLE** con persistence/RLS, `SETTINGS_CANONICAL_SPEC.md` e `TEXTBOOK_AND_PUBLISHER_RESOURCES_FOUNDATION_v1.md`

## 1. Decisione

Le **Impostazioni** non sono una pagina tecnica di parametri. Sono il percorso con cui il docente definisce e mantiene il proprio **contesto professionale di lavoro**.

Regola di prodotto:

> **DOCENTE OS non chiede mai un dato senza spiegare perché serve, dove verrà usato e cosa non modifica.**

Le Impostazioni hanno due modalità della stessa esperienza:

1. **Configurazione guidata** — quando il contesto non è ancora completo o contiene elementi da verificare;
2. **Gestione del contesto** — quando il contesto è completo e il docente torna per aggiornarlo.

Non esistono due archivi o due wizard separati: la stessa sorgente canonica viene presentata con un orientamento diverso in base allo stato reale.

## 2. Confine del modulo

Le Impostazioni contengono informazioni relativamente stabili che descrivono **dove, cosa, con chi e con quali risorse di base lavora il docente**.

Dentro Impostazioni:

- identità professionale;
- istituto;
- anno scolastico attivo, in sola lettura quando già determinato dal workspace;
- discipline;
- classi/sezioni;
- cattedra;
- libri di testo adottati/consigliati collegati alla Cattedra;
- organizzazione abituale della giornata/settimana scolastica.

Fuori da Impostazioni:

- Piano annuale e avanzamento B01–B33;
- UDA e progettazione;
- attività operative;
- documenti e fonti operative;
- eventi di Calendario;
- slot e versioni dell'Orario, salvo i preset usati per inizializzare la griglia;
- contenuti editoriali e sessioni/login dei siti degli editori.

Formula canonica:

> **Impostazioni definisce il contesto. Le altre aree fanno il lavoro.**

## 3. Sequenza guidata

L'ordine canonico è:

1. **Tu e la scuola** — chi sei e dove insegni;
2. **Discipline** — che cosa insegni;
3. **Classi** — con quali classi lavori;
4. **Cattedra** — in quali classi insegni quale disciplina e per quanto tempo settimanale;
5. **Libri di testo** — quali testi adotti o usi per ciascuna Cattedra;
6. **Organizzazione scolastica** — come è normalmente strutturata la settimana tipo.

Le dipendenze devono essere esplicite:

```text
Tu e la scuola
      ↓
Discipline + Classi
      ↓
Cattedra
      ↓
Libri di testo (facoltativi)

Cattedra + preset organizzativi
      ↓
Orario
```

`Libri di testo` dipende dalla Cattedra perché l'identità corretta è `classe + disciplina`. L'Orario non dipende dai libri.

## 4. Significato dei sei passaggi

### 4.1 Tu e la scuola

Domanda: **Chi sei e dove insegni?**

Serve a fornire il contesto professionale riutilizzato da DOCENTE OS.

Campi principali:

- nome visualizzato del docente;
- istituto;
- codice meccanografico opzionale;
- città opzionale;
- ordine/tipo di scuola;
- anno scolastico attivo in sola lettura.

Microcopy obbligatoria:

- **Serve a:** identificare correttamente il tuo spazio di lavoro;
- **Usato in:** contesto, intestazioni, documenti e futura ricerca delle adozioni ufficiali;
- **Non modifica:** attività, Piano annuale, Orario o Calendario.

Il codice meccanografico può essere usato per proporre adozioni dal dataset Open Data MIM, ma non deve avviare automaticamente alcuna conferma.

### 4.2 Discipline

Domanda: **Che cosa insegni?**

Le discipline attive sono disponibili nei moduli didattici e nella Cattedra.

Microcopy:

- **Serve a:** definire le discipline disponibili;
- **Usato in:** Cattedra, Orario, progettazione e contesto delle classi;
- **Non modifica:** le classi o gli slot dell'Orario già esistenti.

### 4.3 Classi

Domanda: **Con quali classi lavori?**

Una classe/sezione identifica un contesto didattico. Non implica ancora che il docente insegni una disciplina specifica in quella classe.

Formula canonica:

> **Classe = esiste nel mio contesto.**

Stati user-facing:

- `PROVVISORIA` → **Provvisoria**;
- `DA_CONFERMARE` → **Da confermare**;
- `CONFERMATA` → **Confermata**.

Microcopy:

- **Serve a:** definire le sezioni con cui lavori;
- **Usato in:** Cattedra, Piano annuale, progettazione e Orario;
- **Non modifica:** la Cattedra né inserisce lezioni nell'Orario.

### 4.4 Cattedra

Domanda: **In quali classi insegni cosa e per quante ore?**

Oggetto canonico persistente: `TeachingAssignment` / `teaching_assignments`.

La Cattedra collega:

```text
classe/sezione + disciplina + minuti settimanali + stato
```

Formula canonica:

> **Cattedra = la insegno.**

Microcopy:

- **Serve a:** collegare classi, discipline e monte ore settimanale;
- **Usato in:** Orario, libri di testo e controlli di capacità settimanale;
- **Non modifica:** Piano annuale, attività o Calendario;
- **Importante:** aggiungere una classe alla Cattedra non inserisce automaticamente lezioni nell'Orario.

Le Impostazioni e l'Orario leggono gli stessi record: non esiste una seconda Cattedra.

### 4.5 Libri di testo

Domanda: **Quali libri usi in ciascuna classe e disciplina?**

Il libro è legato alla Cattedra, non semplicemente alla classe.

Formula canonica:

> **Libro di testo = risorsa adottata o usata per quella Cattedra, non fonte normativa.**

La superficie deve supportare:

- più libri per una Cattedra;
- lo stesso ISBN riutilizzato in più Cattedre;
- `Adottato`, `Consigliato`, `Altro testo`;
- provenienza `Inserito dal docente` oppure `Proposto da Open Data MIM`;
- stato human-facing `Da controllare` / `Confermato`;
- URL ufficiale del libro quando disponibile.

Lifecycle obbligatorio:

```text
proposta manuale/MIM
       ↓
Da controllare
       ↓ azione esplicita del docente
Confermato
```

Una proposta MIM non è un'adozione confermata. Un libro inserito manualmente viene comunque creato prima come proposta e poi confermato con azione distinta.

Microcopy obbligatoria:

- **Serve a:** ricordare quale testo usi in ogni classe e disciplina;
- **Usato in:** Piano annuale, UDA, lezioni e futuri suggerimenti di materiali;
- **Non modifica:** curricolo, coverage, Orario o attività già create;
- **Accesso editore:** DOCENTE OS non salva password o credenziali dei siti editoriali.

Assenza di libri:

- non è un errore;
- non blocca Docente OS;
- l'area può risultare **Facoltativo**.

Presenza di proposte:

- l'area diventa **Da controllare**;
- la proposta deve essere visibile nel riepilogo principale;
- il docente deve poter aprire direttamente la superficie dettagliata.

La gestione dettagliata vive in `/impostazioni/libri-di-testo`, ma resta parte della stessa esperienza Impostazioni.

### 4.6 Organizzazione scolastica

Domanda: **Com'è normalmente organizzata la settimana?**

Contiene esclusivamente preset di costruzione:

- giorni abituali di lezione;
- ora di inizio;
- durata abituale di un periodo;
- numero abituale di periodi.

Formula canonica:

> **Il preset prepara la griglia. Non crea l'Orario.**

Microcopy:

- **Serve a:** velocizzare la costruzione della settimana tipo;
- **Usato in:** inizializzazione/interfaccia dell'Orario;
- **Non modifica:** versioni e slot dell'Orario già registrati, Calendario o Piano annuale.

## 5. Stati di configurazione

Gli stati user-facing ammessi sono:

- **Completo** — tutto ciò che serve è disponibile e non richiede conferma;
- **Da completare** — manca almeno un dato/legame necessario;
- **Da controllare** — i dati esistono ma contengono elementi provvisori o non confermati;
- **Facoltativo** — l'assenza del dato non blocca il lavoro.

Non mostrare nella superficie primaria status tecnici come `PROPOSED`, `CONFIRMED`, `configured`, `missing` o `invalid`.

Per `Libri di testo`:

- nessun libro → `Facoltativo`;
- almeno una proposta → `Da controllare`;
- tutte le Cattedre attive coperte da almeno un libro `Adottato` confermato → `Completo`;
- copertura parziale senza proposte → `Facoltativo` con sintesi del residuo.

## 6. Regole per il riepilogo iniziale

La pagina apre con un riepilogo a **sei aree**.

Ogni area mostra:

1. nome umano;
2. stato;
3. una sintesi reale dei dati presenti;
4. il passaggio successivo utile;
5. collegamento diretto alla sezione/superficie.

Esempi:

```text
Classi                 Da controllare
5 classi · 3 confermate
→ Controlla le classi
```

```text
Libri di testo         Da controllare
2 confermati · 1 da controllare
→ Controlla i libri proposti
```

La pagina deve dichiarare un orientamento complessivo:

- **Configuriamo il tuo spazio docente** se esistono aree `Da completare` o `Da controllare`;
- **Il tuo spazio docente** quando tutte le aree necessarie sono complete.

La progressione si esprime come **N di 6 aree pronte**, non con una percentuale astratta. Le aree `Facoltativo` sono considerate pronte perché non bloccano il lavoro.

## 7. Regola dei blocchi contestuali

Ogni sezione deve rispondere senza documentazione esterna a quattro domande:

1. **Che cos'è?**
2. **Perché serve?**
3. **Dove viene usato?**
4. **Cosa non modifica?**

Per i libri di testo si aggiunge una quinta informazione necessaria:

5. **Come viene gestito l'accesso editore?**

La risposta deve chiarire che DOCENTE OS non memorizza credenziali editore.

## 8. Regola dei vicoli ciechi

Nessuna sezione termina con un semplice stato vuoto o errore.

### Cattedra senza classi

> **Prima servono le tue classi.**  
> Per costruire la cattedra devo sapere con quali classi lavori. Puoi aggiungerle senza definire ancora l'Orario.

CTA: **Configura le classi**.

### Cattedra senza discipline

> **Prima indica cosa insegni.**  
> Aggiungi almeno una disciplina attiva; poi potrai collegarla alle tue classi.

CTA: **Configura le discipline**.

### Libri senza Cattedra

> **Prima serve la Cattedra.**  
> I libri vengono collegati alla relazione reale classe + disciplina, così non creiamo associazioni ambigue o duplicate.

CTA: **Configura la Cattedra**.

### Orario senza Cattedra

> **La cattedra non è ancora completa.**  
> Puoi vedere la griglia, ma per aggiungere una lezione servono almeno una classe e una disciplina associate.

CTA: **Completa la cattedra**.

## 9. Regola delle azioni e dei feedback

I verbi devono descrivere l'effetto reale:

- **Salva il contesto**;
- **Aggiungi disciplina**;
- **Aggiungi classe**;
- **Conferma classe**;
- **Aggiungi alla cattedra**;
- **Conferma cattedra**;
- **Aggiungi come proposta**;
- **Conferma questo libro**.

Per i libri è vietato un singolo bottone ambiguo `Aggiungi e conferma` quando la provenienza è automatica o non ancora verificata.

Dopo una modifica, il feedback ideale comunica anche cosa diventa possibile:

> ✓ Classe aggiunta. Ora puoi associarla alla tua cattedra.

> ✓ Libro confermato. Ora DOCENTE OS può usarlo come riferimento per quella Cattedra.

Non usare un generico `Salvato` quando è possibile spiegare l'effetto.

## 10. Regola della Cattedra condivisa

Le Impostazioni e l'Orario devono leggere e modificare **gli stessi `teaching_assignments`**.

`textbook_adoptions` deve puntare a quegli stessi record.

È vietato:

- creare una seconda tabella di associazioni classe-disciplina per i libri;
- copiare la Cattedra dentro i preset;
- generare slot Orario automaticamente alla creazione della Cattedra o del libro;
- modificare Piano annuale o Calendario come effetto collaterale;
- legare un libro solo a una label di classe quando esiste un `TeachingAssignment` canonico.

## 11. Regola di collaborazione

Nelle Impostazioni non viene montata una chat generica.

Sono ammessi aiuti contestuali discreti, per esempio:

> **Ti manca solo la cattedra.** Hai già indicato discipline e classi: completa le associazioni per poter costruire l'Orario.

> **Ho trovato un libro da controllare.** La fonte può suggerire l'adozione, ma sei tu a confermare che è il testo effettivamente usato in questa Cattedra.

L'assistente X3/X4 non prende il controllo della configurazione e non conferma libri autonomamente.

## 12. Accesso editore e contenuti protetti

La superficie Libri di testo può conservare metadati e link ufficiali, ma T1 non implementa autenticazione sui siti editoriali.

È vietato in Impostazioni:

- chiedere o memorizzare password dell'editore;
- replicare cookie/sessioni editore;
- dichiarare che un link pubblico autorizza l'ingestione AI del contenuto;
- scaricare in automatico manuali, verifiche o ebook protetti.

Le future slice Publisher Resources devono classificare accesso e policy d'uso prima dell'indicizzazione o ingestione.

## 13. Accessibilità e usabilità

Il percorso è conforme se:

- è completabile da tastiera;
- gli stati non dipendono solo dal colore;
- ogni CTA è comprensibile fuori contesto;
- gli errori spiegano come correggere il problema;
- su mobile le sei aree rimangono leggibili e navigabili;
- la superficie Libri passa a una colonna su schermi stretti senza perdere azioni o stato;
- nessun campo obbligatorio viene presentato senza etichetta e spiegazione utile;
- nessun ID o status tecnico è necessario per completare il percorso;
- le azioni di conferma restano distinguibili dai link verso il sito dell'editore.

## 14. Gate di accettazione

La slice Impostazioni + Textbook T1 può essere dichiarata completa solo se:

1. il riepilogo mostra correttamente le sei aree;
2. `Libri di testo` legge lo stato reale delle adozioni e segnala le proposte come `Da controllare`;
3. i dati correnti vengono riutilizzati senza duplicare classi, discipline o Cattedra;
4. Cattedra usa gli stessi `teaching_assignments` dell'Orario e i libri puntano a quegli stessi assignment;
5. la proposta non equivale mai a conferma;
6. l'assenza di un libro non blocca il prodotto;
7. l'Organizzazione scolastica resta chiaramente un preset, non l'Orario;
8. nessuna azione in Impostazioni modifica Piano annuale, UDA, attività o Calendario come effetto collaterale;
9. nessuna credenziale editore viene richiesta o persistita;
10. RLS e autenticazione proteggono le nuove tabelle;
11. test, typecheck, lint e build sono verdi;
12. il restore rehearsal delle migrazioni è verde;
13. la preview è utilizzabile su desktop e mobile.

## 15. Source of truth

Questo contratto governa l'esperienza utente delle Impostazioni.

Per persistenza, tabelle e invarianti tecnici rimangono autorevoli:

- `docs/architecture/SETTINGS_CANONICAL_SPEC.md`;
- `docs/architecture/TEXTBOOK_AND_PUBLISHER_RESOURCES_FOUNDATION_v1.md`.

In caso di conflitto:

1. security/RLS/domain invariants;
2. specifiche architetturali canoniche;
3. questo Settings Experience Contract;
4. Language & Collaboration System;
5. implementazione runtime corrente.
