# DOS-TT-IMPORT-01 — G1.6-F Legacy G1.2 Reconciliation

## Stato
**RECONCILIATION / QUARANTINE CONTRACT — NO RUNTIME CHANGE**

Baseline: `develop@93b348889c41c2e47fbae461a6007dfe8f5be2ad`.

## Finding bloccante
La catena G1.6-A→E è non applicativa e mantiene `HOLD_PRODUCTION_APPLY`.

Nel runtime storico G1.2 esiste tuttavia ancora:

`public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)`

Le migrazioni G1.2 concedono `EXECUTE` al ruolo `authenticated`, e il test DB G1.2 n.10 richiede esplicitamente che tale capability sia esposta.

Non è stato trovato un Server Action/UI consumer corrente della RPC. Questo riduce l'esposizione applicativa ma non elimina la capability DB.

**Conclusione:** G1.2 è `LEGACY_QUARANTINED`, non autorità per A–E e non utilizzabile per collegare G1.6-E alla DRAFT.

## Divergenze semantiche
G1.2 usa concetti non adottati dalla catena corrente:
- candidato DB con `candidate_revision`;
- `confidence` e `AUTO_RESOLVED`;
- `proposed_slot_kind`, inclusi tipi fuori scope dell'import corrente;
- `DifferencePlan` con KEEP/ADD/MOVE/CHANGE/REMOVE/IGNORE;
- `confirmation_request_id` che porta direttamente ad apply;
- receipt di apply;
- RPC mutativa verso la DRAFT.

G1.6-C/D/E usa invece:
- identità deterministica `candidateId` legata a contenuto + effectiveFrom + slot canonici;
- tri-state teacher evidence governata da G1.6-A/B;
- preview read-only G1.6-D;
- receipt di decisione G1.6-E esplicitamente non applicativa.

Nessun adapter implicito tra i due modelli è ammesso.

## Regola di quarantena
Finché una remediation DB separata non è approvata:
1. nessun nuovo codice può invocare `apply_timetable_import_to_draft`;
2. nessun Server Action/repository/client può trasformare un receipt G1.6-E in parametri G1.2;
3. `CONFIRM_PREVIEW` non può essere interpretato come `confirmation_request_id` o autorizzazione di apply;
4. nessuna nuova UI deve esporre apply/import-to-DRAFT tramite G1.2;
5. G1.2 non determina semantica, stati o tipi della pipeline A–E.

## Remediation successiva richiesta
La revoca o sostituzione della capability DB è una **slice runtime separata** perché modifica privilegi già migrati.

La remediation deve almeno:
- verificare su database migrato l'effettiva presenza/privilegio della RPC;
- introdurre una nuova migrazione forward-only, mai modificare retroattivamente 0020/0021;
- revocare `EXECUTE` da `authenticated` sulla RPC legacy finché non esiste un nuovo boundary applicativo governato;
- aggiornare il test DB che oggi considera l'esposizione un requisito;
- dimostrare che editing manuale dell'orario e lifecycle T1 restano invariati;
- non eliminare tabelle/receipt legacy finché retention/audit e dipendenze non sono qualificate;
- non collegare automaticamente G1.6-E alla DRAFT;
- mantenere `HOLD_PRODUCTION_APPLY` dopo la revoca.

## Gate prima della remediation DB
- inventario consumer completo;
- verifica privilegi su schema/migrazioni;
- analisi dipendenze SQL;
- piano rollback/forward-only;
- test negativo: authenticated non può eseguire la RPC legacy;
- regressione T1 manual timetable PASS;
- regressione G1.6-A→E PASS;
- review indipendente;
- HUMAN REVIEW.

## Fuori scope G1.6-F
Questa slice non:
- modifica migrazioni;
- revoca privilegi;
- modifica RPC;
- crea adapter;
- persiste G1.6-E;
- crea o modifica DRAFT;
- attiva orari;
- modifica intervalli di validità;
- abilita replan/CAN-PLAN/DOS-A1.

Restano invariati `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED`.
