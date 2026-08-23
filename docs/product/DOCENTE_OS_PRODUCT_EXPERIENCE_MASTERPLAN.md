# DOCENTE OS — Product Experience Masterplan

Data: 2026-08-22  
Stato: CANONICAL / APPROVED  
Ambito: esperienza prodotto, assistenza contestuale, component platform, accessibilità, adozione progressiva

## 1. Decisione di prodotto

DOCENTE OS evolve da applicazione funzionale composta da viste verticali a **ambiente operativo professionale assistito**, nel quale il docente deve poter capire immediatamente:

1. dove si trova;
2. che cosa sta guardando;
3. da dove proviene l'informazione;
4. che stato ha;
5. che cosa conviene fare adesso;
6. quale effetto avrà l'azione proposta;
7. quando è richiesta una conferma umana.

Il prodotto non deve diventare una chat generalista né un gestionale amministrativo. L'AI è un **collaboratore contestuale incorporato nelle superfici di lavoro**.

## 2. North star

Formula canonica dell'esperienza:

**Contesto → Comprensione → Proposta → Effetto → Conferma → Azione → Traccia**

Ogni vista deve privilegiare significato e decisione rispetto a dettagli tecnici.

Carattere del prodotto: **calma operativa + assistenza competente**.

## 3. Stack di esperienza approvato

### Fondazione UI

- **shadcn/ui** come sorgente di componenti open-code e personalizzabili;
- Tailwind CSS come layer di token/utilità quando introdotto nel runtime;
- componenti copiati nel repository, non dipendenza visiva opaca;
- accessibilità e responsive behavior come gate, non rifinitura finale.

### Assistente contestuale

- **assistant-ui** come prima scelta per primitive conversazionali e agentic UX;
- integrazione tramite runtime/adattatore DOCENTE OS, senza rendere il dominio dipendente dalla libreria;
- nessun obbligo di assistant-cloud;
- nessun obbligo di Vercel AI SDK: il runtime può restare custom/provider-neutral;
- approvazioni umane inline obbligatorie per azioni con effetto persistente o esterno.

### Evoluzione agentica

- **CopilotKit** resta tecnologia candidata per una fase successiva, quando serviranno shared state, generative UI e workflow agentici cross-surface;
- non entra nella baseline finché l'assistente contestuale non è validato con utenti reali.

### Produzione documentale

- **BlockNote** è il candidato preferito per editor a blocchi di UDA, programmazioni, verbali, relazioni e materiali;
- usare soltanto pacchetti con licenza compatibile con il prodotto; le estensioni XL non sono baseline.

### Modelli AI

- provider AI dietro `AiOrchestratorPort`;
- sviluppo possibile con provider remoto o **Ollama** locale;
- nessun provider AI deve diventare requisito del dominio o della persistenza.

## 4. Tecnologie esplicitamente non adottate come fondazione

- **Refine**: non adottato perché DOCENTE OS possiede già dominio, routing, persistenza, RLS e workflow; introdurlo come meta-framework aumenterebbe la superficie di migrazione.
- **Mantine**: ottimo ecosistema ma non adottato come seconda component library parallela; shadcn consente migrazione più graduale e controllo completo del codice.
- template dashboard completi: possono essere studiati come benchmark, non copiati come architettura.

## 5. Superfici canoniche

### Home

Deve rispondere a: **cosa richiede attenzione e da dove conviene iniziare**.

### Oggi

Deve rispondere a: **cosa devo fare oggi e cosa posso rinviare senza perdere il controllo**.

### Conoscenza

Deve rispondere a: **che cosa contiene questa fonte, quanto è affidabile e come posso usarla**.

### Piano annuale

Deve rispondere a: **dove sono rispetto al percorso annuale e quale blocco viene dopo**.

### Progetta

Deve rispondere a: **quali fonti, UDA e materiali sono già disponibili e cosa manca**.

### Orario

Deve rispondere a: **come è organizzata la settimana e quali scostamenti richiedono attenzione**.

### Classi

Deve rispondere a: **quale materiale e quale progettazione è associata a una classe/sezione**.

### Impostazioni

Deve rispondere a: **quale contesto professionale alimenta il sistema**.

## 6. Assistente DOCENTE OS

Nome funzionale interno: `ContextualTeacherAssistant`.

Non è una chat globale separata dal lavoro. Deve ricevere un `AssistantContext` composto almeno da:

- route/surface;
- workspace;
- anno scolastico;
- disciplina;
- classe/sezione quando disponibile;
- oggetto corrente;
- provenienza;
- stato;
- capability disponibili;
- capability vietate;
- dati mancanti;
- eventuali azioni proposte ancora non confermate.

### Formato canonico delle risposte operative

1. **Ho trovato** — fatti e stato.
2. **Ti propongo** — una o più opzioni ordinate.
3. **Ecco l'effetto** — cosa cambierà e cosa resterà invariato.
4. **Confermi tu** — per ogni effetto persistente, esterno o istituzionalmente significativo.

## 7. Command center

Viene introdotta una command palette globale, inizialmente con ricerca e navigazione, successivamente con azioni.

Scorciatoia desktop: `Ctrl/Cmd + K`.

Categorie minime:

- Vai a…
- Cerca nella Conoscenza…
- Apri classe…
- Apri piano annuale…
- Nuova attività…
- Chiedi a DOCENTE OS…

Le azioni distruttive o esterne non si eseguono direttamente dalla palette senza conferma.

## 8. Progressive disclosure

Tre livelli di informazione:

### Livello 1 — lavoro

Titolo umano, stato, sintesi, prossima azione.

### Livello 2 — provenienza

Fonte, versione, data acquisizione, validazione.

### Livello 3 — dettagli tecnici

ID, processor, generation id, raw status, provider metadata, debug information.

Il livello 3 non deve comparire nel flusso ordinario salvo richiesta esplicita.

## 9. Human-in-the-loop

Richiedono sempre conferma:

- invio messaggi/e-mail;
- creazione o modifica di eventi esterni;
- modifica significativa di documenti canonici;
- conferma istituzionale o curricolare;
- cancellazioni irreversibili;
- promozione di una proposta AI a dato canonico;
- attivazione di una versione di orario;
- operazioni che coinvolgono dati personali o destinatari esterni.

Non richiedono conferma separata:

- ricerca;
- lettura;
- sintesi;
- confronto;
- proposta;
- anteprima;
- navigazione;
- calcolo non persistente.

## 10. Roadmap di implementazione

### X0 — Canonical freeze

- masterplan;
- ADR esperienza;
- specifica assistente;
- design system v2;
- stato generale aggiornato.

### X1 — Component foundation

- Tailwind + shadcn foundation;
- token canonici;
- Button, Card, Badge, Alert, Dialog, Sheet, Tooltip, Dropdown, Tabs, Command, Skeleton, Toast;
- nessuna riscrittura big-bang.

### X2 — AppShell professionale

- sidebar responsive;
- mobile drawer/bottom nav coerenti;
- page header canonico;
- command palette globale;
- feedback di navigazione/caricamento.

### X3 — Contextual Assistant shell

- assistant-ui integrato senza provider obbligatorio;
- `AssistantContext` reale da Conoscenza;
- suggerimenti contestuali;
- nessuna scrittura automatica.

### X4 — Assistant actions

- Planner: crea/proponi attività;
- Conoscenza: confronta, trova lacune, aggiorna analisi;
- Piano annuale: prossimo passo, copertura, scostamenti;
- Orario: anomalie e capacità settimanale;
- ogni write passa da preview + conferma.

### X5 — Authoring

- BlockNote per documenti didattici editabili;
- versionamento e provenienza;
- export DOCX/PDF quando richiesto.

### X6 — Agentic evaluation

- spike CopilotKit/AG-UI solo dopo validazione X3-X4;
- decisione ADR separata.

## 11. Gate di qualità

Ogni slice passa solo se:

- TypeScript strict PASS;
- lint PASS;
- test PASS;
- build PASS;
- nessuna regressione RLS/sessione;
- navigazione da tastiera verificabile;
- mobile 320–430 px utilizzabile;
- nessun gergo tecnico non necessario nella superficie primaria;
- nessuna azione AI persistente senza conferma;
- provider AI sostituibile;
- dati canonici non degradati.

## 12. Metriche di successo prodotto

Target qualitativi:

- utente identifica il prossimo passo entro 5 secondi;
- una funzione principale è raggiungibile senza conoscere la struttura interna del sistema;
- ogni proposta AI chiarisce fonte e conseguenza;
- una nuova attività comune richiede massimo 1–2 decisioni esplicite;
- riduzione dei controlli morti/dead-end a zero;
- nessuna schermata primaria richiede la comprensione di ID o status tecnici.

## 13. Principio di migrazione

**Nessuna riscrittura totale.**

Il runtime corrente resta funzionante mentre i componenti vengono sostituiti per strati. Ogni nuovo componente deve poter convivere con CSS esistente fino alla migrazione della superficie interessata.

## 14. Source of truth

Questo documento governa l'evoluzione dell'esperienza prodotto. In caso di conflitto:

1. sicurezza/RLS/domain invariants;
2. questo Masterplan;
3. Language & Collaboration System;
4. Design System V2;
5. specifiche verticali di modulo.
