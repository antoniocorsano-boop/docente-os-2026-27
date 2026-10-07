# DOC-MAT-BOUNDARY-01 — Documenti e Materiali didattici

Data: 2026-10-07  
Stato: **DESIGN / DOCUMENTATION ONLY / HUMAN REVIEW REQUIRED BEFORE RUNTIME CHANGES**

## 1. Scopo

DOCENTE OS deve sostenere due linee di lavoro diverse ma connesse:

1. **Documenti** — progettazione e documentazione professionale e istituzionale del docente;
2. **Materiali didattici** — preparazione, uso e riuso dei materiali necessari alla lezione e all'esperienza dello studente.

Le due linee non devono diventare due applicazioni separate e non devono duplicare dati. Condividono il contesto didattico già governato da DOCENTE OS, ma mantengono finalità, responsabilità e percorsi utente distinti.

La regola sintetica è:

> **Documenti definisce e documenta il quadro professionale; Materiali rende operativo quel quadro nella lezione.**

Il collegamento è bidirezionale soltanto per riferimenti, stato ed evidenze; nessuna linea modifica silenziosamente l'altra.

## 2. Obiettivo umano

Il docente deve poter passare dalla progettazione alla lezione senza ricopiare informazioni e, dopo la lezione, ritrovare nel lavoro documentale ciò che è stato realmente svolto.

Esempio canonico:

```text
Programmazione annuale — Tecnologia — 2C
        ↓
UDA / unità di lavoro
        ↓
Lezione prevista
        ↓
Materiali della lezione
        ↓
Lezione svolta + evidenze
        ↓
Programma svolto / Relazione finale
```

Il sistema deve evitare due errori opposti:

- trasformare **Documenti** in un semplice archivio di file;
- trasformare **Materiali** in un secondo ambiente di progettazione istituzionale.

## 3. Linea A — Documenti

### 3.1 Finalità

La linea Documenti governa i documenti professionali che descrivono, pianificano, formalizzano o rendicontano il lavoro del docente.

Prima famiglia canonica:

- Programmazione annuale / Piano annuale;
- UDA;
- Programma svolto;
- Relazione finale.

Estensioni future, attraverso il motore documentale governato:

- verbali;
- relazioni specifiche;
- rubriche e criteri di valutazione;
- schede progettuali e di monitoraggio;
- altra documentazione istituzionale pertinente al ruolo del docente.

### 3.2 Fonti e raccordo istituzionale

La linea Documenti deve poter utilizzare, come riferimenti governati:

- Atto di indirizzo della Dirigente scolastica;
- PTOF;
- RAV;
- Piano di miglioramento;
- curricolo d'Istituto;
- curricolo verticale e disciplinare;
- programmazione dipartimentale;
- criteri di valutazione;
- riferimenti per educazione civica e percorsi trasversali.

Le fonti orientano la progettazione ma non vengono ricopiate meccanicamente nei documenti.

Per l'a.s. 2026/2027 devono essere recepiti come requisiti strutturali gli indirizzi già consolidati dall'Atto del 6 ottobre 2026: raccordo PTOF–RAV–PdM, competenze e obiettivi, inclusione, metodologie attive e laboratoriali, monitoraggio, esiti, educazione civica trasversale, cittadinanza digitale e uso responsabile dell'IA.

### 3.3 Autorità

Documenti resta sotto responsabilità professionale del docente:

- il sistema può comporre e proporre;
- le fonti possono precompilare dati;
- le evidenze possono alimentare sezioni;
- nessun documento viene validato o finalizzato senza decisione umana;
- un aggiornamento delle fonti non riscrive silenziosamente documenti già salvati o finalizzati.

## 4. Linea B — Materiali didattici

### 4.1 Finalità

La linea Materiali didattici governa ciò che serve per preparare e condurre concretamente la lezione.

Comprende, tra gli altri:

- presentazioni;
- schede di lavoro;
- guide ragionate;
- materiali semplificati;
- materiali di potenziamento;
- esercizi e verifiche formative;
- immagini e infografiche didattiche;
- fumetti e sequenze narrative;
- simulazioni ed esperimenti;
- collegamenti a risorse esterne;
- percorsi ed esperienze prodotti tramite Studio Atlas;
- materiali da proiettare o condividere con la classe.

### 4.2 Punto di ingresso

Il punto di ingresso preferito non è un archivio generico, ma il contesto operativo già noto:

```text
Classe
→ UDA / unità
→ Lezione
→ Materiali
```

Quando il docente parte direttamente da un materiale, DOCENTE OS deve permettere di associarlo esplicitamente alla lezione pertinente.

### 4.3 Autorità

Materiali non modifica automaticamente:

- Programmazione annuale;
- UDA;
- Piano annuale;
- Calendario;
- contenuti istituzionali;
- valutazioni professionali.

L'associazione di un materiale a una lezione è una scrittura esplicita governata da DOCENTE OS.

## 5. Confine canonico fra le due linee

### 5.1 Cosa condividono

Le due linee possono condividere riferimenti a:

- anno scolastico;
- docente;
- disciplina;
- classe;
- curricolo / nodo curricolare applicabile;
- Programmazione annuale;
- UDA;
- lezione;
- stato previsto / svolto;
- evidenze aggregate pertinenti.

Questi dati non devono essere duplicati in archivi concorrenti.

### 5.2 Cosa non condividono come autorità

- Documenti non governa i byte o il ciclo di vita dei materiali didattici.
- Materiali non governa il contenuto professionale dei documenti istituzionali.
- Studio Atlas non governa classe, lezione, UDA o documentazione professionale.
- Arena mantiene l'autorità curricolare secondo i contratti già congelati.

### 5.3 Regola di trasferimento

Il trasferimento fra linee usa riferimenti e conferme esplicite:

```text
Documenti → Materiali
contesto didattico + obiettivi + UDA/lezione

Materiali → Documenti
riferimento al materiale + uso nella lezione + evidenza di svolgimento
```

Il ritorno dalla linea Materiali alla linea Documenti non produce automaticamente giudizi, valutazioni o testo finale. Può soltanto fornire evidenza strutturata e ispezionabile da usare nella composizione del documento.

## 6. Studio Atlas

Studio Atlas è un produttore specializzato di materiali ed esperienze didattiche, non una superficie di documentazione istituzionale.

Flusso canonico:

```text
UDA / Lezione in DOCENTE OS
        ↓
Prepara materiali con Studio Atlas
        ↓
MaterialBundle / esperienza
        ↓
selezione esplicita della lezione
        ↓
Associa alla lezione
```

Restano vincoli obbligatori:

- nessun dato studente nel passaggio;
- nessun binding implicito alla classe o alla lezione;
- nessuna modifica automatica a UDA, Piano annuale o Calendario;
- persistenza finale governata da DOCENTE OS;
- Studio Atlas propone materiali, DOCENTE OS decide il loro uso nel lavoro del docente.

Questo design è coerente con la PR `#692` già dedicata al flusso UDA → Studio Atlas → MaterialBundle → lezione.

## 7. Grafo operativo complessivo

```text
FONTI ISTITUZIONALI
Atto / PTOF / RAV / PdM
          ↓
CURRICOLO ADOTTATO
          ↓
DOCUMENTI
Programmazione annuale
          ↓
         UDA
          ↓
     LEZIONE PREVISTA
          ↓
MATERIALI DIDATTICI
presentazione / scheda / guida / Atlas / risorse
          ↓
      LEZIONE SVOLTA
          ↓
EVIDENZE E MONITORAGGIO
       ↙       ↘
Programma      Relazione
svolto         finale
```

La lezione è il principale punto operativo di raccordo fra progettazione e materiali.

## 8. Primo caso completo — Programmazione annuale di Tecnologia

La prima verticale da usare come prova integrata è **Tecnologia** nella scuola secondaria di primo grado.

### 8.1 Programmazione

La Programmazione annuale deve rappresentare, quando pertinenti:

```text
contesto
→ competenze
→ obiettivi
→ nuclei / contenuti
→ unità / UDA
→ metodologie
→ inclusione e personalizzazione
→ educazione civica / raccordi trasversali
→ verifica
→ criteri di valutazione
→ recupero / consolidamento / potenziamento
→ monitoraggio
```

Deve poter essere composta riusando dati già presenti e riferimenti istituzionali approvati.

### 8.2 Dalla programmazione alla lezione

Da una unità/UDA deve essere possibile individuare o creare il contesto della lezione senza ricopiare:

- classe;
- disciplina;
- unità di riferimento;
- obiettivi pertinenti;
- collocazione temporale prevista.

La programmazione resta però distinta dalla singola lezione: modificare un materiale o registrare una lezione non riscrive automaticamente la Programmazione annuale.

### 8.3 Dalla lezione ai materiali

La lezione deve poter mostrare i materiali pertinenti e offrire una azione primaria coerente con lo stato, per esempio:

- `Prepara materiali` quando mancano;
- `Apri materiali` quando presenti;
- `Associa materiali` quando rientrano da Studio Atlas o da altra sorgente;
- `Registra la lezione` quando l'attività è stata svolta.

Le denominazioni finali devono seguire il linguaggio canonico della UI e non introdurre terminologia tecnica.

### 8.4 Ritorno documentale

Quando la lezione viene registrata, il sistema può rendere disponibili alla linea Documenti:

- unità / UDA collegata;
- data e stato della lezione;
- attività effettivamente svolta;
- materiali utilizzati;
- evidenze e osservazioni compatibili con privacy e ruolo;
- eventuale scostamento fra previsto e svolto.

Questi dati alimentano Programma svolto e Relazione finale come fatti/evidenze; il docente mantiene la responsabilità dell'interpretazione.

## 9. Esperienza utente

Le due linee devono essere riconoscibili senza appesantire la navigazione.

### 9.1 Documenti

Domanda guida:

> **Che documento devi preparare o continuare?**

Stati principali:

- Da preparare;
- In corso;
- Pronti / finalizzati;
- Archivio.

### 9.2 Materiali

Domanda guida nel contesto della lezione:

> **Cosa ti serve per questa lezione?**

La superficie privilegia materiali già collegati alla lezione e azioni operative; non espone per default metadati, identificatori, pipeline o dettagli di pubblicazione.

### 9.3 Principio di continuità

Quando il contesto è già noto, il docente non deve selezionare nuovamente classe, disciplina, UDA o lezione.

## 10. Provenienza, versionamento e stato

- Documenti professionali: versionati attraverso il motore documentale canonico/X5.
- Modelli documentali: governati da `DOC-TPL-01`.
- Materiali: mantengono il proprio ciclo di vita e provenienza, senza diventare versioni del documento professionale.
- L'associazione materiale ↔ lezione deve essere persistente e ispezionabile.
- Una versione finalizzata di un documento non cambia perché viene modificato successivamente un materiale.
- Un documento in corso può proporre di aggiornarsi da nuove evidenze, ma l'aggiornamento richiede azione esplicita del docente.

## 11. Privacy e controllo umano

Regole comuni:

- nessun dato personale non necessario;
- nessuna inferenza automatica di diagnosi o categorie sensibili;
- nessun trasferimento a Studio Atlas di dati studente;
- nessuna finalizzazione automatica di documenti;
- nessuna pubblicazione o associazione definitiva di materiali senza l'azione prevista dal workflow;
- provenienza tecnica disponibile per controllo, ma non esposta nei documenti professionali destinati all'uso scolastico.

## 12. Non-obiettivi

Questo design non introduce:

- un nuovo archivio parallelo;
- una seconda applicazione per i documenti;
- una seconda applicazione per i materiali;
- una nuova autorità curricolare;
- sincronizzazione automatica fra Documenti e Materiali;
- scritture automatiche a Calendario o Piano annuale;
- modifica della bottom navigation mobile;
- nuove dipendenze da provider esterni;
- cambi al runtime delle PR `#692` o `#695`.

## 13. Impatto sulle linee di lavoro esistenti

### PR #693 — DOC-04 / documentazione

Questa specifica estende il modello documentale già consolidato precisando il confine con i materiali didattici. Non sostituisce `INSTITUTIONAL_DOCUMENTATION_CANONICAL.md` e, dopo Human Review, dovrà essere recepita nel canone principale.

### PR #695 — DOC-TPL-01

Nessuna modifica richiesta al motore dei template per effetto di questo documento. `DOC-TPL-01` continua a governare base grafica istituzionale e modelli specifici delle famiglie documentali.

### PR #692 — Materiali / Studio Atlas

Il flusso già implementato costituisce la prima realizzazione della linea Materiali e viene assunto come confine operativo: Studio Atlas produce/proponde, DOCENTE OS associa esplicitamente alla lezione e conserva l'autorità sul contesto didattico.

## 14. Criteri di accettazione architetturale

Il confine Documenti ↔ Materiali è qualificabile soltanto se:

1. il docente non reinserisce dati di contesto già noti;
2. Programmazione, UDA e documenti professionali restano distinti dai materiali;
3. la lezione è il punto operativo principale di raccordo;
4. un materiale può essere associato a una lezione solo attraverso un'azione esplicita;
5. l'uso di un materiale non modifica automaticamente Programmazione o UDA;
6. una lezione registrata può alimentare Programma svolto e Relazione finale come evidenza strutturata;
7. nessun dato studente viene trasferito a Studio Atlas;
8. la linea Documenti recepisce i riferimenti istituzionali senza ricopiarli meccanicamente;
9. il docente mantiene la decisione su aggiornamento, interpretazione e finalizzazione;
10. la UI quotidiana non espone dettagli tecnici del motore documentale o della pipeline dei materiali;
11. mobile mantiene flussi verticali e una sola azione primaria per stato;
12. nessuna delle due linee crea una authority concorrente rispetto ai domini già canonici.

## 15. Decisioni congelate dalla presente specifica

- **DOCENTE OS mantiene due linee di lavoro riconoscibili: Documenti e Materiali didattici.**
- **Le linee condividono contesto, non autorità.**
- **La lezione è il principale punto operativo di raccordo.**
- **Documenti descrive e rendiconta il lavoro professionale; Materiali sostiene la sua realizzazione concreta in classe.**
- **Programmazione annuale e UDA non diventano contenitori di file.**
- **Materiali non diventa un secondo motore di progettazione istituzionale.**
- **Studio Atlas resta produttore specializzato di materiali/esperienze.**
- **Il ritorno Materiali → Documenti avviene tramite evidenze strutturate, non tramite riscrittura automatica.**
- **Tecnologia è la prima verticale reale per verificare l'intero raccordo programmazione → UDA → lezione → materiali → evidenze → rendicontazione.**
- **Nessun cambiamento runtime deriva da questa specifica prima della Human Review.**
