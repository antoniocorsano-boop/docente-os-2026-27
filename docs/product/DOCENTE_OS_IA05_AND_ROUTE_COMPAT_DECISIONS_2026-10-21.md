# DOCENTE OS — IA-05 Altro + Route Compatibility Decisions

Data: 2026-10-21
Stato: IA-05 APPROVATA / ROUTE COMPATIBILITY PROPOSTA DA CONFERMARE
Branch: `docs/dos-ia-product-reset`

## IA-05 — Altro / strumenti — APPROVATA

`Altro` è una sola superficie, senza ulteriori sottomenu obbligatori. Le voci sono organizzate in tre gruppi visivi; i gruppi orientano, non aggiungono un livello di navigazione.

### Lavoro
- Attività
- Progetta
- Piano annuale

### Risorse e organizzazione
- Materiali e fonti
- Calendario
- Documentazione

### Sistema
- Impostazioni
- Account e sicurezza

Regola:

> Altro raccoglie strumenti professionali importanti ma non quotidianamente primari. La gerarchia è visiva, non gerarchia di click.

Capability come Curricolo Arena, assistente/Copilota, voce e riconferma materiali restano contestuali e non diventano destinazioni primarie.

## Materiali di domani — APPROVATA

Casa stabile: `Altro -> Materiali e fonti`.

Accesso contestuale aggiuntivo: dall'Orario quando il docente consulta il giorno successivo.

Non è una voce primaria e non torna dentro Oggi.

## Route compatibility — proposta conservativa

Principio:

> Nessuna route legacy viene cancellata finché il nuovo percorso equivalente non è verificato. Le route legacy possono restare come alias/compatibilità ma non devono continuare a determinare la nuova IA.

### Oggi / Home / workspace

- `/planner` resta inizialmente la route tecnica canonica di Oggi, per minimizzare rotture di link e test.
- `/workspace` continua a risolvere verso Oggi; oggi già redirige a `/planner`.
- `/` cessa di essere una seconda dashboard e viene assorbita da Oggi; il comportamento target è redirect/alias verso `/planner`.
- La nuova UI non espone più Home come destinazione autonoma.

### Resoconto della giornata

`/giornata/resoconto` non ha un equivalente semantico unico perché oggi aggrega registrazione, Diario, materiali di domani e decisioni. Perciò non va rediretto ciecamente prima della redistribuzione completa.

Strategia:
1. rimuoverlo dalla navigazione primaria;
2. preservare temporaneamente la route per compatibilità;
3. migrare le capability verso Oggi/Lezione, Classe/Diario e Materiali;
4. solo dopo verifica di parità, ritirare o redirigere la route.

### Materiali legacy

- `/materiali/prossima`: compatibilità temporanea; il target canonico diventa la Lezione quando il contesto è risolvibile.
- `/materiali/domani`: compatibilità temporanea; il target canonico diventa `Altro -> Materiali e fonti`, con accesso contestuale da Orario.
- `/classi/[sectionId]/in-classe/[assetId]`: compatibilità temporanea; le capability confluiscono nel workspace Lezione.

### Fasi legacy della Lezione

Eventuali URL o query legacy che espongono `prepare/teach/observe/record` possono essere accettati durante la migrazione per non rompere deep link e test, ma la nuova UI non genera più una barra di fasi. Il target finale è sempre il workspace Lezione con stato determinato dal contesto attendibile.

## Criterio di ritiro

Una route legacy può essere eliminata o trasformata in redirect solo quando:

1. tutte le capability utili hanno una nuova casa verificata;
2. i link interni sono migrati;
3. i deep link importanti hanno un equivalente deterministico;
4. i test e la Human Review confermano che non è stato introdotto un passaggio intermedio inutile;
5. non vengono indeboliti blocker, provenienza, versioning o autorità.

Questa strategia privilegia compatibilità e reversibilità: semplifica la IA senza trasformare il redesign in una migrazione distruttiva.
