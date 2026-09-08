# DOCENTE OS — Audit UI Engineering: Conoscenza

Data: 2026-08-29  
Baseline iniziale: `develop@6dde1fd3aae5411a2474f896b461c7c077e6961c`  
Revisione post-merge: `develop@ebdb2aa77ad68f1d65264671b4f61185b0ba2205`  
Tipo: `AUDIT + LOCAL_REPAIR`  
Stato: `STATIC_AUDIT_CORRECTED / LOCAL_REPAIR_IMPLEMENTED / LIVE_BROWSER_AND_HVA_PENDING`

## 1. Perimetro

Superficie canonica esaminata: `product/src/app/knowledge/` con attenzione a pagina principale, acquisizione, filtri, lista recente, uploader e fogli CSS locali.

La revisione successiva al primo audit ha corretto tre omissioni: stato della matrice ancora proposta, focus invisibile sul `summary` di acquisizione e inventario incompleto dei target tattili.

## 2. Human Task

**Compito principale:** ritrovare rapidamente contenuti professionali già acquisiti nella Conoscenza.

**Azione primaria:** cercare nella Conoscenza.

**Azione secondaria:** aggiungere un nuovo contenuto tramite divulgazione progressiva.

Restano invariati i confini: originale preservato, provenienza leggibile, nessuna promozione automatica di candidati operativi, errori recuperabili e conferma umana dove prevista.

## 3. Esito corretto

| Criterio | Esito | Evidenza |
|---|---|---|
| Task clarity | PASS | Ricerca dominante, acquisizione secondaria |
| Visual hierarchy | PASS | Anatomia coerente e leggibile |
| Canonical reuse | PARTIAL | Token condivisi presenti, resta CSS locale |
| Interaction states | PARTIAL | Stati canonici principali presenti; runtime loading/submit da verificare |
| Mobile behavior | PASS_STATIC | Breakpoint e ricomposizione presenti; verifica live pendente |
| Accessibility | PARTIAL_REPAIRED | Riparati focus disclosure, etichetta ricerca e target tattili; verifica browser pendente |
| Authority legibility | PASS | Conferma umana e provenienza restano esplicite |
| Error/empty quality | PASS | Errori recuperabili e empty state distinti |
| Visual debt | PARTIAL | Colori e misure locali da convergere in tranche future |
| Intervention scope | LOCAL_REPAIR | Nessuna evidenza per redesign della superficie |

## 4. Correzioni rispetto al primo audit

### 4.1 Human Interaction State Matrix

`docs/design/HUMAN_INTERACTION_STATE_MATRIX.md` resta `PROPOSED CANONICAL EXTENSION`.

Pertanto la matrice può essere usata solo come **strumento advisory** finché non viene formalmente promossa e indicizzata nell'ordine documentale canonico. Non costituisce un nuovo gate obbligatorio e non modifica la Definition of Done canonica.

### 4.2 Focus della disclosure

Il primo audit aveva considerato sufficiente il focus globale, ma `knowledge-disclosure.css` applicava `outline:0` al `summary` di `Aggiungi un contenuto`, mentre la regola globale copriva soltanto `button`, `input` e `a`.

Correzione implementata: stile `:focus-visible` esplicito per la disclosure di acquisizione e per `Mostra altri`.

### 4.3 Target tattili

L'inventario iniziale era incompleto. Oltre ai pulsanti già rilevati, risultavano sotto il minimo di 44 px anche:

- `Cambia` / `Rimuovi` dell'uploader (`.selectedFileAction`);
- filtri di Conoscenza a larghezze intermedie;
- disclosure `Mostra altri` prima del breakpoint mobile;
- azioni candidate a 38 px;
- pulsanti ricerca/acquisizione a 42 px.

Correzione implementata: override locale a `min-height:44px` per questi controlli, senza modificare struttura o semantica.

### 4.4 Etichetta ricerca

Il campo `q` aveva il placeholder come unico nome locale. È stato aggiunto `aria-label="Cerca nella Conoscenza"` senza alterare l'anatomia visiva.

## 5. Stato delle interazioni

Sono osservabili o coperti staticamente `DEFAULT`, `HOVER`, `FOCUS_VISIBLE`, `ERROR`, `SUCCESS`, `EMPTY` e stati di elaborazione dell'asset.

Restano da verificare in runtime:

- `LOADING/IN_PROGRESS` durante ricerca, upload e rielaborazione;
- comportamento in caso di submit multipli;
- eventuali controlli `DISABLED`;
- stati bloccati per autorità nelle azioni della pagina dettaglio, se applicabili.

Qualunque lettura multidimensionale visual/task/authority/data resta advisory finché la matrice non è promossa.

## 6. Decisione

**Classificazione:** `LOCAL_REPAIR_IMPLEMENTED`.

Nessun redesign strutturale è autorizzato o necessario sulla base dell'audit corrente.

## 7. Gate aperti

- `STRUCTURAL_TESTS`: PENDING_CI;
- `LIVE_BROWSER_DESKTOP`: NOT_RUN;
- `LIVE_BROWSER_MOBILE`: NOT_RUN;
- `INTERACTION_STATE_RUNTIME`: NOT_RUN;
- `HVA`: NOT_RUN.

La riparazione non promuove nessuno di questi gate.
