# Docente OS — DPG-1 Design Policy Gate

Data: 2026-09-11  
Stato: CANONICAL IMPLEMENTATION CONTRACT  
Classificazione: `COMPATIBLE`

## 1. Scopo

DPG-1 trasforma `DESIGN_GOVERNANCE_CANONICAL.md` da sola governance normativa in governance **verificabile prima del merge**. Non pretende di automatizzare il giudizio estetico: separa ciò che è deterministico da ciò che richiede osservazione Human + Visual Acceptance.

## 2. Principio

Una regola viene considerata realmente governata quando ha almeno uno dei seguenti meccanismi:

1. **enforcement statico bloccante**;
2. **componente/token canonico che impedisce varianti locali**;
3. **controllo browser automatico**;
4. **criterio HVA esplicito con evidenza e ricevuta**;
5. **invariante di dominio/human-in-the-loop** per ciò che il design non può alterare.

Nessuna regola qualitativa deve essere dichiarata automaticamente `PASS` senza un segnale osservabile affidabile.

## 3. Enforcement statico DPG-1

Il workflow `.github/workflows/design-policy.yml` esegue `product/scripts/design/design-policy.mjs` sul diff della PR verso `develop`.

Sono bloccanti:

- **DPG-01 — simbolo canonico:** nessuna seconda definizione locale della geometria/parti del marchio; root app icon e app icon runtime devono restare equivalenti;
- **DPG-04 — palette semantica:** nuovi colori raw sono vietati nelle superfici runtime fuori dai file canonici di token/brand;
- **DPG-13 — motion:** nuovo motion richiede un contratto `prefers-reduced-motion` nel file di stile interessato;
- **DPG-14 — iconografia:** non possono essere introdotte librerie di icone alternative al set funzionale canonico;
- **DPG-19 — niente varianti locali:** nuovi token visuali di colore/raggio/ombra non possono essere definiti localmente fuori dai file canonici;
- **DPG-20 — evoluzione governata:** ogni PR che modifica una superficie visuale runtime deve dichiarare `COMPATIBLE`, `SUPERSEDING` o `BREAKING` nel corpo della PR.

Effetti decorativi come blur/drop-shadow/backdrop-filter generano `WATCH`, non un falso giudizio estetico automatico: devono essere giustificati in HVA.

## 4. Regole affidate a HVA

La ricevuta HVA deve chiedere esplicitamente un giudizio sulle regole che richiedono contesto e percezione:

- **DPG-05** una sola azione primaria realmente dominante;
- **DPG-06** gerarchia titolo → contesto → stato → azione → contenuto;
- **DPG-07** calma professionale delle superfici;
- **DPG-08** tipografia editoriale/operativa;
- **DPG-09** mobile-first e fruibilità 360–430 px;
- **DPG-10** navigazione che conserva il contesto;
- **DPG-11** stati espressi con parole umane;
- **DPG-12** loading coerente con la ricomposizione del contesto;
- **DPG-15** copy professionale e non sostitutivo della decisione umana;
- **DPG-16** Home orientata alla realtà della giornata;
- **DPG-17** prominenza visuale non altera l'autorità dei dati;
- **DPG-18** accessibilità percepibile e verificabile.

Overflow, errori browser/rete e target mobili restano anche controllati automaticamente dalla suite HVA esistente.

## 5. Regole governate soprattutto da struttura

- **DPG-02** varianti marchio: componente canonico `DocenteOsMark`/`DocenteOsLockup`;
- **DPG-03** significato del brand: `BRAND_IDENTITY_CANONICAL.md` + HVA;
- **DPG-17** autorità dati: invarianti dominio/human-in-the-loop + HVA;
- **DPG-20** protocollo evolutivo: classificazione PR + documentazione canonica.

## 6. Politica incrementale

DPG-1 controlla **le nuove aggiunte nel diff** invece di dichiarare improvvisamente illegittimo tutto il debito visuale storico. Questo consente di irrigidire il sistema senza bloccare il prodotto per codice precedente.

Il debito preesistente va eliminato progressivamente; nessuna nuova modifica può aumentarlo.

## 7. Ricevute

Ogni run DPG-1 produce:

- `product/test-results/design-policy/design-policy.json`;
- `product/test-results/design-policy/design-policy.md`.

La ricevuta elenca base/head, file visuali modificati, violazioni bloccanti, WATCH e distinzione tra regole automatiche e regole delegate a HVA.

## 8. Evoluzione

DPG-1 è il primo enforcement. DPG-2 potrà aggiungere, solo con segnali sufficientemente affidabili:

- controllo token via AST/CSS parser;
- test contrasto automatizzato sulle superfici critiche;
- audit accessibilità browser più profondo;
- verifica della CTA primaria per componenti con contratto esplicito;
- visual regression mirata per simbolo e primitive stabili.

L'automazione non deve trasformare criteri qualitativi in metriche arbitrarie pur di dichiararli “controllati”.
