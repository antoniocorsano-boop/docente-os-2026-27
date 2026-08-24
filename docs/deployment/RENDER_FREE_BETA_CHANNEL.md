# Render Free — canale beta DOCENTE OS

Stato: `READY / EXACT_COMMIT_GATE_ACTIVE`
Data: 2026-08-24
Branch applicativo: `develop`
Runtime: Node.js / Next.js
Piattaforma: Render Free
Regione: Frankfurt
URL canonico beta: `https://docente-os-2026-27-beta.onrender.com`

## Obiettivo

Fornire il runtime beta canonico di DOCENTE OS, separato dal canale di release `main` e indipendente dai limiti Vercel/Netlify.

Catena canonica:

`feature -> PR -> Product CI -> develop -> Render auto deploy -> exact-commit gate -> browser E2E autenticato`

Il Product CI resta il gate di integrazione prima del merge. Render segue direttamente i commit di `develop`; non usa più `checksPass`, perché i check Vercel legacy possono fallire per limiti del piano gratuito pur non rappresentando errori applicativi.

## Configurazione canonica

Il file `/render.yaml` è la sorgente dichiarativa del servizio:

- servizio: `docente-os-2026-27-beta`;
- tipo: Web Service;
- piano: Free;
- regione: Frankfurt;
- branch: `develop`;
- root directory: `product`;
- build: `npm install --no-audit --no-fund && npm run build`;
- start: `npm start`;
- auto deploy: `commit`;
- health check: `/`.

## Verifica del commit realmente eseguito

DOCENTE OS espone `/api/build-info`, endpoint operativo senza dati utente. Il gate GitHub confronta il commit restituito dal runtime con `GITHUB_SHA` prima di avviare Playwright.

Regola:

- SHA uguale -> il browser può collaudare il runtime;
- SHA diverso/endpoint non ancora disponibile -> il runtime è `DEPLOY_STALE`, non un fallimento dell’assistente;
- SHA uguale ma Playwright fallisce -> `APPLICATION_FAIL` sul beta;
- SHA uguale e Playwright passa -> runtime verificato per quel commit.

Il 24 agosto 2026 il primo tentativo sul commit `efd5432fc5e537a4b2b0345c59a78f286b72a948` ha raggiunto il timeout iniziale di 12 minuti mentre Render restituiva ancora `404` a `/api/build-info`. Il rilancio dello stesso job, senza modifiche di codice, ha poi rilevato esattamente lo stesso SHA e ha completato con successo l'intero browser gate. L'evento è quindi classificato come latenza di deploy Render Free, non come difetto applicativo.

Per evitare falsi negativi, il gate corrente concede fino a 30 minuti per l'allineamento dello SHA e usa uno stato distinto quando il browser non viene eseguito per deploy non aggiornato.

## Ultima baseline X3 verificata

Baseline verificata end-to-end sul beta: `efd5432fc5e537a4b2b0345c59a78f286b72a948`.

Su quello stesso commit risultano verdi:

- `x3-e2e/application`;
- `x3-e2e/render-beta`;
- login con account tecnico isolato;
- upload/organizzazione della fixture;
- contesto professionale;
- sintesi fondata;
- prossimo passo contestuale;
- domanda libera secondo contratto Answer First;
- anteprima Planner senza scrittura;
- verifica finale di assenza di mutazioni automatiche.

La successiva baseline `98bbd6f48285df3e25477587e8f6f5804a08ab7d` integra anche l'assistente X3 sul Planner ed è sottoposta allo stesso doppio gate prima di essere dichiarata runtime-verificata.

## Variabili d'ambiente

Nel Blueprint sono presenti soltanto valori pubblici/non segreti:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `NEXT_PUBLIC_APP_URL`;
- `OPENAI_VISION_MODEL`.

`OPENAI_API_KEY` non è presente nel Blueprint e non viene salvata nel repository. X3 resta provider-neutral e non richiede un modello esterno per le risposte deterministiche correnti.

## Sicurezza

- HTTPS è terminato da Render.
- Nessuna service-role key Supabase è inclusa nel deploy client/server.
- Il browser usa la publishable key; l'autorizzazione dati resta demandata ad Auth + RLS.
- L'account E2E è isolato e usa le stesse RLS di un normale utente.
- Le credenziali E2E sono conservate nei GitHub Actions Secrets, non nel repository.
- `/api/build-info` espone solo metadati operativi del build e non dati utente.
- X3 consente esclusivamente `READ_ONLY / PROPOSE`; nessun gate di deploy autorizza scritture AI persistenti.

### Verifica Supabase 2026-08-23

Restano registrati i due warning già verificati:

1. `bootstrap_personal_workspace(text)` è `SECURITY DEFINER` ed eseguibile dal ruolo `authenticated`; la funzione richiede `auth.uid()`, usa `SET search_path TO ''` e opera sul workspace personale dell'utente.
2. Leaked Password Protection è disabilitata e resta un hardening da valutare separatamente.

## Autenticazione

Il callback usa l'origine HTTPS della richiesta/proxy con `NEXT_PUBLIC_APP_URL` come fallback e ritorna su `/auth/confirm`. Il dominio Render è il riferimento beta canonico per i test autenticati.

## Criteri di accettazione per ogni modifica runtime

Una tranche runtime-visible è verificata soltanto quando:

1. Product CI della PR è verde;
2. la modifica è integrata in `develop`;
3. `/api/build-info` sul beta restituisce esattamente il commit di merge;
4. il browser E2E autenticato passa sul runtime Render;
5. le invarianti di sicurezza previste dalla tranche risultano rispettate.

Un timeout di deploy non viene promosso a PASS e non viene confuso con un difetto applicativo: resta un gate non chiuso finché lo SHA non è osservabile.