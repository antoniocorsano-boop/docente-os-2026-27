# P7 — Tier 2 External Governance Decision Pack

## Scopo

Questo pacchetto prepara il formato canonico delle quattro evidenze istituzionali ancora necessarie per il gate `T2D_EXTERNAL_GOVERNANCE_EVIDENCE`.

Non è un'autorizzazione, non determina la base giuridica del trattamento e non ammette dati personali scolastici in Production.

## Stato corrente

- `TIER_2_SCHOOL_PERSONAL_DATA = NOT_ADMITTED`
- T2A, T2B e T2C: soddisfatti
- T2D: review tecnica completata ma ancora bloccata da governance esterna
- review documentale processor/trasferimenti: soddisfatta
- decisioni istituzionali ancora richieste: 4

## Le quattro decisioni richieste

### 1. INSTITUTIONAL_CONTROLLER_AUTHORITY

Deve risultare da un'evidenza approvata dal titolare o da un soggetto formalmente autorizzato. Deve identificare almeno contesto autorizzato, finalità, categorie ammesse/proibite e riferimento all'autorità di trattamento determinata dal titolare.

### 2. TRANSPARENCY_AND_RIGHTS_ROUTING

Serve un'informativa approvata o un'integrazione approvata nell'informativa esistente, con canali chiari per esercizio dei diritti e gestione delle richieste pertinenti a Docente OS.

### 3. DPIA_SCREENING

Serve una valutazione registrata del titolare/DPO o funzione privacy competente che stabilisca se per il trattamento Tier 2 previsto sia necessaria una DPIA e, se sì, quale follow-up sia richiesto.

### 4. PURPOSE_SPECIFIC_RETENTION_SCHEDULE

Per ogni categoria Tier 2 effettivamente ammessa devono essere definiti periodo di conservazione o trigger oggettivo di cancellazione, evento iniziale, azione alla scadenza e raccordo con la riconciliazione dei backup bloccati.

## Regola di evidenza

Il repository può registrare riferimenti stabili a documenti istituzionali approvati, ma non deve copiare credenziali, segreti o contenuti personali non necessari. L'evidenza deve essere verificabile e deve permettere di identificare autore/ruolo e data della decisione.

## Regola di promozione

La presenza dei quattro documenti non autorizza automaticamente Tier 2. Dopo la verifica delle quattro evidenze sarà comunque necessaria una nuova decisione umana esplicita di ammissione. Fino a quel momento il sistema deve conservare `TIER_2_SCHOOL_PERSONAL_DATA = NOT_ADMITTED`.
