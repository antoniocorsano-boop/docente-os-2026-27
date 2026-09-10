# DOCENTE OS — Class Prepared Materials Contract v1

Status: IMPLEMENTATION CANDIDATE / INTERACTIVE ACCEPTANCE PENDING
Scope: materiali predisposti per una classe e un incontro, inclusi artefatti esterni come presentazioni Canva

## 1. Scopo

La superficie `Classi` deve poter mostrare ciò che il docente ha già predisposto per il prossimo incontro senza confondere tale materiale con il Piano annuale, con una UDA canonica o con una decisione di pubblicazione agli alunni.

La catena operativa è:

`Orario / data prevista → Classe → materiale predisposto → eventuale conferma docente → uso in classe`

Il materiale può essere una presentazione, una scheda, un documento o altra risorsa. La prima integrazione usa presentazioni Canva già create dal docente.

## 2. Confini di autorità

- **Classi** governa il contesto: per quale sezione e per quale incontro il materiale è utile.
- **Conoscenza** conserva identità, provenienza e contesto professionale dell'artefatto.
- **Canva** resta il provider della presentazione; DOCENTE OS conserva il collegamento, non una copia autorevole dell'artefatto.
- **Piano annuale** resta il canone didattico e non viene avanzato per la sola presenza di un materiale.
- **Orario** determina quando la classe viene incontrata; non determina automaticamente quale artefatto sia approvato.
- **Il docente** mantiene l'autorità professionale sulla conferma e sull'uso effettivo del materiale.

## 3. Rappresentazione senza nuovo dominio dati

La prima slice riusa `knowledge_assets` con:

```text
asset_kind = WEB
source_provider = MANUAL
content_category = TEACHING_RESOURCE
source_locator = URL HTTPS della risorsa
class_labels = [classe canonica]
context_status = REVIEWED
reliability = VERIFIED
```

`source_metadata` contiene il contratto applicativo:

```text
docenteOsResource = CLASS_LESSON_MATERIAL
provider = CANVA | ...
resourceKind = PRESENTATION | STUDENT_SHEET | ...
audience = STUDENT | TEACHER
approvalState = PENDING_HUMAN | APPROVED
targetDate = YYYY-MM-DD
sectionId = id sezione canonica
canonicalBinding = ALIGNED | PRE_CANONICAL_DIAGNOSTIC
canonicalBlockId? = Bxx
teacherEditUrl? = URL riservato al docente
```

Nessuna migrazione è richiesta per questa slice.

## 4. Semantica di stato

### `PENDING_HUMAN`

Significa **predisposto**. Non significa:

- pubblicato agli alunni;
- approvato come materiale definitivo;
- lezione svolta;
- blocco CAN-PLAN completato.

### `APPROVED`

Può essere usato solo a seguito di una conferma professionale esplicita del docente. Anche in questo stato non implica pubblicazione esterna né avanzamento automatico del Piano.

## 5. Legame con il Piano annuale

### `ALIGNED`

Si usa quando il materiale è direttamente attribuibile al blocco canonico dichiarato. Deve essere presente `canonicalBlockId`.

### `PRE_CANONICAL_DIAGNOSTIC`

Si usa per attività iniziali, diagnostiche o di accoglienza che sono professionalmente utili ma non coincidono 1:1 con il primo blocco del CAN-PLAN. La superficie deve dichiarare:

> Diagnostica di accoglienza · non imputata al Piano

Non è consentito convertire automaticamente tale materiale in avanzamento del Piano.

## 6. Selezione nella superficie Classe

Per una sezione canonica DOCENTE OS:

1. considera solo `TEACHING_RESOURCE` con classe corrispondente esattamente;
2. richiede `docenteOsResource = CLASS_LESSON_MATERIAL`;
3. accetta solo `source_locator` HTTPS;
4. seleziona la data futura più vicina alla data corrente; in assenza di futuro usa la data passata più recente;
5. mostra prima le risorse destinate alla classe e poi quelle solo docente;
6. presenta il materiale predisposto **prima** della proiezione del Piano annuale, mantenendo i due significati separati.

Un artefatto di un'altra classe non deve mai apparire per semplice somiglianza del titolo o del contenuto.

## 7. Primo caso reale — 11 settembre 2026

Materiali registrati:

- **1A** — presentazione `Che cos'è Tecnologia?`: `ALIGNED` a `B01`, UDA `1-00`;
- **2A** — presentazione `Osservo, misuro e rappresento`: `PRE_CANONICAL_DIAGNOSTIC`;
- **3A** — presentazione `Leggo la tecnologia come sistema`: `PRE_CANONICAL_DIAGNOSTIC`;
- **3C** — presentazione `Leggo la tecnologia come sistema`: `PRE_CANONICAL_DIAGNOSTIC`.

Tutti partono con `approvalState = PENDING_HUMAN`.

## 8. Criteri di accettazione

- 1A vede esclusivamente il proprio materiale predisposto dell'11/09/2026.
- 2A, 3A e 3C vedono il proprio materiale con l'avviso di non imputazione automatica al Piano.
- Il collegamento apre l'artefatto Canva tramite HTTPS.
- Nessuna risorsa di un'altra sezione viene mostrata.
- URL non HTTPS o non validi non vengono resi come materiale predisposto.
- Il riquadro Piano annuale resta separato e invariato.
- `PENDING_HUMAN` viene mostrato come `Predisposto`, non come pubblicato o approvato.
- Conoscenza conserva `source_locator`, identità e provenienza dell'artefatto; la superficie Classe usa quel riferimento per aprire la fonte esterna.

## 9. Slice successive, non incluse

- comando esplicito `Conferma materiale` che cambia `approvalState` tramite un boundary applicativo tracciato;
- materiale docente separato (piano minuto per minuto, griglia diagnostica);
- vista pubblicabile/alunni con whitelist delle sole risorse `APPROVED` e audience consentita;
- associazione diretta all'occorrenza di Orario quando l'identità della sessione prevista è materializzata;
- sincronizzazione del titolo/stato dal provider esterno senza rendere Canva una dipendenza autorevole.
