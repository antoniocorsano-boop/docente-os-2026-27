# P7 Tier 2 — Data Necessity & Anonymization Baseline

**Stato:** ANONYMIZATION_FIRST_BASELINE  
**Effetto su Tier 2:** NONE  
**Tier 2 school personal data:** `NOT_ADMITTED`

## Decisione di prodotto

Docente OS adotta la regola:

> **NO_PERSONAL_DATA_WHEN_FUNCTION_CAN_BE_DELIVERED_WITH_NON_PERSONAL_OR_ANONYMOUS_DATA**

Per il pilot scolastico iniziale, il perimetro raccomandato è ancora più restrittivo del precedente modello pseudonimo:

- **D0 — dati non personali:** ammessi;
- **D1 — aggregati anonimi:** ammessi solo con regole anti-singling-out;
- **D2 — riferimenti pseudonimi individuali:** non ammessi nel pilot iniziale; richiedono un gate funzionale separato;
- **D3 — identificatori diretti:** proibiti;
- **D4 — contesto personale ad alto rischio:** proibito;
- **D5 — categorie particolari / dati di sensibilità equivalente:** proibiti e soggetti a gate separato.

La pseudonimizzazione non viene chiamata anonimizzazione: un riferimento stabile o collegabile a una persona resta dato personale.

## Risultato dell'audit del modello dati attuale

Il tipo database corrente non contiene una tabella `students`, `learners` o equivalente e non contiene campi anagrafici diretti degli studenti. Il sistema è quindi già strutturalmente vicino a una baseline identity-free.

Le superfici più rischiose sono i campi a testo libero e l'ingestione documentale, perché possono ricevere dati personali accidentalmente:

- note di planner, calendario, orario, piano annuale e cattedra;
- commenti di feedback;
- `knowledge_assets.original_name` e `original_text`;
- metadata JSON degli asset;
- testo normalizzato, markdown, summary, extracted data e unità della Knowledge Base;
- dettagli/errori delle pipeline di ingestione.

La conseguenza è importante: **non serve introdurre un'anagrafica studenti per far funzionare Docente OS**. Serve piuttosto impedire che l'identità entri indirettamente nei campi già esistenti.

## Matrice di necessità funzionale

| Funzione | Classe minima | Dato personale necessario? | Decisione pilot |
|---|---|---:|---|
| Piano annuale e UDA | D0 | No | AMMESSO |
| Planner docente | D0 | No | AMMESSO |
| Orario / spazio classe | D0 | No | AMMESSO |
| Knowledge Base didattica | D0 | No | AMMESSO con controllo input |
| Andamento complessivo della classe | D1 | No | AMMESSO come aggregato anonimo |
| Supporto individuale persistente | D2 | Non dimostrato per il pilot iniziale | DEFER |
| Voti ufficiali / registro alunni / comunicazioni individuali | D3+ | Sì | OUT OF SCOPE |
| PEI/PDP/DSA/BES, salute o diagnosi | D5 | Sì | PROHIBITED |

## Regola per gli aggregati anonimi

Per evitare che un aggregato diventi di fatto riferibile a una singola persona, la baseline impone:

- dimensione minima del gruppo **5**;
- soppressione delle celle piccole;
- nessun drill-down a riga individuale;
- nessun identificatore stabile utilizzabile per collegare dataset diversi;
- revisione delle combinazioni di attributi rare;
- nessun testo libero negli aggregati.

La soglia 5 è una **regola prudenziale di prodotto**, non una garanzia universale di anonimizzazione. Il rischio di re-identificazione va sempre valutato nel contesto reale.

## Cosa NON entra nel pilot

Il pilot non deve contenere:

- nome o cognome dello studente;
- email, telefono, indirizzo, data di nascita, foto o altri identificatori diretti;
- una tabella che associ un codice interno a un'identità reale;
- un identificatore studente stabile persistito lato server;
- note disciplinari nominative;
- informazioni familiari o socioeconomiche individuali;
- diagnosi, salute, disabilità o altre categorie particolari;
- documenti scolastici individuali non previamente depurati;
- dati personali inviati a servizi AI esterni.

## Principio di supporto didattico senza spiegare il “perché personale”

Quando possibile Docente OS deve conservare l'azione didattica, non la condizione personale che l'ha originata.

Esempio corretto a livello di classe/attività:

- `support_action = EXTRA_TIME_AVAILABLE_FOR_ACTIVITY`
- `instruction_mode = STEP_BY_STEP`

Non è necessario registrare diagnosi o motivazioni individuali per rendere disponibile una strategia didattica inclusiva.

## Rischio residuo principale: input accidentale

La baseline tecnica successiva deve quindi concentrarsi su quattro controlli:

1. **ANON_INPUT_GUARD** — avviso/classificazione prima dell'ingestione di documenti e asset;
2. **ANON_FREE_TEXT_GUARD** — protezione delle superfici a testo libero;
3. **ANON_AGGREGATE_GUARD** — soglia minima e small-cell suppression per analytics futuri;
4. **D2_FUNCTIONAL_NECESSITY_GATE** — nessun riferimento individuale persistente finché una funzione concreta non dimostri che D0/D1 sono insufficienti.

## Impatto sulla decisione E1

La raccomandazione istituzionale viene quindi ristretta ulteriormente:

> **Per il primo pilot scolastico autorizzare, se l'Istituto lo ritiene appropriato, soltanto dati D0 e D1. Non autorizzare ancora dati personali individuali pseudonimi.**

Questo significa che l'uso iniziale può coprire progettazione, UDA, piano annuale, orario, planner, Knowledge Base depurata e indicatori aggregati della classe senza introdurre un archivio studenti parallelo.

Qualunque futura esigenza D2 dovrà dimostrare una necessità funzionale specifica e superare una nuova decisione istituzionale. D3–D5 rimangono esclusi.

## Confine di autorità

Questa baseline è una decisione tecnica di minimizzazione e privacy-by-design. **Non sostituisce E1–E4 e non autorizza Tier 2.** L'Istituto/titolare mantiene la responsabilità delle decisioni istituzionali e `TIER_2_SCHOOL_PERSONAL_DATA` resta `NOT_ADMITTED`.
