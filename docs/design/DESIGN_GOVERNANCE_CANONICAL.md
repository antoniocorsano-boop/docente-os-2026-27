# Docente OS — Design Governance Canonical

Data: 2026-09-11  
Stato: CANONICAL / BINDING FOR ALL NEW VISUAL WORK  
Classificazione: `COMPATIBLE` con Design System V2 e Brand Identity Canonical

## 1. Scopo

Questo documento fissa le regole di design trasversali di Docente OS. Governa Home, Oggi, Orario, Classi, Diario, Progetta, Conoscenza, login, loading, shell, navigazione, superfici future e materiali di brand.

Le regole qui definite non sono una preferenza estetica: sono un contratto di prodotto. Le implementazioni possono migliorare spaziatura, densità e composizione, ma non possono violare gli invarianti senza una revisione canonica esplicita.

## 2. Principio guida

**Docente OS deve apparire e comportarsi come un unico prodotto anche quando cambia funzione.**

Il design deve mantenere il filo tra contesto, azione, evidenza e prossimo passo. L'identità non si ottiene ripetendo il logo, ma attraverso gerarchie, token, comportamento, linguaggio e continuità percettiva.

## 3. Regole canoniche

1. **Il simbolo è invariabile.** La geometria del marchio deve riprodurre fedelmente il riferimento visuale approvato il 2026-09-11: stessa struttura della `D`, stessa apertura, stesso rapporto tra arco e tratto, stessa posizione e proporzione del punto centrale, stessa curva diagonale e stesso rapporto percettivo blu→turchese. Non sono ammesse reinterpretazioni locali o automatiche.
2. **Sono autorizzate soltanto tre famiglie di variante del marchio.** Icona chiara, icona inversa/scura e simbolo ridotto/monocromatico. Ogni variante conserva la stessa geometria di base. Il lockup usa `Docente OS`; la firma autorizzata è `Mantieni il filo.`
3. **Il significato guida la grafica.** Il brand rappresenta continuità, contesto, orientamento, traccia e autonomia professionale. È vietato usare come identità primaria libri, cappelli da laurea, lavagne, lampadine, robot, persone stilizzate o altre metafore scolastiche didascaliche.
4. **La palette è semantica, non ornamentale.** Navy = identità/struttura; blue = azione/orientamento; teal = continuità/traccia; green = conferma/completamento; red = errore/rischio; amber = attenzione. Il verde non è un secondo colore di marca dominante.
5. **Una sola azione primaria per contesto.** Le altre azioni sono secondarie, progressive o contestuali. Non devono competere più CTA primarie nella stessa gerarchia.
6. **Gerarchia prima della densità.** Titolo, contesto, stato, azione primaria e contenuto devono essere leggibili in quest'ordine. Metadati tecnici e dettagli di provenienza restano recuperabili ma non dominano la superficie.
7. **Le superfici sono calme e professionali.** Canvas chiaro, superfici bianche, bordi leggeri, ombre contenute. Vietati gradienti puramente decorativi, glow, neon, glassmorphism invasivo e codici visivi “AI” non funzionali.
8. **La tipografia è editoriale e operativa.** Titoli netti ma non teatrali; corpo leggibile; metadata discreti; uppercase limitato a label brevi. Inter/system UI resta baseline finché un cambio font non viene approvato esplicitamente.
9. **Mobile-first reale.** Ogni nuova superficie deve essere progettata e validata almeno nel range 360–430 px. Target interattivi >= 44 px, nessun horizontal scroll nel percorso primario, nessuna dipendenza da hover, nessun elemento flottante che copra azioni o navigazione.
10. **La navigazione mantiene il contesto.** Header mobile compatto con simbolo, sezione corrente e workspace/istituto; sidebar desktop con lockup completo. Il brand orienta senza sottrarre spazio al lavoro.
11. **Gli stati usano parole umane.** `Pronto`, `Da registrare`, `Registrata`, `Provvisorio`, `Da riprovare`, `Confermato` e analoghi. Il colore rafforza lo stato ma non lo sostituisce.
12. **Loading = ricomposizione del contesto.** Per attese percepibili, il loading usa il marchio e il concetto di filo. Baseline: `Ritrovo il filo della tua giornata.` Lo spinner generico non è l'identità primaria di caricamento.
13. **Motion funzionale.** Transizioni ordinarie 120–220 ms. Motion solo per orientamento, stato, feedback e continuità; nessuna animazione decorativa continua. `prefers-reduced-motion` obbligatorio.
14. **Iconografia coerente.** Lucide o set funzionale canonico per le azioni dell'interfaccia. Il simbolo Docente OS è riservato al brand e non sostituisce icone operative.
15. **Copy coerente con il brand.** Breve, professionale, contestuale, non trionfalistico. Il sistema propone e ricompone; non presenta decisioni AI come decisioni del docente.
16. **La Home mostra la realtà, non spiega il prodotto.** La marca vive nella struttura della Home; slogan e messaggi identitari non devono occupare lo spazio necessario alla giornata operativa.
17. **Il design non modifica l'autorità dei dati.** Evidenza visuale, prominenza o colore non possono trasformare un DRAFT in canonico, una sincronizzazione Drive in TeachingSession o una proposta AI in decisione umana.
18. **Accessibilità obbligatoria.** Contrasto WCAG AA target, focus visibile, nomi accessibili per icon-only controls, niente informazione solo cromatica, zoom 200%, testo ingrandito, tastiera desktop e reduced motion.
19. **Nessuna variante locale arbitraria.** Nuove feature usano token, componenti, raggi, ombre, icone e marchio condivisi. Nuove palette locali o duplicazioni visuali richiedono motivazione e revisione canonica.
20. **Evoluzione governata.** Ogni modifica visuale trasversale va classificata `COMPATIBLE`, `SUPERSEDING` o `BREAKING`, con problema osservato, evidenza, impatto sugli invarianti e gate di validazione.

## 4. Invarianti non derogabili

Sono invarianti e non possono essere modificati da una singola feature:

- geometria canonica del simbolo rispetto al riferimento approvato;
- promessa `Mantieni il filo.`;
- cinque significati: continuità, contesto, orientamento, traccia, autonomia;
- docente come centro decisionale;
- semantica dei colori di stato;
- una sola azione primaria per contesto;
- mobile-first e accessibilità;
- nessun significato professionale affidato soltanto al colore;
- nessuna reinterpretazione locale del brand;
- distinzione tra identità visuale e autorità dei dati.

## 5. Aspetti migliorabili con evidenza

Possono evolvere senza cambiare l'identità se supportati da HVA, pilot o accessibilità:

- spaziature e densità;
- dimensioni responsive del lockup;
- quantità di metadata visibili per default;
- curve e tempi di motion entro il contratto;
- composizione di card e sezioni;
- microcopy secondaria di loading;
- intensità di ombre e bordi entro i token canonici.

**La geometria del simbolo non rientra più tra gli aspetti liberamente migliorabili.** Qualunque modifica del segno richiede revisione `SUPERSEDING` o `BREAKING`, confronto con il riferimento approvato e nuova accettazione visuale esplicita.

## 6. Ordine di autorità visuale

Per ogni lavoro di interfaccia:

1. invarianti di dominio / sicurezza / human-in-the-loop;
2. specifica verticale della funzione;
3. `DESIGN_SYSTEM_V2_CANONICAL.md`;
4. `BRAND_IDENTITY_CANONICAL.md`;
5. questo `DESIGN_GOVERNANCE_CANONICAL.md` per le regole trasversali;
6. `DESIGN_POLICY_GATE_DPG1.md` per il gate sul diff;
7. `DESIGN_CONFORMANCE_DPG2.md` per il ratchet sul debito visuale storico;
8. Language & Collaboration System;
9. evidenza HVA/pilot più recente.

In caso di conflitto tra una soluzione locale e questo documento, prevale la regola canonica finché non viene formalmente aggiornata.

## 7. Enforcement reale delle 20 regole

Le 20 regole non sono considerate “reali” soltanto perché documentate. Devono essere sostenute da enforcement statico, componenti canonici, browser checks, HVA esplicita o invarianti di dominio.

`DESIGN_POLICY_GATE_DPG1.md` definisce il primo livello automatico bloccante sul diff. DPG-1 controlla almeno:

- duplicazione/ridefinizione locale del marchio (`DPG-01`);
- nuovi colori raw fuori dai token/brand (`DPG-04`);
- motion senza `prefers-reduced-motion` (`DPG-13`);
- librerie di icone alternative (`DPG-14`);
- nuovi token visuali locali (`DPG-19`);
- assenza della classificazione `COMPATIBLE` / `SUPERSEDING` / `BREAKING` nella PR (`DPG-20`).

`DESIGN_CONFORMANCE_DPG2.md` aggiunge un secondo livello sull'intero runtime. DPG-2 misura il debito storico e applica una baseline monotona decrescente per colori raw, token locali, riferimenti brand legacy, effetti decorativi, raggi raw e shadow raw. **Una feature non può aumentare una metrica esistente né rialzare la baseline per normalizzare una regressione.**

Le regole qualitative `DPG-05/06/07/08/09/10/11/12/15/16/17/18` sono criteri obbligatori e strutturati della Human + Visual Acceptance. Devono comparire nella ricevuta come `REVIEW_REQUIRED` finché non vengono osservate: **non possono essere auto-dichiarate PASS**.

La strategia resta incrementale: DPG-1 impedisce nuovo debito nel diff, DPG-2 impedisce l'espansione del debito storico e le tranche di cleanup abbassano progressivamente la baseline senza riscritture massive.

## 8. Gate minimi per modifiche trasversali

Ogni intervento su logo, palette, shell, navigazione, loading, tipografia globale o primitive condivise deve passare:

- **Design Policy Gate DPG-1 + DPG-2**;
- Product CI + typecheck + build;
- Human Interaction Model;
- Human + Visual Acceptance desktop/mobile con checklist Design Governance;
- verifica 360–430 px;
- assenza horizontal overflow sul percorso primario;
- contrasto/focus/accessibility smoke;
- `prefers-reduced-motion` quando c'è motion;
- smoke login + Home + almeno una classe/superficie operativa.

Un gate tecnico verde non sostituisce il giudizio HVA sulle regole qualitative, e un giudizio HVA positivo non può derogare a una violazione DPG-1 o DPG-2 bloccante.

## 9. Regola per agenti e contributori

Prima di introdurre CSS, token, icone, card, CTA o varianti del marchio, verificare se esiste già un componente o token canonico. È vietato dedurre una nuova estetica da una singola pagina o da un mockup isolato.

Ogni PR visuale deve dichiarare la classificazione canonica e deve essere valutata da DPG-1, DPG-2 e HVA quando il perimetro tocca una superficie utente. Le tranche di cleanup devono ridurre o mantenere tutte le metriche DPG-2 e abbassare la baseline quando una riduzione è stata validata.
