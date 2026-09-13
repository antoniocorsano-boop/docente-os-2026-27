# DOCENTE OS — Teaching Evidence Canonical Spec

Data: 2026-09-13  
Stato: FOUNDATION / RUNTIME NOT YET AUTHORIZED

## 1. Decisione

DOCENTE OS introduce una capability canonica denominata **Osservazioni ed evidenze**.

Non è una nuova applicazione, non è una griglia valutativa e non è un sistema di profiling degli alunni. È il livello professionale che collega l'esperienza reale della lezione alla memoria didattica e alla successiva decisione del docente.

La capability estende il ciclo già esistente:

```text
Prepara → In classe → Osserva → Registra
```

in una catena persistente e spiegabile:

```text
CAN-PLAN / Bxx
      +
ProjectedOccurrence / contesto reale
      ↓
TeachingSession
      ↓
Observation[] ──────┐
Evidence[] ─────────┤
      ↓              │
Reflection/Synthesis │
      ↓              │
TeachingProposal     │
      ↓              │
HumanDecision ◀──────┘
```

La `TeachingSession` è l'unità temporale e professionale di riferimento. Le osservazioni non vivono come tag isolati della classe.

## 2. Obiettivo professionale

Ridurre il carico di registrazione durante la lezione e aumentare la qualità della lettura ex post.

Il docente deve poter registrare poche osservazioni significative in pochi tocchi. DOCENTE OS deve poi rendere leggibili:

- ciò che è stato osservato;
- su quale evidenza si basa;
- se il segnale è episodico, ricorrente o in evoluzione;
- quale parte della progettazione è coinvolta;
- quale possibile azione didattica merita valutazione.

Il sistema non deve chiedere di compilare una griglia completa per ogni lezione.

## 3. Confine corrente

Il perimetro iniziale resta:

`SINGLE_OWNER_TIER_1_PROFESSIONAL_NON_PERSONAL`

Sono ammessi:

- osservazioni riferite alla **classe intera**;
- osservazioni riferite a **gruppi anonimi e temporanei** definiti nel contesto della lezione;
- evidenze didattiche prive di dati personali di alunni/terzi;
- sintesi professionali del docente.

Non sono ammessi in questa fase:

- profili persistenti individuali degli alunni;
- identificatori personali degli alunni;
- inferenze psicologiche o comportamentali individuali;
- scoring individuale automatico;
- dati sensibili o categorie particolari;
- qualunque estensione Tier 2 non autorizzata da un gate separato.

## 4. Concetti canonici

### TeachingSession

Rappresenta una lezione realmente svolta o registrata nel contesto di una sezione.

Campi concettuali minimi:

```text
id
workspace_id
academic_year_id
section_id
discipline_id?
canonical_plan_asset_id?
canonical_generation_id?
block_id?
uda_id?
pack_id?
projected_occurrence_id?
local_date
started_at?
ended_at?
outcome_status
teacher_note?
provenance[]
created_at
updated_at
```

Una nuova versione dell'orario, del calendario o del piano non riscrive retroattivamente una `TeachingSession` già registrata.

### Observation

È un fatto professionale registrato dal docente nel contesto di una `TeachingSession`.

Campi concettuali minimi:

```text
id
teaching_session_id
scope: CLASS | ANONYMOUS_GROUP
anonymous_group_key?
dimension_key
state: NOT_OBSERVED | NEEDS_SUPPORT | DEVELOPING | CONSOLIDATED
note?
source: TEACHER_QUICK_MARK | TEACHER_NOTE | EVIDENCE_REVIEW
created_at
```

`NOT_OBSERVED` non è un giudizio negativo: significa esclusivamente che non esiste evidenza sufficiente per quella dimensione nella sessione.

### Evidence

È il riferimento a ciò che sostiene una o più osservazioni.

```text
id
teaching_session_id
kind: WORK_PRODUCT | QUICK_CHECK | ORAL_RESPONSE | CLASS_ACTIVITY | DOCUMENT_REFERENCE | OTHER
description
knowledge_asset_id?
external_reference?
created_at
```

Nel perimetro corrente l'evidenza non deve introdurre dati personali degli alunni.

### Reflection / Synthesis

È una lettura ex post derivata da una o più `TeachingSession`.

Deve distinguere sempre:

- `OBSERVED_FACT`: ciò che è stato registrato;
- `INTERPRETATION`: lettura professionale o assistita;
- `TREND`: confronto longitudinale;
- `UNCERTAINTY`: insufficienza o ambiguità dei dati.

Una sintesi non modifica né sostituisce le osservazioni originarie.

### TeachingProposal

È una proposta di azione didattica conseguente alle evidenze.

```text
id
scope
rationale
proposed_action
evidence_refs[]
status: PROPOSED | ACCEPTED | MODIFIED | DISMISSED
human_decision_at?
```

Una proposta non modifica automaticamente UDA, Piano annuale, materiali o stato di avanzamento.

## 5. Dimensioni osservative

Le dimensioni non costituiscono una rubrica valutativa universale. Sono chiavi professionali riusabili e contestualizzabili.

Baseline iniziale consigliata:

```text
UNDERSTANDING_INSTRUCTION   comprensione della consegna
AUTONOMY                    autonomia
WORK_METHOD                 metodo di lavoro
TECHNICAL_LANGUAGE          lessico tecnico
DISCIPLINARY_APPLICATION    applicazione disciplinare
EVIDENCE_QUALITY            qualità dell'evidenza prodotta
TIME_MANAGEMENT             gestione del tempo
```

Una lezione può esporre soltanto il sottoinsieme pertinente. Nessuna dimensione è obbligatoria.

Le dimensioni specifiche di una lezione possono essere derivate dalla `HumanTaskLessonProjection`, ma devono risolversi su chiavi canoniche o rimanere descrittori contestuali senza creare automaticamente nuove tassonomie permanenti.

## 6. Semantica degli stati

La scala canonica iniziale è volutamente corta:

```text
NOT_OBSERVED
NEEDS_SUPPORT
DEVELOPING
CONSOLIDATED
```

Regole:

1. nessuno stato equivale a voto;
2. nessuno stato ha un valore numerico implicito;
3. gli stati non vengono mediati aritmeticamente;
4. una dimensione può cambiare stato fra sessioni senza che il sistema la interpreti come regressione/progresso se il contesto non è confrontabile;
5. `NOT_OBSERVED` è sempre ammesso;
6. il docente può lasciare una lezione senza alcuna osservazione strutturata.

## 7. Analisi longitudinale

DOCENTE OS può produrre letture longitudinali soltanto quando esistono osservazioni comparabili e provenienza sufficiente.

Le categorie canoniche di sintesi sono:

```text
SINGLE_EPISODE
RECURRING_SIGNAL
IMPROVING_SIGNAL
WORSENING_SIGNAL
INSUFFICIENT_EVIDENCE
CONTEXT_CHANGED
```

Non è ammesso produrre un trend da una singola osservazione.

Il sistema deve mostrare il percorso:

```text
Insight → Perché? → TeachingSession → Observation/Evidence originarie
```

## 8. Ruolo dell'assistenza intelligente

L'assistenza può:

- sintetizzare osservazioni già registrate;
- individuare ricorrenze;
- confrontare sessioni pertinenti;
- segnalare incoerenze o dati insufficienti;
- proporre una prossima azione didattica;
- preparare una bozza di riflessione per il Diario;
- suggerire quali dimensioni osservare nella prossima lezione.

L'assistenza non può:

- generare osservazioni come se fossero state effettuate dal docente;
- assegnare voti;
- produrre profili individuali;
- confermare una proposta al posto del docente;
- aggiornare automaticamente UDA o Piano annuale;
- trasformare assenza di dati in esito negativo;
- nascondere la provenienza dell'insight.

## 9. Agenti cooperativi — modello logico

DOCENTE OS espone una sola esperienza utente. La cooperazione avviene internamente tramite ruoli logici separati:

### Context Agent
Risoluzione di sezione, Bxx, UDA, pacchetto, lezione, materiali e occorrenza reale.

### Observation Agent
Normalizzazione delle micro-rilevazioni del docente nel modello canonico.

### Evidence Agent
Collegamento fra osservazioni ed evidenze pertinenti, senza inventare evidenze mancanti.

### Pattern Agent
Confronto longitudinale fra TeachingSession comparabili e classificazione del segnale.

### Planning Agent
Generazione di una proposta didattica motivata e tracciabile.

### Governance Agent
Applicazione di privacy, scope, provenienza, human validation e divieti di scoring/profiling.

L'orchestrazione deve essere deterministica sui boundary di autorità: nessun agente può ampliare il proprio potere scrivendo direttamente in un dominio canonico non autorizzato.

## 10. Integrazione nelle superfici esistenti

### Orario / Oggi
Apre il contesto della lezione e della sezione corretta.

### Classe
Mostra quadro corrente, segnali recenti, ciò che merita osservazione e accesso alla provenienza. Non diventa una tabella permanente di livelli.

### Lezione
Resta la superficie primaria:

```text
Prepara → In classe → Osserva → Registra
```

`Osserva` evolve da checklist effimera a micro-rilevazione strutturata, ma resta facoltativa e leggera.

### Registra
Conferma ciò che è realmente accaduto e chiude/aggiorna la `TeachingSession`. Non richiede di ricopiare le osservazioni.

### Diario
Riceve una sintesi proposta della sessione e delle decisioni professionali, sempre modificabile dal docente.

### Progetta
Riceve soltanto proposte validate dal docente o segnali esplicitamente aperti per revisione. Non viene modificata automaticamente.

### Conoscenza / Drive
Conservano materiali ed evidenze documentali pertinenti, con provenance e senza diventare fonte di verità della classe.

## 11. Invarianti architetturali

1. `TeachingSession` è append-oriented: correzioni e aggiornamenti preservano la provenienza.
2. `Observation` non modifica `AnnualPlanBlockProgress`.
3. `AnnualPlanBlockProgress` non rappresenta osservazioni formative.
4. `Evidence` non crea classi, UDA o blocchi.
5. `Reflection/Synthesis` è derivata e rigenerabile dalle fonti disponibili.
6. `TeachingProposal` richiede decisione umana prima di produrre qualunque mutazione in Progetta/Piano.
7. Nessun componente UI locale introduce una seconda tassonomia di livelli.
8. Nessuna sintesi può perdere i riferimenti alle osservazioni che la sostengono.
9. Nessun dato individuale degli alunni entra nel modello Tier 1.
10. La capability deve usare i token/componenti canonici del Design System e rispettare il Design Policy Gate.

## 12. Incrementi autorizzabili

### TE-0 — Foundation
- contratto canonico;
- tipi di dominio;
- invarianti e test puri;
- nessuna persistenza;
- nessuna nuova UI.

### TE-1 — Session persistence
- `TeachingSession` persistente;
- migrazione additive-only;
- RLS/AAL2 coerenti col runtime corrente;
- binding a sezione/Bxx/occorrenza.

### TE-2 — Structured observation
- persistenza `Observation` classe/gruppo anonimo;
- evoluzione della fase `Osserva`;
- micro-interazione mobile;
- nessun obbligo di completamento.

### TE-3 — Evidence binding
- collegamenti a evidenze documentali ammesse;
- provenance verificabile;
- nessun dato personale degli alunni.

### TE-4 — Reflection
- sintesi della sessione;
- distinzione fatto / interpretazione / trend;
- Diario come superficie di riflessione.

### TE-5 — Longitudinal insight
- confronto multi-sessione;
- segnali ricorrenti/evolutivi;
- `Perché?` con drill-down completo.

### TE-6 — Teaching proposal
- proposta per la prossima lezione/UDA;
- `PROPOSED → ACCEPTED | MODIFIED | DISMISSED`;
- nessuna mutazione autonoma della progettazione.

## 13. Gate prima del runtime

Prima di TE-1 devono essere verificati:

- coerenza con `TEMPORAL_COMPOSITION_CANONICAL_SPEC`;
- coerenza con `CLASS_WORKSPACE_CONTRACT`;
- confine con `AnnualPlanBlockProgress`;
- modello privacy Tier 1;
- policy RLS/AAL2;
- strategia di audit/provenienza;
- impatto WCAG/mobile;
- assenza di nuova tassonomia visuale o funzionale parallela.

Solo dopo questi gate è autorizzata una migrazione dati.

## 14. Criterio di successo

La capability è matura quando il docente può:

1. entrare nella lezione dal contesto corretto;
2. registrare 0–4 micro-osservazioni senza interrompere il flusso didattico;
3. chiudere la lezione senza ricopiare informazioni;
4. ritrovare ex post cosa è accaduto e su quali evidenze;
5. distinguere episodio e tendenza;
6. comprendere perché DOCENTE OS propone un intervento;
7. accettare, modificare o rifiutare tale proposta;
8. mantenere sempre il controllo professionale sulla progettazione.
