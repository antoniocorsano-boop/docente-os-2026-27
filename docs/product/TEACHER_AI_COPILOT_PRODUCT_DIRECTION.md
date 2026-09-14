# DOCENTE OS — Teacher AI Copilot Product Direction

Data: **2026-09-14**  
Stato: **CANONICAL CANDIDATE / PROFESSIONAL_GAP_CONFIRMED**  
Issue: **#385**  
Programma: **#387 — Teacher Operating System V1**

## 1. Decisione

DOCENTE OS non deve evolvere aggiungendo genericamente “funzioni AI”.

Deve ridurre il lavoro di ricostruzione che oggi separa l’esperienza professionale del docente dal sistema digitale.

La direzione di prodotto è:

> **Docente OS è la memoria operativa e riflessiva del docente, con un copilota AI che comprende il contesto del suo lavoro e riduce il lavoro di ricostruzione, senza sostituire l’autonomia professionale.**

L’AI non è una destinazione del prodotto. È un livello di collaborazione che attraversa i task reali.

## 2. Problema professionale

Il docente lavora in continuità tra preparazione, lezione, osservazione, adattamento, registrazione, documentazione, riflessione e preparazione della lezione successiva.

I sistemi digitali tradizionali frammentano questa continuità in moduli, form, archivi e tassonomie. Ne deriva un costo professionale non necessario:

- ricordare dove è stato salvato qualcosa;
- ricostruire classe, disciplina, data, lezione e percorso;
- ricopiare contesto che il sistema possiede già;
- trasformare manualmente osservazioni in note, task, materiali o decisioni successive;
- cambiare continuamente superficie e modello mentale.

L’AI produce valore quando riduce questo costo senza appropriarsi delle decisioni professionali.

## 3. Di cosa ha bisogno il docente nell’era AI

### 3.1 Continuità contestuale

Il sistema deve sapere dove si trova il lavoro: anno scolastico, disciplina, classe, lezione corrente o appena conclusa, attività prevista, materiali pertinenti, stato del percorso ed elementi lasciati aperti.

Il docente non deve ricostruire il contesto ad ogni interazione.

### 3.2 Memoria operativa e riflessiva

DOCENTE OS deve conservare e rendere recuperabili:

- cosa era previsto;
- cosa è realmente accaduto;
- cosa il docente ha osservato;
- cosa è rimasto incompleto;
- cosa richiede attenzione;
- cosa il docente intende modificare o preparare.

La memoria non è una chat infinita. È informazione professionale strutturata, con provenance e controllo umano.

### 3.3 Riduzione del lavoro cognitivo evitabile

Se il sistema conosce già classe, data, disciplina, lezione, UDA o blocco pertinente, non deve richiederne la reimmissione.

Il copilota deve trasformare la complessità interna in continuità percepita.

### 3.4 Supporto riflessivo

L’AI deve aiutare il docente a vedere pattern nel proprio lavoro: difficoltà ricorrenti, concetti che richiedono più tempo del previsto, materiali che funzionano o non funzionano, scostamenti ripetuti dal piano, elementi da riprendere nella prossima lezione.

Il pattern è una proposta interpretativa, non una diagnosi o una decisione automatica.

### 3.5 Orchestrazione degli strumenti

Conoscenza, Planner, Piano annuale, Drive, SharePoint/OneDrive, Canva, Orario, Calendar/Outlook e Teams devono entrare dal task corrente e poi riportare al task.

L’utente non deve sapere “quale modulo usare” prima di sapere cosa vuole fare professionalmente.

### 3.6 Agency professionale

L’AI legge, riassume, collega, propone, anticipa conseguenze e prepara una write.

Il docente interpreta, decide, conferma, corregge, rifiuta e assume la responsabilità professionale.

### 3.7 Provenance e verificabilità

Ogni informazione che alimenta una decisione mantiene il proprio stato epistemico: `DOCUMENTED`, `USER_REPORTED`, `INFERRED`, `TO_VERIFY`.

L’AI non trasforma un’inferenza in fatto soltanto perché è linguisticamente plausibile.

### 3.8 Privacy e minimizzazione

Il copilota non giustifica una raccolta indiscriminata di dati.

Regole di base:

- contesto minimo necessario;
- niente dati alunno non necessari;
- nessun monitoraggio continuo;
- nessuna sorveglianza della classe;
- persistenza soltanto quando esiste un caso d’uso professionale esplicito;
- separazione tra dati effimeri di elaborazione e record professionali confermati.

### 3.9 Presenza in classe, non presenza nel software

Il successo non è il tempo trascorso in DOCENTE OS. È la capacità di restituire attenzione al docente perché possa osservare, spiegare, ascoltare, adattare e riflettere.

## 4. Ciclo operativo del copilota

**Percepire → Comprendere → Decidere → Agire → Osservare → Riflettere → Adattare**

Il copilota sostiene tutte le fasi, ma non sostituisce quelle in cui è richiesta responsabilità professionale.

### Prima della lezione

Ricostruisce il contesto, mostra cosa viene dopo, recupera materiali e osservazioni pertinenti, evidenzia ciò che è rimasto aperto e propone preparazioni mirate.

### Durante la lezione

Resta discreto, rende disponibili materiali, esempi, domande o spiegazioni quando richiesti e non forza interazioni con il software.

### Subito dopo

Consente una cattura vocale o testuale rapidissima, usa il contesto noto per attribuire correttamente la riflessione, propone una struttura e richiede conferma prima di ogni persistenza significativa.

### Nel tempo

Collega osservazioni successive, evidenzia ricorrenze e propone di tenerne conto nella progettazione futura, senza automatizzare valutazione, completamento Piano o decisioni professionali.

## 5. Contextual Voice Capture come caso paradigmatico

Lo speech-to-text non è uno “strumento di dettatura”. È un **canale di input del copilota contestuale**.

Formula operativa:

**lavora → parla → il sistema comprende il contesto → propone una struttura → il docente conferma → la memoria operativa si aggiorna**

Una singola cattura può proporre:

- nota su ciò che è stato svolto;
- osservazione professionale;
- focus della prossima lezione;
- bisogno di preparazione/materiale;
- promemoria del docente.

Il docente conferma, modifica o scarta.

## 6. Regole di prodotto per la voce

1. Nessuna nuova destinazione primaria: il microfono entra dal task o dal copilota.
2. Contesto prima del testo.
3. Binding deterministico quando possibile.
4. Ambiguità = conferma.
5. Audio effimero per default.
6. Classificazione propositiva, non autoritativa.
7. Una preview comprensibile, senza Product Model.
8. Nessuna auto-valutazione.
9. Nessun auto-completamento del Piano.
10. Fallback manuale sempre disponibile.

## 7. Relazione con Teacher OS V1

La necessità professionale è `PROFESSIONAL_GAP_CONFIRMED` e viene assorbita nel programma #387.

- V1-A costruisce il contesto `TeacherMoment`.
- V1-B riduce la lezione a un `Lesson Brief` operativo.
- V1-C rende reale il copilota e introduce Contextual Voice Capture.
- V1-D applica le policy istituzionali ai provider AI, voce e storage.

La voce è coerente con il prodotto soltanto se riduce Task Cost e non crea una nuova scelta primaria.

## 8. Criterio finale

> **L’AI è utile quando restituisce capacità cognitiva al docente.**

DOCENTE OS non deve chiedere al docente di diventare operatore del proprio software. Deve assorbire la complessità di contesto, memoria, collegamento e trasformazione, lasciando all’insegnante la parte professionale: osservare, interpretare, decidere e agire.
