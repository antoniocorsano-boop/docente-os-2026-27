# UX-0B — Information architecture / Task Cost

Parent canonico: #368  
Slice: #371  
Baseline runtime: `develop@becf77735d2eed3f274a9944e1026327f86c02bf`

## Obiettivo

Ridurre il costo di orientamento della shell senza rimuovere capability e senza modificare dominio, persistenza o autorità professionali.

Il modello utente di riferimento resta:

`Oggi → Classe → Lezione → Fatto`

La shell non deve chiedere al docente di conoscere la struttura interna del prodotto per iniziare il lavoro ordinario.

## Prima

Desktop esponeva contemporaneamente 10 destinazioni canoniche, organizzate in 5 gruppi:

`Home · Oggi · Progetta · Conoscenza · Classi · Orario · Calendario · Piano annuale · Impostazioni · Account`

Mobile esponeva 4 destinazioni immediate (`Home · Oggi · Orario · Classi`) più `Altro`; aprendo `Altro` ricompariva l'intera tassonomia delle 10 destinazioni.

Task Cost strutturale:

- decisioni concorrenti al primo livello desktop: 10 destinazioni;
- concetti interni visibili: 10 moduli + 5 gruppi;
- mobile: 4 destinazioni + `Altro`, con `Altro` che duplicava anche le destinazioni già visibili;
- command palette: tutte le capability, correttamente disponibile come escape hatch ma sovrapposta alla stessa tassonomia della shell.

## Dopo — primo incremento UX-0B

Il primo livello ordinario è identico su desktop e mobile:

`Oggi · Classi · Orario · Materiali · Altro`

`Materiali` è il nome orientato al compito dell'accesso alla superficie canonica `Conoscenza`; la route e l'autorità della superficie non cambiano.

`Altro` contiene soltanto le capability secondarie non già presenti al primo livello:

- Home;
- Progetta;
- Piano annuale;
- Calendario;
- Impostazioni;
- Account e sicurezza.

La command palette conserva tutte le 10 capability e resta un escape hatch per ricerca per intenzione. Il marchio continua a riportare alla Home/cockpit.

Task Cost strutturale:

- decisioni di lavoro al primo livello: 4 destinazioni orientate al task;
- un solo accesso secondario coerente (`Altro`) su desktop e mobile;
- nessuna duplicazione delle 4 destinazioni primarie dentro `Altro`;
- capability canoniche preservate: 10/10;
- nessuna nuova tassonomia mobile rispetto al desktop;
- nessuna modifica a TeachingSession, AnnualPlanBlockProgress, RLS, AAL2 o persistenza.

## Criterio di accettazione

Questo documento misura la riduzione strutturale del costo di orientamento. La validazione percettiva resta affidata a HIM/HVA/WCAG e all'uso reale in Beta; il primo incremento non autorizza ulteriori redesign della Classe, che rimangono fuori scope UX-0B.
