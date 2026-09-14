# DOCENTE OS — Product Experience Masterplan

Data: **2026-09-14**  
Stato: **CANONICAL CANDIDATE / V1 CONVERGENCE**  
Autorità programma: **#387 — Teacher Operating System V1**

## 1. Decisione di prodotto

DOCENTE OS evolve da applicazione composta da viste verticali a **Teacher Operating System**: memoria operativa e riflessiva del docente, orchestratore del lavoro professionale e copilota AI contestuale.

Il prodotto non deve chiedere al docente di amministrare il software. Deve capire il momento professionale, recuperare il contesto, presentare ciò che conta, preparare ciò che manca e poi lasciare spazio all'attività didattica.

Formula canonica:

**Teacher Moment → contesto → prossimo passo → copilota → conferma umana → traccia**

Principio guida:

> **La complessità appartiene al sistema; l'attenzione deve restare al docente e agli studenti.**

## 2. Unità fondamentale: Teacher Moment

Il prodotto ragiona prima per momenti professionali e poi per moduli:

- prima della scuola;
- prima della lezione;
- durante la lezione;
- subito dopo;
- tra due lezioni;
- fine giornata;
- preparazione del giorno successivo;
- revisione periodica del percorso.

`TeacherMoment` è un read model di orchestrazione, non una nuova fonte di verità. Compone Orario, Calendario/Temporal Projection, Classe, Piano, TeachingSession, osservazioni, materiali e capability disponibili.

## 3. Output fondamentale: Next Step

Ogni stato operativo deve poter rispondere rapidamente a:

1. cosa conta adesso;
2. perché conta;
3. cosa è già pronto;
4. cosa manca;
5. cosa propone il copilota;
6. qual è l'unica azione primaria;
7. dove si torna dopo l'azione.

La UI primaria mostra il **Next Step**, non il Product Model.

## 4. Today + Next

Home/Oggi non è una lista statica di attività.

Prima della giornata mostra prima classe, readiness e note pertinenti. Durante la giornata mostra lezione corrente/prossima e scostamenti. A fine giornata mostra ciò che serve per domani.

Se non esiste nulla per oggi, il sistema deve passare al **prossimo Teacher Moment rilevante** invece di fermarsi a una lista vuota.

## 5. Lesson Brief

La progettazione completa resta ricca ma non è l'entry point operativo.

Il Lesson Brief deve mostrare, quando possibile in una singola viewport mobile:

- classe e quando;
- obiettivo umano della lezione;
- cosa serve;
- cosa è già pronto;
- cosa manca;
- nota utile dalla volta precedente;
- proposta del copilota;
- una sola CTA primaria.

Il resto vive dietro `Vedi progettazione completa` o progressive disclosure.

## 6. Copilota contestuale

Nome funzionale: `ContextualTeacherAssistant`.

Non è una chat globale separata dal lavoro. Riceve `TeacherMoment` trasformato in `AssistantContext` e può:

- recuperare il contesto;
- sintetizzare ciò che conta;
- trovare fonti e materiali;
- produrre contenuti;
- adattare e migliorare contenuti;
- confrontare fonte e obiettivo;
- evidenziare ciò che manca;
- proporre il prossimo passo;
- ricevere input vocale;
- preparare write governate.

Regola permanente:

**AI propone e prepara; il docente decide gli effetti persistenti o professionalmente significativi.**

Ogni informazione utile mantiene stato epistemico: `DOCUMENTED`, `USER_REPORTED`, `INFERRED`, `TO_VERIFY`.

## 7. Contextual Voice Capture

La voce è un canale del copilota, non un modulo autonomo.

Flusso canonico:

`parla → trascrizione effimera → context binding → interpretazione proposta → conferma → write governata`

Una singola cattura può proporre nota di esecuzione, osservazione professionale, focus successivo, bisogno di preparazione o promemoria.

Raw audio effimero per default. Binding ambiguo sempre confermato. Nessuna auto-valutazione e nessun auto-completamento Piano.

Specifica: `docs/architecture/CONTEXTUAL_VOICE_CAPTURE_SPEC.md`.

## 8. Memoria operativa e riflessiva

DOCENTE OS deve consentire al docente di riprendere il filo senza ricostruirlo mentalmente.

La memoria professionale conserva e collega:

- previsto;
- realmente svolto;
- osservato;
- lasciato aperto;
- prossimo focus;
- materiali/preparazioni necessarie.

La chat non è il registro delle decisioni. I record confermati restano strutturati, tracciabili e governati.

## 9. Orchestrazione degli strumenti

Conoscenza, Planner, Piano, Drive, SharePoint/OneDrive, Calendar/Outlook, Teams, Canva e altri strumenti sono **capability del Teacher Moment**, non destinazioni cognitive obbligatorie.

Esempi:

- `preparami una scheda per questa lezione`;
- `trova il materiale usato con la 1C`;
- `adatta questa presentazione alla 2C`;
- `metti questa scadenza nel calendario`;
- `salva il documento nello spazio autorizzato dalla scuola`.

Il provider viene risolto secondo la policy istituzionale.

## 10. Institutional Configurator

DOCENTE OS deve funzionare in modalità:

- `PERSONAL_LOCAL_FIRST`;
- `GOOGLE_WORKSPACE_EDU`;
- `MICROSOFT_365_EDU`;
- `HYBRID` soltanto con data boundary esplicito.

La scuola governa provider, identity, scopes, data tier, AI policy, voice policy, retention e capability disponibili. Nessun connector ottiene privilegi impliciti.

Specifica: `docs/architecture/INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`.

## 11. Experience platform

### UI foundation

- shadcn/ui come sorgente open-code;
- Tailwind/token layer dove appropriato;
- accessibilità e responsive behavior strutturali;
- niente template dashboard che impongano una tassonomia estranea al lavoro docente.

### Assistant layer

- assistant-ui o primitive equivalenti dietro adapter DOCENTE OS;
- provider-neutral `AiOrchestratorPort`;
- nessun vendor AI come requisito del dominio;
- local/provider runtime possibile secondo policy.

### Authoring

- editor a blocchi per UDA, programmazioni, verbali, relazioni e materiali;
- versionamento/provenance;
- export DOCX/PDF dove richiesto;
- produzione contenuti accessibile dal task e dal copilota.

## 12. Human-in-the-loop

Richiedono conferma esplicita almeno:

- write esterne;
- invio messaggi/e-mail;
- modifica eventi esterni;
- modifica significativa di documenti canonici;
- conferme istituzionali/curricolari;
- cancellazioni irreversibili;
- promozione di proposta AI a dato canonico;
- attivazione di una versione di orario;
- operazioni su dati personali o destinatari esterni.

Ricerca, lettura, sintesi, confronto, proposta e anteprima non richiedono conferma separata.

## 13. Progressive disclosure

Tre livelli:

1. **Lavoro** — significato, stato, sintesi, prossima azione.
2. **Provenienza** — fonte, versione, data, validazione.
3. **Dettagli tecnici** — ID, generation, provider metadata, debug.

Il livello tecnico non compete con il task ordinario.

## 14. Product KPI

### Teacher Attention Returned — TAR

Domanda centrale:

> Quanto lavoro di ricostruzione, ricerca, ricopiatura e navigazione evita il sistema prima che il docente possa concentrarsi sull'azione professionale?

Metriche correlate:

- tempo per identificare il prossimo passo;
- decision count;
- surface transitions;
- competing actions;
- re-entry burden il giorno successivo;
- percentuale di contesto precompilato correttamente;
- tap/click → interactive;
- P50/P95;
- friction/workaround HUMAN_USE.

## 15. Programma V1

### V1-A — Teacher Moment + Today/Next

Quattro momenti prioritari: sera→domani, prima lezione→readiness, dopo lezione→reflection/capture, tra due lezioni→next context.

### V1-B — Lesson Brief

Entry point compatto task-first con dettaglio progressivo.

### V1-C — Copilota operativo + Voice

`TeacherMoment → AssistantContext`, produzione/adattamento contenuti, Contextual Voice Capture, preview + conferma.

### V1-D — Institutional Configurator

Provider, identity, scopes, data boundary, AI/voice policy e capability resolver.

### V1-E — Runtime

Benchmark Render vs Firebase App Hosting / Cloud Run mantenendo inizialmente Supabase, con cold/warm, TTFB, tap→interactive e P50/P95.

## 16. Test e assurance

La strategia non è `meno test` ma `fast by default, deep by risk`.

- **FAST** — unit/type/lint/contract mirati;
- **MERGE** — build, invarianti e critical path pertinenti;
- **NIGHTLY** — full HVA/WCAG/DPG/performance/security/cross-surface;
- **RELEASE** — exact SHA, full assurance applicabile, HUMAN_USE, visual acceptance, runtime receipt e rollback.

Security, privacy, RLS, AAL2, provenance e human authority non vengono indeboliti.

Specifica: `docs/engineering/FAST_FEEDBACK_TEST_STRATEGY_V1.md`.

## 17. Product Model ≠ User Model

Entità come `TeachingSession`, `AnnualPlanBlockProgress`, `KnowledgeAsset`, UDA, versioni, provenance e policy restano rigorose internamente.

Il docente non deve impararle per completare un task ordinario.

Il modello percepito è:

**adesso → cosa serve → agisco/parlo → confermo se necessario → il sistema ricorda → prossimo passo**

## 18. Relazione con UX-0 e M5

La HUMAN_USE #383 ha prodotto `FRICTION / REWORK_REQUIRED`. Non viene forzata a PASS: diventa evidence vincolante del V1.

M5 resta assurance di prodotto ma non detta il ritmo quotidiano di implementazione. Un gate macchina verde non sostituisce HUMAN_USE.

## 19. Non obiettivi

- sostituire il registro elettronico/SIS;
- replicare Google Workspace o Microsoft 365;
- acquisire indiscriminatamente dati personali;
- registrazione continua dell'aula;
- auto-valutazione degli studenti;
- decisioni professionali automatiche;
- nuova tassonomia di moduli;
- migrazione big-bang.

## 20. Source of truth

Ordine specifico per la convergenza V1:

1. security/RLS/domain invariants;
2. ADR accettate;
3. `PROJECT_STATUS_CURRENT.md`;
4. `TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`;
5. questo Masterplan;
6. `INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`;
7. `TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md`;
8. `CONTEXTUAL_VOICE_CAPTURE_SPEC.md`;
9. Product Simplification / Human Experience / Design System / specifiche verticali.

Le specifiche verticali non possono reintrodurre una UI per moduli in contrasto con il Teacher Moment né indebolire invarianti superiori.
