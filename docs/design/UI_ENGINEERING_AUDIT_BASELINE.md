# DOCENTE OS — UI Engineering Audit Baseline

Data: 2026-08-29  
Stato: INITIAL BASELINE / NON-PROMOTING

## 1. Scopo

Definire una verifica ripetibile delle superfici DOCENTE OS prima di qualunque riprogettazione ampia. L'audit valuta coerenza, comprensibilità e copertura degli stati; non promuove release e non sostituisce HVA.

## 2. Criteri

Ogni superficie viene valutata rispetto a:

1. **Task clarity** — il compito umano principale è evidente.
2. **Visual hierarchy** — contesto, stato e azione primaria hanno priorità coerente.
3. **Canonical reuse** — primitive, composite e token esistenti sono riusati.
4. **Interaction states** — gli stati applicabili sono rappresentati secondo `HUMAN_INTERACTION_STATE_MATRIX.md`.
5. **Mobile behavior** — il flusso primario resta completo su viewport stretta.
6. **Accessibility** — focus, etichette, semantica, zoom, target tattili e movimento ridotto.
7. **Authority legibility** — disponibilità, blocchi e conferme non sono confusi con meri stati visuali.
8. **Error/empty quality** — errori e assenze di contenuto indicano significato, sicurezza e prossima azione.
9. **Visual debt** — duplicazioni, eccezioni locali, token ad hoc, gergo tecnico o gerarchie incoerenti.
10. **Intervention scope** — nessuno / componente / sezione / superficie.

Classificazione per criterio: `PASS`, `PARTIAL`, `FAIL`, `NOT_APPLICABLE`.

## 3. Priorità iniziale delle superfici

L'ordine di audit segue il rischio operativo e il valore del flusso, non l'attrattiva grafica:

1. `Conoscenza`;
2. `Oggi` / shell operativa;
3. `Classi`;
4. `Orario`;
5. `Piano annuale`;
6. `Progetta`;
7. superfici di osservazione/registrazione e conferma;
8. `Impostazioni` e superfici secondarie.

L'ordine può essere modificato da un gate di sicurezza, privacy o release più urgente.

## 4. Scheda di audit

Per ogni superficie usare questa struttura:

```text
SURFACE: <nome>
CANONICAL_REF: <commit/ref>
TASK: <compito umano principale>
PRIMARY_ACTION: <azione>

TASK_CLARITY: PASS|PARTIAL|FAIL|NOT_APPLICABLE
VISUAL_HIERARCHY: ...
CANONICAL_REUSE: ...
INTERACTION_STATES: ...
MOBILE_BEHAVIOR: ...
ACCESSIBILITY: ...
AUTHORITY_LEGIBILITY: ...
ERROR_EMPTY_QUALITY: ...
VISUAL_DEBT: ...

EVIDENCE:
- <test, file, screenshot o osservazione browser>

RECOMMENDED_SCOPE: NONE|COMPONENT|SECTION|SURFACE
BLOCKING_FINDINGS:
- <solo problemi che impediscono il compito o violano un contratto>

NON_BLOCKING_DEBT:
- <debito da consolidare senza allargare lo scope>
```

## 5. Gate di trasformazione

Un audit può autorizzare una proposta di intervento, ma non la promozione automatica.

Flusso previsto:

```text
Human Task / HIM
        ↓
Design System V2
        ↓
UI Engineering Audit
        ↓
Scoped implementation
        ↓
Structural tests
        ↓
Interaction-state coverage
        ↓
Responsive/mobile audit
        ↓
Live browser verification
        ↓
HVA
```

## 6. Regole anti-deriva

Durante una correzione UI:

- non creare un nuovo token se un token semantico esistente copre il ruolo;
- non creare un nuovo componente se un primitive/composite canonico è equivalente;
- non estendere la modifica a superfici non necessarie;
- non cambiare la semantica di un'azione per adattarla al layout;
- non trasformare un blocco di autorità in un generico `disabled`;
- non considerare una schermata desktop sufficiente a certificare il mobile;
- non considerare test automatici equivalenti a HVA.

## 7. Risultato atteso

L'audit deve rendere possibile distinguere tre casi:

- **CONFORMING** — nessun intervento significativo;
- **LOCAL_REPAIR** — correzione circoscritta a componente o sezione;
- **SURFACE_REDESIGN_CANDIDATE** — il flusso umano resta valido ma l'implementazione visiva non soddisfa il contratto.

Una superficie non diventa candidata al redesign per preferenze estetiche isolate.
