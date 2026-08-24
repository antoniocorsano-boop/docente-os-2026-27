# DOCENTE OS — Accessibility Rules

Stato: **CANONICAL**

L'accessibilità è parte del comfort espressivo e del controllo umano, non un controllo separato da aggiungere alla fine.

## Struttura semantica

- Una sola intestazione primaria (`h1`) per la superficie principale, salvo casi motivati.
- Usare elementi nativi (`button`, `a`, `input`, `select`, `details`) prima di ricostruirne il comportamento con `div` e ruoli ARIA.
- Regioni e gruppi critici devono avere nome accessibile quando serve a distinguerli.

## Stato e feedback

- `role="status"` per aggiornamenti di avanzamento e successo non urgenti.
- `role="alert"` per errori che richiedono attenzione immediata.
- Il colore non è l'unico indicatore di stato.
- Focus non viene spostato in modo inatteso dopo operazioni ordinarie.

## Tastiera e focus

- Tutte le azioni devono essere raggiungibili da tastiera.
- Il focus visibile non va rimosso; il runtime usa un outline coerente con il brand.
- Modali e pannelli devono gestire entrata, uscita e ritorno del focus in modo prevedibile.

## Testo e contrasto

- Testo secondario può essere attenuato, ma non fino a perdere leggibilità.
- Informazioni essenziali non vengono affidate a placeholder, tooltip o icone prive di etichetta.
- Evitare blocchi lunghi in maiuscolo; gli eyebrow restano brevi e secondari.

## Mobile e zoom

- Non impedire lo zoom del browser.
- I controlli principali seguono i target definiti in `MOBILE-RULES.md`.
- La navigazione fissa non deve coprire contenuti o focus.

## Gate

HVA v1 controlla semanticamente titolo primario, stato runtime, layout e dimensione dei controlli mobili. Una futura integrazione automatica WCAG/axe può estendere il gate, ma non sostituisce il controllo umano del compito.