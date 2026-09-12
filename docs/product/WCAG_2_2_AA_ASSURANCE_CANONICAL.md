# DOCENTE OS — WCAG 2.2 AA Assurance

Data: **2026-09-12**  
Programma: **M5-03 — Accessibility Assurance**  
Target: **WCAG 2.2 Level AA**  
Stato: **PARTIAL / AUTOMATED BASELINE PASS / NO CONFORMANCE CLAIM**

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

Evidenze presenti:

- `html lang="it"` nel root layout;
- viewport senza blocco dello zoom;
- policy semantica con preferenza per controlli HTML nativi;
- focus visibile globale;
- target mobili da 44 px;
- HVA su superfici principali in viewport mobile e desktop;
- regole mobile contro overflow e sovrapposizione della navigazione;
- login con label esplicite e `autocomplete` per email/password;
- password manager/copy-paste non ostacolati dal form;
- design system e DPG come controllo di non-regressione visuale/interattiva;
- suite Playwright + axe sulle superfici canoniche mobile e desktop;
- bypass `Salta al contenuto` verificato da tastiera.

Baseline automatizzata corrente:

- exact head: `20eb47b7e35faf3114dcbfe32ee320c1cfcc9557`;
- workflow: **WCAG 2.2 AA Assurance** run `34672053257` — **PASS**;
- artifact: `wcag22-aa-34672053257`;
- HVA run `34672053242` — **PASS** sul medesimo exact head;
- DPG, HIM, Product CI e P6 — **PASS** sul medesimo exact head.

Queste evidenze migliorano la readiness, ma **non equivalgono a certificazione o dichiarazione WCAG 2.2 AA**.

## 4. Finding A11Y-001 — WCAG 2.4.1 Bypass Blocks

Stato: **VERIFIED_PASS**

Il finding iniziale era l'assenza di un meccanismo esplicito di bypass dei blocchi di navigazione ripetuti. È stato chiuso introducendo nel Professional AppShell:

1. `Salta al contenuto`, esposto al primo focus da tastiera;
2. destinazione deterministica `#dos-main-content` sul `main` canonico;
3. `tabIndex={-1}` per rendere il trasferimento del focus verificabile;
4. test E2E specifico in `product/e2e/experience/accessibility.spec.mjs`;
5. receipt PASS nel run `34672053257` sull'exact head `20eb47b7e35faf3114dcbfe32ee320c1cfcc9557`.

La chiusura di 2.4.1 non implica la chiusura di M5-03: gli altri criteri manuali e assistive-technology restano da dimostrare.

## 5. Baseline contrasto automatizzata

Il primo run axe completo aveva individuato esclusivamente violazioni `color-contrast`, concentrate in token semantici e bottom navigation mobile.

La correzione è stata applicata a livello canonico, non pagina per pagina:

- `--brand-blue` portato a una variante più scura;
- `--brand-green` portato a una variante più scura;
- `--ink-faint` portato a contrasto sufficiente sui fondi soft osservati;
- bottom navigation agganciata a `--ink-faint` invece di un colore grezzo;
- rimosso l'effetto di opacità che degradava artificialmente il contrasto delle righe inattive in Impostazioni.

Il run `34672053257` è verde su tutte le superfici/viewport incluse nella suite. Il criterio 1.4.3 resta comunque `MANUAL_REQUIRED`, perché stati dinamici, contenuti non osservati e combinazioni contestuali richiedono ancora verifica umana.

## 6. Criteri N/A correnti

Il runtime corrente non espone media temporizzati audio/video, gesture multipoint/path, device-motion controls o drag-and-drop.

Per questo alcuni criteri sono `NOT_APPLICABLE_CURRENT_SCOPE`. Questo stato non è permanente: una futura capability che introduca tali contenuti deve rendere nuovamente applicabile il criterio nella stessa PR.

## 7. Automazione axe

M5-03 integra `@axe-core/playwright` nella suite di assurance sulle superfici HVA.

L'automazione deve:

- analizzare pagina completa, non soltanto un componente isolato;
- eseguire sui viewport mobile e desktop già canonici;
- includere regole A/AA supportate da axe per WCAG 2.0, 2.1 e 2.2;
- produrre evidenza per superficie;
- fallire su violazioni automatiche;
- preservare gli elementi `incomplete/needs review` come input per il controllo manuale.

Axe è uno strumento di rilevazione automatica, non una certificazione. Soltanto una parte dei problemi WCAG è individuabile automaticamente.

## 8. Copertura manuale obbligatoria

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

## 9. Assistive technology baseline

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

## 10. Criterio M5-03A

`WCAG 2.2 AA matrix = COMPLETE` soltanto quando:

- tutti i 55 criteri A/AA sono classificati;
- nessun `GAP` resta aperto;
- ogni `MANUAL_REQUIRED` applicabile dispone di receipt;
- ogni N/A ha motivazione ancora valida sul runtime corrente;
- scansione automatica delle superfici critiche è verde;
- nessuna variante responsive rilevante è esclusa.

Stato corrente: **PARTIAL**. La matrice completa e la baseline automatizzata esistono; resta da chiudere l'evidenza manuale dei criteri applicabili.

## 11. Criterio M5-03B

`Keyboard/focus/reflow = COMPLETE` soltanto con evidence pack manuale desktop/mobile per:

- tab order;
- focus visible;
- focus not obscured;
- no keyboard trap;
- 200% text resize;
- reflow equivalente a 320 CSS px quando applicabile;
- WCAG text-spacing override.

Stato corrente: **PARTIAL**. Il bypass da tastiera ha receipt automatizzata; la traversata manuale completa non è ancora chiusa.

## 12. Criterio M5-03C

`Assistive technology evidence = COMPLETE` soltanto dopo baseline screen-reader ripetibile sulle journey definite e chiusura dei finding significativi.

Stato corrente: **OPEN**.

## 13. Regola di non-regressione

Ogni nuova UI deve:

1. preservare DPG/HVA;
2. non aumentare i GAP WCAG;
3. aggiornare la matrice quando cambia applicabilità di un criterio;
4. aggiungere test/evidence quando introduce una nuova categoria di interazione o contenuto;
5. non dichiarare `VERIFIED_PASS` senza receipt.

## 14. Confine M5

M5-03 può maturare in parallelo al pilot M5-02. I finding di accessibilità osservati durante uso reale devono essere registrati anche nella ledger M5-02 come `ACCESSIBILITY_FINDING`, senza duplicare dati personali o contenuti scolastici.
