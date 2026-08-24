# Gate X3 end-to-end su Render

Questo pacchetto contiene il collaudo browser autenticato del gate X3 di DOCENTE OS.

## Scopo

Il test verifica il comportamento reale del runtime beta Render su viewport mobile, senza usare il workspace personale dell'utente e senza abilitare capacità X4.

Sequenza coperta:

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

## Runtime verificato

Il workflow `.github/workflows/x3-e2e.yml` aspetta che `/api/build-info` sul beta Render esponga esattamente il `GITHUB_SHA` dell'esecuzione. In questo modo il browser non può validare accidentalmente una versione precedente dell'applicazione.

## Evidenze

Ogni esecuzione configurata pubblica, per 14 giorni, il rapporto Playwright e le evidenze disponibili in `product/playwright-report/` e `product/test-results/`, incluse schermate delle tre risposte canoniche e tracce/video in caso di errore.

## Criterio di promozione X3

Il gate automatico è necessario ma non sostituisce la decisione umana sul significato del comportamento. X3 può essere proposto per APPROVE solo quando:

- il workflow browser è PASS sul commit Render corrente;
- il contesto mostra tutte le classi e discipline attese;
- il pannello mobile rispetta il limite di ingombro previsto;
- le risposte sono contestuali e utili;
- la richiesta di scrittura produce soltanto un'anteprima;
- il Planner resta invariato dopo la prova di scrittura.
