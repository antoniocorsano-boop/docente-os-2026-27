# DOCENTE OS — Capability Readiness Current

Data: **2026-10-01**  
Modello: **DOS-CRM v1**  
Baseline iniziale: `develop@74290511ee58a6b61652160463461527e3e0f57a`  
Baseline registro aggiornata: `develop@a59cc21e01b1955514e946fa487a50712a004857`  
Stato: **CURRENT / CAPABILITY AUDIT REGISTER**

## Come leggere questa pagina

Questa è la vista di consultazione del livello di completamento delle capability di Docente OS.

La fonte machine-readable è:

`ops/capability-readiness.json`

Il metodo è definito in:

`docs/product/DOCENTE_OS_CAPABILITY_READINESS_MODEL.md`

Un valore `NEEDS_REAUDIT` è intenzionale: significa che esiste una capability reale e documentata, ma il suo livello non viene promosso o ereditato da audit storici senza una verifica sulla baseline corrente.

## Stato iniziale

| Capability | Dominio | CRL | Stato | Freshness |
| --- | --- | ---: | --- | --- |
| Share Target → importazione Orario con minimizzazione locale | Organizzazione didattica | **5** | **QUALIFIED** | **CURRENT** |
| Orario | Organizzazione didattica | **4** | **INTEGRATED** | **CURRENT** |
| Oggi / Today + Next | Teacher Moment | **4** | **INTEGRATED** | **CURRENT** |
| Preparazione della lezione / Lesson Brief | Didattica | **5** | **QUALIFIED** | **STALE** |
| TeachingSession / registrazione | Didattica | **4** | **INTEGRATED** | **CURRENT** |
| Piano annuale / UDA | Progettazione | **4** | **INTEGRATED** | **CURRENT** |
| Conoscenza / KB | Conoscenza | **4** | **INTEGRATED** | **CURRENT** |
| Calendario / composizione temporale | Organizzazione didattica | **4** | **INTEGRATED** | **CURRENT** |
| Impostazioni / contesto professionale | Configurazione | **4** | **INTEGRATED** | **CURRENT** |
| Account / MFA / sessioni | Sicurezza | **5** | **QUALIFIED** | **STALE** |
| Copilota docente | AI collaboration | **4** | **INTEGRATED** | **CURRENT** |
| Contextual Voice Capture | AI collaboration | **3** | **DEFERRED** | **CURRENT** |
| Institutional Configurator | Integrazione istituzionale | **1** | **CONDITIONAL** | **CURRENT** |

## Aggiornamento qualification — 2026-10-01

Wave A e QL-1 sono state consolidate senza promozioni automatiche:

- PR #642: R-1 TeachingSession e R-2 Copilot **COMPLETE**;
- PR #643: QL-1 Daily Teaching Loop **technical PASS + Human Review PASS** sull'exact head `eda319ec545d5ad37104882d5224c020ebe302dc`, merge `a59cc21e01b1955514e946fa487a50712a004857`;
- 45 test browser QL-1 PASS e Browser Certification/Product CI/K1/ASVS/Human Interaction/TRAMA/MFA Queue Hygiene PASS;
- `human_use=NOT_RUN`: resta il blocker esplicito prima di qualunque promozione CRL attribuita a QL-1;
- i CRL riportati sotto restano pertanto invariati.

## Orario — primo audit capability completo

### DOS-TIMETABLE

**CRL 4 — INTEGRATED / CURRENT**

Assi:

| F | UX | D | S | I | Q | O | K |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **5** | **4** | **5** | **5** | **5** | **4** | **4** | **5** |

L'Orario è una capability realmente integrata: cattedra condivisa, versioni, slot, persistenza Supabase, griglia, editing, import, composizione temporale e apertura del contesto classe sono presenti e collegati. Non viene però promosso a CRL 5 finché non esiste una qualification unica dell'intero journey sulla stessa baseline, con Browser Certification complessiva, HUMAN_USE mirata e receipt operativa/recovery.

Audit dettagliato:

`docs/product/audits/DOS_CRM_AUDIT_ORARIO_2026-09-30.md`

## Oggi / Today + Next — audit capability

### DOS-TODAY-NEXT

**CRL 4 — INTEGRATED / CURRENT**

| F | UX | D | S | I | Q | O | K |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **5** | **4** | **5** | **5** | **5** | **4** | **4** | **5** |

La Home corrente compone realmente Teacher Moment, Orario, Calendario, Planner, Piano annuale e TeachingSession. Il limite a CRL 4 è deliberato: i finding HUMAN_USE storici non vengono cancellati finché una nuova prova end-to-end del cockpit corrente non li chiude con evidence.

Audit dettagliato:

`docs/product/audits/DOS_CRM_AUDIT_TODAY_NEXT_2026-09-30.md`

## Preparazione della lezione / Lesson Brief — audit capability

### DOS-LESSON-PREP

**CRL 5 — QUALIFIED / STALE**

| F | UX | D | S | I | Q | O | K |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **5** | **5** | **5** | **5** | **5** | **5** | **5** | **5** |

La capability conserva una qualification end-to-end storica con Human Review PASS. Tuttavia sono intervenute modifiche successive; QL-1 ha rieseguito il percorso tecnico sullo SHA corrente ma con `human_use=NOT_RUN`. Perciò il CRL resta 5 come evidence storica qualificata, mentre la freshness è **STALE** finché non viene completata una revalidation whole-capability.

Audit dettagliato:

`docs/product/audits/DOS_CRM_AUDIT_LESSON_PREP_2026-09-30.md`

## TeachingSession / registrazione — audit capability

### DOS-TEACHING-SESSION

**CRL 4 — INTEGRATED / CURRENT**

| F | UX | D | S | I | Q | O | K |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **5** | **4** | **5** | **5** | **5** | **4** | **4** | **5** |

Il dominio è maturo e il journey è reale. Le due regression contract precedentemente escluse da `npm test` sono state portate nel Product CI dalla PR #642. QL-1 ha inoltre prodotto technical PASS + Human Review sullo SHA corrente; il CRL resta 4 perché HUMAN_USE task-based e recovery operativo della lane non sono ancora completati.

Audit dettagliato:

`docs/product/audits/DOS_CRM_AUDIT_TEACHING_SESSION_2026-09-30.md`

## Secondo blocco audit — 2026-09-30

| Capability | CRL | F | UX | D | S | I | Q | O | K | Freshness |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Piano annuale / UDA | **4** | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | CURRENT |
| Conoscenza / KB | **4** | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 5 | CURRENT |
| Calendario | **4** | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | CURRENT |
| Impostazioni | **4** | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | CURRENT |
| Account / MFA / sessioni | **5** | 5 | 5 | 5 | 6 | 5 | 5 | 5 | 5 | STALE |
| Copilota docente | **4** | 4 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | CURRENT |

### Lettura sintetica

- **Piano annuale/UDA**: dominio e integrazione forti; manca la qualification unificata del ciclo avanzamento → replanning → preparazione → registrazione.
- **Conoscenza**: dati, provenance, security e K1 sono forti; il limite è l'operatività complessiva del journey e la HUMAN_USE.
- **Calendario**: DOS-CAL-01 è stato qualificato con Human Review, ma il dominio completo non ha ancora un roll-up unico.
- **Impostazioni**: configurazione persistente e propagazione sono reali; manca qualification completa del first-run e della consistenza cross-surface.
- **Account/Sicurezza**: resta **CRL 5** per la qualification storica, ma la freshness è **STALE** perché modifiche successive non sono ancora state riqualificate come whole capability.
- **Copilota**: realmente integrato, ma non ancora qualificato end-to-end; Voice Capture resta esclusa e separatamente `DEFERRED`.

Audit dettagliati:
- `docs/product/audits/DOS_CRM_AUDIT_PLAN_UDA_2026-09-30.md`
- `docs/product/audits/DOS_CRM_AUDIT_KNOWLEDGE_2026-09-30.md`
- `docs/product/audits/DOS_CRM_AUDIT_CALENDAR_2026-09-30.md`
- `docs/product/audits/DOS_CRM_AUDIT_SETTINGS_2026-09-30.md`
- `docs/product/audits/DOS_CRM_AUDIT_ACCOUNT_SECURITY_2026-09-30.md`
- `docs/product/audits/DOS_CRM_AUDIT_COPILOT_2026-09-30.md`

## Capability governate fuori dal core release

| Capability | CRL | Stato | Freshness | Significato |
| --- | ---: | --- | --- | --- |
| Contextual Voice Capture | **3** | **DEFERRED** | CURRENT | Implementazione reale presente, ma non qualificata per il release core |
| Institutional Configurator | **1** | **CONDITIONAL** | CURRENT | Policy definita; implementazione subordinata a un pilot istituzionale autorizzato |

Voice non viene confusa con il Copilota: il Copilota resta CRL 4 anche se il canale vocale è deferito.

L'Institutional Configurator non è un debito del pilot personale: diventa un requisito solo quando viene autorizzato un perimetro istituzionale concreto.

## Prima capability qualificata con DOS-CRM

### DOS-TT-SHARE-IMPORT — Share Target → importazione Orario

**CRL 5 — QUALIFIED**

Evidence corrente:
- PR #640 merged;
- exact head qualificato `d9bcb21f44b916569e25ad957b2afa3cc502efe8`;
- merge commit `74290511ee58a6b61652160463461527e3e0f57a`;
- Product CI PASS;
- Browser Certification PASS;
- P7 DB Restore PASS;
- K1 PASS;
- ASVS, Human Interaction, Design Policy e TRAMA PASS;
- review Codex conclusiva senza rilievi maggiori.

Il failure Operational Security sulla fixture hosted X5 resta classificato come problema esterno alla capability e non viene trasformato artificialmente in PASS.

**Promozione successiva:** CRL 6 richiede evidence di uso runtime/pilot reale ripetuto e recovery nel contesto previsto.

## Regola di aggiornamento

Quando una PR o una decisione cambia materialmente una capability, deve essere verificato anche questo registro.

Il processo è:

`cambiamento → evidence → aggiornamento assi → CRL → freshness → snapshot CURRENT`

Non si aggiorna il CRL per anzianità, percezione o numero di modifiche.

## Richiamo operativo

Quando viene richiesto:
- “mostrami il DOS-CRM”;
- “audit di completamento Docente OS”;
- “a che punto sono le capability?”;
- “aggiorna la maturità del sistema”;

la consultazione deve partire da questo documento e dal registro JSON, quindi verificare il repository corrente per gli elementi non `CURRENT`.

## Prossimo passo previsto

1. completare HUMAN_USE task-based della QL-1 prima di qualsiasi promozione CRL attribuita alla lane;
2. eseguire QL-2 Professional Context & Setup;
3. revalidare Lesson Prep e Account/Sicurezza per ripristinare freshness CURRENT;
4. estendere progressivamente il registro alle capability governate ancora fuori copertura (`DOS-CURRICULUM-INTAKE`, `DOS-MATERIALS`, `DOS-OBSERVATION-EVIDENCE`), che devono restare `NEEDS_REAUDIT` finché non auditate;
5. procedere poi con QL-3 e QL-4.


## Coverage boundary del registro

Il registro DOS-CRM corrente è release-oriented e non pretende ancora copertura totale di ogni capability governata. In particolare Curriculum intake/revalidation, Materials e Observation/Evidence restano esplicitamente fuori dal set corrente e devono essere trattate come **NEEDS_REAUDIT**, non come assenti o complete.
