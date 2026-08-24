# DOCENTE OS — Human Experience Contract

Stato: **CANONICAL / NORMATIVE**

Questo contratto governa tutte le superfici interattive di DOCENTE OS e viene applicato prima di qualunque linea guida estetica esterna. Il documento storico `../../docs/DOCENTE_OS_HUMAN_TASK_EXPERIENCE_v1.md` resta la fonte di provenienza del modello; questo file ne definisce l'uso operativo nel prodotto.

## Sequenza cognitiva obbligatoria

Ogni flusso significativo deve rendere percepibili, nell'ordine utile al compito:

1. **Dove sono?** — contesto professionale e oggetto corrente.
2. **Cosa sto facendo?** — una sola azione primaria comprensibile.
3. **Cosa sta succedendo?** — stato reale e tempestivo.
4. **Cosa è cambiato o è rimasto al sicuro?** — conseguenze esplicite.
5. **Cosa posso fare adesso?** — avanzamento, recupero o uscita sicura.

## Principi vincolanti

- **Contesto completo, esposizione minima.** Mostrare subito ciò che serve alla decisione; dettagli, provenienza e diagnostica restano disponibili su richiesta.
- **Linguaggio del lavoro docente.** Niente nomi di tabelle, route, provider, job, codici HTTP o identificatori interni nella superficie ordinaria.
- **Continuità del compito.** Aprire una risorsa non deve perdere classe, fase, UDA/blocco, ritorno e input già forniti.
- **Recuperabilità.** Un errore conserva tutto ciò che può essere riutilizzato e dice: cosa è successo, cosa non è cambiato, cosa fare ora.
- **Controllo umano.** Decisioni professionali, istituzionali o scritture significative non vengono simulate come già eseguite.
- **Progressiva esposizione.** Gestione, versioni, diagnostica e dettagli secondari non competono con l'azione corrente.
- **Mobile come vincolo reale.** Non è ammessa una semplice compressione della vista desktop quando il compito richiede una rappresentazione diversa.

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
- evidenza visuale osservabile su almeno un target reale quando la slice modifica l'interfaccia.

## Autorità esterne

Linee guida, librerie di componenti, skill di design o sistemi esterni possono proporre soluzioni. Non possono sovrascrivere questo contratto. Una proposta esterna entra nel prodotto solo se è coerente con il compito umano, il sistema visuale canonico e i gate di accettazione.