# Docente OS — Analisi del sistema visuale di provenienza

**Data:** 24 settembre 2026  
**Stato:** CONSOLIDATED ANALYSIS / INPUT TO SPECIFICATION  
**Perimetro:** Docente OS · Atlas · contenuti interni/esterni · Lesson Design · materiali e proposte  
**Origine del finding:** collaudo umano ECO-02/P1 su risorsa Atlas reale

## 1. Problema osservato

Nel collaudo ECO-02/P1 la provenienza della risorsa Atlas è tecnicamente corretta e testualmente visibile, ma richiede lettura. Quando sulla stessa superficie convivono contenuti provenienti da Atlas, Conoscenza, libro, docente, web o strumenti assistiti, il docente deve poter riconoscere l’origine **a colpo d’occhio** senza perdere la precisione testuale.

Il problema non è quindi la mancanza di provenance nei dati: il dominio conserva già `sourceKind`, `sourceRef`, `sourceLabel` e payload specifici. Il problema è la **mancanza di una grammatica visuale cross-surface stabile**.

## 2. Evidenza già presente nel prodotto

La proposta non introduce un principio nuovo.

Il Design System V2 stabilisce:
- “Provenienza sempre recuperabile”;
- il composito Tier E `SourceProvenance`;
- nessuna dipendenza dal colore come unico segnale;
- coerenza cross-surface.

Il Language & Collaboration System richiede che ogni pagina risponda a:
- “Che cosa sto guardando?”;
- “Da dove viene?”;
- “A che punto è?”;
- “Cosa posso fare adesso?”.

La Design Governance impone:
- iconografia coerente;
- nessuna variante locale arbitraria;
- distinzione tra evidenza visuale e authority dei dati;
- classificazione delle modifiche visuali.

Questa analisi completa quindi un’intenzione già canonica: rende `SourceProvenance` un pattern operativo verificabile.

## 3. Evidenza Atlas

Atlas usa già un proprio segno di marca nel prodotto:

`✦`

Il segno compare nel lockup Atlas desktop/mobile come `.atlas-mark`. Per il sistema di provenance deve essere riusato come **marcatore di origine Atlas**, non sostituito con un diamante Lucide o con una nuova “gemma” disegnata localmente.

Il segno Atlas può essere reso in forma ridotta e monocromatica/currentColor quando è inserito dentro Docente OS, così:
- non introduce palette raw locale;
- non affida il significato al colore;
- mantiene riconoscibile l’origine;
- non crea una reinterpretazione del marchio.

## 4. Distinzione fondamentale: provenienza ≠ stato ≠ authority

Tre dimensioni devono restare separate.

### Provenienza
Risponde: **da dove arriva questo contenuto?**

Esempi:
- Atlas;
- Conoscenza;
- libro/editoriale;
- docente;
- web;
- strumento assistito.

### Stato
Risponde: **a che punto è?**

Esempi:
- Da controllare;
- Pronto;
- Accettato;
- Rimosso;
- Da riprovare.

Lo stato resta responsabilità di `HumanStatusBadge` o equivalente.

### Authority
Risponde: **chi ha autorità sul significato o sulla decisione?**

Esempi:
- Arena resta authority curricolare;
- Atlas pubblica/naviga ma non acquisisce authority curricolare;
- il docente resta decisore sull’adozione in lezione.

Un badge “Atlas” non significa “approvato”, “obbligatorio” o “più autorevole”.

## 5. Problema semantico da evitare: “interno a Docente OS”

“Interno a Docente OS” non è una sola provenienza.

Nel modello attuale esistono almeno:
- `KNOWLEDGE` — contenuto della Conoscenza;
- `EDITORIAL_KNOWLEDGE` — contenuto editoriale/libro gestito nella Conoscenza;
- `TEACHER` — contenuto inserito o deciso dal docente;
- `AI_TOOL` — contenuto/proposta da strumento assistito;
- `WEB` — fonte web;
- `ATLAS` — risorsa Atlas.

Quindi non deve esistere un unico simbolo “Docente OS” che appiattisca tutte queste origini.

Il simbolo Docente OS può indicare il **sistema ospitante/provenienza nativa** quando appropriato, ma la UI deve preservare il tipo professionale più utile: “Conoscenza”, “Dal libro”, “Docente”, ecc.

## 6. Tesi di design

Il pattern corretto è:

**segno di origine + etichetta breve**

non:
- solo colore;
- solo icona;
- solo testo;
- logo grande ripetuto;
- badge decorativi diversi per ogni feature.

Esempi:
- `✦ Atlas`
- `[segno Docente OS] Conoscenza`
- `[libro] Dal libro`
- `[penna/persona] Docente`
- `[globo] Web`
- `[scintilla] Strumento assistito`

Il simbolo aiuta la scansione; l’etichetta mantiene comprensione e accessibilità.

## 7. Rapporto con il simbolo Docente OS

Il Brand Identity Canonical riserva la geometria del simbolo Docente OS alla marca e vieta reinterpretazioni locali.

Per questo:
- il SourceProvenance può usare **solo il simbolo canonico ridotto/monocromatico**, se disponibile come asset/component condiviso;
- non è ammesso ricostruire localmente una “D simile”;
- il simbolo non sostituisce icone funzionali di azione;
- se l’asset ridotto canonico non è disponibile, l’implementazione deve prima centralizzarlo, non approssimarlo.

Nel badge, il simbolo rappresenta **origine di sistema**, non un comando.

## 8. Tassonomia visuale proposta

| Origine professionale | Source kind attuale | Segno | Label primaria |
|---|---|---|---|
| Atlas | `ATLAS` | marchio Atlas `✦` | Atlas |
| Conoscenza Docente OS | `KNOWLEDGE` | simbolo Docente OS ridotto, se canonico disponibile | Conoscenza |
| Editoriale/libro | `EDITORIAL_KNOWLEDGE` | icona funzionale canonica `BookOpen` | Dal libro |
| Docente | `TEACHER` | icona funzionale canonica docente/penna | Docente |
| Web | `WEB` | icona funzionale canonica globo/link | Web |
| Strumento assistito | `AI_TOOL` | icona funzionale canonica `Sparkles` | Strumento assistito |

Questa tabella è UX mapping, non una modifica del domain model.

## 9. Perché non usare un colore diverso per ogni fonte

Un sistema cromatico per origine:
- aumenterebbe i token;
- competerebbe con colori di stato;
- rischierebbe di suggerire gerarchie di valore;
- violerebbe il principio “no color-only meaning”.

La prima versione deve quindi essere **prevalentemente neutra**, con identità affidata a segno + testo. Eventuali token source-specific richiedono decisione separata e non sono necessari per ottenere il beneficio.

## 10. Densità e gerarchia

Il marker deve essere piccolo e subordinato al titolo del contenuto.

Ordine percettivo:
1. titolo/contenuto;
2. provenienza;
3. stato;
4. azioni.

Non deve diventare un secondo titolo né un elemento di branding dominante.

## 11. Superfici prioritarie

Prima applicazione:
- “Da Atlas”;
- “Potrebbe servirti qui”;
- “Materiali allegati”;
- proposte “Da controllare” quando source-derived.

Seconda applicazione:
- Conoscenza;
- Planner/Oggi per task source-derived;
- dettaglio materiali/documenti;
- eventuali superfici del copilota che presentano fonti.

Il rollout deve essere progressivo, non un restyling globale.

## 12. Persistenza semantica

La provenienza resta stabile attraverso il lifecycle.

Esempio Atlas:
- proposta → `✦ Atlas`;
- adottata → `✦ Atlas`;
- rimossa dalla lezione → se riproposta, resta `✦ Atlas`;
- lo stato cambia, la provenienza no.

Questa proprietà è importante perché evita che l’adozione “assorba” il contenuto dentro Docente OS facendone perdere l’origine.

## 13. Accessibilità

Regole:
- quando il testo “Atlas”, “Conoscenza”, ecc. è presente, il simbolo è decorativo (`aria-hidden`);
- icon-only è ammesso solo in densità estrema e deve avere nome accessibile/tooltip;
- nessun significato dipende dal colore;
- il badge non deve essere un controllo interattivo salvo che apra esplicitamente dettagli di provenance;
- target 44 px non si applica a marker non interattivi.

## 14. Impatto sul modello mentale TRAMA

Il sistema visuale di provenance rende percepibile la separazione dei domini senza costringere il docente a conoscere l’architettura.

Effetto desiderato:
- “questo viene da Atlas”;
- “questo viene dalla mia Conoscenza”;
- “questo l’ho inserito io”;
- “questo arriva dal web/da uno strumento assistito”.

Non deve richiedere:
- conoscenza di `sourceKind`;
- interpretazione di codici tecnici;
- lettura di dettagli estesi.

## 15. Rischi e mitigazioni

### Troppi badge
Mitigazione: un solo marker di provenienza primaria per contenuto.

### Branding eccessivo
Mitigazione: dimensione ridotta, neutralità cromatica, niente lockup completi.

### Confusione con authority
Mitigazione: stato e authority restano separati; microcopy e dettagli espliciti.

### Incoerenza cross-surface
Mitigazione: componente unico `SourceProvenance` + registry centrale.

### Icone inventate
Mitigazione: Lucide per icone funzionali; brand mark canonici solo quando rappresentano davvero il prodotto sorgente.

## 16. Decisione consolidata

È opportuno introdurre un sistema visuale canonico di provenienza.

La soluzione raccomandata è:
- riusare il composito già previsto `SourceProvenance`;
- mappare le provenance correnti in un registry centrale;
- usare il segno Atlas `✦` per `ATLAS`;
- usare il simbolo Docente OS solo in forma canonica e solo per provenance nativa appropriata;
- mantenere sempre una label testuale;
- separare provenance, stato e authority;
- introdurre il pattern prima nelle superfici della lezione validate dal pilot.

## 17. Classificazione

**COMPATIBLE**

La proposta completa Design System V2, Language & Collaboration System e Design Governance senza cambiare brand, authority o domain invariants.


## 18. Benchmark di strumenti maturi

Il pattern è stato confrontato con prodotti maturi che gestiscono contenuti, componenti o messaggi provenienti da fonti esterne o condivise. L'obiettivo non è copiarne la grafica, ma verificare quali invarianti ricorrono.

### 18.1 Figma — origine persistente e source of truth

Figma distingue tra **main component/library** e **instance**. Un componente riusato in un altro file resta collegato alla propria library sorgente e riceve aggiornamenti da quella fonte. Gli aggiornamenti vengono resi disponibili e possono essere **rivisti e accettati** dall'utente; la library mantiene il ruolo di source of truth.

Fonti:
- https://help.figma.com/hc/en-us/articles/360041051154-Guide-to-libraries-in-Figma
- https://help.figma.com/hc/en-us/articles/360039234193-Review-and-accept-library-updates
- https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-components-in-Figma

Lezioni applicabili a Docente OS:
- l'adozione non deve cancellare il legame con la fonte;
- la provenance deve sopravvivere al lifecycle locale;
- aggiornamento/origine e decisione di adozione sono concetti distinti;
- il sistema ospitante può mostrare la fonte senza trasformarla nella propria fonte nativa.

Questo rafforza la decisione già presa per Atlas: una risorsa adottata in Docente OS resta riconoscibile come Atlas.

### 18.2 GitHub — identità/provenienza separata dalla verifica e dallo stato

GitHub usa indicatori specifici per rendere verificabile l'origine di commit e tag (`Verified`, `Partially verified`, `Unverified`) e permette di aprire il dettaglio della verifica. Allo stesso tempo i **status checks** rappresentano un'altra dimensione: build, test, deploy e readiness.

Fonti:
- https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
- https://docs.github.com/en/pull-requests/reference/status-checks

Lezioni applicabili:
- **chi/da dove viene** non va fuso con **a che punto è**;
- un marker compatto può avere un livello di dettaglio verificabile;
- la fiducia cresce quando il significato del badge è stabile e non ambiguo;
- provenance e status devono avere componenti distinti.

Questo conferma la separazione `SourceProvenance` / `HumanStatusBadge`.

### 18.3 Slack — identità della sorgente resa visibile con nome + icona

Slack associa ai messaggi di app/bot un'identità composta da **nome e icona**. La documentazione sottolinea che, quando un'app pubblica come altra entità, l'attribuzione deve essere chiara e non sorprendere l'utente. Per i bot correnti esistono campi distinti di identità (`bot_id`, `bot_profile`) e il messaggio mantiene traccia del soggetto che lo ha prodotto.

Fonti:
- https://docs.slack.dev/reference/methods/chat.postMessage/
- https://docs.slack.dev/reference/events/message/bot_message/
- https://docs.slack.dev/messaging/sending-and-scheduling-messages/

Lezioni applicabili:
- **icona + nome** è un pattern robusto per attribuzione rapida;
- l'icona da sola non basta;
- non si deve far apparire un contenuto come “del docente” se proviene da un sistema diverso;
- l'attribuzione deve restare prevedibile.

Questo sostiene il pattern `mark/icon + human label`.

### 18.4 Microsoft Adaptive Cards — contenuto esterno, resa nativa dell'host

Adaptive Cards sono contenuti scambiabili tra sistemi che vengono resi con la UI nativa dell'host (Teams, Outlook, Copilot, ecc.), adattandosi a tema, dimensione e contesto. Il contenuto mantiene la propria semantica senza portare con sé un mini-design system estraneo.

Fonti:
- https://learn.microsoft.com/en-us/adaptive-cards/
- https://learn.microsoft.com/en-us/power-automate/overview-adaptive-cards
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/design-effective-cards

Lezioni applicabili:
- Docente OS deve rendere la provenance con **componenti Docente OS**, non incorporare una card “in stile Atlas”;
- il marchio della fonte può essere presente, ma layout, spaziature, accessibilità e responsive restano governati dall'host;
- il contenuto esterno deve apparire coerente con il prodotto ospitante senza perdere identità.

Questo esclude mini-card brandizzate per ogni sorgente e conferma un unico `SourceProvenance`.

### 18.5 Notion — metadata e stato come proprietà distinte

Notion tratta contesto, URL, autore, date e altre informazioni come proprietà visualizzabili/nascondibili e mantiene `Status` come proprietà semantica distinta. Il modello favorisce metadata componibili senza trasformarli tutti nello stesso tipo di badge.

Fonte:
- https://www.notion.com/help/database-properties

Lezioni applicabili:
- provenance è metadata semantico stabile, non stato;
- il dettaglio può essere progressivamente esposto;
- la superficie può decidere quanta provenance mostrare senza perdere il dato sottostante.

## 19. Pattern ricorrenti emersi dal benchmark

Dai prodotti analizzati emergono sette invarianti:

1. **Persistenza dell'origine** — l'adozione locale non cancella la fonte.
2. **Attribution esplicita** — nome/label accompagna il segno.
3. **Provenance separata dallo stato** — origine e readiness sono dimensioni diverse.
4. **Source of truth recuperabile** — quando serve, l'utente può risalire alla fonte o ai suoi dettagli.
5. **Host-native rendering** — la fonte non introduce un design system parallelo dentro il prodotto ospitante.
6. **Progressive disclosure** — marker compatto nel flusso, dettaglio quando richiesto.
7. **Non-impersonation** — un contenuto non deve apparire come originato dal docente o da Docente OS se proviene da Atlas, web o strumento assistito.

Questi invarianti confermano la direzione della specifica e ne rendono più rigorosi i criteri di accettazione.

## 20. Conseguenze per TRAMA

Il confronto esterno rafforza una scelta specifica per l'ecosistema:

- **Atlas mantiene identità** quando un contenuto viene usato in Docente OS;
- **Docente OS mantiene il proprio linguaggio visuale** come host;
- **Arena authority non viene codificata con la stessa grammatica del source badge**;
- la provenance è **persistente e recuperabile**, mentre status e decisioni possono cambiare;
- il docente deve poter distinguere origine, stato e azione senza conoscere il domain model.

Non emerge alcuna ragione per introdurre:
- colori diversi obbligatori per ogni fonte;
- loghi grandi;
- card esterne con stile autonomo;
- badge che fondono origine e approvazione.

Il benchmark sostiene quindi una soluzione piccola, stabile e sistemica: **un solo componente host-native di provenance, con segno riconoscibile e label umana**.
