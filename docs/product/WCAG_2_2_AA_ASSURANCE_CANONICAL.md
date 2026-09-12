# DOCENTE OS — WCAG 2.2 AA Assurance

Data: **2026-09-12**  
Programma: **M5-03 — Accessibility Assurance**  
Target: **WCAG 2.2 Level AA**  
Stato: **PARTIAL / NO CONFORMANCE CLAIM**

## 1. Decisione

DOCENTE OS adotta WCAG 2.2 AA come target di assurance per il runtime web.

Questa adozione **non costituisce una dichiarazione di conformità**. Una dichiarazione AA richiede che tutti i criteri A e AA applicabili risultino soddisfatti sulle pagine complete e sulle relative varianti responsive.

Riferimento normativo:

- <https://www.w3.org/TR/WCAG22/>
- <https://www.w3.org/WAI/standards-guidelines/wcag/>

La matrice machine-readable è:

`ops/wcag22-aa-assurance.json`

## 2. Principi di assurance

Ogni criterio A/AA deve comparire una e una sola volta nella matrice.

Stati ammessi:

- `EVIDENCE_PRESENT` — esiste evidenza utile, ma non sufficiente a una dichiarazione di conformità;
- `MANUAL_REQUIRED` — il criterio richiede verifica umana/contextual/assistive technology;
- `NOT_APPLICABLE_CURRENT_SCOPE` — il runtime corrente non contiene la tipologia di contenuto/interazione; lo stato deve essere rivalutato se il perimetro cambia;
- `GAP` — requisito non soddisfatto o meccanismo richiesto non presente;
- `VERIFIED_PASS` — ammesso solo con receipt specifica, riproducibile e collegata alla variante di pagina pertinente.

Nessuna scansione automatica può trasformare da sola M5-03 in `COMPLETE`.

## 3. Baseline corrente

Evidenze già presenti:

- `html lang="it"` nel root layout;
- viewport senza blocco dello zoom;
- policy semantica con preferenza per controlli HTML nativi;
- focus visibile globale;
- target mobili da 44 px;
- HVA su superfici principali in viewport mobile e desktop;
- regole mobile contro overflow e sovrapposizione della navigazione;
- login con label esplicite e `autocomplete` per email/password;
- password manager/copy-paste non ostacolati dal form;
- design system e DPG come controllo di non-regressione visuale/interattiva.

Queste evidenze migliorano la readiness, ma non equivalgono a certificazione AA.

## 4. Finding iniziale verificato

### A11Y-001 — WCAG 2.4.1 Bypass Blocks

Stato: **GAP**

Nel runtime corrente non è stato trovato un meccanismo `skip link / Salta al contenuto` o altro bypass esplicito dei blocchi di navigazione ripetuti.

Criterio di chiusura:

1. meccanismo tastiera visibile al focus;
2. destinazione `main`/contenuto principale deterministica;
3. funzionamento desktop e mobile;
4. test E2E specifico;
5. nuova receipt che porta 2.4.1 a `VERIFIED_PASS`.

## 5. Criteri N/A correnti

Il runtime corrente non espone media temporizzati audio/video, gesture multipoint/path, device-motion controls o drag-and-drop.

Per questo alcuni criteri sono `NOT_APPLICABLE_CURRENT_SCOPE`. Questo stato non è permanente: una futura capability che introduca tali contenuti deve rendere nuovamente applicabile il criterio nella stessa PR.

## 6. Automazione axe

M5-03 integra `@axe-core/playwright` nella suite di assurance sulle superfici HVA.

L'automazione deve:

- analizzare pagina completa, non soltanto un componente isolato;
- eseguire sui viewport mobile e desktop già canonici;
- includere regole A/AA supportate da axe per WCAG 2.0, 2.1 e 2.2;
- produrre evidenza per superficie;
- fallire su violazioni automatiche;
- preservare gli elementi `incomplete/needs review` come input per il controllo manuale.

Axe è uno strumento di rilevazione automatica, non una certificazione. La documentazione di axe stessa chiarisce che soltanto una parte dei problemi WCAG è individuabile automaticamente.

## 7. Copertura manuale obbligatoria

Le verifiche manuali devono includere almeno:

- navigazione completa da tastiera;
- assenza di keyboard trap;
- ordine del focus;
- focus non oscurato da header, bottom navigation, pannelli e modali;
- reflow/zoom e text spacing;
- contenuti on-hover/on-focus;
- significato delle alternative testuali;
- uso non esclusivo del colore;
- contrasto non-testuale in stati custom;
- label-in-name;
- error identification/suggestion;
- prevenzione/review delle scritture consequenziali;
- status messages con screen reader;
- autenticazione con password manager, copy/paste e recovery;
- language-of-parts quando compaiono passaggi in altra lingua.

## 8. Assistive technology baseline

M5-03C richiede almeno una baseline ripetibile con screen reader sulle journey critiche.

La prima baseline deve coprire almeno:

1. login;
2. Home/Oggi;
3. apertura classe/lezione;
4. registrazione lezione;
5. Progetta/UDA;
6. Conoscenza;
7. Planner assistito.

La tecnologia usata, versione, browser, esito e finding devono essere registrati. Il test non deve includere dati personali scolastici.

## 9. Criterio M5-03A

`WCAG 2.2 AA matrix = COMPLETE` soltanto quando:

- tutti i 55 criteri A/AA sono classificati;
- nessun `GAP` resta aperto;
- ogni `MANUAL_REQUIRED` applicabile dispone di receipt;
- ogni N/A ha motivazione ancora valida sul runtime corrente;
- scansione automatica delle superfici critiche è verde;
- nessuna variante responsive rilevante è esclusa.

## 10. Criterio M5-03B

`Keyboard/focus/reflow = COMPLETE` soltanto con evidence pack manuale desktop/mobile per:

- tab order;
- focus visible;
- focus not obscured;
- no keyboard trap;
- 200% text resize;
- reflow equivalente a 320 CSS px quando applicabile;
- WCAG text-spacing override.

## 11. Criterio M5-03C

`Assistive technology evidence = COMPLETE` soltanto dopo baseline screen-reader ripetibile sulle journey definite e chiusura dei finding significativi.

## 12. Regola di non-regressione

Ogni nuova UI deve:

1. preservare DPG/HVA;
2. non aumentare i GAP WCAG;
3. aggiornare la matrice quando cambia applicabilità di un criterio;
4. aggiungere test/evidence quando introduce una nuova categoria di interazione o contenuto;
5. non dichiarare `VERIFIED_PASS` senza receipt.

## 13. Confine M5

M5-03 può maturare in parallelo al pilot M5-02. I finding di accessibilità osservati durante uso reale devono essere registrati anche nella ledger M5-02 come `ACCESSIBILITY_FINDING`, senza duplicare dati personali o contenuti scolastici.
