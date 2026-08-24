# DOCENTE OS — DESIGN.md

Stato: **CANONICAL / PRODUCT-SPECIFIC**

Questo documento descrive il sistema visuale realmente usato dall'applicazione. Non è una galleria di preferenze: è il vincolo entro cui nuove superfici e componenti devono evolvere.

## Identità

DOCENTE OS è uno strumento professionale di lavoro. La sua espressione deve essere **calma, precisa, operativa**. Il contrasto forte è riservato a navigazione, azione primaria e stato significativo; la maggior parte della superficie resta neutra.

## Token correnti

Fonte runtime: `src/app/globals.css`.

### Colore

- Canvas: `#f3f6fa`
- Superficie: `#ffffff`
- Superficie secondaria: `#f8fafc`
- Testo: `#142033`
- Testo secondario: `#536174`
- Testo attenuato: `#7c8898`
- Linea: `#e2e8f0`
- Linea forte: `#cbd5e1`
- Brand/azione: `#2563eb`
- Brand soft: `#eaf2ff`
- Navigazione: `#0d1b2f`
- Errore: `#c93838`
- Attenzione: `#a65f00`
- Successo: `#18794e`

I colori semantici non sono decorativi. Rosso, arancio e verde comunicano rispettivamente problema, attenzione e successo reale.

### Tipografia

Stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

Gerarchia orientativa:

- H1 di superficie: circa 31–42 px, peso forte, tracking negativo moderato.
- H2 decisionali: 18–36 px secondo contesto.
- Corpo operativo: 12–16 px.
- Metadati/eyebrow: 9–12 px, peso alto; mai sostituire il contenuto principale.

Non ridurre testo informativo sotto la soglia di leggibilità per far entrare più elementi.

### Forma e profondità

- Raggio piccolo: 10 px
- Raggio medio: 16 px
- Raggio grande: 22 px
- Ombre: rare; usate per superfici flottanti o separazione significativa, non per ogni scheda.
- Bordi sottili e superfici neutre sono il meccanismo ordinario di raggruppamento.

## Gerarchia di schermata

Ordine preferito:

**contesto → titolo/compito → stato/azione corrente → contenuto utile → azioni secondarie → gestione/provenienza**.

Una schermata non dovrebbe avere più di una gerarchia dominante. Se due aree competono per attenzione, una delle due va resa secondaria o progressivamente esposta.

## Densità

- **Decisione/errore:** più spazio, testo esplicativo, una azione primaria.
- **Elenco operativo:** densità media, righe o schede compatte, metadati ridotti.
- **Dati tabellari desktop:** alta densità ammessa se le relazioni colonna-valore sono essenziali.
- **Mobile:** una tabella desktop non viene semplicemente rimpicciolita; quando la relazione colonna-valore diventa faticosa si converte in schede o gruppi verticali.

## Movimento

Il movimento è funzionale allo stato, mai ornamentale. Rispettare `prefers-reduced-motion`. Nessuna informazione essenziale deve dipendere da animazioni.

## Stato e feedback

- `success` solo quando il risultato essenziale è realmente persistito/ottenuto;
- `warning` quando serve attenzione ma il lavoro non è fallito;
- `danger` quando esiste un problema reale;
- attesa lunga: mostrare fase umana corrente, non un indicatore indefinito privo di significato.

## Riferimenti runtime

- `src/app/globals.css` — token e shell.
- `src/app/human-task.css` — focus, azioni, dettagli progressivi.
- `src/app/knowledge/knowledge-upload-comfort.css` — pattern transazionale e recupero.
- `src/app/piano-annuale/annual-plan-mobile-comfort.css` — adattamento strutturale mobile.

Se codice e questo documento divergono, la divergenza deve essere risolta esplicitamente: non si assume automaticamente che il CSS corrente sia sempre corretto.