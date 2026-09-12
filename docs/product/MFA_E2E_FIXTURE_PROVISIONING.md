# MFA E2E fixture — provisioning governato

Questa procedura serve esclusivamente a predisporre il secondo fattore persistente usato dal gate browser ASVS V6.3.3.

## Invarianti

- non usare l'account E2E condiviso degli altri gate;
- non versionare email, password o seed TOTP;
- non inserire il seed in issue, PR, commenti o log CI;
- non creare bypass MFA per i test;
- non usare fattori effimeri che possano lasciare l'account bloccato dopo un crash;
- il fattore deve essere verificato realmente da Supabase Auth e produrre `aal2`.

## 1. Account tecnico dedicato

Creare o scegliere un account Supabase Auth dedicato esclusivamente al gate MFA. Deve avere una password stabile e non essere utilizzato dai gate X3/K1/HVA/P6 ordinari.

Conservare localmente:

- email tecnica;
- password tecnica.

## 2. Provisioning TOTP locale

Nel repository, sul branch MFA, installare le dipendenze del prodotto e lanciare il comando in un terminale locale fidato:

```bash
cd product
export NEXT_PUBLIC_SUPABASE_URL='https://gnshgapmwyjamhmlikeg.supabase.co'
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='<publishable-key del progetto>'
export MFA_E2E_EMAIL='<email tecnica dedicata>'
export MFA_E2E_PASSWORD='<password tecnica dedicata>'
node scripts/provision-mfa-e2e-factor.mjs
```

Il comando:

1. esegue login password tramite Supabase Auth;
2. rifiuta account che hanno già un fattore verificato non governato;
3. rimuove soltanto eventuali fattori TOTP incompleti/unverified;
4. crea un fattore TOTP con friendly name `Docente OS E2E MFA`;
5. mostra il seed **solo nel terminale locale**;
6. chiede il codice TOTP corrente;
7. esegue `challenge` + `verify` reali;
8. accetta il provisioning solo se Supabase restituisce `currentLevel=aal2`;
9. esegue sign-out.

Copiare il seed in un password manager prima di chiudere il terminale. Non eseguire questo comando in GitHub Actions.

## 3. Repository secrets GitHub

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Creare esattamente:

- `DOCENTE_OS_MFA_E2E_EMAIL`
- `DOCENTE_OS_MFA_E2E_PASSWORD`
- `DOCENTE_OS_MFA_E2E_TOTP_SECRET`

Il terzo valore è il seed Base32 mostrato dal provisioning locale, non il codice temporaneo a 6 cifre.

## 4. Gate browser

Rieseguire `MFA Browser AAL2 Gate` sullo stesso exact head candidato.

Il gate verifica realmente:

- password → sessione AAL1 → redirect `/mfa`;
- pagina operativa negata ad AAL1;
- API applicativa protetta → `403 mfa_required` ad AAL1;
- superficie recovery raggiungibile ad AAL1 ma incapace di bypassare MFA;
- codice TOTP errato respinto;
- codice TOTP valido → stessa sessione promossa ad AAL2;
- Planner accessibile dopo AAL2;
- API `/api/account/export-manifest` accessibile dopo AAL2;
- una nuova visita a `/mfa` da AAL2 ritorna all'app senza chiedere un secondo challenge.

## 5. Criterio di closure

V6.3.3 può passare a `CLOSED_VERIFIED` solo quando, sullo stesso implementation SHA:

- Product CI = PASS;
- MFA AAL2 Data Plane Contract = PASS;
- runtime Supabase isolato = PASS;
- MFA Browser AAL2 Gate = PASS con fixture dedicata;
- recovery non produce bypass;
- nessun test usa scorciatoie o fattori condivisi non governati.

La presenza dei secret da sola non costituisce evidenza di conformità: serve la receipt browser PASS.