# DOCENTE OS — Lesson Preparation Orchestration Canonical

Data: **2026-09-15**  
Stato: **CANONICAL FOUNDATION / IMPLEMENTATION INCREMENTAL**  
Programma: **#387 — Teacher Operating System V1**  
Issue esecutiva: **#431 — Orchestrazione preparazione lezione e materiali pronti**

## 1. Decisione

DOCENTE OS deve trasformare il lavoro conversazionale e riflessivo del docente in **stato operativo riutilizzabile**, senza rendere la chat una fonte di verità parallela e senza creare un secondo archivio dei materiali.

Il ciclo canonico è:

**resoconto della giornata → conseguenze didattiche proposte → prossima lezione → preparazione necessaria → materiali pronti → validazione docente → lezione → registrazione della realtà → ciclo successivo**

La preparazione della lezione è quindi una **orchestrazione di oggetti già esistenti**, non un nuovo dominio concorrente con Piano annuale, UDA, CAN-PACK, TeachingSession, Conoscenza o Materiali.

## 2. Principio di riuso

Prima di introdurre qualsiasi nuova entità, storage, dipendenza o provider, applicare nell'ordine:

1. riuso di dominio, servizi, componenti e dati già canonici;
2. composizione tramite read model/manifesto;
3. riuso di template e renderer interni;
4. piccolo adapter verso una capability esterna soltanto se necessario;
5. nuova dipendenza open/free soltanto se riduce realmente complessità, con verifica di licenza, manutenzione, privacy e fallback;
6. nuovo storage o nuovo dominio solo tramite ADR che dimostri che gli oggetti esistenti non possono rappresentare il bisogno.

La regola vale anche per Canva, Drive e futuri strumenti di authoring/rendering.

## 3. Non creare un nuovo “pacchetto” canonico

`CAN-PACK-*` resta il pacchetto operativo didattico canonico già collegato a UDA e programmazione.

Per la singola lezione si introduce soltanto il concetto di **Lesson Preparation Manifest**: un manifesto di composizione che referenzia ciò che esiste e descrive la readiness della lezione.

Il manifesto non possiede contenuti duplicati quando può referenziarli.

## 4. Mattoni runtime già esistenti da riusare

La prima implementazione deve partire da:

- `TeacherMoment` / Today + Next;
- Orario e autorità temporale corrente;
- Piano annuale e blocco canonico;
- `NextLessonPreparation`;
- Lesson Brief / proiezione della lezione;
- `LessonDesignExtension` per aggiunte proposte e accettate;
- CAN-PACK, UDA e nucleo comune del grado;
- Conoscenza e `lesson-material-suggestions`;
- TeachingSession, Diario e osservazioni professionali;
- frontdoor Copilot canonica `/api/copilot -> ContextAssembler -> constrained kernel -> dedicated handlers/adapters`.

Una slice non conforme non può bypassare questi mattoni per costruire un secondo percorso “più semplice”.

## 5. Lesson Preparation Manifest

Il manifesto deve essere costruibile deterministicamente per una lezione risolta con sufficiente autorità.

Campi semantici minimi:

```ts
interface LessonPreparationManifest {
  lessonRef: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  disciplineId?: string
  temporalAuthority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'

  blockId?: string
  udaRef?: string
  packRef?: string
  objective?: string

  sequenceRefs: string[]
  materialSlots: LessonMaterialSlot[]
  acceptedExtensionRefs: string[]
  proposedExtensionRefs: string[]

  readiness: 'DRAFT' | 'REVIEW_REQUIRED' | 'READY' | 'USED' | 'NEEDS_REVISION'
  missingInformation: string[]
  provenance: ProvenanceRef[]
  renderingCapabilities: string[]
}
```

Questo è un **contratto semantico**, non una prescrizione di nuova tabella. Nella prima fase può essere un read model composto; la persistenza va introdotta soltanto se un bisogno reale non è soddisfatto dai record esistenti.

## 6. Material slots: ruolo, non archivio

Il sistema deve ragionare per ciò che serve alla lezione, non per formato di file o provider.

Ruoli canonici iniziali:

```ts
type LessonMaterialRole =
  | 'TEACHER_BRIEF'
  | 'LIM_VIEW'
  | 'STUDENT_HANDOUT'
  | 'MINI_DECK'
  | 'VISUAL_AID'
  | 'ASSESSMENT'
```

Ogni slot deve poter indicare almeno:

- ruolo didattico;
- stato `READY | MISSING | PROPOSED | NEEDS_REVIEW`;
- riferimento a un asset esistente quando presente;
- motivo della pertinenza;
- eventuale output derivato/renderizzato;
- provenienza;
- adattamento specifico di sezione, se esiste, separato dal nucleo comune.

La mancanza di un `MINI_DECK` non è automaticamente una scopertura: il sistema genera soltanto ciò che serve al compito didattico corrente.

## 7. Resoconto della giornata → preparazione del giorno successivo

Il resoconto non deve terminare con una risposta testuale isolata.

Quando il contesto lo consente, il sistema deve poter proporre:

1. ciò che è stato realmente svolto;
2. scostamenti rispetto al previsto;
3. osservazioni qualitative rilevanti;
4. eventuale focus da riprendere;
5. prossima lezione della stessa sezione;
6. materiali già disponibili e riusabili;
7. materiali realmente mancanti;
8. proposta di preparazione per il giorno successivo.

La conversazione produce **proposte strutturate**. Le scritture persistenti o professionalmente significative restano separate e governate.

Il giorno successivo Home/Oggi/Classe deve poter esporre direttamente lo stato umano **Materiali pronti** e le azioni pertinenti senza richiedere il recupero della chat precedente.

## 8. Copilota innervato nel sistema

Il copilota non è un modulo laterale che possiede una propria realtà.

Deve conoscere la struttura del prodotto e operare attraverso le capability canoniche. Formula:

> **conoscenza globale dello schema, accesso locale e finalizzato ai dati**.

Per ogni richiesta il contesto operativo deve limitare letture, proposte e scritture al minimo necessario:

`utente/ruolo + workspace + anno + sezione/ambito + Teacher Moment + finalità + fonti autorizzate + capability consentite`

Il fatto che un dato sia accessibile tecnicamente non lo rende pertinente semanticamente.

## 9. Apprendimento governato

DOCENTE OS non modifica silenziosamente regole, preferenze o modelli professionali sulla base della conversazione.

Sequenza canonica:

**osservazione → inferenza proposta → validazione del docente → preferenza/regola versionata → riuso futuro nel medesimo ambito autorizzato**

Esempio: se ricorre una preferenza per schede brevi, visuali e lavorabili a coppie, il sistema può proporre di promuoverla a preferenza di authoring. Non può renderla automaticamente regola globale.

Una preferenza di una sezione non attraversa il confine di sezione, grado o disciplina senza una promozione esplicita coerente con il suo ambito.

## 10. Privacy e isolamento semantico

La privacy non coincide con la sola assenza di nomi degli alunni.

Ogni informazione significativa deve conservare o ereditare:

- **scope** — dove vale;
- **purpose** — per quale finalità viene usata;
- **provenance** — da dove deriva;
- **epistemic status** — documentata, riferita dall'utente, inferita, da verificare;
- **validation** — chi l'ha confermata;
- **visibility/data tier** — chi può accedervi;
- eventuale validità temporale/retention quando richiesta.

Un'osservazione relativa alla 2C non diventa una proprietà degli studenti, della disciplina o di altre classi.

Per impostazione predefinita i template e i materiali condivisibili non includono dati personali degli alunni.

I boundary generali della Conoscenza e della memoria restano governati dalle specifiche canoniche superiori; questo documento non crea un secondo sistema di memoria.

## 11. Authoring e qualità grafica

La qualità dei materiali è una politica di sistema, non una richiesta da ripetere ogni volta.

I renderer DOCENTE OS devono riusare il Design System e definire profili didattici almeno per:

- **LIM:** testo grande, contrasto elevato, bassa densità, gerarchia evidente, un passo per volta quando utile;
- **scheda studente:** A4/print, spazi di lavoro adeguati, consegne brevi e leggibili, struttura compatibile con lavoro autonomo o a coppie;
- **guida docente:** sintesi, tempi, materiali, passaggi, segnali da osservare;
- **supporto visuale:** diagrammi/infografiche funzionali alla comprensione, non decorazione gratuita;
- **mini-presentazione:** poche slide, progressione didattica, leggibilità da fondo aula.

Accessibilità, tipografia, spaziatura, contrasto e componenti devono essere governati dagli stessi token/policy del prodotto dove applicabile.

## 12. Renderer e provider

### Base obbligatoria

La resa minima deve funzionare senza provider esterni:

**dati strutturati → componenti HTML/CSS/SVG DOCENTE OS → vista LIM + stampa/PDF tramite percorso web/print**.

Questa baseline evita di aggiungere ora dipendenze di generazione documentale che il runtime non possiede e che non sono necessarie per rendere fruibile la lezione.

### Canva

Canva può essere usato come **renderer/editor opzionale** quando offre un vantaggio reale di authoring o qualità grafica.

Non può essere:

- fonte di verità della progettazione;
- unico luogo in cui esiste un materiale necessario alla lezione;
- requisito per avviare la lezione;
- proprietario dello stato `READY`.

### Drive / provider documentali

Drive o altri provider autorizzati possono conservare/esportare artefatti e versioni, ma la semantica di lezione, pertinenza e readiness resta in DOCENTE OS.

### Soluzioni open/free

Una libreria o applicazione open/free entra soltanto quando serve una capability non coperta bene dalla baseline, ad esempio un formato editabile specifico. La scelta deve essere sostituibile dietro adapter e accompagnata da fallback canonico.

## 13. Stati e autorità

Stati umani minimi del manifesto:

- `DRAFT` — composizione disponibile ma incompleta;
- `REVIEW_REQUIRED` — proposta/materiale generato richiede controllo docente;
- `READY` — necessario per la lezione controllato e disponibile;
- `USED` — la lezione ha usato il manifesto/materiali;
- `NEEDS_REVISION` — la realtà registrata richiede una revisione per il prossimo ciclo.

`READY` non significa che ogni slot possibile esista. Significa che **quanto necessario per quella lezione è disponibile e validato secondo il suo rischio**.

## 14. UX operativa

Prima della lezione il docente deve poter vedere in pochi secondi:

- classe e orario;
- obiettivo;
- cosa è pronto;
- cosa manca;
- nota pertinente dalla volta precedente;
- un'unica azione primaria.

Quando il necessario è pronto, azioni dirette ammissibili:

- **Avvia lezione**;
- **Proietta alla LIM**;
- **Scheda studenti**;
- **Guida docente**;
- **Modifica** come azione secondaria.

Codici CAN, UUID, generation ID e dettagli provider restano nel livello di provenienza/diagnosi.

## 15. Frontdoor Copilot e write boundary

Ogni capability Copilot relativa alla preparazione deve passare dal percorso canonico:

`/api/copilot -> ContextAssembler -> constrained copilot kernel -> dedicated handler/adapter`

Non sono ammessi:

- endpoint AI paralleli per la stessa intenzione;
- chiamate dirette UI → provider AI per generare materiali canonici;
- scritture dirette del modello nei repository di dominio;
- mutazioni nascoste durante una risposta conversazionale.

La lettura/proposta può essere fluida. La write governata resta una azione esplicita e tracciabile.

## 16. Ordine di implementazione

Issue esecutiva: **#431**.

Ordine canonico:

1. **LP-1 — Manifesto/composizione:** estendere e riusare `NextLessonPreparation`; nessun nuovo store.
2. **LP-2 — Copilot action:** preparare la prossima lezione dietro la frontdoor canonica.
3. **LP-3 — Renderer DOCENTE OS:** guida docente, LIM, scheda studente, supporto visuale con baseline interna.
4. **LP-4 — Home/Oggi/Classe:** rendere visibile `Materiali pronti` e aprire gli artefatti direttamente.
5. **LP-5 — Adapter facoltativi:** Canva/Drive e altri provider soltanto dopo la baseline indipendente.
6. **LP-6 — Diario → domani:** chiudere il ciclo end-of-day con proposta e readiness del giorno successivo.

Non invertire l'ordine introducendo prima un provider o un nuovo formato persistente.

## 17. Acceptance canonica

La fondazione è realmente adottata quando:

1. il resoconto della giornata può produrre una proposta strutturata per la prossima lezione pertinente;
2. la prossima lezione deriva dall'autorità temporale corrente e fallisce chiusa in caso di ambiguità;
3. il sistema riusa materiali pertinenti prima di generarne nuovi;
4. il manifesto non duplica gli oggetti canonici;
5. il docente vede cosa è pronto, cosa manca e perché;
6. la LIM e la stampa funzionano senza Canva;
7. Canva, se disponibile, migliora la resa ma resta sostituibile;
8. le preferenze emergenti vengono promosse solo con validazione esplicita;
9. dati e osservazioni restano isolati per scope/finalità;
10. ogni output conserva provenance e contesto;
11. Home/Oggi permette di usare i materiali senza recuperare la chat che li ha originati;
12. la sessione reale registrata alimenta il ciclo successivo senza modificare automaticamente il Piano.

## 18. Non-obiettivi

- un nuovo database dei materiali;
- un secondo sistema di memoria;
- un secondo tipo di CAN-PACK;
- un agente autonomo in background;
- dipendenza obbligatoria da Canva/Drive/provider esterni;
- modifica automatica del Piano annuale;
- generalizzazione automatica fra classi;
- generazione preventiva di ogni possibile formato;
- documenti lunghi come interfaccia primaria della lezione.

## 19. Regola di manutenzione documentale

Questo documento è la fonte canonica per **preparazione della prossima lezione, materiali pronti, renderer didattici, relazione Copilot↔materiali e ciclo Diario→domani**.

Le specifiche verticali devono **referenziarlo**, non riscriverne i principi. Aggiornarlo soltanto quando cambia una decisione di fondazione.

Le issue e le PR devono contenere delta, acceptance ed evidence, non nuove riscritture della visione.