# Render Free — canale beta Docente OS

Stato: `PREPARED_FOR_LINK`
Data: 2026-08-23
Branch applicativo: `develop`
Runtime: Node.js / Next.js
Piattaforma: Render Free
Regione: Frankfurt

## Obiettivo

Fornire un canale beta semplice, senza carta di credito, separato dal canale di release `main` e indipendente da Netlify/Vercel.

Catena prevista:

`GitHub develop -> Product CI -> Render checksPass -> Docente OS beta -> Supabase`

## Configurazione canonica

Il file `/render.yaml` è la sorgente di configurazione del servizio.

- servizio: `docente-os-2026-27-beta`
- tipo: Web Service
- piano: Free
- regione: Frankfurt
- root directory: `product`
- build: `npm install --no-audit --no-fund && npm run build`
- start: `npm start`
- auto deploy: solo dopo CI GitHub verde (`checksPass`)
- health check: `/`

## Variabili d'ambiente

Nel Blueprint sono presenti solo valori pubblici/non segreti:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_VISION_MODEL`

`OPENAI_API_KEY` non viene mai salvata nel repository. Il Blueprint usa `sync: false`, quindi Render la richiede nel flusso iniziale di creazione. Se non si vuole attivare subito la funzione AI server-side, la chiave può essere aggiunta successivamente dal pannello Render, purché il flusso di creazione consenta di proseguire senza valore.

## Sicurezza

- HTTPS è terminato da Render.
- Nessuna service-role key Supabase è inclusa nel deploy client/server.
- Il browser usa esclusivamente la publishable key Supabase prevista per uso pubblico; l'autorizzazione dati resta demandata a Auth + RLS.
- Il servizio viene distribuito dalla branch `develop`, mentre `main` resta separata per release stabili.
- Il deploy automatico è subordinato ai controlli GitHub, non al solo push.

### Verifica Supabase 2026-08-23

Il Security Advisor segnala due warning:

1. `bootstrap_personal_workspace(text)` è `SECURITY DEFINER` ed eseguibile dal ruolo `authenticated`. Verifica manuale della definizione: la funzione richiede `auth.uid()`, usa `SET search_path TO ''` e opera sul workspace personale dell'utente. Il warning è pertanto registrato, ma non viene modificata automaticamente la funzione perché la modifica potrebbe alterare il bootstrap applicativo.
2. Leaked Password Protection è disabilitata. È un hardening consigliato per la beta autenticata e va riesaminato separatamente nelle impostazioni Auth.

## Gate esterno residuo

Il repository è predisposto automaticamente. Per creare materialmente il servizio serve una sola autorizzazione esterna nel dashboard Render:

1. accesso/login a Render;
2. `New -> Blueprint`;
3. collegamento del repository `antoniocorsano-boop/docente-os-2026-27`;
4. branch Blueprint `develop`;
5. conferma del servizio Free;
6. inserimento di `OPENAI_API_KEY` solo se si vuole attivare immediatamente l'AI server-side.

Dopo il primo deploy occorre verificare che l'URL assegnato coincida con `https://docente-os-2026-27-beta.onrender.com`; se Render assegna un hostname differente, aggiornare `NEXT_PUBLIC_APP_URL` al valore reale e rieseguire il deploy.

## Criteri di accettazione

Il canale passa a `READY` solo quando:

- Render mostra deploy `Live`/equivalente sul commit corrente di `develop`;
- `/` risponde via HTTPS;
- autenticazione Supabase funziona;
- una rotta persistente (es. impostazioni/orario) legge e salva correttamente con RLS;
- il successivo commit applicativo su `develop`, dopo CI verde, genera automaticamente un nuovo deploy.
