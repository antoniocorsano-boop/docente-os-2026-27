# TRAMA — STAGE-B-AUTH-01

**Stato:** AUTHORIZATION_CANDIDATE  
**Autorizzazione corrente:** REVIEW_ONLY  
**Runtime implementation authorized:** NO  
**Human review:** PENDING  
**Canonical plan:** `docs/governance/TRAMA-STAGE-B-PLAN-01.md`  
**Canonical Docente OS baseline:** `develop@1d4fb3f9888c7a4161b6fa13863215499b803b0b`  
**TRAMA contract:** `TRAMA-COMPONENT-PATTERN-01`  
**DOS-A1:** `RUNTIME_DEFERRED`

## 1. Oggetto dell'autorizzazione candidata

Questa autorizzazione candidata riguarda esclusivamente l'implementazione futura della prima fetta Stage B già approvata nel piano canonico:

`Docente OS → /impostazioni → Cattedra → singolo TeachingAssignment → Conferma / Rimetti da controllare`.

Non autorizza ancora alcuna modifica runtime. Serve a congelare il perimetro e i gate che dovranno essere revisionati e approvati prima di creare il ramo di implementazione.

## 2. Baseline e invalidazione

La baseline autorizzabile è `develop@1d4fb3f9888c7a4161b6fa13863215499b803b0b`.

Prima dell'implementazione deve essere verificato che la superficie Cattedra/TeachingAssignment e i relativi contratti di persistenza non siano cambiati. Qualunque drift sostanziale invalida l'autorizzazione e richiede nuova revisione.

## 3. Perimetro runtime massimo

Sono autorizzabili soltanto:

- adattamento locale dell'interazione `Conferma` / `Rimetti da controllare` del singolo `TeachingAssignment`;
- stato pending percettibile e blocco del comando consequenziale durante la transizione;
- feedback percettibile di successo, errore e conflitto/stato obsoleto;
- binding atomico della mutazione allo stato/revisione osservati;
- protezione lato server da richieste ripetute o concorrenti;
- test automatici e verifiche accessibilità/responsive strettamente relativi alla fetta;
- mapping locale ai token/PVIP di Docente OS senza normalizzazione visiva degli altri prodotti.

## 4. Vincolo di concorrenza

La futura implementazione deve sostituire l'aggiornamento incondizionato con un compare-and-set equivalente vincolato almeno a:

`id + workspace + academicYear + expectedStatus + expectedUpdatedAt`.

Zero righe mutate per mancata corrispondenza dello stato/revisione deve produrre un esito `STALE_CONFLICT`, mai successo.

La sola disabilitazione del pulsante lato client non costituisce protezione sufficiente contro richieste concorrenti.

## 5. Confine di persistenza

Questa autorizzazione candidata NON comprende:

- migrazioni schema;
- nuove RPC;
- nuovi trigger;
- token di richiesta persistiti;
- modifica delle policy RLS;
- modifica del contratto canonico `TeachingAssignment`.

Se una di queste modifiche risultasse necessaria, l'implementazione deve fermarsi e tornare a governance. Non può ampliare implicitamente il perimetro.

## 6. Pattern autorizzabili

La fetta può implementare esclusivamente le semantiche già qualificate:

- `TRAMA.REVIEW_DECIDE_CONFIRM`;
- `TRAMA.STATUS_MESSAGE`;
- `TRAMA.LOADING_PENDING_PROGRESS`;
- `TRAMA.ERROR_RECOVERY`.

`TRAMA.EMPTY_STATE` e `TRAMA.OFFLINE_DEGRADED` restano fuori perimetro. Nessuna promessa di continuità offline è autorizzata.

## 7. Divieti espliciti

Restano vietati:

- conferma automatica o implicita;
- retry silenzioso di una mutazione consequenziale;
- falso successo;
- sovrascrittura di stato obsoleto;
- modifica di conferma classe o monte ore;
- modifica di lezioni, calendario o curriculum;
- modifica di Arena, Atlas o Centro di controllo;
- refactoring generale di Docente OS;
- migrazione generale del design system;
- nuove dipendenze da profilo docente server-side;
- nuovi dati studente o tracking;
- attivazione DOS-A1;
- promozione `STABLE`.

## 8. Gate automatici minimi

Prima di qualunque decisione di adozione della futura implementazione devono passare almeno:

- test positivo `PROVISIONAL → CONFIRMED` con revisione corrispondente;
- test positivo `CONFIRMED → PROVISIONAL` con revisione corrispondente;
- stale confirm fail-closed;
- stale reopen fail-closed;
- doppio invio durante pending senza doppio effetto;
- richieste concorrenti sulla stessa revisione senza esiti incompatibili;
- errore repository senza falso successo;
- recovery da stale senza reinvio automatico;
- assignment fuori workspace/anno senza mutazione;
- stato/token inatteso fail-closed;
- regressione `/impostazioni`;
- regressione `/orario`;
- regressione home `/`;
- conferma classe e monte ore invariati.

## 9. Gate umani e accessibilità

La futura implementazione richiede verifica umana almeno su desktop e smartphone per:

- decisione esplicita e comprensibile;
- pending chiaramente percepibile;
- successo, errore e conflitto distinguibili;
- focus prevedibile dopo l'esito;
- completamento da tastiera;
- semantica per lettore di schermo;
- riflusso al 200%;
- azioni primarie non tagliate su smartphone;
- target tattili utilizzabili;
- stato non comunicato soltanto tramite colore.

## 10. Rollback

L'implementazione deve essere revertibile come unità `SINGLE_TEACHING_ASSIGNMENT_CONFIRM_REOPEN`, senza revertire il piano governato, senza modificare il modello canonico `TeachingAssignment` e senza coinvolgere modifiche Docente OS estranee.

Qualunque scope escape, fallimento di accettazione o necessità di cambiare il contratto di persistenza blocca l'adozione.

## 11. Sequenza governata

1. revisione indipendente di questo exact authorization head;
2. decisione umana sull'autorizzazione;
3. merge dell'autorizzazione governata in `develop`;
4. nuova verifica della baseline canonica e delle PR concorrenti;
5. solo allora creazione del ramo runtime dedicato;
6. implementazione strettamente nel perimetro autorizzato;
7. prove automatiche, evidenze e revisione indipendente dell'exact runtime head;
8. verifica umana desktop/smartphone;
9. decisione umana separata sull'adozione runtime.

**Decisione corrente:** `AUTHORIZATION_CANDIDATE`  
**Runtime implementation:** `NOT_AUTHORIZED`  
**Human review:** `PENDING`
