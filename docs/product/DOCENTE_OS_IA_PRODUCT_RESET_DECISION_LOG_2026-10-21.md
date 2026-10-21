# DOCENTE OS — IA Product Reset Decision Log

Data: 2026-10-21  
Stato: DRAFT / DECISION LOG — non autorizza implementazione  
Branch: `docs/dos-ia-product-reset`

## Scopo

Conservare in forma versionata le decisioni e le analisi del reset dell'information architecture di Docente OS, evitando che il lavoro resti soltanto nella conversazione.

Questo documento NON è ancora la specifica finale di implementazione. Distingue decisioni già approvate da proposte ancora da chiudere.

## Diagnosi condivisa

Il problema non è principalmente visuale. Docente OS espone molte capability valide attraverso troppe destinazioni e percorsi equivalenti. Il risultato è rumore cognitivo: il docente deve scegliere il modulo software invece del lavoro professionale da svolgere.

Il precedente mockup task-centric ha prodotto indicazioni visuali utili, ma non viene più trattato come architettura normativa da riprodurre pixel-per-pixel. Resta materiale di ricerca e riferimento per gerarchia, calma visiva e continuità.

Principio guida:

> Il docente sceglie il proprio lavoro, non il modulo software che deve eseguirlo.

Principio di routing:

> Se il contesto è già determinato con sufficiente certezza, Docente OS porta direttamente al lavoro. Non inserisce passaggi intermedi inutili e non indovina quando il contesto non è certo.

Principio di esposizione:

> Una capability può essere potente, completa e importante senza essere una destinazione primaria.

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

## IA-03 — CLASSI / CLASSE — PROPOSTA DA CONSOLIDARE

### Classi

Classi è principalmente un selettore delle sezioni.

Al primo livello dovrebbe mostrare solo ciò che serve per identificare rapidamente una classe:

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

Primo livello proposto:

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

Capability da preservare ma spostare fuori dal primo livello:

- storia/registro della classe;
- materiali della classe;
- Piano annuale;
- Progetta;
- Conoscenza / fonti;
- curricolo;
- registrazione avanzata;
- cattedra;
- dettagli professionali/tecnici.

---

## IA-04 — LEZIONE — PROPOSTA DA CONSOLIDARE

### Principio

La Lezione diventa il vero oggetto operativo centrale.

L'attuale sequenza:

```text
Prepara -> Conduci -> Osserva -> Registra
```

resta utile come modello interno/stato del sistema, ma non deve necessariamente essere presentata al docente come quattro destinazioni navigabili.

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

`Osserva` diventa una capability contestuale, ad esempio `Aggiungi osservazione`, non necessariamente una pagina separata.

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

---

## IA-05 — ALTRO / STRUMENTI — DIREZIONE APPROVATA, DETTAGLI DA CHIUDERE

Altro raccoglie capability professionali che devono restare disponibili ma non competere con il lavoro quotidiano primario.

Inventario preliminare:

- Attività;
- Progetta;
- Materiali e fonti / Conoscenza;
- Piano annuale;
- Calendario;
- Documentazione;
- Impostazioni;
- Account e sicurezza.

Capability come Curricolo Arena, assistente/Copilota e voce possono essere richiamate contestualmente senza diventare destinazioni primarie.

---

## Matrice anti-regressione preliminare

| Capability attuale | Nuova collocazione proposta |
| --- | --- |
| Home | assorbita da Oggi; route tecnica da decidere |
| Oggi | superficie primaria essenziale |
| Orario giorno/settimana | primaria; UI preservata |
| Modifica/attivazione Orario | modalità secondaria interna a Orario |
| Classi | primaria; selettore |
| Classe | memoria/continuità della sezione |
| Lezione | workspace operativo centrale |
| Prepara | stato/capability della Lezione |
| Conduci | stato della Lezione |
| Osserva | capability contestuale della Lezione |
| Registra | stato finale della Lezione |
| Attività / PlannerTask | proposta: Altro -> Attività |
| Calendario | Altro -> Calendario; gli impegni odierni sono leggibili da Oggi |
| Progetta | Altro -> Progetta; richiamabile contestualmente |
| Conoscenza / fonti | Altro -> Materiali e fonti; richiamabile contestualmente |
| Piano annuale | Altro -> Piano annuale; letto anche da Classe/Lezione |
| Documentazione | Altro -> Documentazione |
| Curricolo Arena | capability contestuale governata |
| Assistente / Copilota | capability contestuale |
| Voce | capability contestuale |
| Impostazioni | Altro |
| Account / sicurezza | Altro |

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

---

## Decisione ancora aperta

### Attività generiche

Da confermare esplicitamente:

> Le attività generiche (`PlannerTask`) restano disponibili in `Altro -> Attività`, ma non compaiono più in Oggi.

Questa decisione modifica la precedente baseline in cui Oggi poteva comporre anche attività operative generiche. La separazione di dominio resta invariata; cambia soltanto l'esposizione nella IA primaria.

---

## Stato del lavoro

- IA-01 Oggi: APPROVATA
- IA-02 Orario: APPROVATA
- IA-03 Classi/Classe: PROPOSTA DA CONSOLIDARE
- IA-04 Lezione: PROPOSTA DA CONSOLIDARE
- IA-05 Altro: DIREZIONE APPROVATA / DETTAGLI APERTI
- Matrice anti-regressione: PRELIMINARE
- Implementazione: NON AUTORIZZATA
- Merge/deploy: NON AUTORIZZATI

Passo successivo: chiudere le decisioni aperte, quindi trasformare questo decision log in specifica canonica revisionata prima di qualunque implementazione.
