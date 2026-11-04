# DOS-UX-R1 — Progetta: ingresso contestuale e catalogo completo

Data: 2026-11-04  
Stato: **DESIGN CANDIDATE — HUMAN UX REVIEW PENDING**  
Tracciamento: [Docente OS #789](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/789), [UX-0 #368](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/368), [UX-0F #383](https://github.com/antoniocorsano-boop/docente-os-2026-27/issues/383).  
Base di analisi: file letti dal ramo `develop` il 04/11/2026. La revisione delle schermate della PR #788 (SHA `1a03fb7860ea6466196588466fc33f21377c7558`) è evidenza complementare, non prova che la Beta e `develop` siano identici.

## 1. Decisione proposta

Adottare una UX **a due intenzioni**, preservando integralmente il contesto didattico:

1. **Continua a progettare**: l'azione coerente con una classe e una fase canonica *esplicitamente individuate*. Sfrutta il percorso esistente `Classe → Progetta` con `grade + section + block + uda + pack`. Quando il contesto non è determinabile in modo affidabile, mostra **Scegli una classe**; non inventa una UDA attiva.
2. **Esplora la progettazione**: catalogo intenzionale completo, con filtro per grado/tipologia, consultazione progressiva **lato server** e ricerca per fonti disponibili, mantenendo accesso a tutti i risultati; nessuna lista di decine di UDA nella schermata iniziale.

Non proporre un nuovo cruscotto e non creare una terza gerarchia globale. `Progetta` resta una capability richiamata da Classe, Oggi e funzioni secondarie.

### Cosa NON fare

- Non sostituire `listRecent(...,100)` con `.slice(0,10)`: il taglio visuale non recupera i contenuti esclusi dalla query.
- Non indicare «UDA corrente» a partire dall'ultimo documento caricato, visualizzato o modificato.
- Non copiare il Piano annuale o il modello di avanzamento in una seconda autorità.
- Non nascondere il catalogo completo dietro una funzione non individuabile.
- Non rendere permanenti i dati fittizi delle prove, né cancellare contenuti reali.
- Non introdurre variazioni a database reali, ACL, curricolo Arena, importazioni o registrazioni.

## 2. Evidenze nel codice

- `product/src/app/progetta/page.tsx` usa `knowledgeRepository.listRecent(context.workspace.id, 100)` **prima** del filtro per grado, sezione e fase. Questo campione è incompleto se esistono più di 100 risorse, anche quando l'UDA cercata è meno recente.
- Nel ramo generico `groupProgettaItems(scopedItems)` e `group.items.map(...)` mostrano l'intero campione; il contatore `total` riflette il campione, **non** il catalogo complessivo.
- Nel ramo contestuale `resolveCanonicalProgettaFocus()` convalida `Bxx` contro il piano del grado e la coerenza UDA/pacchetto; la vista mostra al massimo 4 risorse comuni + 3 adattamenti. Non distruggere questo percorso.
- `product/src/app/classi/class-workspace-model.ts` dispone già di `buildClassWorkspaceLearningFocus()`: seleziona la prima fase non completata/non annullata, **solo** con generazione canonica presente. Non dedurre né persistere nuovi stati di preparazione.
- `product/src/core/infrastructure/supabase/supabase-annual-plan-execution-repository.ts` fornisce lo snapshot per spazio/anno, e la registry di Classe è autorità sulle sezioni valide.
- Nel ramo focalizzato attuale `guidedPrimaryAuthoring` offre «Prepara documento», `guidedNow` offre «Apri UDA» e le azioni finali marcano anche «Torna alla classe» come primaria. Sono percorsi legittimi ma con prominenze concorrenti: definire l'intento di ingresso.
- Il design system V2 in `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md` prescrive una sola azione primaria per contesto, tipografia ordinaria 15–17 px, metadati 12–14 px, obiettivi tattili >=44 px e accesso alle informazioni secondarie su richiesta.

## 3. Modello degli stati d'ingresso

| Stato | Condizione affidabile | Prima schermata / azione | Comportamento di sicurezza |
| --- | --- | --- | --- |
| A — Focus esplicito | `grade/section/block/uda/pack` coerenti con classe e piano canonici | Titolo fase e una azione primaria pertinente; risorse comuni e adattamenti disponibili | Conservare percorso guidato attuale; mai mescolare altre classi |
| B — Classe esplicita, fase assente | `section` valida e grado coerente, nessun `block` | «Continua la progettazione della [classe]» solo se fase ricavabile in modo autorevole; altrimenti «Apri classe» | Riutilizzare selettore canonico; nessuna inferenza dalla recenza |
| C — Ingresso senza contesto | `/progetta` senza riferimenti univoci | «Scegli una classe» e voce secondaria «Esplora tutte le UDA» | Nessun «lavoro corrente» inventato; classe non creata dagli asset |
| D — Contesto invalido/obsoleto | Classe non presente nello spazio/anno o grado/pack non coerenti | Avviso discreto «Il percorso richiesto non è disponibile in questa classe» + scelta classe/catalogo | Non applicare silenziosamente filtro di altra classe; nessuna persistenza |
| E — Nessun piano canonico disponibile | Binding mancante/non qualificato | «Consulta le risorse» + stato «Piano non disponibile per individuare la prossima fase» | Non etichettare UDA come attiva né ripiegare su date importazione |
| F — Tutti i blocchi conclusi | Nessuna fase canonica successiva | «Percorso concluso» + «Esplora la progettazione» | Non riproporre B01 come attività corrente |
| G — Nessuna classe autorizzata nell'anno | Registry vuota per il docente e lo spazio corrente | «Nessuna classe disponibile» + collegamento secondario «Esplora le UDA» | Non mostrare selettori vuoti, non chiedere di creare classi per la sola consultazione e non inventare un contesto didattico |

`grade` senza `section` equivale a esplorazione del nucleo di grado, **non** a fase attiva. `section` senza `grade` deve essere riconciliata esplicitamente con la registry o rifiutata; mai mostrare come «della classe» l'intero catalogo trasversale.

## 4. Architettura dell'esperienza

### Vista iniziale senza contesto (smartphone)

```text
Progetta
Scegli la classe per cui vuoi preparare la prossima fase

[ 1ª A ] [ 1ª C ]
[ 2ª C ] [ 3ª A ]
[ 3ª C ] [ 3ª E ]       (esempi di contenuti fittizi)

Esplora tutte le UDA
Consulta per grado, tipologia o parola chiave
```

La vista iniziale visualizza solo le sezioni della registry corrente e autorizzata. Se la registry è vuota, la CTA «Scegli una classe» non deve comparire come azione inutilizzabile: presentare lo stato G e offrire l'esplorazione delle risorse accessibili. La selezione di una classe porta al relativo workspace o a un focus già validato, senza inventare un blocco corrente. L'eventuale filtro disciplina si basa su assegnazioni riconosciute, non su etichette testuali nei documenti. Per una singola classe esplicitamente selezionata, è ammessa una scheda «Prossima fase del Piano» **solo** se esiste un binding canonico attendibile; il collegamento porta alla vista focalizzata già esistente.

### Vista con fase valida

```text
2ª C / Fase Bxx
[Titolo della fase]                 [stato fondato sul Piano]

[ Apri UDA ]   (azione primaria di consultazione, se collegata)
Prepara un documento      (azione secondaria finché non richiesta esplicitamente)

Materiali pertinenti              [Vedi tutti per questa fase]
Adattamenti 2ª C                  [Apri se servono]
Torna alla classe / Piano annuale
```

«Prepara documento» può diventare primario **solo** quando il docente entra da un intento esplicito di preparazione documentale (`intent=author` o equivalente verificabile), e senza creare scritture implicite. L'assenza di UDA collegata non genera pulsanti fittizi: offre «Cerca un'UDA o una risorsa» con ritorno al contesto. Se più UDA candidate sono legittime, nessuna scelta automatica non tracciata.

### Catalogo su richiesta

- Struttura orientata a **Grado → Tipologia → risorse** (UDA / programmazione / materiali), con ricerca e filtri leggibili.
- Risultati di prima pagina limitati (proposta iniziale 12 per pagina), con paginazione esplicita server-side e navigazione tastiera; criterio di ordinamento stabile `captured_at DESC, id DESC` come opzione per il catalogo. La recenza ordina la consultazione ma **non** determina la fase didattica.
- Contatori accurati da query completa o etichetta prudente («Mostrati 12 risultati»), mai «96 contenuti disponibili» quando è solo il campione di 100.
- Accesso a ogni risorsa, con query URL che conserva filtri/pagina/classe; al ritorno, stesso punto e stessi criteri.
- Nelle viste focalizzate, «Vedi tutti per questa fase» apre un catalogo **filtrato sulla stessa fase**, non l'elenco mondiale indistinto.
- La ricerca testuale deve interrogare l'intera raccolta autorizzata mediante metodo verificato; una ricerca limitata ai 100 recenti non soddisfa il contratto di completezza.

## 5. Contratto dati

### Separazione tra riepilogo e catalogo

La pagina iniziale **non** deve caricare automaticamente i documenti necessari al catalogo completo: può leggere registro classi/anno e stato autorevole della classe solo quando necessario. Il catalogo usa un'interrogazione dedicata e limitata, non `listRecent(100)`.

**Read model proposto** (nome indicativo, non API già implementata):

```ts
type PlanningCatalogQuery = {
  workspaceId: string;
  academicYearId?: string;
  grade?: 'prima' | 'seconda' | 'terza';
  sectionId?: string;
  blockId?: string;
  category?: 'UDA' | 'PROGRAMMING' | 'TEACHING_RESOURCE' | 'ASSESSMENT' | 'MODEL';
  search?: string;
  cursor?: string;
  pageSize: number;
};
type PlanningCatalogPage = {
  items: readonly ProgettaItem[];
  nextCursor: string | null;
  total?: number; // soltanto se contato con query completa
};
```

**Requisiti di sicurezza e correttezza:**

1. `workspaceId` e `academicYearId` sono ricavati da sessione autenticata e contesto server, non fidati se provenienti da querystring.
2. `sectionId` e `blockId` sono convalidati contro registry e Piano. Filtri per grado e sezione sono **applicati nella query al database** quando il catalogo supera una pagina, non solo a valle della paginazione.
3. Conservare risorse **comuni** (grado o istituto) insieme agli adattamenti della sezione; escludere adattamenti specifici di altre sezioni. Non assimilare grado e sezione, né escludere i documenti senza una classificazione completa.
4. Per l'UDA nella vista contestuale, usare prima legami canonici verificati, se presenti; la ricerca testuale per codice è un fallback di consultazione, non una prova di autorità curricolare.
5. RLS, provenienza e stato di revisione invariati. Ricerca limitata ai contenuti autorizzati; nessuna esposizione di dati di altri spazi.
6. Paginazione stabile: nessun elemento saltato o duplicato tra pagine in dataset immutato. Se il cursore non è valido, ripartire con messaggio leggibile; la vista non scompare silenziosamente.
7. Se la query full-text corrente non supporta la paginazione esaustiva, prevedere un adattamento di lettura dedicato **prima** di dichiarare la ricerca completa. Nessuna migration su Supabase attivo dentro la fase di design.
8. Se una sorgente canonica non è disponibile, non trasformare un'eccezione in falsa etichetta «fase pronta»: degradare in modo esplicito, in sola lettura.

## 6. Alternative valutate

| Opzione | Vantaggio | Difetto decisivo | Esito |
| --- | --- | --- | --- |
| A — sola riduzione di schede, `.slice(0,10)` | Minimo codice | Nasconde ancor più il corpus già troncato a 100 | **RESPINTA** |
| B — ricerca in testa con elenco completo sotto | Facile da spiegare | Continua il costo cognitivo e non risolve il limite query | **INSUFFICIENTE** |
| C — un solo pannello «UDA suggerita» dalla recenza | Apparente immediatezza | Falsa autorità sul lavoro corrente; confonde contenuto con Piano | **RESPINTA** |
| D — ingresso contestuale, accesso esplicito al catalogo completo, letture paginabili | Più chiarezza e reperibilità; riusa la Classe canonica | Richiede un adapter di catalogo e prove specifiche | **PROPOSTA** |

## 7. Piano di esecuzione RED → GREEN (PR tecniche separate)

### R1-A — Baseline & contratto di stato (nessuna UI nuova)
- Scrivere test per matrice stati A–F e fonti dell'autorità.
- Dimostrare RED: l'ingresso `/progetta` attuale rende gruppi di decine di elementi e non offre l'intenzione «Scegli classe».
- Collegare misure: testo prioritario nel primo viewport, scorrimento prima del primo compito, azioni concorrenti.

### R1-B — Ingresso orientato al contesto
- Usare registry delle classi già disponibile, senza introdurre nuova entità.
- Sostituire **solo** il ramo generico senza focus con la scelta classe e l'accesso al catalogo. Preservare gli URL di focus e l'accesso esplorativo.
- Test: nessuna classe autorizzata (stato vuoto e catalogo raggiungibile); una classe; molte; classe di altro workspace; `grade` senza `section`; `section` invalida; tutti blocchi conclusi; binding mancante.

### R1-C — Catalogo completo con lettura limitata/paginata
- Estrarre il carico documentale dal percorso iniziale; creare read model con filtri server-side e paginazione.
- Test con **0, 1, 20, 100, 150+ asset**; risorsa più vecchia del 100° posto; materiali non UDA più recenti che saturano la finestra; codici ripetuti; nomi lunghi; modifiche tra pagine; risorse comuni e adattamenti di sezioni diverse.
- Non usare solo il contatore del campione; niente falsi totali.

### R1-D — Focalizzazione dell'azione e tipografia
- UNA CTA dominante per il contesto; «Apri UDA» come consultazione primaria se la UDA è presente; authoring come alternativa visibile e non concorrente, salvo richiesta esplicita.
- Ripristinare corpo 15–17 px, metadati 12–14 px tramite token condivisi, non ingrandimenti indiscriminati.
- Disposizione 320/360/390/412 CSS px e desktop: nessun contenuto importante sotto elementi fissi; target >=44 px, focus visibile, zoom 200% e lettore di schermo.
- Misurare sulla **prima finestra realmente visibile**, al netto di intestazione, barra inferiore e area di sicurezza del dispositivo, la presenza del titolo, contesto e CTA. Il solo superamento del test di assenza di overflow non dimostra la leggibilità.

### R1-E — Certificazione e revisione umana
- Product CI, Design Policy, accessibilità, test browser desktop/mobile e revisione indipendente **sullo stesso commit**.
- Uso umano: da Oggi/Classe alla UDA pertinente, da Progetta senza contesto alla classe, recupero della 101ª risorsa, ritorno dalla Conoscenza e authoring senza cambi di contesto.
- Documentare tempo/azioni/scroll osservati, senza fabbricare risultati.
- Dati di collaudo isolati, fittizi ma realistici; nessuna modifica a dati veri.

## 8. Confini di prodotto

- Non modificare `TeachingSession`, `AnnualPlanBlockProgress`, UDA comune o adattamento, registrazioni, snapshot curricolari, dati studenti, RLS e ACL.
- Non integrare o pubblicare la PR #788, che resta nel filone Arena.
- Nessun merge, deploy, migration o promozione L4/M5 in questa fase di progettazione.
- Non dichiarare `QUALIFIED` prima dei gate tecnici e della Human UX Review.
- I miglioramenti a Conoscenza e Lezione restano sotto la issue #789, ma non vanno accumulati nella stessa PR di Progetta.

## 9. Esito della presente analisi

**DESIGN SPEC PREPARED / IMPLEMENTATION NOT STARTED / HUMAN UX REVIEW PENDING.**

Scelta: D — **ingresso contestuale + catalogo completo paginato**, senza inferenze da recenza né nuovi stati di dominio.