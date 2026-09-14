# DOCENTE OS — Human Experience Contract

Stato: **CANONICAL / NORMATIVE**

Questo contratto governa tutte le superfici interattive di DOCENTE OS e viene applicato prima di qualunque linea guida estetica esterna. Il documento storico `../../docs/DOCENTE_OS_HUMAN_TASK_EXPERIENCE_v1.md` resta la fonte di provenienza del modello; questo file ne definisce l'uso operativo nel prodotto.

`PRODUCT-SIMPLIFICATION.md` definisce la regola normativa di riduzione della complessità percepita (`WHY NOW?`, Product Model ≠ User Model, una CTA primaria, Task Cost). `../../docs/product/UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md` governa il programma UX-0, le slice e la closure M5-02D. I tre documenti sono complementari e nessuno può indebolire controllo umano, sicurezza, privacy, provenance o recuperabilità.

## Sequenza cognitiva obbligatoria

Ogni flusso significativo deve rendere percepibili, nell'ordine utile al compito:

1. **Dove sono?** — contesto professionale e oggetto corrente.
2. **Cosa sto facendo?** — una sola azione primaria comprensibile.
3. **Cosa sta succedendo?** — stato reale e tempestivo.
4. **Cosa è cambiato o è rimasto al sicuro?** — conseguenze esplicite.
5. **Cosa posso fare adesso?** — avanzamento, recupero o uscita sicura.

## Invariante Product Model ≠ User Model

Le distinzioni necessarie a dominio, persistenza, provenance, sicurezza o audit non devono diventare automaticamente distinzioni che il docente deve comprendere o navigare.

Il sistema può mantenere entità e boundary separati; l'interfaccia deve tradurli in un task umano continuo quando la separazione non corrisponde a una decisione professionale reale.

Per il ciclo didattico quotidiano il modello mentale preferito è:

**Oggi → Classe → Lezione → Fatto**

Il docente non deve conoscere `TeachingSession`, `AnnualPlanBlockProgress`, `TemporalProjection`, generation id, route o storage boundary per eseguire correttamente un compito ordinario.

## Principi vincolanti

- **Contesto completo, esposizione minima.** Mostrare subito ciò che serve alla decisione; dettagli, provenienza e diagnostica restano disponibili su richiesta.
- **Linguaggio del lavoro docente.** Niente nomi di tabelle, route, provider, job, codici HTTP o identificatori interni nella superficie ordinaria.
- **Continuità del compito.** Aprire una risorsa non deve perdere classe, fase, UDA/blocco, ritorno e input già forniti.
- **Recuperabilità.** Un errore conserva tutto ciò che può essere riutilizzato e dice: cosa è successo, cosa non è cambiato, cosa fare ora.
- **Controllo umano.** Decisioni professionali, istituzionali o scritture significative non vengono simulate come già eseguite.
- **Progressiva esposizione.** Gestione, versioni, diagnostica e dettagli secondari non competono con l'azione corrente.
- **Mobile come vincolo reale.** Non è ammessa una semplice compressione della vista desktop quando il compito richiede una rappresentazione diversa.
- **Una sola priorità percepibile.** Una superficie operativa non presenta più azioni come equivalenti primarie quando una sola corrisponde al passo corrente.
- **Nessuna scelta introdotta dal software.** Se il sistema possiede già classe, data, disciplina, lezione o ritorno, non chiede al docente di ricostruirli per completare il task.
- **Capability assorbite nel task.** Una nuova capacità non giustifica da sola una nuova voce primaria di navigazione o una nuova decisione visibile.

## Budget di complessità del task

Ogni journey critica deve essere valutata anche per:

- numero di decisioni esplicite prima dell'obiettivo;
- azioni concorrenti visibili;
- cambi di superficie;
- concetti interni necessari alla comprensione;
- input obbligatori evitabili;
- burden di recovery dopo un errore.

Target ordinario:

- prossimo passo identificabile entro 5 secondi;
- task comune con 1–2 decisioni esplicite prima dell'azione, escluse le conferme professionali obbligatorie;
- una sola azione primaria per stato;
- zero concetti interni obbligatori per una journey ordinaria.

Le soglie sono target di progettazione e richiedono HUMAN_USE per essere considerate dimostrate.

## Pattern transazionale

Per acquisizioni o trasformazioni a più fasi:

**Selezione/decisione → Salvaguardia → Elaborazione → Conferma → Prossimo passo**

Esempio Conoscenza:

**File scelto → Originale al sicuro → Organizzato → Contenuto utilizzabile**

Se fallisce la salvaguardia, la fase successiva non parte. Se fallisce l'elaborazione dopo la salvaguardia, l'interfaccia deve dichiarare che la fonte resta conservata e riprendere dalla fase realmente interrotta.

## Gate di maturità

Una slice non è `UX_COMPLETE` se manca uno dei controlli seguenti:

- stato visibile e semanticamente esposto;
- azione primaria distinguibile;
- linguaggio non tecnico;
- recupero dall'errore senza perdita evitabile;
- comportamento mobile verificato;
- accessibilità semantica di stato, errore e controllo;
- acceptance test del percorso umano critico;
- evidenza visuale osservabile su almeno un target reale quando la slice modifica l'interfaccia;
- task-cost dichiarato per le journey modificate;
- nessuna nuova conoscenza del Product Model richiesta all'utente senza necessità professionale;
- nessuna nuova scelta primaria introdotta soltanto per riflettere una separazione tecnica interna.

Un machine gate verde non dimostra da solo semplicità percepita. La closure di un finding di costo cognitivo richiede evidenza HUMAN_USE secondo M5-02 e UX-0.

## Autorità esterne

Linee guida, librerie di componenti, skill di design o sistemi esterni possono proporre soluzioni. Non possono sovrascrivere questo contratto. Una proposta esterna entra nel prodotto solo se è coerente con il compito umano, il sistema visuale canonico e i gate di accettazione.