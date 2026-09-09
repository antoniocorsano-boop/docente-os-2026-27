# DOCENTE OS — Revisione del percorso quotidiano del docente

Data: 2026-09-09  
Baseline: `develop` @ `d7d7464c655d937234081c7a7fc8dd2373cd2d8a`  
Stato: PRODUCT REVIEW / PROPOSTA OPERATIVA

## 1. Problema

DOCENTE OS dispone di molte superfici funzionali corrette, ma il docente non vive la giornata per moduli software. Vive una sequenza temporale di compiti professionali.

Il rischio attuale è che Home, Oggi, Orario, Calendario, Classi, Piano annuale, Progetta e Conoscenza competano per attenzione e costringano il docente a decidere ogni volta “dove andare”.

La domanda principale deve diventare:

> Che cosa serve a questo docente adesso, in questo momento della sua giornata?

## 2. Principio guida

La shell continua a offrire tutte le funzioni, ma la superficie primaria deve essere **Oggi** come proiezione temporale e operativa del sistema.

Oggi non è un altro database e non duplica Orario, Calendario, Planner, Classi o Piano annuale. Compone le loro informazioni e propone il prossimo passo.

Catena canonica:

`contesto temporale → impegni → lezioni → preparazione → conferme → esecuzione → registrazione → continuità`

## 3. Momenti della giornata

### A. Prima dell’inizio della giornata scolastica

Domande del docente:

- quali impegni ho oggi?
- quali classi vedrò e a che ora?
- ci sono riunioni, scadenze o adempimenti?
- quali lezioni sono previste?
- manca qualcosa da predisporre?
- ci sono proposte dell’assistente che richiedono una mia conferma?

La superficie Oggi deve mostrare:

1. data e contesto scolastico;
2. linea temporale sintetica degli impegni;
3. lezioni del giorno ricavate dall’Orario;
4. eventi e impegni dal Calendario/agenda operativa;
5. stato di preparazione di ogni lezione;
6. materiali necessari;
7. sole anomalie o mancanze che richiedono attenzione;
8. eventuali proposte preparate dall’assistente in attesa di conferma.

Azione primaria:

- se tutto è pronto: **Apri la prossima attività**;
- se manca qualcosa: **Completa la preparazione**;
- se esiste una proposta non confermata necessaria per la lezione: **Rivedi e conferma**.

### B. Poco prima di una lezione

Il sistema deve cambiare priorità senza cambiare contesto.

Mostrare:

- classe;
- ora;
- aula se disponibile;
- UDA/blocco previsto;
- obiettivo sintetico;
- materiali;
- risorse da aprire o distribuire;
- eventuali adattamenti pertinenti;
- evidenze da osservare;
- stato della proposta dell’assistente.

Non mostrare in primo piano riferimenti normativi, versioni, metadati, intero piano annuale o documenti canonici.

Azione primaria: **Inizia la lezione**.

### C. Durante la lezione

Modalità FOCUSED.

Mostrare:

- sequenza operativa;
- tempi;
- materiali;
- consegne;
- indicatori/evidenze pertinenti alla fase;
- eventuale supporto contestuale richiudibile.

Una sola azione primaria per volta.

### D. Tra una lezione e l’altra

Mostrare soltanto:

- cosa è appena successo e se richiede registrazione;
- prossimo impegno;
- tempo residuo;
- eventuale materiale ancora da predisporre.

Azioni possibili:

- **Registra la lezione**;
- **Apri la prossima attività**.

### E. Fine giornata

Mostrare:

- lezioni svolte/non svolte;
- registrazioni mancanti;
- attività generate durante la giornata;
- impegni imminenti dei giorni successivi;
- sole preparazioni che conviene anticipare.

Azione primaria: **Chiudi le attività di oggi**.

## 4. Gerarchia delle viste

### Livello 1 — alta frequenza

1. **Oggi** — centro operativo quotidiano.
2. **Classi** — accesso al contesto professionale della classe.
3. **Orario** — struttura ricorrente della settimana.
4. **Calendario** — eventi, riunioni, scadenze e agenda temporale non coincidente con l’orario didattico.

### Livello 2 — lavoro periodico

5. **Progetta** — progettazione di UDA, lezioni e materiali.
6. **Piano annuale** — progressione curricolare e avanzamento.
7. **Conoscenza** — fonti, documenti, circolari, materiali e contenuti.

### Livello 3 — configurazione

8. **Impostazioni** — contesto, preferenze, integrazioni e notifiche.

Home deve essere riesaminata: se duplica Oggi senza un compito distinto, va ridotta a ingresso/orientamento o assorbita dalla superficie Oggi.

## 5. Notifica mattutina

### Obiettivo

Fornire al docente un riepilogo breve e operativo prima dell’inizio della giornata.

### Configurazione

L’utente sceglie:

- attiva/disattiva;
- ora del riepilogo;
- giorni scolastici o giorni della settimana;
- canale disponibile e autorizzato.

### Contenuto

La notifica non deve diventare un report lungo. Deve indicare:

- primo impegno e ora;
- numero di lezioni/impegni della giornata;
- eventuali preparazioni mancanti;
- eventuali conferme necessarie;
- collegamento ad **Apri Oggi**.

Esempio concettuale:

> Oggi hai 4 lezioni e 1 impegno. La prima attività è Tecnologia in 1ª A alle 8:15. Le prime due lezioni sono pronte; per la 2ª C manca ancora la conferma dei materiali proposti. Apri Oggi.

### Vincoli

- opt-in esplicito;
- permesso browser richiesto nel contesto corretto, non all’accesso iniziale;
- nessun dato personale degli alunni nella notifica;
- contenuto breve e professionale;
- fallback in-app se la notifica browser non è disponibile;
- non dichiarare “pronto” ciò che non è stato verificato;
- non inviare notifiche duplicate.

## 6. Preparazione automatica delle lezioni

Il sistema può predisporre una **proposta di preparazione**, ma deve distinguere rigorosamente:

### Confermato

Elementi già derivati da fonti canoniche o accettati dal docente.

### Proposto

Scelte o suggerimenti elaborati dall’assistente che modificano o completano la preparazione.

### Mancante

Prerequisiti o risorse necessari ma non disponibili.

La UI non deve mescolare queste categorie.

Pattern:

`Ho predisposto → Evidenzio cosa deriva dalle fonti → Segnalo cosa propongo → Mostro l’effetto → Confermi tu`

La conferma non deve essere richiesta per semplici letture o ricomposizioni di dati già validi. Deve essere richiesta quando l’assistente introduce una scelta professionale significativa.

## 7. Stati di preparazione della lezione

Stati umani proposti:

- **Pronta** — fonti e materiali necessari disponibili, nessuna decisione professionale pendente;
- **Da confermare** — preparazione disponibile ma contiene una o più proposte che richiedono decisione del docente;
- **Da completare** — manca almeno un prerequisito necessario;
- **In aggiornamento** — elaborazione ancora in corso;
- **Da riprovare** — elaborazione fallita, con precedente stato preservato se disponibile.

## 8. Riduzione del caos

Regole immediate:

1. non aggiungere nuove destinazioni principali;
2. Oggi deve comporre, non duplicare;
3. una sola azione primaria per momento;
4. le informazioni secondarie entrano per progressive disclosure;
5. nessuna pagina deve obbligare il docente a capire da quale modulo proviene un dato;
6. Orario e Calendario restano fonti temporali distinte ma vengono composti in Oggi;
7. le lezioni vengono collegate alla progressione annuale e alle risorse senza mostrare i codici interni;
8. il sistema evidenzia eccezioni e mancanze, non conferma continuamente ciò che è già normale;
9. l’assistente prepara e propone; il docente mantiene l’autorità sulle decisioni professionali;
10. notifiche e riepiloghi devono portare a un’azione, non creare un secondo luogo da consultare.

## 9. Percorso minimo da validare

Verticale di accettazione prioritario:

`notifica mattutina → Apri Oggi → vedi impegni → individua prossima lezione → verifica stato preparazione → conferma eventuale proposta → Inizia lezione → Registra → torna a Oggi → prossima attività`

Questo percorso deve essere testato su mobile prima di ulteriori espansioni.

## 10. Metriche di prodotto da validare

Budget interni proposti:

- capire il primo impegno della giornata: <= 5 s;
- capire se esistono preparazioni mancanti: <= 5 s;
- arrivare alla prossima lezione: 1 azione;
- distinguere confermato/proposto/mancante: immediato nel primo viewport pertinente;
- iniziare una lezione pronta: 1 azione;
- tornare alla sequenza della giornata: 1 azione;
- nessun bisogno di aprire Orario + Calendario + Piano annuale separatamente per capire cosa fare adesso.

## 11. Decisione di prodotto proposta

Prima di sviluppare nuove funzionalità, trattare **Oggi come orchestratore umano della giornata** e riesaminare Home, navigazione e notifiche rispetto a questo contratto.

Il primo incremento tecnico deve essere piccolo:

1. definire un `DailyTeacherBrief` derivato dalle fonti esistenti;
2. mostrare in Oggi la timeline unificata di lezioni + impegni;
3. associare a ogni lezione `Pronta / Da confermare / Da completare`;
4. rendere visibile un’unica prossima azione;
5. aggiungere preferenza per il riepilogo mattutino senza ancora introdurre dipendenze da servizi esterni;
6. validare il verticale mobile con HVA/HIM prima di implementare il canale di notifica definitivo.
