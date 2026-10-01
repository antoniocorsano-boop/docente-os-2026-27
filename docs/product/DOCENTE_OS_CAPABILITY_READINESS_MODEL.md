# DOCENTE OS — Capability Readiness Model (DOS-CRM v1)

Data di adozione: **2026-09-30**  
Stato: **CANONICAL CANDIDATE / PERMANENT MATURITY INSTRUMENT**  
Scope: **Docente OS**

## 1. Scopo

DOS-CRM è il modello permanente con cui Docente OS descrive il livello di completamento e maturità delle proprie capability.

Evita percentuali sintetiche non verificabili e separa:
- presenza della funzione;
- integrazione;
- qualità dell'esperienza;
- sicurezza/privacy;
- evidenza di qualificazione;
- operatività reale;
- prova sostenuta nel contesto d'uso.

La gerarchia di consultazione è:

`Sistema → Dominio → Capability → Vista/Flusso → Evidenze`.

La **capability** è l'unità primaria di audit. Una vista UI è una superficie della capability e non costituisce da sola prova di completamento.

## 2. Relazione con lo stato canonico

- `docs/product/PROJECT_STATUS_CURRENT.md` resta la fonte sintetica autorevole dello stato complessivo.
- `docs/product/CAPABILITY_READINESS_CURRENT.md` è la vista umana corrente di dettaglio.
- `ops/capability-readiness.json` è il registro machine-readable del DOS-CRM.
- gli audit datati restano evidence storica e non devono essere usati come fotografia CURRENT quando divergono dal registro corrente.

Il DOS-CRM non sostituisce M5, WCAG, ASVS, release engineering o HUMAN_USE: li usa come evidenze negli assi pertinenti.

## 3. Scala CRL

| CRL | Nome | Criterio minimo |
| --- | --- | --- |
| **0** | Assente | capability non progettata o solo nominata |
| **1** | Definita | scopo, attore, requisiti e confini documentati |
| **2** | Prototipata | flusso dimostrabile ma non integrato nel prodotto reale |
| **3** | Implementata | funzione reale presente nella linea prodotto |
| **4** | Integrata | dati, servizi e domini necessari sono collegati; test essenziali presenti |
| **5** | Qualificata | gate pertinenti, error handling, responsive/accessibilità/sicurezza e regression evidence adeguati al rischio |
| **6** | Operativa | utilizzabile nel runtime previsto con deploy stabile, persistenza/recovery e supportabilità sufficienti |
| **7** | Provata | evidenza HUMAN_USE/pilot reale sostenuta, senza finding critici aperti nel perimetro dichiarato |

Il CRL non è una percentuale.

## 4. Otto assi di qualificazione

Ogni capability viene valutata separatamente su:

- **F — Functional suitability**: journey end-to-end realmente completabile.
- **UX — Human interaction**: comprensibilità, teacher-first, reflow/mobile, accessibilità, costo del task.
- **D — Data integrity**: persistenza, consistenza, concorrenza, idempotenza, lineage, recovery.
- **S — Security & privacy**: autenticazione/autorizzazione, RLS, minimizzazione, confini dati, fail-closed.
- **I — Integration**: interoperabilità con capability e sistemi confinanti senza duplicare autorità.
- **Q — Qualification**: test, CI, contract tests, Browser Certification, evidence specialistica applicabile.
- **O — Operability**: deploy, PWA/runtime, failure/recovery, osservabilità/supportabilità.
- **K — Knowledge & governance**: contratti, ADR/spec, decisioni e evidence consolidate nelle fonti canoniche.

Ogni asse usa la stessa scala 0–7, ma il numero indica maturità di quell'asse, non avanzamento percentuale.

## 5. Regola di composizione

Non si usa la media aritmetica.

Il CRL complessivo è limitato dal più basso asse **critico** applicabile alla capability.

Una capability non può essere:
- CRL 4 se il journey end-to-end non è integrato;
- CRL 5 se un gate pertinente o un rischio critico resta non qualificato;
- CRL 6 se non esiste evidence di runtime operativo coerente col perimetro;
- CRL 7 senza evidence HUMAN_USE/pilot reale sostenuta.

Un asse può essere marcato `N/A` solo con motivazione esplicita.

## 6. Stato sintetico

| Stato | Significato |
| --- | --- |
| `NOT_STARTED` | CRL 0 |
| `DEFINED` | CRL 1 |
| `PROTOTYPED` | CRL 2 |
| `IMPLEMENTED` | CRL 3 |
| `INTEGRATED` | CRL 4 |
| `QUALIFIED` | CRL 5 |
| `OPERATIONAL` | CRL 6 |
| `PROVEN` | CRL 7 |

Stati trasversali ammessi:
- `NEEDS_REAUDIT` — l'ultima evidence non è abbastanza fresca rispetto alla baseline corrente;
- `BLOCKED` — un vincolo esplicito impedisce la promozione;
- `CONDITIONAL` — capability richiesta solo in un diverso perimetro prodotto;
- `DEFERRED` — deliberatamente rinviata.

## 7. Evidenza minima

Ogni record CURRENT deve indicare almeno:
- `capability_id` stabile;
- dominio;
- nome;
- CRL;
- assi;
- baseline SHA o riferimento verificato;
- data ultima verifica;
- evidence refs;
- finding/gap aperti;
- prossimo criterio di promozione;
- freshness.

Nessun CRL può aumentare per semplice dichiarazione narrativa.

## 8. Freshness

La maturità descrive la capability; la freshness descrive quanto è affidabile la fotografia.

Valori:
- `CURRENT` — verificata sulla baseline corrente o su evidence ancora direttamente applicabile;
- `RECENT` — evidence valida ma precedente alla baseline corrente senza cambi rilevanti noti;
- `STALE` — il codice/stato è avanzato e serve nuova verifica;
- `UNKNOWN` — evidence insufficiente.

Un record `STALE` non deve essere automaticamente retrocesso: deve essere mostrato come **livello precedente da riverificare**, non come stato corrente certo.

## 9. Update contract

Ogni PR o decisione che modifica materialmente una capability deve verificare se cambia il DOS-CRM.

Aggiornamento obbligatorio quando cambia almeno uno di:
- journey disponibile;
- persistenza/contratto dati;
- security/privacy boundary;
- integrazione;
- gate di qualificazione;
- runtime/operatività;
- HUMAN_USE/pilot evidence;
- finding che limita il livello.

L'aggiornamento deve avvenire nello stesso cambiamento o in una PR di governance immediatamente collegata.

## 10. Anti-inflation rules

È vietato:
- promuovere una capability perché la UI “sembra finita”;
- derivare CRL da numero di PR o righe di codice;
- convertire CRL in percentuale di completamento;
- compensare un asse critico basso con assi alti;
- dichiarare `OPERATIONAL` o `PROVEN` solo sulla base della CI;
- usare evidence di un'altra capability senza esplicita applicabilità.

## 11. Consultazione

Richieste come:
- “mostrami la maturità di Docente OS”;
- “a che punto è l'Orario?”;
- “quali capability non sono ancora qualificate?”;
- “aggiorna il DOS-CRM”;

devono partire da:
1. `ops/capability-readiness.json`;
2. `docs/product/CAPABILITY_READINESS_CURRENT.md`;
3. evidence richiamate dai record;
4. stato reale del repository/runtime se il record non è CURRENT.

## 12. Riferimenti

Il modello è coerente con:
- ISO/IEC 25010:2023 per la qualità del prodotto;
- logica di readiness level per la progressione maturity-by-evidence;
- WCAG 2.2 AA, ASVS 5.0, Human Interaction Model, Browser Certification e release governance già adottati dal repository.

Questi riferimenti non implicano certificazione ISO né equivalenza formale con i Technology Readiness Levels.

## 13. Regola finale

> **Una capability è completa solo nel livello dimostrato dalle sue evidenze più deboli ma pertinenti.**

Il DOS-CRM deve rendere evidente non soltanto “cosa esiste”, ma soprattutto **cosa possiamo sostenere che funzioni, con quale livello di prova e cosa manca per il livello successivo**.
