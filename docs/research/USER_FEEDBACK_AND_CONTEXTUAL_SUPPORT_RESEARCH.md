# DOCENTE OS — User Feedback & Contextual Support Research

Status: RESEARCH BASELINE / MUST INFORM PRODUCT DESIGN
Date: 2026-08-22

## Perché questo documento esiste

DOCENTE OS deve aiutare il docente senza trasformare ogni schermata in un manuale e deve raccogliere feedback senza interrompere il compito. Questa ricerca definisce il comportamento canonico per supporto contestuale, feedback sull'esperienza e ciclo di miglioramento del prodotto.

## 1. Evidenze e riferimenti maturi

### GOV.UK — feedback e soddisfazione

GOV.UK raccomanda di rendere possibile il feedback quando l'utente ha terminato il servizio e di misurare la soddisfazione con una scala semplice, accompagnata quando utile da una domanda aperta facoltativa. Il feedback deve essere usato per migliorare il servizio, non raccolto come fine a sé stesso.

Riferimenti:
- https://www.gov.uk/service-manual/service-assessments/get-feedback-page
- https://www.gov.uk/service-manual/measuring-success/measuring-user-satisfaction

### Office for National Statistics — feedback pattern

Il pattern ONS separa chiaramente invito, modulo e conferma. La ricerca ONS evidenzia che gli utenti preferiscono fornire feedback alla fine del compito e che il feedback non dovrebbe interrompere una transazione. Gli utenti vogliono inoltre capire perché il feedback viene chiesto e come verrà usato.

Riferimento:
- https://service-manual.ons.gov.uk/design-system/patterns/feedback

### Department for Education — ask users for feedback

Il pattern DfE raccomanda di chiedere feedback alla fine di un journey o task e di non inserirlo nel mezzo del percorso principale.

Riferimento:
- https://design.education.gov.uk/design-system/patterns/ask-users-for-feedback

### GOV.UK Design System — Details

Il componente Details è appropriato per informazioni che alcuni utenti possono aver bisogno di vedere, ma che non sono necessarie a tutti per completare il compito. Non deve nascondere informazioni essenziali.

Riferimento:
- https://design-system.service.gov.uk/components/details/

### GOV.UK Design System — error messages

Gli errori devono spiegare in modo specifico cosa è successo e come correggerlo, evitando messaggi generici quando l'utente può intervenire. I dati già inseriti non dovrebbero essere persi a causa di un errore di validazione.

Riferimento:
- https://design-system.service.gov.uk/components/error-message/

### GOV.UK Service Manual — user support

Il supporto deve essere progettato come parte del servizio e le evidenze provenienti dalle richieste di aiuto devono alimentare il miglioramento continuo, non restare isolate come gestione reattiva dei problemi.

Riferimento:
- https://www.gov.uk/service-manual/helping-people-to-use-your-service/set-up-and-manage-user-support

## 2. Decisione di prodotto

> Supporto nel punto di bisogno; feedback alla fine del compito.

Durante il lavoro DOCENTE OS può mostrare una sola forma di supporto contestuale leggero, normalmente dietro una divulgazione progressiva come **“Serve una mano?”**.

Dopo il completamento di un compito può comparire una richiesta discreta **“Com'è andato questo flusso?”**.

Supporto e feedback non sono la stessa cosa:

- il supporto aiuta a completare il compito corrente;
- il feedback raccoglie evidenza sull'esperienza appena conclusa;
- la segnalazione di un problema tecnico è un terzo canale e non deve essere confusa con la soddisfazione.

## 3. Regole canoniche per il supporto contestuale

1. Il supporto non interrompe mai l'azione primaria.
2. Deve essere specifico per il task e lo stato corrente.
3. Le informazioni necessarie a completare il compito restano visibili: non vengono nascoste nel supporto.
4. Il supporto aggiuntivo è collassato per default quando il compito è già comprensibile.
5. Una superficie FOCUSED usa al massimo un punto di accesso al supporto allo stesso livello.
6. Il supporto non ripete la documentazione completa.
7. Il supporto non introduce nuovi obblighi, stati o azioni non presenti nel dominio.
8. Quando un dettaglio deriva da una fonte incompleta, il sistema lo dichiara senza inventare riempitivi.

### Applicazione al verticale B01

- PREPARE: le spunte della checklist sono promemoria locali e non vengono salvate.
- TEACH: la sequenza canonica guida 110 minuti dei 120 disponibili; i 10 minuti residui restano non assegnati dalla fonte. Il prodotto non inventa come utilizzarli.
- OBSERVE: gli indicatori sono promemoria; non è necessario selezionarli tutti e non vengono registrati dati individuali degli alunni.
- RECORD: si registra l'esito reale e una nota breve solo se utile; una modifica successiva conserva la data originaria della lezione.

## 4. Regole canoniche per il feedback utente

1. Chiedere feedback al completamento di un task/journey, non durante il task.
2. La richiesta è facoltativa, discreta e non blocca la continuazione.
3. Il sistema acquisisce automaticamente il contesto operativo già noto; non chiede all'utente di riscrivere classe, pagina, UDA o identificatori tecnici.
4. Usare una scala a cinque livelli e un commento aperto facoltativo.
5. Il commento deve ricordare di non inserire nomi di alunni o altri dati personali.
6. Il feedback sull'esperienza non deve contenere dati degli alunni.
7. Il feedback viene conservato come evidenza immutabile dell'esperienza, non come modifica diretta del prodotto.
8. Un singolo feedback non determina automaticamente una decisione di design.
9. Problemi ricorrenti vengono raggruppati per journey, superficie e intento prima della prioritizzazione.
10. Dopo l'invio, il sistema conferma in modo chiaro che il feedback è stato ricevuto e spiega sinteticamente come sarà usato.

## 5. Modello dati minimo

Il runtime conserva per ogni feedback:

- workspace;
- anno scolastico, se pertinente;
- superficie;
- journey;
- intento Human Task;
- contesto operativo minimo costruito dal server;
- soddisfazione 1–5;
- commento facoltativo;
- autore autenticato;
- timestamp.

Il contesto tecnico viene catturato automaticamente e non viene mostrato come onere all'utente.

Per il verticale lezione il contesto può contenere internamente sezione, blocco e projection id. Questi identificatori servono alla diagnosi del prodotto ma non sono etichette primarie dell'interfaccia.

## 6. Sicurezza e privacy

- RLS obbligatoria.
- Inserimento consentito solo a membri autenticati dello workspace.
- `created_by` deve coincidere con l'utente autenticato.
- Nessun accesso anonimo.
- L'app ordinaria non necessita di lettura, modifica o cancellazione del feedback: la raccolta è append-only dal punto di vista del docente.
- Nessun nome alunno, valutazione individuale, dato sanitario o altra informazione sensibile nel feedback di prodotto.

## 7. Feedback improvement loop

Il ciclo maturo è:

**Capture → Contextualize → Cluster → Prioritize → Test → Implement → Re-measure**

### Capture
Raccogliere un segnale breve e facoltativo dopo un task reale.

### Contextualize
Collegare automaticamente il segnale a superficie, journey e Human Task intent.

### Cluster
Raggruppare temi ricorrenti: orientamento, terminologia, quantità di informazioni, latenza, azione primaria, ritorno, errori, contenuto mancante.

### Prioritize
Dare precedenza a problemi che impediscono o rallentano compiti frequenti e importanti, non semplicemente ai commenti più recenti.

### Test
Formulare una modifica verificabile e un criterio di successo.

### Implement
Applicare la modifica mantenendo i contratti Human Task e la provenienza canonica.

### Re-measure
Verificare se soddisfazione, tempo sul task, errori o richieste di aiuto migliorano realmente.

## 8. Anti-pattern vietati

- popup o survey nel mezzo della lezione;
- feedback obbligatorio;
- una nuova voce primaria “Feedback” nella navigazione quotidiana;
- chiedere all'utente codici, URL o nomi tecnici che il sistema conosce già;
- campo libero come unico segnale senza contesto;
- usare il feedback come canale per dati sugli alunni;
- interpretare un singolo commento come requisito automaticamente approvato;
- confondere feedback di esperienza con segnalazione di bug o richiesta di assistenza;
- mostrare help esteso prima dell'azione primaria.

## 9. Acceptance

Una superficie Human Task con supporto/feedback è matura quando:

- il supporto è raggiungibile con un solo gesto ma non compete con l'azione primaria;
- il supporto cambia in base al punto del task;
- il task si può completare senza aprire il supporto;
- nessuna richiesta di feedback compare prima del completamento;
- il feedback può essere inviato in meno di circa 20 secondi;
- l'utente non deve inserire identificatori tecnici;
- il contesto viene acquisito automaticamente e validato lato server;
- l'invio non modifica il Piano annuale o altri dati didattici;
- il feedback non contiene dati degli alunni;
- la conferma di invio è chiara e non interrompe la continuazione.

## 10. Applicazione iniziale obbligatoria

Primo journey di riferimento:

**Classe → Prepara → In classe → Osserva → Registra → Classe → feedback facoltativo**

Il feedback appare solo quando la registrazione del Piano annuale esiste realmente. Un parametro URL da solo non è sufficiente a mostrare una conferma o a rendere disponibile la raccolta del feedback.
