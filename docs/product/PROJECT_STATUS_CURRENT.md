# DOCENTE OS — Stato corrente canonico

Data: **2026-09-14**  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti e gli audit datati restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline integrata corrente:

`develop` @ `c553feae62e70b23aa932077ec43ed76ce3b075b`

## 1. Classificazione

DOCENTE OS resta classificato:

**M4 — ADVANCED CONTROLLED PRODUCTION PILOT**

Il single-owner professional core è sostanzialmente completo. Il programma attivo resta **maintenance & maturation** verso M5, con una nuova priorità vincolante:

**UX-0 — PRODUCT SIMPLIFICATION / ACTIVE**

La chiusura di Account, TE-1 e dei gate tecnici non costituisce promozione M5. Il pilot reale ha evidenziato che il prodotto può essere localmente corretto ma globalmente troppo costoso cognitivamente.

Fonti correnti:

- `docs/product/SYSTEM_MATURITY_AUDIT_2026-09-12.md`;
- `docs/product/M5_READINESS_MATRIX_2026-09-12.md`;
- `docs/product/UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md`;
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md`;
- `product/design/HUMAN-EXPERIENCE-CONTRACT.md`.

## 2. Production e dati reali

Production resta separata da `develop` e governata come **SINGLE_OWNER_PILOT** tramite SHA immutabile certificato.

Un merge in `develop` non equivale a promozione in Production. Una nuova promozione richiede release candidate, gate applicabili, decisione umana e smoke post-deploy secondo M5-01.

### Ambito dati ammesso

È ammesso esclusivamente:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

Restano non ammessi senza gate separato:

- `TIER_2_SCHOOL_PERSONAL_DATA`;
- signup pubblico;
- onboarding multi-tenant;
- uso istituzionale multiutente;
- migrazione automatica Beta → Production.

## 3. Runtime e invarianti permanenti

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico di sviluppo: `develop`;
- promozione Production: `IMMUTABLE_CERTIFIED_SHA`;
- Vercel non è gate canonico;
- Beta operativa su Render;
- Netlify e la vecchia app statica root restano legacy/reference.

Invarianti:

- il docente conserva l'autorità sulle decisioni professionali;
- `TeachingSession` è la ricevuta autorevole dell'accaduto didattico;
- nessun automatismo promuove un blocco del Piano a `SVOLTO` senza autorità umana;
- Orario e Calendario restano domini distinti, composti tramite Temporal Projection;
- nessun dato Tier 2 viene ammesso implicitamente;
- **Product Model ≠ User Model**: le distinzioni di dominio non devono diventare automaticamente scelte o superfici che il docente deve capire.

## 4. Capability consolidate

### Product experience

- **X0 — COMPLETE**: fondazioni canoniche;
- **X1 — COMPLETE**: component foundation;
- **X2 — COMPLETE**: Professional AppShell;
- **X3 — COMPLETE** nel confine `READ_ONLY / PROPOSE`;
- **X4-A — COMPLETE / BETA-PROVEN**: Planner write assistita con conferma umana e undo;
- **X5-A — COMPLETE / BETA-PROVEN**: authoring UDA versionato;
- **X5-B — COMPLETE / BETA-PROVEN**: export professionale UDA;
- **UX-0 — ACTIVE**: semplificazione del core quotidiano;
- **X6 — FUTURE / NOT BASELINE**.

### Superfici disponibili in `develop`

- Home/Oggi;
- Planner/Attività;
- Classi e workspace di classe;
- Piano annuale;
- Progetta e UDA;
- Conoscenza con ingestione, trasformazione, provenance e generations;
- Orario;
- Calendario;
- registrazione lezione e TeachingSession;
- Impostazioni professionali;
- Account e sicurezza;
- libri di testo / risorse editoriali;
- assistente contestuale human-in-the-loop.

La presenza di una superficie non implica che debba avere rango primario nella navigazione ordinaria.

## 5. Account e sicurezza — CLOSED / CONSOLIDATED

La foundation MFA/AAL2 #346 è integrata come:

`b07596f7c2142becd32eb66ed195ecbf5ac6b24a`

La superficie Account #348 è stata certificata sull'exact head:

`41bb3c55c866c31c6b906382165f3c18821ec81e`

ed integrata come:

`77455d5f50bcccf2fed2cf5607dba3067fd81f97`

La capability comprende `/account`, `/account/mfa`, identità account, fattori TOTP, cambio password AAL2, revoca delle altre sessioni e logout corrente, mantenendo separati Account e Impostazioni professionali.

La closure non equivale a dichiarazione complessiva WCAG 2.2 AA o ASVS L2.

## 6. Teaching Core / Teaching Evidence — COMPLETE

Il percorso autorevole è ora:

**Prepara → Svolgi → Osserva → Registra**

Stato:

- #361 — Unified Registra semantics — merge `e87b8bb0a367fa78b6de4bdbca871e094dc65dd1`;
- #365 — TE-1A atomic Observation/Evidence — merge `0716482c337eb8c11395ba49f7491e12a6205555`;
- #366 — TE-1B UI binding — exact head `0371ce253dd7be63b80b518aa2e3834e0cc16174`, merge prodotto `8180aee707eeeb15e9863127f2df739746663e7d`;
- #367 — X3 governed AAL2 credentials — merge `c553feae62e70b23aa932077ec43ed76ce3b075b`;
- #351 — CLOSED / COMPLETED.

TE-1B preserva:

- checklist `Osserva` locali/non canoniche;
- una Observation professionale facoltativa di classe;
- privacy guard server-side sulla nota;
- draft locale protetto fino alla receipt;
- boundary TeachingSession semplice senza Observation;
- boundary atomico TeachingSession + Observation quando presente;
- nessuna `EvidenceReference` inventata;
- nessuna mutazione implicita di Piano/UDA;
- nessun Tier 2.

Certificazione:

- exact-head TE-1B: Product CI, ASVS, Dependency Security, DPG, HIM, Release Engineering, Queue Hygiene, WCAG, P6 e HVA PASS;
- post-merge prodotto `8180aee...`: P6 runtime PASS e HVA runtime PASS;
- post-fix `c553feae...`: X3 application PASS e X3 Render PASS con browser test reali ed evidence.

## 7. Design, Human Interaction e nuovo finding UX

DPG-2 resta **CLOSED / INTEGRATED**. La convergenza visuale non viene riaperta dal finding UX-0.

Human Interaction Model, HVA, mobile rules, WCAG assurance e Design Policy restano gate permanenti.

### Finding UX-0

La situazione reale osservata sulla Beta è:

> molte viste sono localmente comprensibili, ma il prodotto complessivo presenta troppe categorie e azioni concorrenti; alcune azioni corrette conducono a ulteriore complessità invece di ridurre il lavoro del docente.

Questo è classificato in M5 come:

**M5-02D — Task simplicity / cognitive burden — ACTIVE FINDING**

La fonte canonica è:

`docs/product/UX0_PRODUCT_SIMPLIFICATION_CANONICAL.md`

North star del core quotidiano:

**Oggi → Classe → Lezione → Fatto**

Il Product Model può restare ricco; il docente non deve comprenderlo per completare una journey ordinaria.

## 8. UX-0 — programma attivo

Issue canonica: **#368**.

Slice autorizzate:

- **UX-0A** — baseline task-cost + governance;
- **UX-0B** — information architecture / navigazione;
- **UX-0C** — workspace Classe task-first;
- **UX-0D** — chiusura lezione / Registra semplificata;
- **UX-0E** — materiali / Conoscenza / Progetta contestuali;
- **UX-0F** — HUMAN_USE validation.

Journey iniziali:

1. iniziare la giornata;
2. entrare in classe;
3. condurre una lezione;
4. chiudere/registrare una lezione;
5. preparare la successiva.

Task-cost da misurare:

- decisioni esplicite;
- azioni concorrenti visibili;
- surface transitions;
- concetti interni esposti;
- input obbligatori evitabili;
- recovery burden.

Target progettuali iniziali:

- prossimo passo identificabile entro 5 secondi;
- task comune con 1–2 decisioni esplicite prima dell'azione, escluse conferme professionali necessarie;
- una sola azione primaria per stato;
- zero concetti interni obbligatori.

La chiusura richiede HUMAN_USE M5-02, non soltanto machine gates.

## 9. Assurance e gate

Il prodotto dispone di:

- Product CI;
- Human Interaction Model;
- Human + Visual Acceptance;
- DPG-1 / DPG-2;
- P6 Performance Baseline;
- K1 Knowledge Upload;
- P7 Anonymization Input Guard;
- operational/dependency security;
- recovery/storage/incident gates;
- Release Engineering Policy — M5-01;
- Pilot Evidence Policy — M5-02;
- WCAG 2.2 AA Assurance — M5-03;
- OWASP ASVS 5.0 Assurance — M5-04;
- X3 E2E application + Render acceptance.

### M5-03 WCAG

La matrice A/AA e l'automazione esistono e i regression gate applicabili restano verdi. Restano criteri `MANUAL_REQUIRED`, audit keyboard/focus/reflow completo e baseline assistive technology.

**M5-03 non è COMPLETE e non esiste una dichiarazione complessiva di conformità WCAG 2.2 AA.**

### M5-04 ASVS

La foundation usa OWASP ASVS 5.0.0, target L2, con `verificationClaim=false` e requirement-level mapping ancora incompleta.

Le closure prioritarie già verificate non equivalgono a una verifica ASVS L2 complessiva.

## 10. Maturity program M5

Stato gate sintetico:

- **M5-00** — Canonical State & Maturity Baseline — COMPLETE;
- **M5-01A/B/C** — hygiene/versioning/RC — COMPLETE;
- **M5-01D** — reale release/changelog — PARTIAL;
- **M5-02A/B/C** — sustained pilot evidence — PARTIAL;
- **M5-02D** — task simplicity / cognitive burden — ACTIVE FINDING;
- **M5-03A/B** — WCAG matrix/manual interaction — PARTIAL;
- **M5-03C** — assistive technology — OPEN;
- **M5-04A/B** — ASVS mapping/security cadence — PARTIAL;
- **M5-05** — SLI/SLO & observability — OPEN/PARTIAL;
- **M5-06** — Drive/Canva runtime continuity; Arena conditional — PARTIAL;
- **M5-07** — Tier 2 / multi-user / institutional — CONDITIONAL / NOT AUTHORIZED.

## 11. Priorità operative

1. chiudere **UX-0A** come baseline canonica;
2. procedere con **UX-0B information architecture**, senza rimuovere capability e senza cambiare dominio;
3. semplificare **Classe** in UX-0C prima di nuove espansioni;
4. semplificare il gesto **Registra** in UX-0D mantenendo i boundary TE-1;
5. rendere materiali/Conoscenza/Progetta capability contestuali in UX-0E;
6. raccogliere HUMAN_USE e task-cost prima/dopo in UX-0F/M5-02;
7. completare M5-03 e M5-04 senza false claim;
8. definire SLI/SLO solo dopo baseline osservata;
9. maturare Drive/Canva quando riducono davvero il costo del task;
10. mantenere Tier 2, multi-user e nuove feature fuori baseline senza decisione esplicita.

## 12. Regola anti-feature-creep

Durante M5 ogni nuova feature deve essere classificata come:

- `MATURITY_REQUIRED`;
- `PILOT_REQUIRED`;
- `PROFESSIONAL_GAP_CONFIRMED`;
- `DEFERRED`.

Durante UX-0 una capability non è considerata miglioramento se introduce una nuova scelta primaria quando può essere assorbita da un task esistente.

Il default in assenza di evidenza è **DEFERRED**.