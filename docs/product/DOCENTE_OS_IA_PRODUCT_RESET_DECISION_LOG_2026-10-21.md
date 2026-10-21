# DOCENTE OS — IA Product Reset Decision Log

Data: 2026-10-21  
Stato: DRAFT / DECISION LOG — non autorizza implementazione  
Branch: `docs/dos-ia-product-reset`

## Scopo

Conservare in forma versionata le decisioni e le analisi del reset dell'information architecture di Docente OS, evitando che il lavoro resti soltanto nella conversazione.

Questo documento NON è ancora la specifica finale di implementazione. Distingue decisioni già approvate, direzioni accettate da consolidare e questioni ancora aperte.

## Diagnosi condivisa

Il problema non è principalmente visuale. Docente OS espone molte capability valide attraverso troppe destinazioni e percorsi equivalenti. Il risultato è rumore cognitivo: il docente deve scegliere il modulo software invece del lavoro professionale da svolgere.

Il precedente mockup task-centric ha prodotto indicazioni visuali utili, ma non viene più trattato come architettura normativa da riprodurre pixel-per-pixel. Resta materiale di ricerca e riferimento per gerarchia, calma visiva e continuità.

Principio guida:

> Il docente sceglie il proprio lavoro, non il modulo software che deve eseguirlo.

Principio di routing:

> Se il contesto è già determinato con sufficiente certezza, Docente OS porta direttamente al lavoro. Non inserisce passaggi intermedi inutili e non indovina quando il contesto non è certo.

Principio di esposizione:

> Una capability può essere potente, completa e importante senza essere una destinazione primaria.

Principio di semplificazione:

> Semplificare la IA non significa cancellare capability. Significa assegnare a ogni capability una casa coerente e renderla visibile soltanto quando serve.

---

## Backbone primario approvato

Navigazione quotidiana primaria:

- Oggi
- Orario
- Classi
- Altro

La Lezione NON è una voce della navigazione globale. È l'oggetto operativo centrale raggiungibile da Oggi, Orario o Classe.

Routing concettuale:

```text
Oggi --------> Lezione
Orario ------> Lezione
Classi -> Classe -> Lezione

Altro -> strumenti professionali
```

Quando Oggi o Orario conoscono già classe e lezione, il passaggio per Classe non è necessario.

---

## IA-01 — OGGI — APPROVATA

### Scopo

Oggi è la giornata didattica essenziale. Non è un planner generale e non è una dashboard delle capability del sistema.

### Contenuto ammesso al primo livello

Oggi mostra esclusivamente:

1. una eventuale **lezione terminata da registrare**;
2. la **prima lezione disponibile/prossima**;
3. gli **impegni del Calendario di oggi**, se presenti.

Se una lezione da registrare e una prossima lezione coesistono, vengono mostrate entrambe.

Vincolo: massimo **due oggetti didattici operativi + impegni di calendario**.

### CTA

Se il contesto è già determinato, la CTA porta direttamente alla Lezione, ad esempio:

- Registra la lezione
- Apri la lezione
- Continua la lezione
- Inizia la lezione

Non deve passare dalla Classe solo perché la Classe esiste come superficie.

### Contenuti esclusi da Oggi

Non appartengono al primo livello di Oggi:

- planner generico / lista completa delle attività;
- materiali come catalogo;
- progettazione;
- accessi rapidi generici;
- timeline completa della giornata;
- riepiloghi/dashboard;
- Piano annuale;
- Conoscenza;
- "altre decisioni" come contenitore generalista.

Gli impegni di Calendario rimangono eventi di Calendario: Oggi li legge, non ne cambia la natura.

### Attività generiche — decisione chiusa

La richiesta esplicita "Oggi deve mostrare la lezione disponibile e, se ci sono, alcuni impegni in calendario. Solo questo" chiude il punto precedentemente aperto sulle `PlannerTask`.

Le attività generiche restano una capability autonoma, ma **non vengono più composte dentro Oggi**. La loro nuova collocazione è `Altro -> Attività`.

---

## IA-02 — ORARIO — APPROVATA

### Vincolo principale

L'interfaccia di Orario attuale, incluse le viste **giornaliera e settimanale**, viene preservata. Non è oggetto di redesign strutturale.

### Ruolo

Orario è il punto di partenza temporale alternativo a Oggi.

Risponde a:

> Come è organizzata la mia settimana e quale lezione voglio aprire?

### Consultazione

In modalità di consultazione, quando una fascia identifica già con certezza classe e lezione, l'azione può aprire direttamente la Lezione.

### Modifica dell'orario

La modifica dell'orario resta una capability propria di Orario e non viene spostata in Altro.

Si preserva la separazione già esistente tra consultazione e manutenzione, incluso il flusso governato:

```text
Modifica -> Data di decorrenza -> Controlla / attiva
```

La modifica della bozza non cambia immediatamente l'orario in uso. L'attivazione resta una decisione esplicita finale.

Regola: in modalità modifica la griglia serve a modificare l'orario; non deve essere ambiguo se il tap significhi "apri la lezione" oppure "modifica lo slot".

Sintesi canonica:

> ORARIO = UI GIORNALIERA/SETTIMANALE PRESERVATA + accesso diretto alla Lezione in consultazione + modifica separata e governata.

---

## IA-03 — CLASSI / CLASSE — DIREZIONE ACCETTATA, DA FORMALIZZARE NELLA SPEC

### Classi

Classi è principalmente un selettore delle sezioni.

Al primo livello deve mostrare ciò che serve per identificare rapidamente una classe:

- classe;
- disciplina/cattedra essenziale;
- stato sintetico.

`Gestisci classi` resta una funzione secondaria di configurazione.

### Classe

La Classe è la **memoria professionale della sezione**, non un mini-Docente OS.

Deve rispondere a quattro domande:

1. Dove siamo?
2. Che cosa abbiamo fatto l'ultima volta?
3. Che cosa viene dopo?
4. Che cosa devo/posso fare adesso?

Primo livello:

- identità classe + disciplina;
- ultimo lavoro effettivamente registrato;
- prossima attività;
- avanzamento essenziale;
- una sola CTA contestuale dominante.

CTA possibili:

- Prepara la lezione
- Apri la lezione
- Continua la lezione
- Registra la lezione

La Classe non è un passaggio obbligatorio se Oggi o Orario conoscono già la Lezione.

### Capability secondarie della Classe

Da preservare, ma fuori dal primo livello:

- Diario / storia delle lezioni registrate;
- materiali della classe;
- Piano annuale;
- Progetta;
- Conoscenza / fonti;
- curricolo;
- registrazione avanzata;
- cattedra;
- dettagli professionali/tecnici.

Il Diario esistente è una capability coerente con questo modello: conserva lezioni svolte, osservazioni, prossima attività e stato di sincronizzazione Drive. Non deve diventare una voce primaria della navigazione globale; appartiene al contesto Classe.

---

## IA-04 — LEZIONE — DIREZIONE ACCETTATA, DA FORMALIZZARE NELLA SPEC

### Principio

La Lezione diventa il vero oggetto operativo centrale.

L'attuale sequenza:

```text
Prepara -> Conduci -> Osserva -> Registra
```

resta utile come modello interno/stato del sistema, ma non deve essere presentata al docente come quattro destinazioni concorrenti.

Per il docente esiste un solo workspace:

```text
Lezione · Classe · Disciplina · Titolo
```

che cambia contenuto in base allo stato.

### Prima della lezione

Primo livello:

- obiettivo;
- cosa serve;
- materiali essenziali;
- eventuale blocker reale;
- CTA `Inizia la lezione`.

Le regole di approvazione, curricolo e autorità restano attive senza diventare un itinerario tecnico da comprendere.

### Durante la lezione

Primo livello:

- attività/passaggio corrente;
- istruzione essenziale;
- materiale necessario;
- avanzamento leggero;
- CTA `Concludi la lezione`.

`Osserva` diventa una capability contestuale, ad esempio `Aggiungi osservazione`, non una destinazione primaria autonoma.

### Chiusura

Primo livello:

- esito;
- cosa è stato fatto;
- prossima attività;
- CTA `Registra la lezione`.

Opzioni come data, minuti, osservazioni dettagliate, voce, assistente, riflessione e dettagli restano disponibili come secondarie/progressive disclosure.

### Dopo la registrazione

Conferma breve con continuità:

- Lezione registrata;
- prossima attività;
- CTA `Prepara la prossima` oppure `Torna a Oggi`.

### Materiali dentro la Lezione

Le attuali superfici `materiali/prossima` e `in-classe/[assetId]` dimostrano capability valide: vista docente, LIM/scheda, materiali canonici, riconferma esplicita, supporto alla conduzione. Nella nuova IA queste funzioni devono diventare **viste/capability contestuali della Lezione**, non passaggi di navigazione obbligatori.

---

## IA-05 — ALTRO / STRUMENTI — DIREZIONE APPROVATA

Altro raccoglie capability professionali che devono restare disponibili ma non competere con il lavoro quotidiano primario.

Struttura target:

- Attività
- Progetta
- Materiali e fonti
- Piano annuale
- Calendario
- Documentazione
- Impostazioni
- Account e sicurezza

Capability come Curricolo Arena, assistente/Copilota, voce e strumenti di riconferma materiali vengono richiamate contestualmente senza diventare destinazioni primarie.

---

## Audit delle superfici esistenti — classificazione IA

### A. Superfici da preservare come destinazioni primarie

| Superficie attuale | Destino |
| --- | --- |
| `/planner` / Oggi | preservare come concetto Oggi, ma ridurre drasticamente il contenuto |
| `/orario` | preservare; UI giorno/settimana invariata |
| `/classi` | preservare come selettore |

La route tecnica finale di Oggi (`/`, `/planner` o alias/redirect) viene decisa nel piano tecnico, non nella IA.

### B. Superfici da preservare come strumenti sotto Altro

| Superficie/capability | Nuova casa |
| --- | --- |
| PlannerTask: crea, completa, sposta, attesa, riapri | `Altro -> Attività` |
| `/calendario` | `Altro -> Calendario` |
| `/progetta` | `Altro -> Progetta` |
| `/knowledge` | `Altro -> Materiali e fonti` |
| `/piano-annuale` | `Altro -> Piano annuale` |
| `/documentazione/modelli` | `Altro -> Documentazione` |
| `/impostazioni` | `Altro -> Impostazioni` |
| `/account` e MFA | `Altro -> Account e sicurezza` |

Il Calendario conserva la capacità di gestire giorni scolastici reali, sospensioni, impegni, scadenze e acquisizione verificata da circolare. Oggi ne legge soltanto gli impegni pertinenti alla data.

### C. Superfici da assorbire nel contesto corretto

| Superficie attuale | Capability da preservare | Nuova collocazione |
| --- | --- | --- |
| `/classi/[sectionId]/lezioni/[blockId]` | preparazione, conduzione, osservazione, registrazione | unico workspace Lezione |
| `/classi/[sectionId]/diario` | storia, osservazioni, prossima attività, sync Drive | livello secondario della Classe |
| `/classi/[sectionId]/in-classe/[assetId]` | uso materiale in classe, viewer, riconferma | capability della Lezione |
| `/materiali/prossima` | bundle prossimo incontro, viste LIM/scheda/docente | capability/materiali della Lezione |
| `/materiali/domani` | panoramica dei pacchetti di domani | strumento Materiali o accesso contestuale da Orario; non navigazione primaria |
| `curricolo-arena` | intake/controllo curricolare governato | contesto Classe/Lezione quando necessario |

### D. Superfici candidate a cessare di essere destinazioni autonome

#### Home attuale

La Home attuale ricompone già prossimo passo, lezioni, attività e accessi rapidi. Nella nuova IA questa funzione è assorbita da Oggi. La route `/` può diventare alias/redirect a Oggi; non serve conservare una seconda dashboard.

#### Resoconto della giornata

`/giornata/resoconto` oggi combina:

- lezioni da registrare;
- Diario/continuità;
- materiali di domani;
- decisioni aperte.

Nella nuova IA questi contenuti hanno già una casa più precisa:

- lezione conclusa da registrare -> Oggi / Lezione;
- continuità e riflessioni -> Classe / Diario;
- pacchetti futuri -> Materiali / Orario / Lezione;
- decisioni generiche -> non devono ricreare una dashboard parallela.

Conclusione: **candidato a ritiro come superficie autonoma**, dopo aver verificato che nessuna capability venga persa. Il loader e le logiche utili possono essere riusati; ritiro della pagina non significa cancellazione del dominio.

### E. Superfici di sistema fuori dalla IA quotidiana

- Login/autenticazione;
- workspace bootstrap/redirect;
- setup iniziale;
- MFA e sicurezza;
- altre superfici strettamente amministrative.

Restano necessarie ma non fanno parte del backbone quotidiano.

---

## Matrice anti-regressione estesa

| Capability attuale | Nuova collocazione | Regola |
| --- | --- | --- |
| Home | assorbita da Oggi | niente seconda dashboard |
| Oggi | primaria | max 2 lezioni operative + impegni Calendario |
| Orario giorno/settimana | primaria | UI preservata |
| Modifica/attivazione Orario | interna a Orario | flusso governato separato |
| Classi | primaria | selettore |
| Classe | memoria/continuità | una CTA dominante |
| Lezione | workspace operativo centrale | stato determinato dal contesto |
| Prepara | stato interno Lezione | non destinazione globale |
| Conduci | stato interno Lezione | non destinazione globale |
| Osserva | capability contestuale | non pagina obbligatoria |
| Registra | chiusura Lezione | persistenza invariata |
| Diario | secondario Classe | storia professionale |
| Viewer materiale in classe | Lezione | contestuale |
| Materiali prossima lezione | Lezione | contestuale |
| Materiali di domani | Altro/Materiali o Orario | secondario |
| Attività / PlannerTask | Altro -> Attività | escluse da Oggi |
| Calendario | Altro -> Calendario | Oggi legge solo impegni odierni |
| Circolare -> Calendario | Calendario | conferma esplicita invariata |
| Progetta | Altro -> Progetta | richiamabile da Classe/Lezione |
| Conoscenza / fonti | Altro -> Materiali e fonti | richiamabile contestualmente |
| Piano annuale | Altro -> Piano annuale | letto da Classe/Lezione |
| Documentazione | Altro -> Documentazione | capability professionale autonoma |
| Curricolo Arena | Classe/Lezione | fail-closed e governato |
| Assistente / Copilota | contestuale | mai destinazione primaria |
| Voce | contestuale | mai destinazione primaria |
| Impostazioni | Altro | configurazione |
| Account / MFA | Altro | sicurezza |
| Resoconto giornata | capability distribuite | candidata al ritiro come pagina autonoma |

---

## Invarianti da non rompere

1. Orario e Calendario restano domini distinti.
2. La Proiezione temporale può comporli senza riscriverli.
3. Piano annuale resta distinto da Calendario, Orario e Attività.
4. Le modifiche dell'Orario restano versionate e governate.
5. I blocker curricolari/di autorità non vengono aggirati per semplificare la UI.
6. La semplificazione riguarda esposizione, gerarchia e routing; non autorizza perdita di capability o indebolimento dei confini di dominio.
7. Nessun nuovo passaggio intermedio viene introdotto quando il sistema conosce già il contesto necessario.
8. In caso di ambiguità, il sistema non indovina.
9. Il Diario/TeachingSession resta la fonte della continuità reale della Classe.
10. Le fonti e i materiali conservano provenienza, versione e stato di approvazione anche quando vengono mostrati dentro la Lezione.
11. Le route legacy possono restare temporaneamente per compatibilità, ma non devono obbligare il docente a conoscere l'architettura interna.

---

## Questioni ancora da chiudere nella specifica

1. **Classe:** forma esatta del livello secondario (un unico `Approfondisci` oppure pochi accessi nominati come Diario/Materiali/Piano).
2. **Lezione:** regola precisa di transizione visibile tra prima/durante/dopo senza reintrodurre una barra di quattro moduli.
3. **Materiali di domani:** accesso preferenziale da Altro/Materiali, da Orario, o entrambi.
4. **Altro:** gerarchia interna e numero massimo di voci visibili senza creare un nuovo menu rumoroso.
5. **Route compatibility:** strategia di alias/redirect per Home, Planner, Resoconto e superfici assorbite.

Queste sono decisioni di design/implementazione successive; non riaprono IA-01 o IA-02.

---

## Stato del lavoro

- IA-01 Oggi: APPROVATA
- IA-02 Orario: APPROVATA
- Attività generiche fuori da Oggi: APPROVATA
- IA-03 Classi/Classe: DIREZIONE ACCETTATA / formalizzazione finale nella spec
- IA-04 Lezione: DIREZIONE ACCETTATA / formalizzazione finale nella spec
- IA-05 Altro: DIREZIONE APPROVATA / gerarchia interna da definire
- Audit superfici/capability: ESTESO / nessuna perdita volontaria autorizzata
- Matrice anti-regressione: ESTESA
- Implementazione: NON AUTORIZZATA
- Merge/deploy: NON AUTORIZZATI

Passo successivo: chiudere le cinque questioni residue di design, presentare il design integrato per approvazione, quindi trasformarlo in specifica canonica revisionata. Solo dopo la review della specifica si potrà preparare un piano di implementazione.
