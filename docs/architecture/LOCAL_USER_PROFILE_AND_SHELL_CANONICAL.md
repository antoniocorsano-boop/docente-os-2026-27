# DOCENTE OS — Local User Profile & Shell Contract

Data: 2026-09-24
Stato: **CANONICAL CANDIDATE / PRIVACY + UX BOUNDARY**
Classificazione: **SUPERSEDING** per la parte nome visualizzato docente; **COMPATIBLE** per shell mobile.

## 1. Decisione

DOCENTE OS distingue:

```text
Profilo personale locale
≠
Contesto professionale server-side
```

Il profilo personale locale serve soltanto a personalizzare l'esperienza sul dispositivo.

Non è un'identità istituzionale e non è una fonte autorevole.

## 2. Dati locali

Baseline locale:

- nome visualizzato;
- iniziali derivate localmente;
- eventuale avatar locale;
- preferenze di presentazione personali non istituzionali.

Questi dati:

- restano nel browser/dispositivo;
- non vengono inviati a Supabase;
- non vengono inclusi in manifest, receipt o telemetria;
- non vengono usati per decisioni di autorizzazione;
- non vengono inferiti da email, account o provider esterni.

## 3. Uso consentito

Il profilo locale può alimentare:

- saluto Home/Oggi;
- avatar nel chrome;
- intestazioni personali puramente locali;
- preferenze visuali/device-local future.

Non può alimentare:

- documenti istituzionali che richiedono una identità verificata;
- audit/provenance;
- ownership;
- autorizzazioni;
- curricolo;
- Planner/Calendario/Orario;
- analytics remoti.

## 4. Saluto

La Home/Oggi usa:

```text
Buongiorno / Buon pomeriggio / Buonasera
+ nome locale, se presente
+ data
```

Fallback:

```text
Buongiorno
+ data
```

Il saluto è contestuale e discreto; non deve competere con il Teacher Moment.

## 5. Avatar

La testata mobile usa un avatar/profilo come secondo controllo globale accanto alla ricerca.

Baseline:

```text
[brand + contesto]                [search] [avatar]
```

L'avatar:

- apre configurazioni personali/locali;
- può mostrare iniziali generate localmente;
- usa un fallback iconografico accessibile;
- non carica immagini remote per default;
- non implica account cloud o profilo pubblico.

## 6. Navigazione

Il menu hamburger non resta nella testata mobile se `Altro` è già disponibile nella bottom navigation.

Ruoli:

- lente = command/search;
- avatar = profilo/configurazioni personali;
- Altro = navigazione secondaria.

Questi tre ruoli non devono sovrapporsi.

## 7. Persistenza locale

La prima implementazione può usare una chiave locale versionata, per esempio:

```text
DOCENTE_OS_LOCAL_PROFILE_V1
```

Payload minimo:

```ts
type LocalTeacherProfileV1 = {
  displayName: string
  avatarDataUrl?: string | null
}
```

Vincoli:

- validazione lunghezza/input;
- nessun token o segreto;
- nessun dato alunno;
- nessuna sincronizzazione automatica;
- clear/reset disponibile;
- compatibilità futura tramite versione del payload.

## 8. Campo server legacy

`teacher_workspace_settings.teacher_display_name` è considerato legacy/deprecated.

Nuove superfici:

- non lo leggono;
- non lo aggiornano;
- non lo usano come fallback per il saluto.

La rimozione/bonifica fisica del dato esistente viene trattata come migrazione separata.

## 9. Surface Maturity

Ogni vista nuova o modificata deve usare il Surface Maturity Review definito in Design Governance.

La review deve verificare in particolare:

- rumore;
- duplicazione controlli;
- gerarchia del primo viewport;
- uso selettivo di card/bordi/ombre;
- coerenza della shell;
- mobile 360–430;
- separazione tra profilo locale e contesto server.

## 10. Rollout

### LUP-1 — contract + stop server read/write
- consolidare la regola;
- smettere di leggere/scrivere il nome server-side nelle nuove superfici.

### LUP-2 — local profile component
- storage locale versionato;
- campo nome locale;
- saluto Oggi.

### LUP-3 — avatar shell
- sostituire hamburger top con avatar;
- Altro resta nella bottom navigation;
- profilo locale apre una surface dedicata.

### LUP-4 — legacy cleanup
- migrazione/bonifica campo server;
- test privacy e regressione.
