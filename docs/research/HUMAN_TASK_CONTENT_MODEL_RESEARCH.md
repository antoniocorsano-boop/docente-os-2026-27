# DOCENTE OS — Human Task Content Model

Status: RESEARCH BASELINE / MUST INFORM PRODUCT DESIGN
Date: 2026-08-22

## Perché questo documento esiste

Questa ricerca nasce da un problema osservato direttamente nel runtime mobile di DOCENTE OS: anche dopo la semplificazione delle superfici, l'apertura di Piano annuale, UDA e CAN-PACK può ancora produrre pagine dense, lunghe e difficili da usare durante il lavoro reale del docente.

La conclusione centrale è:

> Il documento canonico è una forma di conservazione, validazione e rendicontazione. Non è automaticamente una buona forma di interazione.

DOCENTE OS deve quindi preservare i documenti canonici ma trasformarne il contenuto in viste operative coerenti con il compito umano corrente.

Questa ricerca deve essere usata come riferimento per ogni evoluzione di:

- Piano annuale;
- UDA;
- CAN-PACK e materiali didattici;
- Classe;
- Progetta;
- Conoscenza quando un contenuto viene aperto dentro un compito;
- registrazione dell'attuazione didattica.

## 1. Problema osservato

Un docente che sta per entrare in classe non vuole "aprire un documento". Vuole rispondere rapidamente a domande come:

- che cosa devo fare adesso?
- che cosa devo preparare?
- quale sequenza conviene seguire?
- quale scheda serve agli alunni?
- che cosa devo osservare?
- che cosa devo registrare alla fine?

Quando il sistema mostra invece un documento lungo, il docente deve ricostruire mentalmente la struttura del lavoro. Questo trasferisce il costo cognitivo dal sistema alla persona.

## 2. Riferimenti di ricerca

### ISO 9241-11

L'usabilità è legata a utenti, obiettivi e contesto d'uso, e si valuta in termini di efficacia, efficienza e soddisfazione. Per DOCENTE OS questo significa che una schermata non è "usabile" in astratto: deve consentire a un docente reale di completare un compito reale nel contesto scolastico reale.

Riferimento: https://www.iso.org/standard/63500.html

### GOV.UK Service Manual

Un servizio maturo viene progettato dal bisogno dell'utente e deve accompagnare il completamento del compito end-to-end senza richiedere di conoscere la struttura interna del sistema. Nei flussi complessi è utile ridurre il numero di decisioni simultanee, mantenendo però efficienza per utenti professionali che ripetono frequentemente i compiti.

Riferimenti:
- https://www.gov.uk/service-manual/design/introduction-designing-government-services
- https://www.gov.uk/service-manual/design/form-structure

### Apple Human Interface Guidelines

Gerarchia e progressive disclosure: ciò che serve più spesso e nel momento corrente deve essere immediatamente disponibile; dettagli e funzioni secondarie devono emergere solo quando diventano rilevanti.

Riferimento: https://developer.apple.com/design/human-interface-guidelines/disclosure-controls

### Nielsen Norman Group

Le persone scansionano il contenuto più di quanto lo leggano linearmente. Gerarchia, titoli, raggruppamento e parole significative devono ridurre il lavoro di interpretazione. Al tempo stesso, nascondere troppo può aumentare il carico cognitivo se l'utente deve ricordare dove si trovano funzioni o informazioni.

Riferimenti:
- https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- https://www.nngroup.com/articles/zen-mode/

### Canvas / Google Classroom

I prodotti didattici maturi organizzano i contenuti in moduli, argomenti, attività e progressione, non come fascicoli monolitici da leggere integralmente durante l'azione.

Riferimenti:
- https://community.canvaslms.com/html/assets/Canvas_Basics_Guide.pdf
- https://support.google.com/edu/classroom/answer/9093681

### Segmenting effect e cognitive load

La presentazione di istruzioni complesse in segmenti coerenti tende a ridurre il carico cognitivo rispetto a unità continue e monolitiche. Segnalare ciò che è importante, integrare elementi collegati e rimuovere informazione non necessaria al compito corrente sono principi coerenti con questa evidenza.

Riferimenti:
- https://doi.org/10.1007/S10648-018-9456-4
- https://pubmed.ncbi.nlm.nih.gov/33716467/

## 3. Evidenza dai contenuti canonici reali

La ricerca è stata verificata sui documenti reali presenti nel Drive di progetto.

### CAN-PLAN-1 — Piano annuale operativo Tecnologia classe prima 2026/2027

Il Piano annuale è semanticamente già ben strutturato: 33 blocchi da 2 ore, con UDA, pacchetto, attività, evidenza e gate. Per esempio:

- B01 — UDA 1-00 — Che cos'è Tecnologia?
- CAN-PACK-1A
- attività di preconoscenza e osservazione di un oggetto tecnico
- evidenza: scheda di osservazione + exit ticket
- valutazione diagnostica/formativa

B02 prosegue con laboratorio, strumenti e sicurezza e chiude UDA 1-00.

Documento sorgente:
https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit

Conclusione: il contenuto è già operativo, ma una tabella B01-B33 costringe il docente a ricostruire ogni volta la progressione. La vista umana deve aggregare per UDA, stato e prossimo passo.

### CAN-UDA-1-00 — Entrare nel laboratorio della Tecnologia

L'UDA contiene circa sedici sezioni concettuali: riferimenti, collocazione, senso formativo, obiettivi, conoscenze, abilità, attività, metodologie, strumenti, prodotti, verifica, indicatori, rubrica, inclusione, collegamenti, tracciabilità ed esiti successivi.

Documento sorgente:
https://docs.google.com/document/d/1YyHBEsKJVdYEqyEdPmJp6f_SOCEWfLibA1Mv3ApMJPw/edit

Conclusione: è un documento istituzionale completo e corretto, ma non è la forma adatta al compito "tra cinque minuti entro in 1ª A".

### CAN-PACK-1A — Avvio classe prima UDA0-UDA1

Il pacchetto contiene già oggetti operativi distinti:

- schede docente per singole lezioni;
- materiali da predisporre;
- sequenze temporizzate;
- schede alunno;
- exit ticket;
- griglia diagnostica;
- compito significativo;
- rubrica;
- checklist di preparazione;
- adattamenti inclusivi;
- indicazioni di portfolio e tracciabilità.

Documento sorgente:
https://docs.google.com/document/d/1vVoF3z1QigzA1S5WnXiqCTe2bvMD08PwWmVv9s5bvR8/edit

Conclusione: CAN-PACK non deve essere trattato in runtime come un singolo "documento da aprire", ma come un contenitore di risorse tipizzate collegate alle specifiche lezioni e intenzioni.

## 4. Decisione architetturale proposta

Separare chiaramente:

### A. Documento canonico

Serve per:

- validazione;
- conservazione;
- provenienza;
- esportazione;
- rendicontazione;
- confronto versioni;
- governance.

### B. Contenuto operativo

Serve per:

- orientare;
- preparare;
- condurre la lezione;
- osservare/valutare;
- registrare;
- riflettere e continuare.

Il contenuto operativo non è una copia autonoma del documento. È una vista semantica derivata, tracciabile e sempre riconducibile alla fonte canonica.

## 5. Human Task Content Model

Le stesse informazioni devono poter essere mostrate attraverso lenti diverse in base all'intento.

### ORIENT — Orientarmi

Domanda umana: dove sono nel percorso?

Mostrare:

- classe/sezione;
- UDA corrente;
- blocco/lezione corrente;
- stato;
- quanto manca;
- cosa viene dopo.

### PREPARE — Preparare

Domanda umana: cosa devo predisporre prima della lezione?

Mostrare:

- obiettivo della lezione;
- materiali da predisporre;
- schede necessarie;
- tempi;
- accorgimenti;
- eventuali adattamenti pertinenti.

### TEACH — Condurre

Domanda umana: cosa faccio adesso in classe?

Mostrare:

- sequenza operativa;
- tempi;
- consegne;
- domande-stimolo;
- materiali da aprire/esibire;
- evidenze da osservare.

### OBSERVE — Osservare / valutare

Domanda umana: che cosa devo guardare?

Mostrare:

- indicatori pertinenti alla fase;
- prodotto/evidenza attesa;
- eventuale strumento di osservazione;
- rubrica solo quando necessaria.

### RECORD — Registrare / riflettere

Domanda umana: che cosa è realmente successo?

Mostrare:

- svolto / recuperato / rimodulato / annullato;
- data e ore effettive;
- evidenza raccolta;
- breve nota;
- adattamento/criticità;
- prossimo passo suggerito ma non inventato.

### EXPLORE — Approfondire

Domanda umana: voglio vedere il quadro completo.

Mostrare:

- documento canonico;
- riferimenti;
- sezioni complete;
- versioni;
- metadati;
- governance.

## 6. Oggetti semantici target

La catena dati target è:

AnnualPlan
→ UDA
→ LessonBlock
→ ActivityStep
→ Resource
→ Evidence
→ Assessment
→ Adaptation

Ogni oggetto deve mantenere provenienza e riferimento alla fonte canonica.

### Esempio di tipizzazione CAN-PACK-1A

| Contenuto | Tipo semantico | Contesto |
| --- | --- | --- |
| Scheda docente 1 | LESSON_GUIDE | B01 |
| Scheda alunno A | STUDENT_RESOURCE | B01 |
| Exit ticket | QUICK_ASSESSMENT | B01 |
| Scheda docente 2 | LESSON_GUIDE | B02 |
| Scheda alunno B | STUDENT_RESOURCE | B02 |
| Griglia UDA 0 | OBSERVATION_TOOL | B01-B02 |
| Scheda docente 3 | LESSON_GUIDE | B03 |
| Scheda alunno C | STUDENT_RESOURCE | B03 |
| Rubrica UDA 1 | RUBRIC | chiusura UDA |
| Checklist docente | PREPARATION_CHECKLIST | avvio |
| Adattamenti inclusivi | ADAPTATION_GUIDANCE | quando pertinente |

## 7. Vista target del Piano annuale

La vista ordinaria non deve essere una tabella di 33 righe.

Con una sezione selezionata deve mostrare prima la progressione per UDA:

- UDA corrente;
- numero di lezioni completate/totali;
- prossimo blocco;
- stato;
- azione primaria: prepara / conduci / registra secondo il contesto.

La sequenza completa B01-B33 resta accessibile come approfondimento.

## 8. Vista target dell'UDA

L'UDA in runtime deve comportarsi come una mappa eseguibile.

Primo livello:

- titolo;
- classe/grado;
- periodo;
- durata;
- perché la faccio;
- risultati attesi in linguaggio docente;
- percorso di lezioni/blocchi;
- stato di ciascun blocco;
- prossimo blocco;
- unica azione primaria.

Secondo livello:

- valutazione/osservazione;
- adattamenti;
- riferimenti;
- documento completo.

## 9. Vista target della lezione B01

Verticale di riferimento:

1ª A → UDA 1-00 → B01 → CAN-PACK-1A

### Prima della lezione

Mostrare:

- titolo: Che cos'è Tecnologia?
- durata: 2 ore;
- obiettivo;
- materiali da predisporre;
- Scheda alunno A;
- eventuali accorgimenti.

Azione primaria: **Inizia la lezione**.

### Durante la lezione

Mostrare una sequenza segmentata e temporizzata, ricavata dal contenuto canonico:

1. domanda-stimolo — 10 min;
2. raccolta idee — 10 min;
3. modellamento osservazione — 15 min;
4. scheda individuale — 25 min;
5. confronto a coppie — 10 min;
6. restituzione bisogno → funzione → materiale → parti — 20 min;
7. mini-sintesi — 15 min;
8. exit ticket — 5 min.

Non mostrare contemporaneamente rubrica completa, riferimenti normativi, tracciabilità, versioni e metadati.

### Chiusura

Mostrare:

- evidenze osservabili pertinenti;
- exit ticket;
- eventuale conservazione della scheda;
- azione primaria: **Registra la lezione**.

## 10. Regola di progressive disclosure

Non adottare minimalismo cieco.

Ogni vista operativa deve conservare sempre quattro coordinate visibili:

**Classe → UDA → lezione/blocco → stato**

La semplificazione deve ridurre il lavoro mentale senza far perdere orientamento.

## 11. Acceptance model

I seguenti valori sono budget di prodotto da validare, non soglie scientifiche universali.

| Compito | Budget target |
| --- | --- |
| Capire quale lezione devo fare | <= 5 s |
| Arrivare dalla classe alla preparazione | <= 1 tap |
| Capire cosa preparare | nessuna ricerca/scorrimento iniziale |
| Iniziare la conduzione | <= 1 tap |
| Trovare la scheda alunno | visibile nel contesto |
| Capire cosa osservare | senza aprire la rubrica completa |
| Registrare la lezione | <= 15-20 s |
| Tornare al contesto precedente | 1 tap |
| Aprire il documento ufficiale | sempre possibile, ma secondario |

### Test qualitativo canonico

> Immagina che tra cinque minuti entri in 1ª A. Usando DOCENTE OS, dimmi cosa devi fare e prepara la lezione.

Il test fallisce se il docente deve:

- leggere documenti lunghi;
- interpretare codici CAN per orientarsi;
- cercare manualmente la scheda corretta;
- scorrere contenuti non pertinenti al compito;
- capire l'architettura interna del prodotto;
- perdere il contesto entrando in una risorsa.

## 12. Verticale pilota obbligatorio

Prima di generalizzare l'intero sistema, costruire e validare completamente:

**1ª A → UDA 1-00 → B01 → CAN-PACK-1A**

Il verticale deve coprire:

**orienta → prepara → conduci → osserva → registra → continua**

Il documento canonico completo deve rimanere disponibile solo tramite un'azione esplicita di approfondimento.

Una volta validato sul telefono, il modello può essere generalizzato a tutte le UDA, tutti i blocchi e tutte le classi.

## 13. Vincolo per le future implementazioni

Ogni PR o slice che modifica Piano annuale, UDA, CAN-PACK, Classe, Progetta o Conoscenza in un contesto didattico specifico deve verificare esplicitamente:

1. quale intento umano sta servendo;
2. quale oggetto semantico è corrente;
3. quale informazione è necessaria adesso;
4. quale informazione può essere differita;
5. come si mantiene la provenienza canonica;
6. come si torna al compito precedente;
7. se l'utente sta usando contenuti operativi o sta amministrando documenti.

Se la risposta finale è semplicemente "apri il documento", la progettazione non è ancora Human Task Modeled.
