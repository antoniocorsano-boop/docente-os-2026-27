# DOCENTE OS — Classroom Generative Support v1

Data: 2026-09-10  
Stato: IMPLEMENTATION CANDIDATE / EXACT-HEAD VALIDATION PENDING  
Dipende da: `CLASSROOM_AI_SUPPORT_CONTRACT.md`, `AI_COLLABORATION_CANONICAL_SPEC.md`, cockpit `In classe`

## 1. Scopo

Aggiungere al cockpit `In classe` una prima capacità generativa reale senza sostituire il supporto locale, senza trasformare la chat o il provider in fonte autoritativa e senza introdurre scritture automatiche.

Flusso:

`Cockpit → endpoint autenticato → AiOrchestratorPort → adapter provider → proposta effimera → valutazione docente`

Il client non chiama direttamente il provider.

## 2. Capability

### CLASSROOM_TEXT_PROPOSE

Produce una variante breve per uno dei tre compiti già contestualizzati:

- spiegazione più semplice;
- esempio alternativo;
- domanda flash.

L'esito è sempre `status = PROPOSED`. Non sostituisce il supporto locale e non modifica alcun oggetto persistente.

### CLASSROOM_IMAGE_GENERATE

Parte esclusivamente dal `visualBrief` già predisposto per il passaggio corrente. Non accetta nella prima versione un prompt libero del client.

L'esito è sempre `status = PROPOSED` e contiene una anteprima effimera. Non viene creato automaticamente un asset Knowledge, un file Drive, un elemento Canva o un binding al Piano.

## 3. Context minimization

Il server ricostruisce il contesto dal workspace autenticato, dall'anno scolastico, dalla sezione canonica e dall'asset `CLASS_LESSON_MATERIAL`.

La allowlist inviata al boundary AI contiene soltanto:

- titolo della lezione;
- titolo del passaggio;
- istruzione corrente;
- cue corrente, se presente;
- supporto locale pertinente, per le proposte testuali;
- brief visuale pertinente, per la generazione immagine.

Non vengono inoltrati campi ulteriori ricevuti dal client, dati alunno, osservazioni individuali, registro, planner, raw classroom notes, credenziali o payload provider precedenti.

## 4. Revalidation server-side

Ogni POST a `/api/classroom-assistant` rivalida:

- sessione autenticata;
- workspace e anno attivi;
- sezione appartenente al Piano annuale corrente;
- asset nello stesso workspace;
- eventuale anno dell'asset coerente;
- classe esatta e `sectionId` coerente;
- marker `CLASS_LESSON_MATERIAL`;
- fonte HTTPS;
- indice del passaggio esistente;
- capability richiesta ammessa.

Il client non è autorità per prompt o contesto.

## 5. Provider adapter

La prima implementazione riusa la configurazione OpenAI già prevista da Docente OS:

- `OPENAI_API_KEY` — credenziale esclusivamente server-side;
- `OPENAI_TEXT_MODEL` — default/fallback `OPENAI_VISION_MODEL`, poi `gpt-5.6`;
- `OPENAI_IMAGE_MODEL` — default `gpt-image-2.5-flare`.

L'adapter implementa `AiOrchestratorPort`; il dominio e la UI non dipendono direttamente da OpenAI.

Per il visuale live viene usato un profilo orientato alla rapidità in aula:

- endpoint Image API `v1/images/generations`;
- formato landscape `1536x1024`;
- qualità `low` come bozza rapida;
- JPEG con compressione 82.

Riferimento tecnico verificato il 10/09/2026: documentazione ufficiale OpenAI Image generation e modello GPT-Image-2.5 Flare. La documentazione indica Flare come modello rapido per generazione quotidiana di alta qualità, supporta `low` e formato landscape e segnala JPEG come opzione da privilegiare quando la latenza conta.

## 6. Esperienza docente

Il comportamento è progressivo:

1. il docente apre uno dei quattro supporti locali;
2. il supporto locale compare immediatamente e continua a funzionare senza rete AI;
3. se il provider è configurato, per spiegazione/esempio/domanda compare `Proponi una variante AI`;
4. su `Idea visuale` compare `Genera visuale da questo brief`;
5. la risposta compare separatamente come `PROPOSTA AI · DA VALUTARE` o `ANTEPRIMA AI · DA VALUTARE`;
6. il docente può scartarla senza alcun effetto;
7. un visuale può essere aperto separatamente soltanto con un ulteriore gesto esplicito.

Nessuna generazione parte automaticamente al cambio di passaggio o all'apertura della lezione.

## 7. Failure mode

Senza `OPENAI_API_KEY`:

- la UI dichiara provider non configurato;
- i quattro strumenti locali restano attivi;
- nessuna chiamata di rete al provider viene tentata.

Se il provider risponde con errore:

- il server restituisce un errore applicativo non bloccante;
- la UI mantiene il supporto locale visibile;
- nessun retry automatico crea costi inattesi;
- nessun payload provider viene trattato come autorità applicativa.

## 8. Persistenza e provenienza

V1 non introduce tabelle o migrazioni.

Le proposte testuali e visuali:

- vivono nello stato del browser;
- non entrano nel Piano annuale;
- non entrano nel registro;
- non vengono salvate in Knowledge, Drive o Canva;
- espongono provider e modello come provenienza della proposta.

Una futura azione `Salva/usa nel materiale` dovrà essere una slice separata `WRITE_REVERSIBLE` o `WRITE_EXTERNAL`, con anteprima e conferma immediatamente prima dell'effetto.

## 9. Gate

La slice è promuovibile solo se sullo stesso head risultano verdi:

- test di minimizzazione del contesto;
- test `PROPOSED` text/image;
- adapter OpenAI con fetch simulato, senza rete reale;
- fail-closed senza credenziale;
- Product CI, typecheck, lint e build;
- Human Interaction Model;
- Human + Visual Acceptance del fallback locale su desktop e mobile.

La presenza di una chiave reale sul runtime non è requisito dei test automatici e non deve generare consumo API durante CI.
