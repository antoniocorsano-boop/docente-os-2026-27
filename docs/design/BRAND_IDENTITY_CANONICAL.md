# Docente OS — Brand Identity Canonical

Data: 2026-09-11  
Stato: CANONICAL / COMPATIBLE EXTENSION OF DESIGN SYSTEM V2  
Classificazione: `COMPATIBLE`

## 1. Tesi

Docente OS non è un registro, un calendario o un contenitore di moduli. È il sistema operativo professionale che **mantiene il filo del lavoro docente** e porta in primo piano il prossimo passo pertinente, senza sostituire la decisione umana.

La marca deve rendere percepibile questa promessa prima ancora che l'utente legga una funzione.

Le regole trasversali di applicazione sono vincolate anche da `DESIGN_GOVERNANCE_CANONICAL.md`.

## 2. Promessa

### Lockup breve

**Docente OS**  
**Mantieni il filo.**

### Formula estesa

> Il sistema operativo professionale che mantiene il filo del lavoro docente e porta in primo piano il prossimo passo pertinente, senza sostituire la decisione umana.

`Mantieni il filo.` è la promessa primaria. Non va sostituita da formule funzionali come “organizza la giornata”, “gestisci la scuola” o “assistente per docenti”, perché ridurrebbero il prodotto a un singolo modulo.

## 3. Cinque significati invarianti

1. **Continuità** — il lavoro non riparte da zero; il sistema conserva il contesto utile.
2. **Contesto** — classe, momento, progettazione, materiali ed evidenze sono ricomposti prima dell'azione.
3. **Orientamento** — il sistema propone il prossimo passo pertinente, non tutto il sistema contemporaneamente.
4. **Traccia** — ciò che accade diventa memoria professionale recuperabile.
5. **Autonomia** — il sistema suggerisce e prepara; la decisione professionale resta umana.

Questi significati sono invarianti. Le loro espressioni visuali e microcopy possono evolvere soltanto senza alterarne il significato.

## 4. Simbolo canonico

Il marchio è un segno astratto costruito su tre elementi:

- una **D aperta**, che richiama `Docente` senza diventare un semplice lettermark;
- un **punto centrale**, che rappresenta il docente come centro decisionale;
- una **traccia aperta diagonale** che entra nel segno e continua, simbolo del filo tra contesto, azione e lavoro successivo.

### Riferimento visuale approvato

Il riferimento visuale approvato il **2026-09-11** è autoritativo per la geometria del simbolo. La versione runtime deve riprodurre fedelmente:

- struttura e proporzioni complessive della `D`;
- grado e posizione dell'apertura;
- rapporto tra arco esterno e tratto verticale;
- posizione, dimensione e respiro del punto centrale;
- traiettoria, angolo, spessore e terminazione della curva diagonale;
- equilibrio percettivo del passaggio cromatico blu → turchese.

Il simbolo implementato non può essere una “reinterpretazione coerente”: deve essere una **ricostruzione fedele del riferimento approvato**. Qualunque differenza percettibile deve essere trattata come finding visuale da correggere, non come variante autorizzata.

Il simbolo non deve incorporare icone didascaliche di libro, calendario, persone, lampadina, cappello da laurea, robot o check. Questi elementi possono esistere nell'interfaccia come icone funzionali, ma non costituiscono l'identità primaria.

### Varianti autorizzate

Sono autorizzate soltanto tre famiglie:

- **chiara**: simbolo canonico su fondo chiaro;
- **inversa/scura**: stessa geometria su navy/scuro, con valori cromatici adeguati al contrasto;
- **ridotta/monocromatica**: stessa geometria in un solo colore quando il supporto lo richiede.

L'**app icon** usa il simbolo canonico isolato in un contenitore arrotondato. Il contenitore può cambiare per contrasto/supporto; la geometria interna no.

Le proporzioni del segno devono restare riconoscibili anche a 24–32 px. Le semplificazioni necessarie per dimensioni molto piccole richiedono verifica visuale esplicita e non possono alterare il gesto fondamentale del simbolo.

## 5. Colore

La palette concreta estende i token semantici del Design System V2; il markup di dominio continua a usare ruoli semantici.

| Ruolo brand | Valore baseline | Significato |
|---|---:|---|
| Navy | `#0B2D5B` | affidabilità, struttura, profondità professionale |
| Blue | `#2F6DF6` | azione, orientamento, percorso attivo |
| Thread teal | `#35BDD0` | continuità del filo, transizione |
| Green | `#16A34A` | conferma/completamento, non decorazione |
| Neutral | `#E5E7EB` | spazio, separazione, leggibilità |

### Regole

- il verde non è un secondo colore di marca dominante: resta segnale di conferma/successo;
- il blu attivo identifica azione e orientamento;
- il navy governa identità e struttura;
- il teal è riservato alla traccia/continuità e non deve diventare colore casuale di decorazione;
- nessuno stato professionale dipende unicamente dal colore;
- contrasto e accessibilità prevalgono sulla fedeltà cromatica nominale, senza cambiare il ruolo semantico.

## 6. Tipografia

Baseline: **Inter o system UI equivalente**. Non è autorizzata una dipendenza da font remoto necessaria al funzionamento del prodotto.

Carattere percepito:

- sobrio, professionale, contemporaneo;
- gerarchie nette;
- display con tracking leggermente negativo;
- uppercase limitato a eyebrow e micro-label brevi;
- niente estetica “edtech giocosa” o amministrativa.

## 7. Forma e superfici

Il linguaggio visuale usa:

- raggi medio-grandi, coerenti ma non infantili;
- superfici bianche su canvas freddo molto chiaro;
- bordi leggeri;
- ombre morbide e poco profonde;
- una sola azione primaria fortemente riconoscibile per contesto;
- densità mobile controllata e progressive disclosure.

La sidebar desktop è il principale carrier del navy. Il contenuto operativo rimane chiaro per ridurre affaticamento e preservare leggibilità prolungata.

Sono vietati come linguaggio globale gradienti puramente decorativi, glow, neon, glassmorphism invasivo o effetti generici associati all'“AI”. I gradienti sono ammessi quando esprimono il brand o una transizione funzionale precisa.

## 8. Loading e motion

Il caricamento non comunica genericamente “attesa”: comunica **ricomposizione del contesto**.

Messaggio baseline per attese percepibili:

> Ritrovo il filo della tua giornata.

Sequenza semantica, quando la durata o il contesto giustificano più stati:

`Ritrovo il contesto → Ricompongo la giornata → Quasi pronto → Pronto`

Motion:

- tratto/orbita che si ricompone attorno al simbolo canonico;
- durata locale 120–220 ms per feedback UI ordinario;
- animazione di loading sobria, non ludica;
- `prefers-reduced-motion` obbligatorio;
- niente animazioni decorative continue fuori da uno stato di attesa reale.

## 9. Applicazione di sistema

Il brand deve risultare coerente almeno in:

- metadata/browser identity e app icon;
- login e recupero accesso;
- loading globale;
- sidebar desktop;
- header e bottom navigation mobile;
- command palette e sheet;
- Home/Next Best Action;
- primitive condivise: card, input, button, badge, focus ring;
- stati success/warning/error nel rispetto dei token semantici;
- documentazione e screenshot ufficiali.

Non è richiesto che ogni pagina abbia il logo: la coerenza deriva da token, gerarchie e comportamento, non dalla ripetizione del marchio.

## 10. Linguaggio

Usare `Docente OS` in title case nel prodotto e nei testi correnti. `DOCENTE OS` può essere usato solo come micro-label/eyebrow dove l'uppercase è coerente con il Design System.

La marca parla come il prodotto: concreta, professionale, contestuale. Evitare formule che attribuiscano autonomia decisionale all'AI.

## 11. Confini

Il brand non modifica:

- domain invariants;
- autorità delle fonti;
- human-in-the-loop;
- stato canonico di TeachingSession, Planner, Orario, Calendario o UDA;
- RLS, autenticazione o autorizzazioni.

Un restyling non può cambiare il significato di uno stato, nascondere una distinzione professionale necessaria o trasformare una proposta in decisione.

## 12. Protocollo di evoluzione

Gli **invarianti** sono:

- promessa `Mantieni il filo.`;
- cinque significati;
- docente come centro decisionale;
- geometria canonica del simbolo rispetto al riferimento approvato;
- famiglie di variante autorizzate;
- distinzione semantica dei colori;
- assenza di iconografia scolastica didascalica nel marchio;
- coerenza cross-surface.

Sono **migliorabili con evidenza**:

- densità e spaziature delle superfici;
- dimensione e posizionamento responsive del lockup;
- microcopy secondaria di loading;
- tempi e curve di motion entro i limiti canonici;
- intensità di ombre/bordi entro i token;
- quantità di metadata esposti per default.

**La geometria del simbolo non è migliorabile localmente.** Qualunque modifica richiede una revisione canonica `SUPERSEDING` o `BREAKING`, confronto con il riferimento approvato e nuova accettazione visuale esplicita.

Ogni revisione deve dichiarare:

1. problema osservato;
2. evidenza (HVA, pilot, accessibilità o uso reale);
3. ipotesi di modifica;
4. impatto sugli invarianti;
5. classificazione `COMPATIBLE`, `SUPERSEDING` o `BREAKING`;
6. prova necessaria prima della promozione.

## 13. Acceptance minima

Una release che modifica il brand o i token globali deve superare almeno:

- Product CI + typecheck + build;
- Human Interaction Model;
- Human + Visual Acceptance desktop e mobile;
- verifica esplicita del simbolo rispetto al riferimento approvato quando il logo cambia;
- controllo assenza overflow orizzontale mobile;
- controllo contrasto/focus sulle superfici toccate;
- verifica `prefers-reduced-motion` per loading/motion;
- smoke di login, Home, navigazione e almeno una superficie operativa di classe.

## 14. Relazione con la Design Governance

`DESIGN_GOVERNANCE_CANONICAL.md` fissa le regole trasversali che rendono questa identità coerente nell'intero prodotto. Una feature non può introdurre eccezioni locali al brand, ai token o alle gerarchie senza una revisione canonica esplicita.
