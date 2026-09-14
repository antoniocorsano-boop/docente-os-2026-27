# DOCENTE OS — M5-01A Repository Hygiene — Closure Receipt

Data: **2026-09-14**  
Baseline ispezionata: `develop` @ `77455d5f50bcccf2fed2cf5607dba3067fd81f97`  
Issue di tracciamento: **#362**  
Stato: **COMPLETE — CLASSIFICATION CLOSURE**

## 1. Criterio di chiusura

M5-01A è chiuso quando nessuna pull request aperta resta ambigua: ogni PR deve essere classificata come lavoro candidato reale, lavoro stacked deliberato, lavoro rinviato con motivazione oppure checkpoint professionale; le PR storiche superate devono essere chiuse senza merge.

La chiusura di M5-01A **non autorizza** automaticamente merge, deploy o promozioni. Ogni candidato attivo conserva i propri gate final-head.

## 2. Chiusura Account e sicurezza

L'intermezzo security/account 0.1 → 0.4 è completato:

- MFA/AAL2 foundation **#346** integrata in `develop` come `b07596f7c2142becd32eb66ed195ecbf5ac6b24a`;
- Account e sicurezza **#348** certificata sull'exact head `41bb3c55c866c31c6b906382165f3c18821ec81e`;
- #348 integrata in `develop` come `77455d5f50bcccf2fed2cf5607dba3067fd81f97`;
- issue **#347** chiusa con closure evidence;
- HVA finale: 24/24 osservazioni, 10 journey, `/account` e `/account/mfa` mobile+desktop, CTA MFA mobile verificata libera dalla bottom navigation.

Account e sicurezza è quindi una capability consolidata in `develop`. Questo non equivale a promozione automatica in Production.

## 3. Pull request chiuse come superate

Durante la hygiene sono state chiuse senza merge:

- **#360** — `SUPERSEDED_BY_361`: la convergenza TeachingSession è ora concentrata nel candidato #361;
- **#254** — `SUPERSEDED_BY_M5_CANONICAL_STATE`: piano di stabilizzazione storico sostituito dal canone M5 corrente;
- **#286** — `SUPERSEDED_BY_CURRENT_DAILY_JOURNEY`: principi UX assorbiti dalle superfici Home/Oggi/Classe correnti;
- **#255** — `SUPERSEDED_BY_C2P_03`: contratto same-version revalidation assorbito nello stack C2P-03;
- **#251** — `SUPERSEDED_BY_DPG2_WCAG_BASELINE`: finding UI/accessibilità assorbiti dalla baseline DPG-2/HIM/HVA/WCAG.

Restano inoltre valide le precedenti chiusure DPG-2 #328/#329/#330/#331/#332/#334 come `SUPERSEDED`.

## 4. Candidati attivi di maturazione

Restano aperti perché contengono lavoro reale non assorbito:

- **#361** — `ACTIVE_CANDIDATE / MATURITY_REQUIRED`: unica convergenza autorizzata della semantica «Registra la lezione» su TeachingSession; merge solo dopo final-head gate e verifica interattiva;
- **#262** — `ACTIVE_CANDIDATE / MATURITY_REQUIRED`: fail-closed sulla risoluzione plesso MIM; richiede rebase e ricertificazione;
- **#259** — `ACTIVE_CANDIDATE / MATURITY_REQUIRED`: hardening server-side del Calendario; richiede rebase e ricertificazione;
- **#234** — `ACTIVE_CANDIDATE / GOVERNANCE_RECONCILIATION_REQUIRED`: la promozione P7 DOCX-media non è assorbita dal contratto corrente (`schemaVersion: 6`); occorre riconciliare governance e runtime sulla baseline corrente;
- **#170** — `ACTIVE_CANDIDATE / MATURITY_REQUIRED`: bounded search Conoscenza/P6; prima del rebase va verificato che il delta non sia stato sostituito da evoluzioni successive;
- **#261** — `ACTIVE_CANDIDATE / REBASE_REQUIRED`: allineamento temporale dell'A.S. 2026/27; verificare i riferimenti scolastici correnti prima dell'integrazione.

## 5. Stack deliberatamente vivo

### Teaching Evidence

- **#350** — `STACKED_LIVE / BLOCKED`: fondazione TE-0, senza persistenza Observation; resta bloccata dalla chiusura della convergenza #361.

### Curriculum-to-Practice

Restano `STACKED_LIVE`, senza autorizzazione a merge/deploy isolato:

- **#298** — C2P-00;
- **#299** — C2P-01;
- **#300** — C2P-03;
- **#301** — C2P-04;
- **#302** — C2P-05;
- **#303** — C2P-06;
- **#304** — C2P-07;
- **#305** — C2P-09;
- **#306** — C2P-10 evidence;
- **#307** — C2P-10 preflight.

Lo stack C2P è intenzionalmente conservato come lavoro tecnico/governance non ancora promosso nella baseline.

## 6. Lavoro rinviato

- **#311** — `DEFERRED / PILOT_REQUIRED`: supporto generativo in classe; riattivare solo se il pilot ne dimostra il bisogno;
- **#260** — `DEFERRED / PILOT_REQUIRED`: orizzonte operativo Home; riattivare solo da attrito osservato M5-02;
- **#252** — `DEFERRED / EXTERNAL_REFERENCE`: AILit; non requisito corrente di maturazione;
- **#86** — `DEFERRED / HUMAN_DECISION_REQUIRED`: checkpoint professionale su evidenza trasversale vs riallocazione oraria UDA 2-03/2-06.

## 7. Esito M5-01A

Il criterio di repository hygiene è soddisfatto:

- nessuna PR aperta resta non classificata;
- il lavoro vivo non è stato chiuso meccanicamente;
- le PR superate sono state rimosse dalla coda senza merge;
- candidati attivi, stack deliberati e lavoro rinviato sono separati esplicitamente;
- la classificazione è tracciata anche nei thread delle singole PR.

**M5-01A — COMPLETE.**

Il mantenimento della hygiene resta una regola permanente: ogni nuova PR deve entrare nella coda con una classificazione intenzionale e non può diventare debito storico ambiguo.