# DOCENTE OS — Teacher AI Copilot Product Direction

Data: **2026-09-14**  
Stato: **PRODUCT DIRECTION / PROFESSIONAL_GAP_CONFIRMED**  
Issue: **#385 — AI-1 Contextual Voice Capture e copilota operativo del docente**  
Implementazione: **DEFERRED_UNTIL_UX0F**, salvo eccezione formalmente autorizzata.

## 1. Decisione

DOCENTE OS non deve evolvere aggiungendo genericamente “funzioni AI”.

Deve ridurre il lavoro di ricostruzione che oggi separa l’esperienza professionale del docente dal sistema digitale.

La direzione di prodotto è:

> **Docente OS è la memoria operativa e riflessiva del docente, con un copilota AI che comprende il contesto del suo lavoro e riduce il lavoro di ricostruzione, senza sostituire l’autonomia professionale.**

L’AI non è una destinazione del prodotto. È un livello di collaborazione che attraversa i task reali.

## 2. Problema professionale

Il docente lavora in continuità tra:

- preparazione;
- lezione;
- osservazione;
- adattamento;
- registrazione;
- documentazione;
- riflessione;
- preparazione della lezione successiva.

I sistemi digitali tradizionali frammentano questa continuità in moduli, form, archivi e tassonomie.

Ne deriva un costo professionale non necessario:

- ricordare dove è stato salvato qualcosa;
- ricostruire classe, disciplina, data, lezione e percorso;
- ricopiare contesto che il sistema possiede già;
- trasformare manualmente osservazioni in note, task, materiali o decisioni successive;
- cambiare continuamente superficie e modello mentale.

L’AI produce valore quando riduce questo costo senza appropriarsi delle decisioni professionali.

## 3. Di cosa ha bisogno il docente nell’era AI

### 3.1 Continuità contestuale

Il sistema deve sapere dove si trova il lavoro:

- anno scolastico;
- disciplina;
- classe;
- orario/lezione corrente o appena conclusa;
- attività prevista;
- materiali pertinenti;
- stato del percorso;
- elementi lasciati aperti.

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

### 3.3 Riduzione del lavoro amministrativo e cognitivo evitabile

Se il sistema conosce già classe, data, disciplina, lezione, UDA o blocco pertinente, non deve richiederne la reimmissione.

Il copilota deve trasformare la complessità interna in continuità percepita.

### 3.4 Supporto riflessivo

L’AI deve aiutare il docente a vedere pattern nel proprio lavoro, per esempio:

- difficoltà ricorrenti;
- concetti che richiedono più tempo del previsto;
- materiali che funzionano o non funzionano;
- scostamenti ripetuti dal piano;
- elementi da riprendere nella prossima lezione.

Il pattern è una proposta interpretativa, non una diagnosi o una decisione automatica.

### 3.5 Orchestrazione degli strumenti

Conoscenza, Planner, Piano annuale, Drive, Canva, Orario e altre capability devono entrare dal task corrente e poi riportare al task.

L’utente non deve sapere “quale modulo usare” prima di sapere cosa vuole fare professionalmente.

### 3.6 Agency professionale

L’AI:

- legge;
- riassume;
- collega;
- propone;
- anticipa conseguenze;
- prepara una write.

Il docente:

- interpreta;
- decide;
- conferma;
- corregge;
- rifiuta;
- assume la responsabilità professionale.

### 3.7 Provenance e verificabilità

Ogni informazione che alimenta una decisione deve poter mantenere il proprio stato:

- `DOCUMENTED`;
- `USER_REPORTED`;
- `INFERRED`;
- `TO_VERIFY`.

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

Il prodotto deve liberare attenzione.

Il successo non è il tempo trascorso in DOCENTE OS. È la possibilità per il docente di dedicare più attenzione a:

- osservare;
- spiegare;
- ascoltare;
- adattare;
- riflettere;
- progettare meglio.

## 4. Il ciclo operativo del copilota

Il modello di collaborazione è:

**Percepire → Comprendere → Decidere → Agire → Osservare → Riflettere → Adattare**

Il copilota sostiene tutte le fasi, ma non sostituisce quelle in cui è richiesta responsabilità professionale.

### Prima della lezione

- ricostruisce il contesto;
- mostra cosa viene dopo;
- recupera materiali e osservazioni pertinenti;
- evidenzia ciò che è rimasto aperto;
- propone preparazioni mirate.

### Durante la lezione

- resta discreto;
- rende disponibili materiali, esempi, domande o spiegazioni quando richiesti;
- non forza interazioni con il software.

### Subito dopo

- consente una cattura vocale o testuale rapidissima;
- usa il contesto noto per attribuire correttamente la riflessione;
- propone una struttura;
- richiede conferma prima di ogni persistenza significativa.

### Nel tempo

- collega osservazioni successive;
- evidenzia ricorrenze;
- propone di tenerne conto nella progettazione futura;
- non automatizza valutazione, completamento del Piano o decisioni professionali.

## 5. Contextual Voice Capture come caso paradigmatico

Lo speech-to-text non deve essere progettato come “strumento di dettatura”.

È un **canale di input del copilota contestuale**.

Formula operativa:

**lavora → parla → il sistema comprende il contesto → propone una struttura → il docente conferma → la memoria operativa si aggiorna**

Esempio:

> “Oggi hanno capito il concetto di sistema agricolo. La distinzione fra risorse naturali e mezzi tecnici è stata immediata; input e output sono ancora confusi. La prossima volta partirei da un esempio sull’irrigazione.”

Il sistema può proporre, senza decidere autonomamente:

- nota su ciò che è stato svolto;
- osservazione professionale;
- focus della prossima lezione;
- bisogno di preparazione/materiale.

Il docente conferma, modifica o scarta.

## 6. Regole di prodotto per la voce

1. **Nessuna nuova destinazione primaria.** Il microfono entra dal task o dal copilota.
2. **Contesto prima del testo.** La cattura deve sapere a quale lavoro potrebbe riferirsi.
3. **Binding deterministico quando possibile.** Classe/lezione esplicita prevale sulle inferenze.
4. **Ambiguità = conferma.** Non si persiste sotto una classe inferita in modo ambiguo.
5. **Audio effimero per default.** Il raw audio non diventa automaticamente un record.
6. **Classificazione propositiva.** L’AI propone categorie ed effetti; il docente li conferma.
7. **Una preview comprensibile.** Non mostrare il Product Model.
8. **Nessuna auto-valutazione.** La voce del docente non genera decisioni sugli alunni.
9. **Nessun auto-completamento del Piano.** Registrare ciò che è accaduto resta distinto dalla decisione di completamento.
10. **Fallback manuale sempre disponibile.** Il fallimento STT/AI non blocca il lavoro.

## 7. Relazione con UX-0

Questa direzione non autorizza feature creep durante UX-0.

La necessità professionale è classificata:

`PROFESSIONAL_GAP_CONFIRMED`

ma l’implementazione resta:

`DEFERRED_UNTIL_UX0F`

perché la priorità corrente è verificare che il core `Oggi → Classe → Lezione → Fatto` sia realmente semplice in uso umano.

La Contextual Voice Capture è coerente con UX-0 soltanto se riduce Task Cost e non crea una nuova scelta primaria.

## 8. Primo incremento post-UX0 raccomandato

Non partire dal provider STT.

Partire dal **contratto di Contextual Capture**:

1. entry point microfono in Classe/Lezione e copilota;
2. risoluzione del contesto;
3. trascrizione effimera;
4. classificazione in poche proposte comprensibili;
5. preview unica;
6. conferma/correzione/scarto;
7. persistenza tramite application layer esistente;
8. provenance;
9. recovery;
10. HVA mobile-first + HUMAN_USE reale.

Solo dopo scegliere/providerizzare il motore STT.

## 9. Non obiettivi

- registrazione continua della classe;
- sorveglianza degli studenti;
- riconoscimento o profilazione degli alunni;
- valutazione automatica;
- nuova chat separata;
- nuova destinazione primaria;
- raw audio conservato per default;
- write diretta del modello;
- bypass di privacy, RLS, AAL2, domain policy o human authority.

## 10. Riferimenti esterni

### UNESCO

*AI Competency Framework for Teachers* (2024, aggiornato 2026) identifica come dimensioni chiave mindset human-centred, etica dell’AI, fondamenti/applicazioni AI, pedagogia con AI e AI per lo sviluppo professionale.

https://www.unesco.org/en/articles/ai-competency-framework-teachers

### OECD

*Reimagining Teaching in an Accelerating World* (2026) collega la trasformazione della professione a autonomia, fiducia, collaborazione e uso dell’AI come alleato dell’insegnamento e dell’apprendimento.

https://www.oecd.org/en/publications/reimagining-teaching-in-an-accelerating-world_d0edfe8c-en.html

### Commissione europea

Gli *Orientamenti sull’uso etico dell’intelligenza artificiale e dei dati nell’insegnamento e nell’apprendimento* aggiornati nel 2026 insistono su decisioni informate e contestuali, AI literacy, gestione dei rischi, GDPR/AI Act e uso responsabile dei dati.

https://education.ec.europa.eu/it/focus-topics/digital-education/actions/plan/ethical-guidelines-for-educators-on-using-artificial-intelligence

## 11. Criterio finale

> **L’AI è utile quando restituisce capacità cognitiva al docente.**

DOCENTE OS non deve chiedere al docente di diventare operatore del proprio software. Deve assorbire la complessità di contesto, memoria, collegamento e trasformazione, lasciando all’insegnante la parte professionale: osservare, interpretare, decidere e agire.