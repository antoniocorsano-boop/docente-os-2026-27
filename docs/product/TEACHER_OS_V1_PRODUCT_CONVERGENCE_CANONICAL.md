# DOCENTE OS — Teacher Operating System V1 Product Convergence

Data: **2026-09-15**  
Stato: **CANONICAL CANDIDATE / PRODUCT CONVERGENCE**  
Issue: **#387**

## 1. Decisione

DOCENTE OS entra in una fase di **convergenza di prodotto**.

Le capability costruite finora sono sufficienti a dimostrare che il valore non dipende dall'aggiungere altri moduli, ma dal comporre correttamente contesto, memoria, strumenti e AI nel momento professionale del docente.

Il sistema non deve chiedere al docente di amministrare il software. Deve ridurre il lavoro di ricostruzione e restituire attenzione alla classe.

Formula canonica:

**Teacher Moment → comprensione del contesto → prossimo passo → copilota → conferma umana → traccia**

## 2. Identità di prodotto

> **DOCENTE OS è il Teacher Operating System: memoria operativa e riflessiva del docente, orchestratore del lavoro professionale e copilota AI contestuale.**

Non è:

- un registro elettronico;
- un LMS;
- un archivio documentale;
- una chat generalista;
- un sostituto della decisione professionale.

Può integrarsi con registro/SIS, Google Workspace, Microsoft 365, Drive, SharePoint/OneDrive, Calendar/Outlook, Teams, Canva e altri strumenti quando esiste una policy esplicita che lo autorizza.

## 3. Principio guida

> **La complessità appartiene al sistema; l'attenzione deve restare al docente e agli studenti.**

Ogni schermata, workflow o integrazione deve dimostrare di ridurre almeno uno di questi costi:

- ricordare dove si era arrivati;
- cercare il materiale corretto;
- ricostruire il contesto di classe/lezione;
- reinserire dati che il sistema possiede già;
- passare tra moduli per un unico compito;
- trasformare manualmente osservazioni in prossimo passo;
- controllare continuamente se qualcosa è stato salvato o perso.

## 4. Unità fondamentale: Teacher Moment

Il prodotto deve ragionare prima per **momenti professionali**, poi per moduli.

Esempi:

- prima della scuola;
- prima della prossima lezione;
- ingresso in classe;
- durante la lezione;
- appena terminata la lezione;
- intervallo fra due lezioni;
- fine giornata;
- preparazione del giorno successivo;
- revisione periodica del percorso.

Read model proposto:

```ts
interface TeacherMoment {
  when: string
  mode:
    | 'BEFORE_DAY'
    | 'BEFORE_LESSON'
    | 'IN_LESSON'
    | 'AFTER_LESSON'
    | 'BETWEEN_LESSONS'
    | 'END_OF_DAY'
    | 'PREPARE_NEXT'
  workspaceId: string
  academicYearId: string
  sectionId?: string
  classLabel?: string
  discipline?: string
  currentLessonRef?: string
  lastRealState?: string
  nextObjective?: string
  readyResources: string[]
  missingItems: string[]
  relevantObservations: string[]
  allowedCapabilities: string[]
}
```

`TeacherMoment` è un read model di orchestrazione. Non sostituisce TeachingSession, AnnualPlanBlockProgress, UDA, KnowledgeAsset, Orario o Calendario.

## 5. Output fondamentale: Teacher Next Step

```ts
interface TeacherNextStep {
  headline: string
  whyNow: string
  ready: string[]
  missing: string[]
  assistantProposal?: string
  primaryAction: string
  secondaryActions?: string[]
  returnContext: string
}
```

La UI primaria deve mostrare il Next Step, non il Product Model.

## 6. Home / Oggi diventa Today + Next

La Home non può essere semanticamente identica alle 07:30 e alle 19:30.

Esempi:

### Prima della giornata

- prima classe;
- cosa è già pronto;
- eventuale nota utile dalla lezione precedente;
- unico punto da preparare ancora.

### Durante la giornata

- lezione corrente/prossima;
- materiali immediatamente disponibili;
- eventuale scostamento da gestire.

### Fine giornata

- domani: classi e ordine;
- cosa è pronto;
- cosa manca;
- eventuale follow-up della giornata ancora non registrato.

Se non esiste nulla per oggi, il sistema non deve fermarsi a `nessuna attività`: deve passare al **prossimo Teacher Moment rilevante**.

## 7. Lesson Brief, non pagina-progetto

La progettazione completa può restare ricca. Il docente non deve però attraversarla integralmente per preparare o iniziare una lezione.

La vista operativa deve stare, quando possibile, in una sola viewport mobile:

- classe / quando;
- obiettivo umano della lezione;
- cosa serve;
- cosa è già pronto;
- cosa manca;
- nota rilevante dalla volta precedente;
- proposta del copilota;
- una CTA primaria.

Tutto il resto vive dietro `Vedi progettazione completa` o disclosure contestuale.

## 8. Copilota reale

Il `ContextualTeacherAssistant` esistente diventa il motore operativo del Teacher Moment.

Deve poter:

- recuperare il contesto;
- sintetizzare ciò che conta;
- trovare materiali;
- produrre un contenuto;
- modificare/adattare un contenuto;
- confrontare fonte e obiettivo;
- evidenziare ciò che manca;
- proporre il prossimo passo;
- ricevere input vocale;
- preparare una write governata.

Regola:

**AI propone e prepara; il docente decide gli effetti persistenti o professionalmente significativi.**

## 9. Contextual Voice Capture

La voce è un canale del copilota, non un modulo separato.

Flusso:

`parla → trascrizione effimera → context binding → interpretazione → proposta strutturata → conferma → write governata`

Possibili intent candidate:

- lesson execution note;
- professional observation;
- next lesson focus;
- preparation need;
- reminder candidate.

Il docente non sceglie preventivamente il contenitore. Corregge o conferma la proposta del sistema.

## 10. Memoria operativa e riflessiva

Il prodotto deve essere capace di riprendere il filo senza costringere il docente a ricordarlo.

Esempio:

`Nelle ultime due lezioni della 2C è emersa difficoltà nel distinguere funzione e materiale. Vuoi ripartire da questo nella prossima attività?`

Questa è una proposta riflessiva, non una decisione automatica.

## 11. Orchestrazione degli strumenti

Drive, SharePoint/OneDrive, Calendar/Outlook, Teams, Canva, Conoscenza, Progetta e Piano sono capability disponibili al Teacher Moment.

Non devono diventare necessariamente destinazioni cognitive primarie.

Il docente deve poter chiedere, per esempio:

- `preparami una scheda per questa lezione`;
- `trova il materiale che avevo usato con la 1C`;
- `adatta questa presentazione alla 2C`;
- `metti questa scadenza nel calendario`;
- `salva il documento nello spazio autorizzato dalla scuola`.

L'orchestratore risolve provider e percorso secondo il configuratore istituzionale.

Per **preparazione della prossima lezione, materiali pronti, ciclo Diario→domani, resa LIM/stampa e uso opzionale di Canva/Drive**, la fondazione canonica è `docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md` e il programma esecutivo è #431.

La regola è vincolante: il sistema compone gli oggetti esistenti tramite un `Lesson Preparation Manifest`; non crea un nuovo archivio, non duplica CAN-PACK/asset e non rende Canva o Drive fonte di verità. La baseline LIM/stampa deve funzionare con renderer interni provider-independent; i provider esterni migliorano authoring/esportazione ma restano sostituibili.

## 12. Product KPI

### Teacher Attention Returned — TAR

KPI qualitativo/quantitativo centrale:

> Quanto lavoro di ricostruzione, ricerca, ricopiatura e navigazione evita il sistema prima che il docente possa concentrarsi sull'azione professionale?

Metriche correlate:

- tempo per identificare il prossimo passo;
- decision count;
- surface transitions;
- competing actions;
- re-entry burden il giorno successivo;
- tempo tap → interactive;
- percentuale di contesto precompilato correttamente;
- friction/workaround osservati in HUMAN_USE.

Per il ciclo di preparazione, una misura specifica è la quota di lezioni per cui il docente raggiunge **Materiali pronti** senza cercare nuovamente la chat, ricopiare informazioni o ricostruire manualmente il contesto.

## 13. Programma V1

### V1-A — Teacher Moment + Next

Prima implementazione sui quattro momenti più frequenti:

1. sera → cosa serve domani;
2. prima della lezione → readiness;
3. dopo la lezione → reflection/capture;
4. tra due lezioni → next context.

### V1-B — Lesson Brief

Sostituire la pagina-operazione lunga come entry point con brief task-first + dettaglio progressivo.

### V1-C — Copilot operativo

Collegare TeacherMoment ad AssistantContext, produzione/adattamento contenuti e Contextual Voice Capture.

Il verticale preparazione/materiali segue #431 nell'ordine `LP-1 manifesto → LP-2 azione Copilot → LP-3 renderer interni → LP-4 Home/Oggi/Classe → LP-5 adapter opzionali → LP-6 Diario→domani`. Non anticipare provider o nuovi formati persistenti prima della baseline interna.

### V1-D — Institutional Configurator

Applicare provider, identity, scopes, data boundary e policy AI definite dall'istituto.

### V1-E — Runtime

Scegliere l'hosting da benchmark reali e non da preferenza tecnologica.

## 14. Relazione con UX-0 / HUMAN_USE

La sessione HUMAN_USE #383 ha prodotto evidence di `FRICTION / REWORK_REQUIRED`.

Non si forza una closure PASS. I finding vengono assorbiti nel V1.

UX-0 resta chiudibile soltanto quando il prodotto convergente dimostra che il docente può completare i task ordinari senza ricostruire il Product Model.

## 15. Non obiettivi

- auto-valutazione degli studenti;
- decisioni professionali automatiche;
- registrazione continua dell'aula;
- acquisizione indiscriminata di dati personali;
- replica del registro elettronico;
- replica delle UI Google/Microsoft;
- nuova tassonomia di moduli;
- nuovo archivio o secondo modello dei materiali della lezione;
- Canva/Drive come dipendenza obbligatoria o fonte di verità;
- apprendimento silenzioso che generalizza osservazioni tra classi;
- migrazione big-bang.