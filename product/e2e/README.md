# Gate X3 end-to-end

Questo pacchetto contiene il collaudo browser autenticato del gate X3 di DOCENTE OS.

## Due gate indipendenti

Il workflow `.github/workflows/x3-e2e.yml` mantiene separati due problemi che non devono mascherarsi a vicenda.

### `x3-e2e/application`

Avvia il commit corrente come applicazione Next.js dentro GitHub Actions e lo collauda con Playwright su viewport mobile 412×915. Usa Supabase reale e l'account tecnico E2E reale, quindi verifica autenticazione, RLS, upload, indicizzazione, persistenza del contesto, assistente e Planner senza dipendere dal canale Render.

### `x3-e2e/render-beta`

Aspetta che `https://docente-os-2026-27-beta.onrender.com/api/build-info` esponga esattamente il `GITHUB_SHA` dell'esecuzione e solo dopo ripete lo stesso collaudo browser sul beta Render. Un ritardo o un guasto di pubblicazione resta quindi un errore del gate runtime e non viene confuso con un errore applicativo X3.

## Sequenza browser coperta

1. accesso con l'account tecnico E2E;
2. caricamento e indicizzazione della fixture `fixtures/x3-responsible-ai.txt`;
3. salvataggio del contesto professionale;
4. apertura dell'assistente contestuale;
5. prova `Cosa contiene questo documento?`;
6. prova `Qual è il prossimo passo utile?`;
7. prova `Crea un'attività nel Planner da questo documento.`;
8. verifica che nessuna attività sia stata realmente creata nel Planner.

## Invarianti di sicurezza

- l'account tecnico usa lo stesso bootstrap applicativo e le stesse RLS degli utenti ordinari;
- nessuna chiave `service_role` è usata dal test;
- la password non è versionata: vive soltanto nel segreto GitHub `DOCENTE_OS_E2E_PASSWORD`;
- la fixture resta confinata nel workspace tecnico;
- `PLANNER_CREATE_TASK` resta vietato in X3;
- un gate non eseguito non viene mai presentato come PASS.

## Evidenze e telemetria

Ogni job pubblica uno status context sul commit e collega la relativa esecuzione GitHub Actions. Le evidenze Playwright vengono conservate per 14 giorni: rapporto HTML, schermate delle tre risposte canoniche, tracce e video in caso di errore. Il gate applicativo conserva anche il registro del server Next locale.

## Criterio di promozione X3

Il gate automatico è necessario ma non sostituisce la decisione umana sul significato del comportamento. X3 può essere proposto per APPROVE quando:

- `x3-e2e/application` è PASS;
- il contesto mostra tutte le classi e discipline attese;
- il pannello mobile rispetta il limite di ingombro previsto;
- le risposte sono contestuali e utili;
- la richiesta di scrittura produce soltanto un'anteprima;
- il Planner resta invariato dopo la prova di scrittura.

La promozione del **beta Render** richiede inoltre `x3-e2e/render-beta = PASS`. Se questo secondo gate è rosso mentre il primo è verde, il residuo è classificato come problema di distribuzione/runtime, non come regressione X3.