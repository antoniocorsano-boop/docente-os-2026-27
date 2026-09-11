# DOCENTE OS — Home giornaliera / Daily Cockpit

Data: 2026-09-11  
Stato: **CANONICAL**  
Classificazione modifica: **COMPATIBLE** con il Product Experience Masterplan e con Design System V2.

## 1. Scopo

La Home di DOCENTE OS è la **cabina di regia giornaliera del docente**.

Non è una dashboard generale, non è un secondo Planner e non è un menu di moduli. Deve ridurre il tempo necessario a capire:

1. che cosa sta accadendo ora;
2. qual è il prossimo gesto professionale utile;
3. quale classe, attività e materiale sono pertinenti;
4. quali lezioni richiedono ancora registrazione;
5. quali osservazioni o idee emerse meritano di essere riprese.

North star:

> **La Home ricompone la realtà della giornata e porta in primo piano il prossimo gesto professionale già contestualizzato.**

Il principio preesistente “il prossimo passo, non tutto il sistema” resta valido, ma deve essere alimentato dal contesto reale di giornata, non soltanto da Planner e dalla presenza di una lezione esattamente in corso.

## 2. Invarianti canonici

Questi punti non sono dettagli di layout e non vanno cambiati senza una revisione canonica esplicita.

1. **Una sola azione primaria per contesto.** La Home deve sempre evidenziare un gesto principale, senza nascondere ciò che resta da fare.
2. **Nessuna nuova fonte di verità.** La Home compone dati esistenti; non introduce un proprio stato canonico parallelo.
3. **TeachingSession resta l’evidenza canonica della lezione svolta.** Drive è una proiezione documentale e un suo errore non trasforma una lezione registrata in “non registrata”.
4. **Orario e Calendario restano separati.** La Home usa la Temporal Projection o, dove già previsto, un contesto provvisorio esplicitamente etichettato; non crea dipendenze dirette Timetable → Calendar.
5. **Un orario DRAFT non diventa attivo per effetto della Home.** Ogni uso documentale di un orario provvisorio deve essere visibile come tale.
6. **Classe, attività, materiale e Diario devono essere raggiungibili senza ricostruire manualmente il contesto.**
7. **Le modifiche all’UDA restano proposte.** Nessuna osservazione della Home può modificare automaticamente una UDA o un Piano annuale.
8. **Privacy professionale.** La Home e le riflessioni collegate non richiedono nomi di alunni o altri dati personali per funzionare.
9. **Progressive disclosure.** La Home non espone per default l’intero sistema; “Esplora tutto lo spazio docente” resta accesso secondario.
10. **Mobile first nel flusso primario.** Il docente deve poter capire e agire dalla Home con una mano, senza hover e senza tabelle come superficie primaria.

## 3. Fonti di contesto autorizzate

La Home costruisce un **Daily Context Snapshot** di sola composizione applicativa. Lo snapshot non è una nuova entità di dominio persistente.

Può leggere, secondo i contratti esistenti:

- contesto workspace/docente/anno scolastico;
- Temporal Projection e stato dell’Orario;
- classi e teaching assignments;
- Piano annuale, blocco/attività didattica e UDA pertinenti;
- materiali e knowledge assets collegati alla classe/attività, inclusi link Canva;
- `TeachingSession` già registrate;
- stato documentale della proiezione Drive/outbox;
- PlannerTask rilevanti;
- osservazioni professionali già confermate dal docente.

Regola: se una sorgente non è disponibile o non è autorevole, la Home degrada in modo esplicito e non inventa il contesto mancante.

## 4. Modello temporale della Home

La stessa Home assume configurazioni diverse durante la giornata. Non esistono cinque Home diverse: esiste un solo resolver contestuale.

### Prima delle lezioni

Obiettivo: orientare e preparare.

La Home mette in primo piano la prossima lezione, la classe, l’attività prevista e il materiale già pronto.

### Durante una lezione

Obiettivo: ridurre la navigazione.

La Home mette in primo piano la lezione corrente e permette di continuare il percorso o aprire direttamente il materiale pertinente.

### Tra due lezioni

Obiettivo: preservare continuità senza creare attrito.

La Home deve rendere visibile sia la lezione appena conclusa da registrare sia la successiva. Il primario dipende dalla distanza temporale dalla prossima lezione secondo una soglia configurabile/evolutiva.

### Dopo l’ultima lezione

Obiettivo: chiudere la giornata.

La priorità passa alle TeachingSession mancanti, poi alle osservazioni/idee da riprendere e alle attività urgenti residue.

### Giorno senza lezioni

Obiettivo: lavoro professionale non in aula.

La Home porta in primo piano Planner, progettazione o preparazione futura secondo priorità, senza simulare un contesto didattico inesistente.

## 5. Resolver della Next Best Action

Il resolver è deterministico e spiegabile. Ordine di base:

1. lezione attualmente in corso;
2. lezione appena terminata da registrare, se non c’è una lezione imminente;
3. prossima lezione imminente;
4. altra lezione della giornata ancora da registrare;
5. PlannerTask urgente/scaduta/odierna;
6. preparazione della prossima giornata o prossima attività didattica;
7. fallback “Organizza il prossimo passo”.

### Regola di transizione tra lezioni

Quando una lezione è terminata ma la successiva è vicina, la Home non deve costringere il docente a scegliere fra “registrare” e “prepararsi”.

- azione primaria: la successiva se è imminente;
- richiamo persistente secondario: la lezione appena terminata resta “Da registrare”.

La soglia di “imminenza” è **parametro evolutivo**, non invariante. Valore iniziale raccomandato: **15 minuti**.

## 6. Anatomia canonica della Home

### A. Testata compatta

Mostra solo il contesto che aiuta ad agire:

- giorno e data;
- nome docente quando disponibile;
- sintesi della giornata, ad esempio “4 lezioni · 1 da registrare”;
- eventuale avviso umano “Orario provvisorio”.

La testata non deve occupare una porzione dominante del primo viewport mobile.

### B. Blocco “Adesso”

È la superficie principale e contiene:

- stato umano: `Prossima`, `In corso`, `Da chiudere`, `Da preparare`;
- classe e fascia oraria;
- attività/UDA pertinente quando disponibile;
- presenza del materiale pronto;
- una sola CTA primaria;
- massimo una o due azioni secondarie contestuali.

Esempi di CTA: `Apri la lezione`, `Continua la lezione`, `Registra la lezione`, `Apri il materiale`, `Apri la classe`.

### C. “La mia giornata”

Timeline leggibile con un colpo d’occhio. Ogni riga rappresenta un impegno didattico e mostra:

- orario;
- classe;
- attività sintetica;
- stato umano;
- accesso al contesto della classe.

La timeline non deve trasformarsi in tabella complessa su mobile.

### D. “Da riprendere”

Area professionale compatta per:

- lezioni ancora da registrare;
- idee emerse;
- osservazioni che possono influenzare la prossima attività;
- proposte di revisione UDA non ancora confermate;
- eventuale stato Drive, soltanto come informazione secondaria.

### E. “Dopo / Domani”

Preview compatta del prossimo contesto utile. Deve comparire solo se riduce lavoro futuro; non deve diventare una seconda agenda completa.

### F. Esplorazione completa

`Esplora tutto lo spazio docente` resta in fondo o comunque secondario. Da qui si accede a Oggi, Orario, Classi, Progetta, Piano annuale, Conoscenza e altre superfici.

## 7. Stati umani delle lezioni

La Home usa stati comprensibili, non codici tecnici:

- **Da preparare** — attività prevista ma materiale/contesto operativo non ancora pronto;
- **Pronta** — contesto e materiale sufficienti per entrare in aula;
- **In corso** — fascia corrente;
- **Da registrare** — lezione terminata senza TeachingSession conclusiva;
- **Registrata** — TeachingSession presente;
- **Registrata · Drive in attesa** — stato canonico salvo, proiezione documentale non ancora sincronizzata;
- **Da riprovare su Drive** — errore di sincronizzazione documentale, non perdita della TeachingSession.

La distinzione canonico/documentale deve restare coerente con il Diario.

## 8. Materiali e Canva

Il materiale non è una destinazione generica separata dalla lezione.

La Home deve risolvere il percorso:

`classe → attività → materiale pertinente`.

Se esiste un materiale Canva già collegato, la Home lo presenta come `Materiale pronto` / `Apri materiale` dentro il contesto della lezione. Non deve chiedere al docente di cercarlo nuovamente in Conoscenza o in Drive.

Canva resta superficie didattica; non diventa registro né fonte canonica delle evidenze di lezione.

## 9. Diario e chiusura della lezione

Terminata la fascia oraria, una lezione senza TeachingSession passa a `Da registrare`.

Il gesto apre il form nativo già previsto per:

- che cosa è stato svolto;
- che cosa è stato osservato;
- difficoltà;
- idee emerse;
- possibile impatto sull’UDA;
- prossima attività;
- durata effettiva.

Dopo il salvataggio canonico la Home deve mostrare `Registrata` immediatamente, indipendentemente dall’esito successivo della proiezione Drive.

## 10. Filo professionale e miglioramento della didattica

La Home non deve limitarsi a chiudere registrazioni. Deve rendere recuperabili le osservazioni professionali confermate dal docente.

`Da riprendere` può quindi aggregare segnali come:

- una difficoltà osservata in più classi;
- un’idea didattica emersa durante una lezione;
- una proposta di modifica della sequenza UDA;
- una prossima attività già suggerita dal diario.

Qualunque sintesi AI o deterministica resta `PROPOSE`. Nessuna modifica a UDA/Piano annuale viene applicata senza conferma umana.

## 11. Fallback e incompletezza del contesto

La Home deve fallire in modo utile.

### Orario non attivo

Se esiste un unico slot DRAFT coerente e i contratti applicativi ne consentono l’uso documentale, mostrare `Orario provvisorio, non ancora attivato`.

Se esistono più slot plausibili o il binding di sezione è ambiguo, non indovinare: mostrare la necessità di aprire Orario/Classi.

### Nessuna attività collegata

Mostrare la classe e l’orario, con CTA `Apri la classe` o `Prepara attività`; non inventare una UDA o un blocco.

### Materiale mancante

Mostrare `Materiale non ancora collegato` e offrire un gesto di preparazione, senza marcare la lezione come errore.

### Drive non collegato

La registrazione resta utilizzabile. Il collegamento Drive è un miglioramento del flusso documentale, non un prerequisito per il lavoro in aula.

## 12. Criteri di accettazione della prima implementazione

Una slice Home Daily Cockpit è accettabile solo se dimostra almeno questi scenari:

1. prima della prima lezione: la CTA primaria apre il contesto della prossima lezione;
2. durante una lezione: la classe corrente è identificata correttamente;
3. transizione ravvicinata: la prossima lezione è primaria e la precedente resta visibile come `Da registrare`;
4. fine giornata: una TeachingSession mancante sale in priorità;
5. TeachingSession registrata + Drive pending: la lezione resta `Registrata`;
6. orario DRAFT unico: etichetta provvisoria visibile;
7. orario ambiguo: fail-closed, nessuna classe indovinata;
8. materiale Canva collegato: raggiungibile dal contesto della lezione;
9. mobile 360–430 px: nessun overflow orizzontale e CTA primaria raggiungibile senza layout ambiguo;
10. nessun flusso richiede nomi di alunni o dati personali.

HVA desktop/mobile deve includere almeno un caso reale o fixture semanticamente equivalente per `prima`, `durante`, `tra`, `dopo`.

## 13. Parametri evolutivi

Questi elementi sono deliberatamente migliorabili senza mettere in discussione il modello canonico, purché la modifica venga validata:

| Parametro | Baseline iniziale | Stato |
|---|---:|---|
| soglia “lezione imminente” | 15 min | OPEN TO EVIDENCE |
| densità timeline mobile | 1 riga compatta per impegno | OPEN TO EVIDENCE |
| posizione “Da riprendere” | sotto timeline | OPEN TO EVIDENCE |
| preview “Domani” | compatta e condizionale | OPEN TO EVIDENCE |
| quantità azioni secondarie nel blocco Adesso | max 2 | OPEN TO EVIDENCE |

Una modifica di questi parametri è `COMPATIBLE` se preserva gli invarianti del §2.

## 14. Registro delle ipotesi UX

Le decisioni migliorabili devono essere trattate come ipotesi, non come gusti.

### H-001 — 15 minuti per il passaggio tra lezioni

Ipotesi: sotto i 15 minuti il docente beneficia maggiormente dell’accesso alla lezione successiva che della registrazione immediata della precedente.

Validazione: prova umana su giornate con lezioni consecutive; misurare se il docente deve tornare indietro o se perde registrazioni.

### H-002 — Timeline compatta

Ipotesi: una timeline verticale è più leggibile di card complete ripetute su mobile.

Validazione: HVA con almeno 4 lezioni nella stessa giornata.

### H-003 — “Da riprendere” dopo la timeline

Ipotesi: riflessione e miglioramento sono più utili dopo aver ricostruito la giornata, salvo urgenze di registrazione.

Validazione: test di fine giornata.

### H-004 — Preview del giorno successivo

Ipotesi: una preview minima riduce il carico serale senza trasformare la Home in agenda settimanale.

Validazione: uso reale per almeno una settimana scolastica.

## 15. Evidenza di miglioramento

La Home va migliorata con evidenza qualitativa e operativa, non inseguendo metriche di engagement.

Fonti ammesse:

- HVA guidata e libera;
- diario di bordo del docente sul flusso di lavoro;
- errori ricorrenti o navigazioni ridondanti osservate durante il pilot;
- failure/ambiguità reali di Orario, materiali, TeachingSession e Drive;
- feedback esplicito del docente.

Telemetria comportamentale non personale può essere introdotta solo con decisione separata; non è requisito della Home.

## 16. Regola di evoluzione

Ogni modifica a questa specifica deve dichiarare una delle seguenti classi:

- `COMPATIBLE` — migliora layout, soglie, copy o ordinamento secondario senza violare gli invarianti;
- `SUPERSEDING` — cambia il modello di composizione o la responsabilità della Home e sostituisce una decisione precedente;
- `BREAKING` — sposta una fonte di verità, altera i confini umani o introduce nuove dipendenze di dominio.

Ogni proposta deve riportare:

1. problema osservato;
2. evidenza;
3. ipotesi di miglioramento;
4. impatto sugli invarianti;
5. HVA/acceptance necessaria;
6. esito dopo il pilot.

Questa regola serve a rendere la Home **canonica ma non rigida**: gli invarianti stabilizzano il prodotto; i parametri evolutivi possono migliorare con l’esperienza reale.

## 17. Sequenza di implementazione raccomandata

### HDC-1 — Daily Context + Next Best Action

Comporre giornata, TeachingSession e stato temporale; sostituire il fallback generico con il resolver canonico.

### HDC-2 — Timeline + materiali

Aggiungere `La mia giornata`, stati umani e accesso diretto ai materiali collegati.

### HDC-3 — Chiusura giornata + Da riprendere

Portare in Home le registrazioni mancanti e le osservazioni professionali confermate.

### HDC-4 — Evidenza pilot e tuning

Validare H-001…H-004 e aggiornare soltanto i parametri supportati dall’evidenza.

Non introdurre in HDC-1/HDC-2 una nuova persistenza Home-specifica.

## 18. Relazioni canoniche

Questa specifica va letta insieme a:

- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`;
- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md`;
- `docs/architecture/WORK_TIME_MENTAL_MODEL.md`;
- `docs/architecture/TEMPORAL_COMPOSITION_CANONICAL_SPEC.md`;
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md`;
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md`;
- `product/design/HUMAN-EXPERIENCE-CONTRACT.md`;
- `product/design/MOBILE-RULES.md`;
- `product/design/ACCESSIBILITY-RULES.md`.

In caso di conflitto prevale l’ordine di autorità definito in `docs/product/CANONICAL_DOC_INDEX.md`.
