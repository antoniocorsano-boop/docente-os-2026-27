# DOCENTE OS — Deployment Channel Status

Data: 2026-08-23  
Stato: RELEASE_BRANCH_REPAIRED / NETLIFY_GIT_TRIGGER_BLOCKED

## Stato verificato

Il canale repository è stato riallineato.

- ramo di integrazione canonico: `develop`;
- baseline validata Human Task: `d20e16aa0b4cb943ece1687067cfe5a74b7a94fd`;
- release `develop -> main` eseguita tramite PR #2;
- commit di release su `main`: `de0f11ecfbf146edb9cfd46959e4f7d0cffbec31`;
- i due commit che erano presenti soltanto su `main` avevano effetto netto zero sul tree.

Flusso di release canonico ripristinato:

`feature -> develop -> CI verde -> main -> hosting`

## Netlify

Il file `netlify.toml` è coerente con il prodotto Next.js:

- base `product`;
- `npm run build`;
- Node 22;
- plugin Next.js.

Il progetto storico `docente-os-dev` continua però a riportare come deploy corrente il vecchio commit `ddebb6d970f382983e368cfd29bdacb71c0335c7` e non ha reagito al nuovo push su `main`.

Conclusione: il problema residuo non è la build né la divergenza dei rami, ma l’integrazione Git/build trigger del progetto Netlify.

Gli strumenti Netlify attualmente disponibili al sistema consentono di leggere i progetti e generare un comando di deploy diretto, ma non espongono la modifica dell’integrazione Git, del production branch o la creazione di un build hook. Il comando di deploy diretto richiede inoltre un checkout locale del repository e un proxy temporaneo: tale credenziale non deve essere salvata nel repository pubblico.

Per questo motivo il runtime Netlify non viene dichiarato verificato sulla baseline corrente finché un deploy non riporta il commit di release atteso.

## Vercel

Il team collegato è disponibile ma non contiene attualmente progetti. Vercel non viene usato come fallback implicito.

## Gate

Finché il runtime di riferimento non è nuovamente verificabile:

- sono consentite slice compiler, test, documentazione e architettura che non richiedono accettazione interattiva;
- una modifica runtime-visible non può essere dichiarata chiusa senza una ricevuta di deploy reale;
- X3/Settings interactive acceptance resta sospesa;
- nessun agente deve interpretare il vecchio `DEV_RUNTIME_VERIFIED` come stato corrente.

## Chiusura del blocco

Il blocco è chiuso soltanto quando un deploy Netlify `READY` riporta il commit corrente di `main` oppure un nuovo canale di hosting viene formalmente scelto e verificato.
