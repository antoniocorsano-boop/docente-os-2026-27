# DOCENTE OS — Component Rules

Stato: **CANONICAL**

## Prima il compito, poi il componente

Un nuovo componente è ammesso quando rappresenta un pattern di lavoro riusabile. Non creare componenti solo per ottenere una variante estetica locale.

## Azioni

- Una superficie decisionale ha una sola azione primaria evidente.
- Azioni distruttive non condividono stile o posizione con l'azione primaria ordinaria.
- Pulsanti disabilitati devono avere una ragione comprensibile dal contesto.
- Su mobile le azioni principali devono essere raggiungibili senza precisione fine del puntatore.

## Stato

- Badge e pill descrivono stato, non categorie arbitrarie.
- Il colore non è l'unico canale: ogni stato ha testo leggibile.
- `role="status"` per aggiornamenti non critici; `role="alert"` per problemi che richiedono attenzione immediata.
- Caricamenti a più fasi espongono la fase umana corrente e ciò che è già stato salvaguardato.

## Schede ed elenchi

- Una scheda esiste quando i dati formano un'unità semantica autonoma.
- Evitare “card dentro card” senza una vera relazione gerarchica.
- Gli elenchi ripetitivi devono rendere riconoscibili titolo, stato e prossima azione senza aprire ogni elemento.
- Metadati secondari non devono dominare il titolo o il contenuto utile.

## Dettagli progressivi

Usare `details/summary` o pattern equivalenti per versioni, diagnostica, gestione avanzata e sequenze molto dense quando non servono subito al compito corrente.

Non nascondere invece:

- errori;
- conseguenze di una scrittura;
- stato della operazione in corso;
- decisioni che l'utente deve prendere ora.

## Modali e pannelli flottanti

- Devono avere uno scopo circoscritto e una via d'uscita evidente.
- Non devono coprire stabilmente il contesto necessario alla decisione.
- Su mobile l'altezza deve essere limitata e verificata con browser reale.

## Formulari

- Etichetta esplicita; placeholder come esempio, non come unica istruzione.
- In caso di errore conservare i valori già validi.
- Messaggio di errore vicino al problema e con istruzione di recupero.
- Evitare campi obbligatori che il sistema può ricavare in modo affidabile dal contesto.

## Provenienza

La provenienza deve essere disponibile quando modifica il significato, l'attendibilità o la decisione. Nella vista primaria va mostrata nella forma più breve utile; dettagli tecnici e identificatori restano secondari.

## Adozione di componenti esterni

Una libreria o sorgente esterna può accelerare l'implementazione, ma il componente va adattato ai token, al linguaggio, alle regole mobile e al Human Experience Contract. Nessun componente esterno entra nel prodotto solo perché visivamente convincente.