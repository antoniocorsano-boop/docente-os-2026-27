# DOCENTE OS — Human + Visual Acceptance System

## Obiettivo

Questa cartella descrive la capacità permanente con cui DOCENTE OS viene **eseguito, osservato e valutato** dopo una modifica dell'interfaccia.

Il sistema usa lo stesso contratto contro tre target:

- `local` — runtime sul computer o nel job CI;
- `preview` — URL pubblico temporaneo indicato manualmente;
- `beta` — `https://docente-os-2026-27-beta.onrender.com`.

## Componenti

- `../design/` — autorità Human e visuale del prodotto.
- `../e2e/experience/` — scenari read-only delle superfici principali.
- `../e2e/support/experience-observer.mjs` — console, rete, layout, target mobili.
- `../playwright.experience.config.mjs` — browser mobile e desktop.
- `../scripts/experience/wait-for-target.mjs` — handshake commit/stato `product/` con Beta.
- `../scripts/experience/acceptance-report.mjs` — receipt JSON e Markdown.
- `../../.github/workflows/experience-acceptance.yml` — orchestrazione CI.

## Esecuzione locale

Con l'applicazione già avviata su `http://127.0.0.1:3000` e `E2E_PASSWORD` disponibile:

```bash
cd product
npm install --no-audit --no-fund
npm install --no-save --package-lock=false @playwright/test@1.55.0
npx playwright install chromium
E2E_BASE_URL=http://127.0.0.1:3000 EXPERIENCE_TARGET=local npx playwright test --config=playwright.experience.config.mjs
EXPERIENCE_TARGET=local E2E_BASE_URL=http://127.0.0.1:3000 node scripts/experience/acceptance-report.mjs
```

## Preview

Il workflow può essere lanciato manualmente con `target=preview` e un `base_url` pubblico. Non viene eseguito l'handshake `/api/build-info` salvo futura estensione esplicita: una preview può non corrispondere al ramo `develop`.

## Beta

Su `develop`, il workflow aspetta che Render serva lo stesso commit oppure uno stato `product/` equivalente. Solo dopo apre il browser.

## Ricevuta

Output canonico:

```text
test-results/experience/
├── deployment.json
├── observations/
├── screenshots/
├── playwright-artifacts/
└── receipt/
    ├── acceptance.json
    └── acceptance.md
```

La receipt automatica non assegna da sola un PASS estetico. `visual=REVIEW_REQUIRED` significa che un umano o un agente deve osservare gli screenshot, registrare eventuali finding e richiedere una nuova esecuzione dopo la correzione.

## Regola di non contaminazione

Gli scenari generali sono read-only. Test che creano dati (per esempio K1 o X3) restano separati finché non dispongono di cleanup/reset deterministico. Le fixture E2E non devono essere considerate contenuto reale nel giudizio visuale.