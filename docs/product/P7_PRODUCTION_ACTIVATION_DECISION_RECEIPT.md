# DOCENTE OS — P7 Production Activation Decision Receipt

Data decisione: **2026-08-25**  
Gate: `P7-PRODUCTION-ACTIVATION-DECISION`  
Esito: **AUTHORIZE_SINGLE_OWNER_PILOT**

## Decisione umana

È stata fornita un'autorizzazione umana esplicita all'attivazione della Production nel solo perimetro `SINGLE_OWNER_PILOT` / `named_owner_only`.

Questa decisione **non equivale ancora a Production ACTIVE**. Lo stato successivo alla decisione è:

`AUTHORIZED_PENDING_DEPLOY`

## Candidato autorizzato

- branch sorgente: `develop`;
- repository head al momento della decisione: `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`;
- ultimo SHA che modifica `product/`: `0959c37e14e0224232f5040cb577c6332bd193fb`;
- `db3d4ab...` è product-equivalent a `0959c37...` per il codice applicativo;
- precedente SHA Production verificato: `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`.

## Readiness alla decisione

- activation blocker tecnici: **0**;
- Production Readiness Review sul merge P7 finale: **PASS**, run `32892644910`;
- Security baseline: **SATISFIED**;
- Beta runtime gates: **SATISFIED** nel registro canonico;
- DB/Auth/Storage recovery: **SATISFIED**;
- R2 EU persistent destination: **SATISFIED**;
- Bucket Lock `production/`, 90 giorni: **SATISFIED**.

## Vincoli invarianti

Restano vietati fino alla chiusura del gate di promozione:

- accettazione di dati professionali reali;
- signup pubblico;
- onboarding multi-tenant;
- copia automatica Beta → Production;
- riuso delle credenziali Beta;
- auto-deploy Production.

## Prossimo gate

`P7-PRODUCTION-PROMOTION`

Deve distribuire lo SHA immutabile autorizzato su Render Production e concludersi con un **authenticated non-mutating post-promotion smoke PASS**. Solo dopo tale prova potrà essere prodotta una release receipt finale e lo stato potrà passare da `AUTHORIZED_PENDING_DEPLOY` ad `ACTIVE_SINGLE_OWNER_PILOT`.
