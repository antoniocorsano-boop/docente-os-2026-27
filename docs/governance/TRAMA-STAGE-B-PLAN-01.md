# TRAMA — STAGE-B-PLAN-01

**Stato:** PLAN_CANDIDATE_R2  
**Autorizzazione:** PLANNING_ONLY  
**Runtime change authorized:** NO  
**Human review:** PENDING  
**TRAMA contract:** TRAMA-COMPONENT-PATTERN-01  
**TRAMA source baseline:** `4d679a6a6e0fc2f80b4026fa4000a65dba083001`  
**Docente OS canonical baseline:** `develop@89826e4e6ff9e82dcf0c8105595ce36723941eea`  
**DOS-A1:** RUNTIME_DEFERRED

## 1. Prima fetta Stage B

La prima fetta proposta è limitata a:

`Docente OS → /impostazioni → Cattedra → singolo TeachingAssignment → Conferma / Rimetti da controllare`.

Sono incluse esclusivamente le transizioni di un `TeachingAssignment` esistente:

- `PROVISIONAL → CONFIRMED` tramite azione esplicita **Conferma**;
- `CONFIRMED → PROVISIONAL` tramite azione esplicita **Rimetti da controllare**.

Sono fuori perimetro: conferma classe, modifica monte ore settimanale, aggiunta/rimozione assegnazioni, stato disciplina, lezioni, calendario, curriculum, Arena, Atlas, Centro di controllo, PWA/offline, DOS-A1 e migrazione generale del design system.

## 2. Pattern Stage A.2 consumati

La fetta può consumare esclusivamente i pattern già qualificati:

- `TRAMA.REVIEW_DECIDE_CONFIRM`;
- `TRAMA.STATUS_MESSAGE`;
- `TRAMA.LOADING_PENDING_PROGRESS`;
- `TRAMA.ERROR_RECOVERY`.

`TRAMA.EMPTY_STATE` e `TRAMA.OFFLINE_DEGRADED` non sono autorizzati né necessari per questa fetta. Nessuna resilienza offline può essere dichiarata.

## 3. Fatti runtime verificati sulla baseline

Sulla baseline Docente OS indicata:

- la Cattedra espone azioni esplicite di conferma e riapertura;
- `confirmSettingsTeachingAssignment` richiede lo stato `CONFIRMED`;
- `reopenSettingsTeachingAssignment` richiede lo stato `PROVISIONAL`;
- il repository corrente aggiorna per `assignmentId + workspaceId + academicYearId` e stato desiderato;
- l'aggiornamento corrente non è vincolato a `expectedStatus` né a `expectedUpdatedAt`;
- `TeachingAssignment` dispone di `updatedAt` e la persistenza dispone di `updated_at` aggiornato dal database;
- l'esistenza di `updatedAt` non costituisce prova di concorrenza ottimistica già implementata;
- Cattedra e Orario condividono il medesimo modello canonico `TeachingAssignment`.

Non sono attualmente dimostrati: rifiuto dello stato obsoleto, protezione server-side da richieste concorrenti, stato pending percettibile, esito successo/errore/conflitto annunciato e idempotenza sotto concorrenza.

## 4. Contratto di transizione richiesto

### Stato revisionato

Prima della decisione devono essere disponibili identità dell'assegnazione, stato corrente, dati necessari alla comprensione della Cattedra e un token affidabile della revisione osservata.

### Decisione esplicita

Solo l'attivazione volontaria di **Conferma** o **Rimetti da controllare** può iniziare la transizione. Navigazione, rendering, timeout, valore predefinito, recupero o retry non possono decidere per il docente.

### Pending e doppio invio

Dopo l'attivazione, la specifica transizione entra immediatamente in stato pending percettibile e il relativo comando consequenziale viene disabilitato fino all'esito terminale. La protezione lato interfaccia non è sufficiente: anche richieste ripetute o concorrenti lato server devono essere sicure.

### Binding e concorrenza

La mutazione deve essere atomicamente condizionata allo stato effettivamente revisionato dal docente. L'implementazione deve usare un compare-and-set equivalente basato almeno su:

`id + workspace + academicYear + expectedStatus + expectedUpdatedAt`

o un meccanismo database più forte e governato.

Un aggiornamento incondizionato non è accettabile. Zero righe aggiornate per mancata corrispondenza dello stato/revisione deve essere trattato come **conflitto/stato obsoleto**, non come successo.

### Esiti

- **Successo:** mostrato solo dopo conferma della mutazione condizionale; il nuovo stato è percepibile e riferito all'assegnazione interessata.
- **Conflitto/stato obsoleto:** nessuna sovrascrittura; il docente riceve un messaggio percettibile e deve riesaminare lo stato corrente prima di una nuova decisione.
- **Errore:** mai rappresentato come successo; nessun retry silenzioso consequenziale.
- **Recupero:** può aggiornare lo stato corrente, ma non può confermare o riaprire automaticamente.

## 5. Confine di persistenza

Questa pianificazione non autorizza una migrazione dello schema o un nuovo contratto di persistenza.

È consentito progettare il compare-and-set usando i campi già esistenti soltanto se l'atomicità è dimostrabile con la persistenza corrente. Se risultano necessari schema migration, RPC, trigger aggiuntivi, request token persistito o altra modifica del contratto dati, l'implementazione deve fermarsi e tornare a governance prima di procedere.

## 6. Preservazione PVIP e teacher-first

Devono essere preservati:

- autorità esplicita del docente;
- identità e architettura informativa di Docente OS;
- attribuzione del feedback allo specifico `TeachingAssignment`;
- assenza di nuove dipendenze da identità docente lato server;
- assenza di dati studenti o tracking aggiuntivo.

Sono vietati shell TRAMA generico, copia dell'identità visiva Arena/Atlas, approvazione automatica, falso successo, retry silenzioso e refactoring estesi giustificati soltanto dall'adozione del design system.

## 7. Regressione obbligatoria

Poiché la Cattedra canonica alimenta anche altre superfici, l'accettazione deve verificare esplicitamente:

- `/impostazioni` — Cattedra e azioni adiacenti non incluse nella fetta;
- `/orario` — nessuna regressione nella lettura/uso del `TeachingAssignment` aggiornato;
- `/` — nessuna regressione derivante dalla revalidazione della home;
- conferma classe invariata;
- modifica monte ore invariata;
- flussi lezione, calendario e curriculum invariati.

La regressione di `/orario` è un gate obbligatorio, non opzionale.

## 8. Prove minime richieste

### Positive

- conferma da `PROVISIONAL` con revisione corrispondente;
- riapertura da `CONFIRMED` con revisione corrispondente;
- successo annunciato soltanto dopo commit della transizione.

### Negative / fail-closed

- conferma contro revisione già cambiata → conflitto, nessuna sovrascrittura;
- riapertura contro revisione già cambiata → conflitto, nessuna sovrascrittura;
- doppio clic durante pending → una sola transizione effettiva;
- due richieste concorrenti sulla stessa revisione non possono produrre esiti consequenziali incompatibili;
- errore repository → errore percettibile e nessun falso successo;
- recupero da stale → refresh/riesame senza reinvio automatico;
- assegnazione fuori workspace/anno → nessuna mutazione;
- stato/token inatteso → fail-closed.

### Accessibilità e responsive

- completamento solo tastiera;
- semantica per lettore di schermo su decisione, pending ed esito;
- riflusso al 200% senza perdita delle azioni;
- smartphone senza azioni primarie tagliate;
- target tattili utilizzabili;
- pending/disabilitazione non comunicati soltanto tramite colore;
- focus prevedibile e mantenuto nel contesto dell'assegnazione dopo l'esito.

## 9. Rollback

L'unità di rollback è esclusivamente `SINGLE_TEACHING_ASSIGNMENT_CONFIRM_REOPEN`.

L'implementazione futura deve poter essere revertita senza rimuovere gli artefatti Stage A, senza revertire modifiche Docente OS estranee e senza alterare il modello canonico `TeachingAssignment`.

Qualunque fuga di perimetro, modifica non autorizzata della persistenza o fallimento dei criteri di accettazione blocca l'adozione e richiede rollback prima di qualsiasi espansione.

## 10. Lavoro parallelo e baseline

Il piano è vincolato a `Docente OS develop@89826e4e6ff9e82dcf0c8105595ce36723941eea`.

Prima dell'implementazione runtime deve essere verificato nuovamente che `develop` e le PR concorrenti non abbiano modificato la superficie Cattedra/TeachingAssignment. Un cambio sostanziale della baseline invalida l'assunzione di non impatto e richiede nuova revisione del piano.

Il lavoro parallelo `DOS-TT-IMPORT-01` non è assorbito né autorizzato da questo piano.

## 11. Gate successivi

1. revisione indipendente di questo exact plan head;
2. decisione umana sul piano;
3. solo dopo PASS, eventuale PR di pianificazione verso `develop`;
4. autorizzazione Stage B separata prima di qualsiasi modifica runtime;
5. ramo runtime dedicato e vincolato alla baseline autorizzata;
6. prove automatiche + evidenze runtime;
7. verifica umana desktop/smartphone;
8. nessuna espansione automatica ad altre superfici.

**Decisione corrente:** `PLAN_CANDIDATE_R2`  
**Human review:** `PENDING`  
**Runtime migration:** `FORBIDDEN_UNTIL_SEPARATE_STAGE_B_AUTHORIZATION`
