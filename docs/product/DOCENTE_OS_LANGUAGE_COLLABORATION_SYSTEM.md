# DOCENTE OS — Language & Collaboration System v1

**Stato:** CANONICO  
**Ambito:** Home, Oggi, Progetta, Conoscenza, Classi, Orario, Impostazioni e superfici future.

## 1. Voce di prodotto

DOCENTE OS parla come un **collega competente, discreto e operativo**. L’interfaccia deve aiutare il docente a capire il contesto, lo stato del lavoro e il passo successivo utile senza esporre in primo piano dettagli di implementazione.

Sequenza canonica:

1. **Orienta** — che cosa sto guardando?
2. **Spiega** — perché conta e da dove viene?
3. **Dichiara lo stato** — è pronto, da controllare, in corso o non disponibile?
4. **Propone l’azione** — cosa posso fare adesso?
5. **Lascia la decisione al docente** — cosa richiede conferma umana?

## 2. Regole di tono

- Professionale, chiaro e tranquillo.
- Usa il **tu professionale**.
- Preferisce il linguaggio della scuola al linguaggio del software.
- Spiega l’effetto prima di chiedere una conferma.
- Non presenta mai una proposta automatica come decisione già presa.
- Non nasconde provenienza, incertezza o conservazione delle versioni precedenti.
- Gli stati vuoti indicano sempre una via d’uscita.
- Gli errori spiegano che cosa è rimasto al sicuro e cosa fare dopo.

## 3. Significato prima della tecnologia

La UI principale traduce i termini interni in significato professionale.

| Interno | UI principale | Dettaglio tecnico |
| --- | --- | --- |
| INDEXED | Pronto | Indexed |
| NORMALIZED | Organizzato | Normalized |
| CAPTURED | Acquisito | Captured |
| FAILED | Da riprovare | Failed |
| GENERATED | Creato in DOCENTE OS | Generated |
| DRIVE | Google Drive | DRIVE |
| processor | nascosto dalla vista primaria | visibile in Dettagli tecnici |
| generation | versione dell’analisi | numero generazione nei dettagli |
| asset | documento / contenuto | asset id nei dettagli |
| reprocess | Aggiorna analisi | reprocess nei dettagli tecnici |
| sync | Aggiorna | sync nei dettagli tecnici |

## 4. Le quattro domande canoniche

Ogni pagina operativa deve rendere immediatamente comprensibili queste risposte:

- **Che cosa sto guardando?**
- **Da dove viene?**
- **A che punto è?**
- **Cosa posso fare adesso?**

## 5. Grammatica degli stati

Nella UI primaria usare stati semantici:

- **Pronto** — utilizzabile ora.
- **Da controllare** — richiede verifica umana.
- **In aggiornamento** — elaborazione attiva.
- **Aggiornato** — allineato alla fonte o all’ultima versione accettata.
- **Bozza** — non ancora confermata.
- **Confermato** — validato esplicitamente dal docente.
- **Da riprovare** — un’operazione automatica non è riuscita; i dati preservati restano al sicuro.
- **Non disponibile** — manca un prerequisito.

I codici tecnici possono restare nei dettagli espandibili.

## 6. Grammatica collaborativa

Pattern canonico:

**Ho trovato → Ti propongo → Ecco l’effetto → Confermi tu**

Esempi:

- “Ho trovato due possibili scadenze. Posso prepararle per il Planner. Nessuna attività viene creata finché non confermi.”
- “L’analisi può essere aggiornata. L’originale e la versione precedente restano conservati.”

## 7. Etichette delle azioni

Le azioni descrivono il risultato, non il meccanismo.

Preferire:

- Usa nella progettazione
- Controlla il contesto
- Crea attività nel Planner
- Aggiorna analisi
- Apri originale
- Rivedi modifiche
- Conferma
- Scarta proposta

Evitare come etichette principali:

- Execute
- Process
- Reprocess
- Sync
- Submit
- Asset
- Entity

## 8. Errori e stati vuoti

Struttura del messaggio:

1. Che cosa è successo.
2. Che cosa è rimasto al sicuro.
3. Che cosa può fare il docente.

Esempio:

> L’aggiornamento dell’analisi non è riuscito. La versione precedente resta disponibile. Puoi riprovare più tardi.

## 9. Dettagli tecnici per progressiva esposizione

Processore, codici di stato interni, identificativi e numeri di generazione non devono dominare la superficie di lavoro. Vanno raccolti sotto **Dettagli tecnici**.

La vista docente mostra prima: provenienza, contesto professionale, stato umano e azioni successive.

## 10. Regola specifica per Conoscenza

Una pagina di Conoscenza non è un “asset viewer”: è una **pagina di lavoro su un documento o una fonte di contenuto**.

Ordine canonico:

1. Titolo umano e contesto professionale.
2. Stato umano e provenienza.
3. **Ti aiuto da qui** con azioni realmente disponibili.
4. Classificazione professionale e collegamenti operativi.
5. Contenuto.
6. Proposte di azione/scadenza che richiedono conferma.
7. Versioni e dettagli tecnici.

## 11. Criteri di accettazione per la UI futura

Una superficie è conforme quando:

- il primo viewport non contiene codici interni non spiegati;
- il titolo principale è leggibile da una persona;
- fonte e stato sono comprensibili senza conoscenze tecniche;
- almeno una prossima azione significativa è visibile quando esiste;
- le proposte sono separate chiaramente dai dati confermati;
- gli errori dichiarano ciò che non è andato perso;
- i dettagli tecnici restano disponibili tramite progressiva esposizione;
- le etichette sono coerenti con questo documento.

Ogni nuova terminologia visibile all’utente deve riusare questa grammatica oppure aggiornare deliberatamente questa specifica canonica.

## 12. Relazione con l'assistente contestuale

Il medesimo linguaggio governa anche `ContextualTeacherAssistant` e assistant-ui. L'assistente non possiede una “voce chat” separata dal prodotto.

Quando propone un'azione:

- usa fatti prima di opinioni;
- cita o rende recuperabile la provenienza;
- non mostra più di tre proposte prioritarie salvo richiesta dell'utente;
- spiega cosa cambierà e cosa resterà invariato;
- non usa la conferma come formalità: la chiede solo quando esiste un effetto significativo.

## 13. Cosa non deve dire l'assistente

Evitare formulazioni come:

- “Ho ottimizzato tutto per te” senza evidenza;
- “Devi fare…” quando esistono alternative professionali;
- “Il sistema ha deciso…”;
- “Errore 500 / payload / processor…” nella superficie ordinaria;
- “Fatto” se l'azione non è stata realmente persistita o verificata.

Preferire:

- “Ho trovato…”;
- “La fonte indica…”;
- “Manca ancora…”;
- “Posso preparare…”;
- “Se confermi, verrà…”;
- “Non sono riuscito a…, ma … è rimasto invariato.”

## 14. Documenti collegati

Questa specifica opera insieme a:

- `DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`;
- `../architecture/ADR-002-experience-platform.md`;
- `../architecture/AI_COLLABORATION_CANONICAL_SPEC.md`;
- `../design/DESIGN_SYSTEM_V2_CANONICAL.md`.

In caso di conflitto su sicurezza o capacità di write, prevalgono le policy architetturali e human-in-the-loop.
