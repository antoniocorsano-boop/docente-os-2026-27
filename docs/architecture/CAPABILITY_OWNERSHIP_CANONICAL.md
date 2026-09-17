# Docente OS — Capability Ownership Canonical Map

Stato: **CANONICAL CANDIDATE / CONSOLIDATION #508**  
Data: 2026-09-17  
Baseline verificata: `develop@b8037da8ca15af7904152aae085830fd28bfcc62`

## 1. Scopo

Questo documento congela la distinzione tra **source of truth**, **writer autorizzato**, **read model/compositore** e **superficie utente** per le capability che durante l'evoluzione di Docente OS hanno mostrato sovrapposizioni apparenti.

Regola di governo:

> Una superficie può mostrare, combinare o proporre dati, ma non diventa proprietaria del dato solo perché lo rende visibile.

Nessuna nuova persistenza è autorizzata per risolvere una sovrapposizione di interfaccia.

## 2. Ownership canonica

| Ambito | Source of truth / owner | Writer autorizzato | Read model / composizione | Superfici / proiezioni | Decisione |
|---|---|---|---|---|---|
| Attività professionali esplicite | `PlannerTask` / Planner repository | Planner application boundary | Today/Planner context | Oggi, Planner, Copilota | **CONSERVA**: Planner possiede i task; Oggi non li duplica |
| Autorità temporale | Orario + Calendario, con stato di autorità esplicito | rispettivi boundary Orario/Calendario | `TemporalProjectionService`, `HomeDailyContext` | Oggi, Classe, Copilota, Lesson Preparation | **CONSERVA**: nessuna terza agenda |
| Esecuzione reale della lezione | `TeachingSession` + allocations | `recordLessonExecution` / boundary TeachingSession | storia corrente, continuità, evidenze | Classe, Diario, Oggi, Copilota | **CONSERVA**: TeachingSession è il root dell'accaduto |
| Riflessione/Diario | contenuto confermato nella TeachingSession/evidence contract | stesso boundary di registrazione della lezione | `TeachingSessionReflection`, `DriveDiaryProjection` | Diario, resoconto serale, Copilota | **UNIFICA**: Diario è proiezione/memoria della TeachingSession, non secondo registro |
| MDS / chiusura giornata | dati già posseduti da TeachingSession, Lesson Preparation, Planner e autorità temporale | **nessun writer MDS** | coda/read model derivato | Copilota, Oggi, resoconto giornata | **CONSOLIDA**: MDS resta read-only e non crea persistenza |
| Piano annuale / blocchi Bxx | Piano annuale canonico e relativo stato professionale | boundary del Piano con decisione docente | Lesson context / HumanTask projection | Classe, Progetta, Lesson Workspace, Copilota | **CONSERVA**: nessuna auto-mutazione da Diario/Copilota |
| UDA | UDA canonica + delta professionali governati | boundary UDA/Progetta con decisione docente | Lesson/HumanTask projection | Progetta, Classe, Lesson Workspace | **CONSERVA**: una UDA, non una copia per superficie |
| Preparazione prossima lezione | nessun nuovo owner: deriva da autorità temporale + Piano/UDA + TeachingSession + Knowledge | writer separati delle fonti; nessun writer nel `NextLessonPreparation` | `NextLessonPreparation` | Oggi, Classe, Copilota | **CONSOLIDA**: è un read model composto |
| Lesson Preparation Manifest | nessun archivio autonomo; riferisce Piano/UDA, proiezione lezione, Knowledge, `LessonDesignExtension` | accettazione delle proposte solo tramite boundary `lesson_design_extensions` | `LessonPreparationManifest` | Materiali, Lesson Workspace, Copilota, RoleView | **CONSERVA COME MANIFEST**: non duplicare asset o contenuti |
| Adattamenti/proposte di lezione | `LessonDesignExtension` | repository/RPC di accettazione esplicita docente | composizione della sequenza e dei material slot | Lesson Workspace, Materiali, RoleView | **CONSERVA**: `PROPOSED` non è `ACCEPTED` |
| Materiali didattici | owner distribuito e tracciato: risorse canoniche della lezione, asset Knowledge, estensioni accettate | boundary dell'asset/origine; promozione umana dove richiesta | material slots del Manifest | `/materiali/prossima`, `/materiali/domani`, Classe, LIM/print | **UNIFICA LA SEMANTICA**: le pagine Materiali non sono un secondo archivio |
| Conoscenza / KB | `KnowledgeAsset` + generazione corrente | Knowledge ingestion/reprocessing boundary | retrieval FULL_TEXT / SEMANTIC / HYBRID | Conoscenza, Copilota, Lesson Preparation | **CONSERVA**; il bounded retrieval #514 deve estendere questo unico motore |
| Copilota | **nessun dato di dominio posseduto** | nessuna write implicita; azioni persistenti passano da boundary dedicati e conferma | ContextAssembler + Copilot Kernel + handler dedicati | Oggi, Classe, Lezione, Conoscenza | **CONSOLIDA**: orchestratore, non database né seconda memoria |
| Voice/STT | audio/transcript effimeri fino a conferma | nessun writer autonomo STT | input della stessa azione Copilota/registrazione | Registra lezione | **CONSERVA COME INPUT MODE** |
| Notifiche / riepiloghi / automazioni | fatti e priorità restano nei rispettivi owner: Oggi/TemporalProjection, Planner, TeachingSession, Lesson Preparation | nessun writer didattico nel canale di consegna; ammessa solo persistenza tecnica di consenso/deduplica/consegna quando necessaria | `DailyTeacherBrief`/read model Today e query canoniche | in-app, eventuale browser notification o consegna schedulata | **CONSOLIDA COME DELIVERY PROJECTION**: mai nuova source of truth |
| RoleView | **nessun dato posseduto** | nessun writer RoleView | `RoleViewSnapshot` derivato dal Manifest e dalle evidenze | viste TEACHER/COORDINATOR/REVIEWER/DEVELOPER | **CONSERVA COME PROIEZIONE**: mai fonte di maturità autonoma |
| Drive | file/artefatti esportati o documenti con propria provenance | adapter Drive governato | link/export/proiezione | Materiali, Diario, Knowledge | **CONSERVA COME DESTINAZIONE/ASSET PROVIDER**, non semantica del dominio |
| Canva | output/editing esterno opzionale | adapter esplicito dopo azione docente | renderer/editor | Materiali | **BLOCCA COME OWNER**: non può possedere readiness o stato didattico |
| Libro/MIM | adozioni/cache MIM + binding editoriale con provenance | sync/cache e conferma docente | riferimenti per lezione/LO/materiali | Cattedra, Lesson Preparation, Copilota | **CONSERVA**: il libro è fonte/riferimento, non copia del contenuto protetto |
| Curricolo istituzionale | CurManLight/Arena e fonte istituzionale/versionata | processo di approvazione/validazione previsto | binding curricolare in Docente OS | Curricolo, Piano, UDA, Copilota | **CONSERVA AUTORITÀ ESTERNA**; Docente OS non riscrive il curricolo |
| Learning Object | **nessun owner runtime ancora autorizzato** | nessuno | futuro manifest didattico riusabile | nessuna nuova superficie nella Fase 2 | **BLOCCA IMPLEMENTAZIONE** fino al pilot canonico |

## 3. Chiarimenti vincolanti sulle sovrapposizioni

### 3.1 Oggi non possiede Planner, Orario o Calendario

`Oggi` è l'orchestratore della giornata. Compone proiezione temporale, lezioni, registrazioni pendenti, task Planner e readiness della prossima lezione. Non crea una propria agenda o un proprio registro attività.

### 3.2 Diario non è un secondo registro della lezione

La registrazione professionale persistente resta `TeachingSession`. La riflessione strutturata e la proiezione Drive del Diario derivano da quella registrazione e mantengono il riferimento alla sessione/provenienza.

### 3.3 MDS non possiede decisioni

MDS-4/5/6 ha il ruolo di derivare la coda di chiusura e continuità verso il giorno successivo. Resta `READ_ONLY`: registrare una lezione, accettare una proposta didattica o modificare il Piano richiede il relativo writer canonico.

### 3.4 Lesson Preparation non è un database

`NextLessonPreparation` e `LessonPreparationManifest` compongono dati esistenti. Il Manifest può essere ricostruito deterministicamente dagli owner sottostanti; non giustifica un secondo storage di materiali, UDA o preparazioni.

### 3.5 Materiali è una capability, non una nuova autorità

`TEACHER_BRIEF`, `LIM_VIEW`, `STUDENT_HANDOUT`, `MINI_DECK`, `VISUAL_AID` e `ASSESSMENT` sono **ruoli d'uso**. Il loro contenuto resta nell'asset o nella sorgente che lo possiede. `/materiali/prossima` e `/materiali/domani` devono convergere sullo stesso Manifest e differire soltanto per contesto temporale/UX.

### 3.6 Copilota e RoleView sono proiezioni/orchestratori

Il Copilota può leggere, spiegare e proporre. Una write richiede un application boundary distinto e conferma umana. RoleView traduce lo stato del Manifest in una vista orientata al ruolo; non conserva un secondo stato di readiness, maturità o blocco.

### 3.7 Notifiche e automazioni consegnano contesto, non lo possiedono

Il riepilogo mattutino e le eventuali notifiche devono derivare da `DailyTeacherBrief`/Oggi e dagli owner canonici. È ammesso conservare soltanto lo stato tecnico necessario alla consegna (consenso, preferenza, deduplica, esito), senza copiare Planner, lezioni, readiness o Diario in un nuovo dominio. Un'eventuale azione di modifica aperta da una notifica torna sempre al writer canonico competente.

## 4. Writer boundary che non devono essere bypassati

- Planner task → Planner application/repository.
- Registrazione lezione → TeachingSession / `recordLessonExecution`.
- Stato Piano/UDA → boundary professionale specifico con decisione docente.
- Accettazione proposta di lezione → `lesson_design_extensions` / RPC governata.
- Knowledge → ingestion/reprocessing/retrieval canonici.
- Curricolo istituzionale → autorità CurManLight/Arena e processo di validazione previsto.

Copilota, MDS, RoleView, Home/Oggi, Manifest, notifiche e automazioni non diventano writer per comodità di implementazione.

## 5. Consolidazioni autorizzate per la Fase 3

Sono autorizzate soltanto queste consolidazioni, senza introdurre nuovi owner:

1. **Oggi/Home** — stabilire una sola responsabilità di orientamento operativo; Home può essere ingresso/riduzione, Oggi resta orchestratore della giornata.
2. **Materiali/Preparation** — ricondurre `prossima` e `domani` allo stesso `LessonPreparationManifest`, mantenendo differenti soltanto contesto e presentation flow.
3. **Diario/MDS/Copilota** — rendere esplicita la catena `TeachingSession → Reflection → read model MDS → proposta Copilota`, senza nuovo writer.
4. **RoleView** — mantenerla come projection layer riusabile sopra read model canonici, senza persistenza autonoma.
5. **Knowledge bounded retrieval (#514)** — riscrivere la query come estensione dell'unico retrieval corrente, senza secondo repository/motore.

Non sono autorizzati nella Fase 3:

- nuovo store Learning Object;
- compositore UDA automatico;
- secondo archivio materiali;
- secondo assistant runtime;
- writer autonomi MDS/RoleView/Copilota;
- generalizzazione automatica delle osservazioni tra classi;
- nuovi provider/canali di notifica prima della convergenza Oggi/Home, salvo sola configurazione di delivery già prevista;
- supporto generativo #519 finché lifecycle e promozione degli output non vengono verificati contro questa mappa.

## 6. Evidenza tecnica verificata

La baseline `develop@b8037da8…` mostra coerentemente che:

- `PlannerTask` possiede stato, priorità, scadenze e source refs dei task;
- `TeachingSession` possiede durata reale, note/evidenza, source snapshot e allocazioni ai blocchi;
- `TeachingSessionReflection` viene codificata nella evidence note della TeachingSession e può produrre una `DriveDiaryProjection`;
- `NextLessonPreparation` aggrega temporal authority, Lesson context, continuità da TeachingSession e Knowledge;
- `LessonPreparationManifest` compone sequenza, material slots, Knowledge ed estensioni senza creare un nuovo content store;
- `handleNextLessonPreparation()` dichiara `persistentEffect: NONE` e richiede conferma per qualunque effetto persistente;
- `RoleViewSnapshot` è costruito dal `LessonPreparationManifestResult` e mantiene source/provenance;
- le decisioni già tracciate per riepilogo/notifiche richiedono contenuto derivato da Oggi/DailyTeacherBrief, non un flusso autonomo.

## 7. Gate Fase 2

Per il perimetro delle capability sovrapposte, il requisito **“nessun proprietario del dato ambiguo” è soddisfatto** da questa mappa.

La chiusura formale di #508 richiede ancora soltanto:

1. riallineamento del Capability Register alla presente mappa;
2. verifica che tutte le capability minime elencate in #508 abbiano una classificazione esplicita;
3. registrazione della lista di consolidazioni autorizzate della sezione 5 come unico ingresso alla Fase 3.

## 8. Decisione

**OWNER FREEZE APPROVED FOR CONSOLIDATION.**

Da questo punto una nuova persistenza, un nuovo writer o una nuova source of truth in uno degli ambiti sopra elencati richiede una decisione architetturale esplicita e deve dimostrare perché l'owner canonico esistente è insufficiente.