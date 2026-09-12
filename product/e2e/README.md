# Gate X3 end-to-end

Questo pacchetto contiene i collaudi browser autenticati di DOCENTE OS.

## X3: due gate indipendenti

Il workflow `.github/workflows/x3-e2e.yml` mantiene separati due problemi che non devono mascherarsi a vicenda.

### `x3-e2e/application`

Avvia il commit corrente come applicazione Next.js dentro GitHub Actions e lo collauda con Playwright su viewport mobile 412×915. Usa Supabase reale e l'account tecnico E2E reale, quindi verifica autenticazione, RLS, upload, indicizzazione, persistenza del contesto, assistente e Planner senza dipendere dal canale Render.

### `x3-e2e/render-beta`

Aspetta che `https://docente-os-2026-27-beta.onrender.com/api/build-info` esponga esattamente il `GITHUB_SHA` dell'esecuzione e solo dopo ripete lo stesso collaudo browser sul beta Render. Un ritardo o un guasto di pubblicazione resta quindi un errore del gate runtime e non viene confuso con un errore applicativo X3.

## MFA AAL2 browser gate

Il workflow `.github/workflows/mfa-browser-e2e.yml` usa esclusivamente una fixture MFA dedicata. Non riusa l'account X3 condiviso e non crea fattori TOTP effimeri durante la CI.

Richiede tre repository secrets separati:

- `DOCENTE_OS_MFA_E2E_EMAIL`
- `DOCENTE_OS_MFA_E2E_PASSWORD`
- `DOCENTE_OS_MFA_E2E_TOTP_SECRET`

L'account associato deve avere già un fattore TOTP verificato corrispondente al seed conservato nel secret GitHub. Se uno dei tre valori manca, il gate termina in errore e dichiara esplicitamente che la prova browser non è stata eseguita.

La prova `mfa-aal2-browser.spec.mjs` verifica:

1. password → sessione AAL1 → redirect a `/mfa`;
2. pagina operativa negata ad AAL1;
3. API applicativa protetta → `403 mfa_required` ad AAL1;
4. superficie recovery raggiungibile ad AAL1 senza promuovere la sessione;
5. TOTP errato respinto;
6. TOTP valido → AAL2 → Planner;
7. API applicativa protetta accessibile dopo AAL2;
8. `/mfa` con sessione già AAL2 non ricrea un challenge e ritorna alla destinazione operativa.

Il seed TOTP non deve comparire in log, fixture, artifact o file versionati.

## Sequenza browser X3 coperta

1. accesso con l'account tecnico E2E;
2. caricamento e indicizzazione della fixture `fixtures/x3-responsible-ai.txt`;
3. salvataggio del contesto professionale;
4. apertura dell'assistente contestuale;
5. prova `Cosa contiene questo documento?`;
6. prova `Qual è il prossimo passo utile?`;
7. prova `Crea un'attività nel Planner da questo documento.`;
8. verifica che nessuna attività sia stata realmente creata nel Planner.

## Invarianti di sicurezza

- gli account tecnici usano lo stesso bootstrap applicativo e le stesse RLS degli utenti ordinari;
- nessuna chiave `service_role` è usata dai test browser;
- password e seed TOTP non sono versionati;
- la fixture X3 resta confinata nel workspace tecnico;
- `PLANNER_CREATE_TASK` resta vietato in X3;
- un gate non eseguito non viene mai presentato come PASS.

## Evidenze e telemetria

Ogni job conserva le evidenze Playwright previste dal relativo workflow. Tracce, schermate, video e log del server sono artifact di test; nessun secret deve esservi scritto.

## Criterio di promozione X3

Il gate automatico è necessario ma non sostituisce la decisione umana sul significato del comportamento. X3 può essere proposto per APPROVE quando:

- `x3-e2e/application` è PASS;
- il contesto mostra tutte le classi e discipline attese;
- il pannello mobile rispetta il limite di ingombro previsto;
- le risposte sono contestuali e utili;
- la richiesta di scrittura produce soltanto un'anteprima;
- il Planner resta invariato dopo la prova di scrittura.

La promozione del **beta Render** richiede inoltre `x3-e2e/render-beta = PASS`. Se questo secondo gate è rosso mentre il primo è verde, il residuo è classificato come problema di distribuzione/runtime, non come regressione X3.
