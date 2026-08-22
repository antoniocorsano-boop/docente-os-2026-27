# DOCENTE OS — Settings Experience Contract

Data: 2026-08-22  
Stato: **CANONICAL / PRODUCT CONTRACT**  
Compatibilità: **COMPATIBLE** con persistence/RLS e `SETTINGS_CANONICAL_SPEC.md`

## 1. Decisione

Le **Impostazioni** non sono una pagina tecnica di parametri. Sono il percorso con cui il docente definisce e mantiene il proprio **contesto professionale di lavoro**.

Regola di prodotto:

> **DOCENTE OS non chiede mai un dato senza spiegare perché serve, dove verrà usato e cosa non modifica.**

Le Impostazioni hanno due modalità della stessa esperienza:

1. **Configurazione guidata** — quando il contesto non è ancora completo o contiene elementi da verificare;
2. **Gestione del contesto** — quando il contesto è completo e il docente torna per aggiornarlo.

Non esistono due archivi o due wizard separati: la stessa sorgente canonica viene presentata con un orientamento diverso in base allo stato reale.

## 2. Confine del modulo

Le Impostazioni contengono soltanto informazioni relativamente stabili che descrivono **dove, cosa e con chi lavora il docente**.

Dentro Impostazioni:

- identità professionale;
- istituto;
- anno scolastico attivo, in sola lettura quando già determinato dal workspace;
- discipline;
- classi/sezioni;
- cattedra;
- organizzazione abituale della giornata/settimana scolastica.

Fuori da Impostazioni:

- Piano annuale e avanzamento B01–B33;
- UDA e progettazione;
- attività operative;
- documenti e fonti;
- eventi di Calendario;
- slot e versioni dell'Orario, salvo i preset usati per inizializzare la griglia.

Formula canonica:

> **Impostazioni definisce il contesto. Le altre aree fanno il lavoro.**

## 3. Sequenza guidata

L'ordine canonico è:

1. **Tu e la scuola** — chi sei e dove insegni;
2. **Discipline** — che cosa insegni;
3. **Classi** — con quali classi lavori;
4. **Cattedra** — in quali classi insegni quale disciplina e per quanto tempo settimanale;
5. **Organizzazione scolastica** — come è normalmente strutturata la settimana tipo.

Le dipendenze devono essere esplicite:

```text
Tu e la scuola
      ↓
Discipline + Classi
      ↓
Cattedra
      ↓
Orario usa la Cattedra
```

L'Orario non è una dipendenza delle Impostazioni e non viene creato dal percorso guidato.

## 4. Significato dei cinque passaggi

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
- **Usato in:** contesto, intestazioni e documenti;
- **Non modifica:** attività, Piano annuale, Orario o Calendario.

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

Stati già disponibili:

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
- **Usato in:** Orario e controlli di capacità settimanale;
- **Non modifica:** Piano annuale, attività o Calendario;
- **Importante:** aggiungere una classe alla Cattedra non inserisce automaticamente lezioni nell'Orario.

La Cattedra appartiene al contesto professionale ed è configurabile da Impostazioni. L'Orario continua a leggere gli stessi record canonici: non esiste una seconda cattedra.

### 4.5 Organizzazione scolastica

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

Gli stati user-facing ammessi per le aree di Impostazioni sono:

- **Completo** — tutto ciò che serve è disponibile e non richiede conferma;
- **Da completare** — manca almeno un dato/legame necessario;
- **Da controllare** — i dati ci sono ma contengono elementi provvisori o non confermati;
- **Facoltativo** — l'assenza del dato non blocca il lavoro.

Non mostrare nella superficie primaria: `configured`, `missing`, `invalid`, `PROVISIONAL`, `CONFIRMED` o altri status tecnici.

## 6. Regole per il riepilogo iniziale

La pagina apre con un riepilogo a cinque aree.

Ogni area mostra:

1. nome umano;
2. stato;
3. una sintesi reale dei dati presenti;
4. il passaggio successivo utile;
5. collegamento diretto alla sezione.

Esempio:

```text
Classi                 Da controllare
5 classi · 3 confermate
→ Controlla le classi
```

La pagina deve dichiarare un orientamento complessivo:

- **Configuriamo il tuo spazio docente** se esistono aree `Da completare` o `Da controllare`;
- **Il tuo spazio docente** quando tutte le aree necessarie sono complete.

La progressione si esprime come **N di 5 aree pronte**, non con una percentuale astratta.

## 7. Regola dei blocchi contestuali

Ogni sezione deve rispondere senza documentazione esterna a quattro domande:

1. **Che cos'è?**
2. **Perché serve?**
3. **Dove viene usato?**
4. **Cosa non modifica?**

La spiegazione primaria resta breve. Approfondimenti ulteriori possono stare in `Perché serve?` o `Dettagli`, ma non devono essere necessari per completare il flusso.

## 8. Regola dei vicoli ciechi

Nessuna sezione deve terminare con un semplice stato vuoto o errore.

Esempi canonici:

### Cattedra senza classi

> **Prima servono le tue classi.**  
> Per costruire la cattedra devo sapere con quali classi lavori. Puoi aggiungerle senza definire ancora l'Orario.

CTA: **Configura le classi**.

### Cattedra senza discipline

> **Prima indica cosa insegni.**  
> Aggiungi almeno una disciplina attiva; poi potrai collegarla alle tue classi.

CTA: **Configura le discipline**.

### Orario senza Cattedra

> **La cattedra non è ancora completa.**  
> Puoi vedere la griglia, ma per aggiungere una lezione servono almeno una classe e una disciplina associate.

CTA: **Completa la cattedra**.

## 9. Regola delle azioni e dei feedback

I verbi devono descrivere l'effetto reale:

- **Salva modifiche**;
- **Aggiungi disciplina**;
- **Aggiungi classe**;
- **Conferma classe**;
- **Aggiungi alla cattedra**;
- **Conferma cattedra**.

Dopo una modifica, il feedback ideale comunica anche cosa diventa possibile:

> ✓ Classe aggiunta. Ora puoi associarla alla tua cattedra.

oppure:

> ✓ Cattedra aggiornata. L'Orario userà questi dati quando aggiungi le lezioni.

Non usare un generico `Salvato` quando è possibile spiegare l'effetto.

## 10. Regola della Cattedra condivisa

Le Impostazioni e l'Orario devono leggere e modificare **gli stessi `teaching_assignments`**.

È vietato:

- creare una seconda tabella di associazioni;
- copiare la cattedra dentro i preset;
- generare slot Orario automaticamente alla creazione della Cattedra;
- modificare Piano annuale o Calendario come effetto collaterale.

## 11. Regola di collaborazione

Nelle Impostazioni non viene montata una chat generica.

Sono ammessi soltanto aiuti contestuali discreti, per esempio:

> **Ti manca solo la cattedra.** Hai già indicato discipline e classi: completa le associazioni per poter costruire l'Orario.

Oppure:

> **Questa modifica interessa l'Orario.** Cambiare il monte ore non modifica il Piano annuale né le attività già create.

L'assistente X3/X4 non deve prendere il controllo della configurazione.

## 12. Accessibilità e usabilità

Il percorso è conforme se:

- è completabile da tastiera;
- gli stati non dipendono solo dal colore;
- ogni CTA è comprensibile fuori contesto;
- gli errori spiegano come correggere il problema;
- su mobile le cinque aree rimangono leggibili e navigabili;
- nessun campo obbligatorio viene presentato senza etichetta e spiegazione utile;
- nessun ID o status tecnico è necessario per completare il percorso.

## 13. Gate di accettazione

La slice Impostazioni guidate può essere dichiarata completa solo se:

1. il riepilogo mostra correttamente le cinque aree;
2. i dati correnti vengono riutilizzati senza migrazione o duplicazione;
3. Cattedra usa gli stessi `teaching_assignments` dell'Orario;
4. le dipendenze Discipline/Classi → Cattedra sono esplicite;
5. l'Organizzazione scolastica è chiaramente un preset, non l'Orario;
6. nessuna azione in Impostazioni modifica Piano annuale, attività o Calendario fuori dai legami già canonici delle classi;
7. RLS e autenticazione restano invariati;
8. test, typecheck, lint e build sono verdi;
9. la preview Netlify è utilizzabile su desktop e mobile.

## 14. Source of truth

Questo contratto governa l'esperienza utente delle Impostazioni.

Per persistenza, tabelle e invarianti tecnici rimane autorevole `docs/architecture/SETTINGS_CANONICAL_SPEC.md`.

In caso di conflitto:

1. security/RLS/domain invariants;
2. `SETTINGS_CANONICAL_SPEC.md`;
3. questo Settings Experience Contract;
4. Language & Collaboration System;
5. implementazione runtime corrente.
