# DOCENTE OS — Classroom AI Support Contract v1

Stato: IMPLEMENTATION CANDIDATE / INTERACTIVE ACCEPTANCE PENDING
Data: 2026-09-10

## 1. Obiettivo

Rendere la superficie **In classe** utile anche quando l'attività corrente non coincide ancora 1:1 con un blocco CAN-PLAN, mantenendo Docente OS come regia della sessione e i provider esterni come sorgenti di materiali o servizi subordinati.

Flusso:

`Orario / Classe → Materiale predisposto → In classe → Presentazione + sequenza + supporto rapido → Osserva / Registra`

Per una lezione canonica già modellata resta valido il workspace `Prepara → In classe → Osserva → Registra`. Il cockpit introdotto da questa slice copre anche attività diagnostiche o di accoglienza `PRE_CANONICAL_DIAGNOSTIC`.

## 2. Audit dello stato precedente

La modalità canonica `In classe` già:

- percorre la sequenza passo per passo;
- mostra istruzione, cue e risorse collegate;
- include aggiunte docente accettate;
- separa osservazione e registrazione;
- non registra automaticamente dati individuali degli alunni.

Gli strumenti di arricchimento erano però disponibili soprattutto in `Prepara` e l'unico tool applicativo attivo era la domanda di attivazione locale. Non esisteva una superficie equivalente per materiali predisposti non ancora imputabili a un blocco CAN-PLAN.

## 3. Primo incremento

Il materiale `CLASS_LESSON_MATERIAL` apre una route autenticata:

`/classi/<sectionId>/in-classe/<assetId>`

La route valida nuovamente:

- workspace attivo;
- anno scolastico attivo;
- sezione canonica;
- asset appartenente allo stesso workspace;
- classe esatta;
- eventuale `sectionId` coerente;
- `content_category = TEACHING_RESOURCE`;
- marker `docenteOsResource = CLASS_LESSON_MATERIAL`;
- fonte esterna HTTPS.

Un artefatto di un'altra classe non può essere aperto come sessione della sezione corrente.

## 4. Cockpit In classe

La superficie mostra soltanto ciò che serve durante la lezione:

- classe, data e titolo;
- stato `Predisposto` / `Confermato`;
- eventuale distinzione `ALIGNED` / `PRE_CANONICAL_DIAGNOSTIC`;
- azione primaria `Apri presentazione`;
- sequenza operativa passo per passo;
- cue essenziale;
- navigazione avanti/indietro;
- disclosure della sequenza completa;
- supporto rapido contestuale.

## 5. Supporto rapido

La prima versione è **locale e deterministica**, quindi non deve essere presentata come generazione AI remota.

Per ogni passaggio può offrire:

- `Spiega più semplice`;
- `Dammi un esempio`;
- `Domanda flash`;
- `Idea visuale`.

I testi derivano esclusivamente dai metadati predisposti della lezione. Nessun dato alunno è richiesto o registrato.

Questo livello serve anche come fallback se un futuro provider AI non è disponibile.

## 6. Dove l'AI generativa ha valore in classe

L'AI generativa è appropriata soprattutto per richieste **just-in-time**, brevi e contestuali:

1. riformulare una spiegazione mantenendo l'obiettivo della lezione;
2. produrre un esempio alternativo coerente con il concetto corrente;
3. generare una domanda di controllo o un micro-esercizio;
4. preparare uno schema, diagramma o brief visuale;
5. generare un'immagine didattica quando una visualizzazione aiuta realmente la comprensione;
6. adattare temporaneamente il livello linguistico senza cambiare l'obiettivo disciplinare;
7. proporre una variante di recupero o approfondimento.

Non deve:

- sostituire la decisione didattica del docente;
- cambiare il Piano annuale;
- registrare valutazioni o dati individuali senza un caso d'uso esplicito;
- mostrare automaticamente agli alunni contenuti non controllati;
- chiamare direttamente database o provider dal modello.

## 7. Generazione immagini

Questa slice **non simula** la generazione di immagini.

`Idea visuale` produce un brief verificabile. La futura capability `CLASSROOM_IMAGE_GENERATE` dovrà usare il boundary canonico:

`assistant-ui / cockpit → AiOrchestratorPort → capability applicativa → policy → adapter provider → asset proposto → conferma docente`

Requisiti minimi:

- provider esplicitamente configurato;
- nessuna credenziale al client;
- prompt costruito da contesto minimizzato;
- nessun dato personale alunno nel prompt;
- risultato in stato `PROPOSED`;
- anteprima prima dell'uso;
- provenienza del provider;
- possibilità di scartare senza effetti sul Piano;
- fallimento non bloccante: la lezione continua senza AI.

## 8. Primo caso reale

Per 11 settembre 2026 sono strutturate 4 sessioni:

- 1A — 7 passaggi, allineata a B01;
- 2A — 7 passaggi, diagnostica pre-canonica;
- 3A — 7 passaggi, diagnostica pre-canonica;
- 3C — 7 passaggi, diagnostica pre-canonica.

Ogni sessione dispone di 7 semplificazioni, 7 esempi, 7 domande flash e 7 brief visuali.

## 9. Criteri di accettazione

- dalla pagina Classe il materiale predisposto apre il cockpit Docente OS;
- dal cockpit la presentazione Canva resta raggiungibile con un solo gesto;
- 2A, 3A e 3C funzionano anche senza binding CAN-PLAN;
- 1A conserva l'indicazione di allineamento a B01;
- nessuna sessione di un'altra classe è accessibile mediante cambio di assetId;
- i quattro supporti rapidi cambiano con il passaggio corrente;
- `Idea visuale` non dichiara mai che un'immagine è stata generata;
- la UI dichiara `Generazione immagini: Da collegare` finché non esiste un provider;
- nessun supporto modifica stato, Piano o registro;
- mobile e desktop restano utilizzabili durante una lezione.

## 10. Slice successiva

Dopo accettazione del cockpit:

1. estendere lo stesso supporto al workspace canonico `mode=teach`;
2. collegare un `ClassroomAssistantContext` reale al runtime assistant-ui;
3. introdurre una prima capability generativa testuale provider-neutral in `PROPOSE`;
4. solo dopo, introdurre `CLASSROOM_IMAGE_GENERATE` con anteprima e conferma;
5. valutare cache/pre-generazione delle immagini prima della lezione per ridurre latenza e dipendenza dalla rete in aula.
