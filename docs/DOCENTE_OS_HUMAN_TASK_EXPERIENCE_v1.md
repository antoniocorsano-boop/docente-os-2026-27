# DOCENTE OS — Human Task Experience v1

Stato: **CANONICAL — applicare alle nuove slice e alle revisioni delle viste esistenti**

## Obiettivo

DOCENTE OS deve ridurre il costo cognitivo del lavoro docente senza nascondere lo stato reale del sistema. L'interfaccia non rappresenta entità tecniche: rappresenta **compiti umani, avanzamento, conseguenze e prossima azione utile**.

## Modello canonico

Ogni flusso significativo deve rispondere, nell'ordine, a cinque domande percepibili dall'utente:

1. **Dove sono?** — contesto professionale e compito corrente.
2. **Cosa sto facendo?** — un'azione principale espressa nel linguaggio del docente.
3. **Cosa sta succedendo?** — stato del sistema visibile entro il tempo di percezione dell'azione.
4. **Cosa è al sicuro / cosa è cambiato?** — conseguenze esplicite, soprattutto per documenti e scritture.
5. **Cosa posso fare adesso?** — prossimo passo o recupero, senza obbligare a ricominciare.

## Regole di esperienza

### 1. Visibilità dello stato

- Dopo un'azione, rendere immediatamente percepibile lo stato: attesa, avanzamento, completamento o problema.
- Per operazioni a più fasi mostrare **poche tappe umane**, non dettagli tecnici.
- Non mostrare un successo finché il dato che l'utente considera essenziale non è realmente acquisito.

### 2. Linguaggio del mondo reale

Preferire:

- `Originale al sicuro`
- `Sto organizzando il contenuto`
- `Da controllare`
- `Pronto`
- `Riprova`

Evitare nell'interfaccia ordinaria:

- nomi di tabelle, bucket, provider, route, codici HTTP, nomi di job, identificatori tecnici;
- stati interni se non aiutano una decisione dell'utente.

I dettagli tecnici restano disponibili nei log e negli strumenti di diagnosi.

### 3. Recuperabilità

- Un errore non deve cancellare input o selezioni ancora utili.
- Il messaggio deve dire **cosa è successo, cosa è rimasto invariato e cosa fare ora**.
- Distinguere problemi che l'utente può correggere da problemi del servizio.
- Offrire `Riprova` sullo stesso contesto quando è sicuro farlo.

### 4. Progressiva esposizione

La vista primaria contiene solo ciò che serve al compito corrente. Provenienza estesa, versioni, diagnostica, impostazioni avanzate e gestione secondaria vanno esposte solo quando diventano necessarie.

Gerarchia preferita:

**azione corrente → stato → contenuto utile → azioni secondarie → dettagli tecnici/provenienza**.

### 5. Continuità del compito

Aprire una risorsa, una classe o un documento non deve far perdere il motivo per cui l'utente vi è arrivato. Preservare:

- classe/sezione;
- fase di progettazione;
- unità o blocco corrente;
- ritorno al punto di origine;
- input già forniti.

## Modello visuale

Il comfort visuale non coincide con l'aggiunta di decorazione. Le viste devono usare:

- **una gerarchia dominante** per schermata;
- superfici calme e contrasto riservato a stato e azione;
- densità informativa adattiva: più compatta negli elenchi, più distesa nei momenti decisionali;
- etichette di stato brevi e coerenti;
- spaziatura sufficiente a distinguere gruppi semantici;
- movimento minimo e rispettoso di `prefers-reduced-motion`;
- mobile come vincolo reale, non come riduzione tardiva della vista desktop.

Un colore di errore è riservato a un problema effettivo; non deve essere usato come semplice enfasi.

## Pattern di transazione DOCENTE OS

Per acquisizioni e scritture a più fasi usare il pattern:

**Selezione/decisione → Salvaguardia → Elaborazione → Conferma → Prossimo passo**

Esempio Conoscenza:

**File scelto → Originale al sicuro → Organizzato → Scheda contenuto**

Se fallisce la salvaguardia: la fase successiva non parte.

Se fallisce l'elaborazione dopo la salvaguardia: dichiarare esplicitamente che l'originale resta conservato.

## Gate di maturità per ogni slice

Una slice non è `UX_COMPLETE` se manca uno dei seguenti controlli:

- stato visibile;
- linguaggio non tecnico;
- recupero dall'errore senza perdita evitabile di lavoro;
- distinzione tra azione primaria e secondaria;
- comportamento mobile verificato;
- accessibilità semantica di stato/errore;
- acceptance test del percorso umano critico.

## Riferimenti di modello

- Nielsen Norman Group, *10 Usability Heuristics*: Visibility of System Status; Match Between System and the Real World; User Control and Freedom; Error Prevention; Help Users Recognize, Diagnose, and Recover from Errors. https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen Norman Group, *Heuristic Evaluation Workbook*. https://media.nngroup.com/media/articles/attachments/Heuristic_Evaluation_Workbook_-_Nielsen_Norman_Group.pdf
- GOV.UK Design System, *Patterns*: soluzioni progettuali per compiti e tipi di pagina centrati sull'utente. https://design-system.service.gov.uk/patterns/
- GOV.UK Design System, *Error message*: spiegare cosa è successo e come correggerlo, mantenendo i dati già inseriti. https://design-system.service.gov.uk/components/error-message/
- GOV.UK Design System, *Confirmation pages*: rassicurare sul completamento e rendere chiaro cosa succede dopo. https://design-system.service.gov.uk/patterns/confirmation-pages/
- GOV.UK Design System, *Task list / Complete multiple tasks*: stati brevi e raggruppamento dei compiti per rendere comprensibile l'avanzamento. https://design-system.service.gov.uk/components/task-list/
