# DOCENTE OS — Visual Hierarchy Context Contract

Data: 2026-10-04  
Stato: CANONICAL CANDIDATE / COMPATIBLE WITH DESIGN SYSTEM V2  
Ambito iniziale: Orario; estensione progressiva alle altre superfici

## 1. Problema

Docente OS dispone già di componenti, token, responsive rules e gate visuali. Questo non garantisce, da solo, che **l'informazione giusta domini nello spazio giusto al momento giusto**.

L'evidenza del pilot mobile dell'Orario ha mostrato due classi di difetto:

- una decisione importante può esistere tecnicamente ma essere gerarchicamente nascosta;
- un feedback può essere corretto semanticamente ma poco percepibile perché collocato fuori dal fuoco dell'utente.

La gerarchia visuale deve quindi diventare un contratto verificabile che combina **significato, momento operativo, spazio disponibile e persistenza**.

## 2. Fonti di metodo

Il contratto adotta principi compatibili con pratiche mature:

- USWDS: partire dal bisogno reale, ordinare i contenuti per priorità e rendere sempre chiaro il prossimo passo;
- GOV.UK Design System: progettare da schermi piccoli, single-column first e tipografia responsive;
- WCAG 2.2: ordine logico, reflow, focus e significato indipendente dalla sola presentazione;
- Design System V2 Docente OS: una sola azione primaria per contesto, progressive disclosure, mobile-first reale, feedback immediato per ogni write.

Queste fonti non sostituiscono il pilot: la validazione finale resta sul prodotto reale e sui dispositivi/viewport di riferimento.

## 3. Assi del contratto

Ogni blocco informativo significativo viene valutato su quattro assi.

### 3.1 Priorità semantica

| Livello canonico | Significato | Esempi |
| --- | --- | --- |
| `decision-primary` | decisione esplicita che cambia lo stato operativo | Metti in uso questo orario |
| `operational-primary` | contenuto necessario per svolgere il compito | griglia orario, prossima lezione |
| `status-transient` | esito breve di una write o errore contestuale | Modifiche salvate, errore di salvataggio |
| `guidance` | spiegazione necessaria per capire cosa fare | descrizione della bozza, istruzioni essenziali |
| `supporting` | informazione utile ma non necessaria nel momento corrente | monte ore, provenienza sintetica |
| `metadata` | dettaglio consultabile, storico o tecnico | versioni precedenti, source ref, dettagli avanzati |

I valori sono chiusi: non si introducono sinonimi locali.

### 3.2 Momento operativo

Il livello visuale dipende dal momento:

- **NOW** — ciò che serve per agire subito;
- **PREPARE** — ciò che serve a preparare una decisione futura;
- **REVIEW** — ciò che serve a controllare prima della conferma;
- **HISTORY** — ciò che serve a ricostruire il passato.

Un'informazione può cambiare prominenza tra momenti senza cambiare autorità.

### 3.3 Spazio disponibile

La gerarchia non viene ridotta a breakpoint nominali. Il contratto usa una matrice minima di verifica:

| Contesto | Viewport di riferimento | Obiettivo |
| --- | ---: | --- |
| mobile compatto | 360×800 | compito e decisione leggibili senza compressione impropria |
| mobile medio | 390×844 | layout primario completo |
| mobile ampio | 412×915 | riferimento pilot Android |
| tablet portrait | 768×1024 | ricomposizione senza perdere priorità |
| desktop | 1440×1000 | densità maggiore senza moltiplicare CTA |

I test devono misurare l'ordine e la percepibilità, non soltanto l'assenza di overflow.

### 3.4 Persistenza

- **transient**: esito breve; entra nel campo visivo, resta il tempo necessario e scompare;
- **session**: stato valido per la sessione/flusso;
- **persistent**: contenuto o decisione che deve restare disponibile finché cambia lo stato;
- **disclosed**: dettaglio recuperabile tramite progressive disclosure.

## 4. Regole normative

1. Per ogni contesto deve esistere **al massimo una `decision-primary`**.
2. La `decision-primary` deve precedere il contenuto che serve a valutarla quando la decisione è il prossimo passo; non può essere nascosta in disclosure.
3. `operational-primary` deve restare leggibile e utilizzabile a 360 px senza horizontal scroll nel percorso primario.
4. `status-transient` deve comparire nel viewport corrente, non spostare stabilmente il layout e non coprire navigazione o CTA.
5. `guidance` spiega il compito, ma non può competere tipograficamente con decisione e contenuto operativo.
6. `supporting` e `metadata` vengono subordinati quando riducono la leggibilità del first viewport.
7. Colore, card e ombra non sono sufficienti a creare gerarchia: ordine DOM, heading, spacing e copy devono funzionare anche senza colore.
8. La prominenza visuale non cambia stato, autorità o governance del dato.
9. Motion è ammesso solo per orientamento, feedback e continuità; 120–220 ms come baseline e `prefers-reduced-motion` obbligatorio.
10. Una superficie significativa deve essere validata con almeno un test browser sul layout reale.

## 5. Marker machine-addressable

Le superfici possono dichiarare il ruolo con:

```html
data-visual-priority="decision-primary"
data-visual-moment="review"
```

Valori ammessi per `data-visual-priority`:

```text
decision-primary
operational-primary
status-transient
guidance
supporting
metadata
```

I marker non controllano lo stile da soli. Servono a rendere il contratto osservabile da Playwright, HVA e gate statici.

## 6. Contratto iniziale — Orario

### Gestisci

Ordine atteso:

1. Page title / contesto;
2. navigazione locale;
3. **decision-primary**: Metti in uso / Cambia data di validità;
4. guidance sintetica sulla bozza;
5. **operational-primary**: griglia modificabile;
6. supporting: monte ore;
7. metadata/history: versioni precedenti.

La decisione di messa in uso deve essere visibile **prima della griglia**. Se non è disponibile, il motivo e il prossimo passo devono occupare la stessa posizione gerarchica.

### Aggiorna

Ordine atteso:

1. Page title;
2. navigazione locale;
3. operational-primary: modifica diretta della settimana;
4. data di validità;
5. CTA verso controllo/messa in uso;
6. import da documento come percorso secondario/disclosed.

### Feedback

Ogni write:

```text
tap
→ pending sul controllo
→ status-transient nel viewport corrente
→ auto-dismiss
```

Gli errori restano più a lungo dei successi.

## 7. Enforcement

Il contratto viene applicato a strati:

- **DPG-1**: rifiuta valori `data-visual-priority` non canonici;
- **source regression**: verifica che decisione e contenuto primario siano marcati e ordinati;
- **Playwright/HVA**: misura ordine e first-viewport su 360×800, 390×844, 412×915 e 768×1024 per la superficie qualificata;
- **pilot reale**: resta l'evidenza finale per qualità percepita.

Il gate statico non può dichiarare PASS una gerarchia qualitativamente scorretta: può soltanto impedire vocabolario e strutture non governate.

## 8. Criterio di estensione ad altre superfici

Una nuova superficie entra nel contratto solo quando sono definiti:

```text
Surface:
Primary teacher task:
Moment:
decision-primary:
operational-primary:
status-transient:
guidance/supporting/metadata:
Viewport matrix:
Browser evidence:
Pilot evidence:
```

L'estensione è incrementale; non è richiesta una riscrittura massiva del prodotto.
