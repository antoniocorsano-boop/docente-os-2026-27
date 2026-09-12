# DOCENTE OS — OWASP ASVS 5.0 Assurance

Data: **2026-09-12**  
Programma: **M5-04 — Security Assurance**  
Baseline: **OWASP ASVS 5.0.0 / tag v5.0.0**  
Target: **Verification Level 2**  
Stato: **PARTIAL / NO VERIFICATION CLAIM**

## 1. Decisione

DOCENTE OS adotta **OWASP Application Security Verification Standard 5.0.0** come baseline canonica per M5-04.

Il target di maturazione è **L2**, coerente con un'applicazione professionale autenticata che conserva dati e documenti del proprietario e usa servizi backend gestiti. Questo target è una direzione di assurance, **non una dichiarazione di verifica ASVS L2**.

La fonte standard è la release stabile `v5.0.0`; `master` non è usato come baseline perché è un ramo evolutivo.

Matrice machine-readable:

`ops/asvs50-assurance.json`

Validator:

`.github/scripts/validate-asvs50-assurance.mjs`

Gate:

`.github/workflows/asvs50-assurance.yml`

## 2. Regole di assurance

Fino alla chiusura della mappatura requisito-per-requisito:

- `verificationClaim=false`;
- `requirementLevelMappingComplete=false`;
- nessun capitolo può essere marcato `VERIFIED_PASS`;
- un requisito L1/L2 noto come gap non può essere rimosso o declassato senza receipt di chiusura;
- un controllo delegato a Supabase o all'infrastruttura gestita richiede evidenza provider/runtime, non una deduzione dal framework;
- `NOT_APPLICABLE_CURRENT_SCOPE` richiede una motivazione verificabile e deve essere riaperto se il perimetro cambia.

## 3. Perimetro

La baseline M5-04 riguarda il prodotto corrente:

`SINGLE_OWNER_TIER_1_PROFESSIONAL_NON_PERSONAL`.

Tier 2 scolastico/personale, multi-user istituzionale e nuove integrazioni di identità restano fuori dal perimetro autorizzato e richiederebbero una nuova valutazione ASVS.

## 4. Evidenze forti già presenti

### Web frontend security

Il runtime usa ora una **Content Security Policy request-scoped con nonce crittografico** attraverso `product/src/proxy.ts`, registrato da Next.js 16 come Proxy/Middleware.

La policy di produzione:

- propaga il nonce a Next.js e lo applica agli script framework;
- esclude `unsafe-inline` e `unsafe-eval` da `script-src`;
- usa `self`, nonce e `strict-dynamic` per il trust degli script;
- imposta `script-src-attr 'none'`;
- imposta `object-src 'none'` e `base-uri 'none'`;
- imposta `frame-ancestors 'none'` e `form-action 'self'`;
- limita `connect-src` all'origin Supabase configurato, al corrispondente WebSocket e all'origin TUS esatto `https://<project>.storage.supabase.co` derivato dal medesimo project ref, senza wildcard;
- limita `img-src` all'origin Supabase configurato quando applicabile;
- genera un nonce nuovo per ogni document request.

La suite Human + Visual Acceptance verifica nel browser l'header CSP, il nonce framework, la rotazione del nonce e l'assenza di violazioni CSP su desktop e mobile. K1 verifica inoltre che il percorso PDF >6 MiB attraversi il trasferimento resumable Supabase Storage sotto la stessa policy di produzione. Il requisito **V3.4.3 / ASVS-001 è `CLOSED_VERIFIED`** sull'implementation SHA `1498b675d7d8d9d897867317df3bf07193240833`.

### Autenticazione e sessioni

Il runtime usa Supabase Auth. Le decisioni server-side si basano su `supabase.auth.getClaims()` e non su una sessione client non verificata. Esistono flussi password, magic link, recovery, logout e rehearsal locale di refresh, invalidazione sessione e reset password.

### Autorizzazione

RLS è attiva nei domini persistenti principali, tra cui identità/workspace, Planner, Conoscenza, Piano annuale, Impostazioni e Orario. I repository server ricavano il subject autenticato dalle claims Supabase.

Questa è una base forte per V8, ma non equivale ancora alla verifica completa di tutte le regole function-level, data-level e field-level.

### File handling

L'upload Knowledge applica:

- limite di **20 MiB**;
- allowlist di MIME ammessi;
- sanitizzazione del filename;
- object path interno randomizzato;
- bucket separato e controllo di workspace;
- validazione fail-closed di **estensione + MIME + contenuto reale**;
- parsing effettivo per PDF e DOCX;
- firme binarie per PNG/JPEG/WebP;
- UTF-8 strict e rifiuto NUL/binary disguise per testo e Markdown;
- test negativi per mismatch e file camuffati;
- rilettura server-side dei blob caricati tramite percorso resumable prima dell'ammissione nella KB, con rimozione del blob incoerente.

Il controllo copre i tre ingressi esistenti — server action, API same-origin e percorso resumable verso Storage — e il client non costituisce l'autorità di sicurezza. Il requisito **V5.2.2 / ASVS-002 è `CLOSED_VERIFIED`** sull'implementation SHA `f0c5ee3b4b4995dec78836571584bc9f72e78890`; il capitolo V5 resta `PARTIAL` perché la mappatura requirement-level non è ancora completa.

### Dependency security

Il repository ha un workflow periodico e manuale di dependency security. La policy blocca vulnerabilità `HIGH`/`CRITICAL` sia nel grafo completo sia nelle dipendenze di produzione e usa il lockfile canonico.

### Recovery e incident management

Sono presenti rehearsal e contratti per Auth recovery, database restore, storage recovery e incident escalation. Il contratto incidente distingue SEV-1..SEV-4 e vieta di inserire segreti o dati personali scolastici reali nelle receipt.

## 5. Finding prioritari

### ASVS-001 — V3.4.3 — CSP

**Livello:** L2  
**Stato:** `CLOSED_VERIFIED`  
**Implementation SHA:** `1498b675d7d8d9d897867317df3bf07193240833`

La closure è fondata su CSP request-scoped con nonce, registrazione effettiva del Proxy Next.js, policy di produzione senza `unsafe-inline`/`unsafe-eval` per gli script, allowlist `connect-src` senza wildcard che include l'origin TUS esatto derivato dal project ref Supabase, prova browser permanente dell'header e dei nonce, e prova K1 del percorso resumable >6 MiB.

Receipt registrate in `ops/asvs50-assurance.json`:

- Product CI — run `34678320805`;
- Human + Visual Acceptance — run `34678320813`;
- P6 Performance Baseline — run `34678320851`;
- Design Policy Gate — run `34678320842`;
- WCAG 2.2 AA Assurance — run `34678320806`;
- Human Interaction Model — run `34678320833`;
- K1 Knowledge Upload Gate — run `34678320870`;
- ASVS 5.0 Assurance pre-closure — run `34678320823`.

La chiusura di V3.4.3 **non** trasforma V3 in `VERIFIED_PASS`, non completa M5-04A e non costituisce una dichiarazione di verifica ASVS L2.

### ASVS-002 — V5.2.2 — file content/type validation

**Livello:** L1  
**Stato:** `CLOSED_VERIFIED`

**Implementation SHA:** `f0c5ee3b4b4995dec78836571584bc9f72e78890`

La closure è fondata su validazione server-side del contenuto reale per tutti gli ingressi di upload, parser/signature coerenti con i tipi ammessi, test negativi e rilettura fail-closed dei blob resumable prima dell'ammissione nella KB.

Receipt registrate in `ops/asvs50-assurance.json`:

- Product CI — run `34674333510`;
- K1 Knowledge Upload Gate — run `34674333522`;
- P6 Performance Baseline — run `34674333530`;
- P7 Anonymization Input Guard — run `34674333531`;
- ASVS 5.0 Assurance — run `34674333504`;
- Design Policy Gate — run `34674333521`;
- Human Interaction Model — run `34674333487`.

La chiusura di V5.2.2 **non** trasforma V5 in `VERIFIED_PASS`, non completa M5-04A e non costituisce una dichiarazione di verifica ASVS L2.

### ASVS-003 — V6.3.3 — MFA

**Livello:** L2  
**Stato:** `OPEN_GAP`

I flussi correnti sono password e magic link email. Non è stata trovata implementazione di enrollment/challenge MFA, TOTP o AAL2.

Criterio di chiusura:

1. introdurre un fattore aggiuntivo o una combinazione conforme al requisito L2 per il perimetro protetto;
2. definire enrollment, challenge, recovery e revoca;
3. testare sessione e recovery senza introdurre bypass più deboli;
4. validazione umana del percorso di accesso e recupero.

MFA resta una slice separata perché modifica il percorso di autenticazione e recovery.

## 6. Capitoli inizialmente N/A

### V10 — OAuth and OIDC

`NOT_APPLICABLE_CURRENT_SCOPE` per il prodotto corrente: non è stata trovata un'integrazione OAuth/OIDC client/provider o social login. I flussi Auth correnti sono password e email magic link Supabase.

Se viene introdotto un IdP esterno, social login o OAuth/OIDC, V10 torna immediatamente applicabile.

### V17 — WebRTC

`NOT_APPLICABLE_CURRENT_SCOPE`: nessuna capability WebRTC, TURN o media server nel prodotto corrente.

## 7. Controlli provider-managed

V6, V7, V9, V11 e V12 contengono requisiti che possono dipendere in parte da Supabase e dall'infrastruttura di hosting.

Regola M5-04:

> provider-managed non significa automaticamente verified.

Per chiudere un requisito serve una delle seguenti evidenze:

- configurazione verificabile del provider;
- documentazione/versione provider applicabile al runtime;
- test runtime;
- receipt di configurazione/deploy;
- combinazione delle precedenti quando il requisito lo richiede.

## 8. M5-04A — ASVS mapping

M5-04A può diventare `COMPLETE` solo quando:

1. tutti i requisiti ASVS 5.0.0 applicabili a L1/L2 sono presenti nella mappatura requisito-per-requisito;
2. ciascuno ha stato ed evidenza;
3. tutti gli N/A hanno motivazione ancora valida;
4. non esistono `OPEN_GAP` L1/L2;
5. i controlli provider-managed hanno receipt appropriata;
6. il gate machine-readable è verde sull'exact head candidato.

Stato corrente: **PARTIAL**.

Le closure verificate di **V3.4.3** e **V5.2.2** riducono i finding prioritari aperti da tre a uno. **V6.3.3 / MFA resta aperto**, insieme alla mappatura requirement-level e alle receipt provider-managed ancora incomplete.

## 9. M5-04B — dependency/security cadence

La dependency-security cadence è già operativa e forte, ma la readiness M5 richiede ancora un roll-up security unico con:

- dipendenze;
- finding ASVS;
- incident/recovery evidence;
- eventuali finding runtime;
- stato delle closure.

Stato corrente: **PARTIAL**.

## 10. Ordine di chiusura raccomandato

1. preservare le closure **ASVS-001 / V3.4.3** e **ASVS-002 / V5.2.2** con i rispettivi regression gate;
2. progettare **ASVS-003 / V6.3.3 MFA** come slice separata perché modifica il percorso di autenticazione e recovery;
3. completare la mappatura requirement-level L1/L2;
4. produrre provider/runtime receipts per sessioni, token, TLS, crypto e configuration hardening;
5. rivalutare soltanto allora una possibile verification claim L2.

## 11. Regola anti-certification

Il repository può dichiarare che un controllo o requirement è stato verificato solo quando esiste una receipt specifica. La presenza di Supabase, RLS, HTTPS, un framework moderno o un workflow security non è sufficiente da sola a dichiarare conformità ASVS.
