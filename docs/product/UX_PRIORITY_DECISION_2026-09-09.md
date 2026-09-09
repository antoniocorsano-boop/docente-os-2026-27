# DOCENTE OS — Decisione di priorità UX

Data: 2026-09-09  
Stato: PROPOSTA VINCOLANTE PER IL PROSSIMO SLICE

## Decisione

Sospendere l'espansione orizzontale delle superfici e concentrare il prossimo sviluppo su **Oggi come orchestratore della giornata docente**.

## Ragione

La complessità percepita non deriva principalmente dall'assenza di funzioni, ma dal fatto che le funzioni esistenti sono presentate come destinazioni autonome. Il docente, invece, deve ricevere una composizione temporale dei dati già esistenti e una sola prossima azione coerente con il momento della giornata.

## Vincolo di superficie

**Oggi non deve diventare una nuova pagina infinita.** Deve funzionare come una superficie compatta, con divulgazione progressiva delle informazioni:

- una fascia iniziale con **prossimo impegno / prossima azione**;
- un riepilogo sintetico del **programma della giornata**;
- stato delle lezioni espresso solo come **Pronta / Da confermare / Da controllare**;
- massimo pochi elementi prioritari visibili senza scorrimento esteso;
- dettagli, materiali, scadenze e attività secondarie **chiusi per impostazione predefinita** e apribili su richiesta;
- nessuna duplicazione integrale delle viste Orario, Calendario, Classi, Piano annuale o Conoscenza;
- nessuna nuova dashboard o voce principale di navigazione dedicata al riepilogo mattutino.

Su mobile il primo viewport deve rispondere, nell'ordine, a tre domande: **cosa ho adesso? cosa viene dopo? devo preparare o confermare qualcosa?**

## Ordine del prossimo slice

1. mappare le fonti temporali già esistenti;
2. definire `DailyTeacherBrief` come modello derivato e non come nuova source of truth;
3. comporre lezioni, agenda, scadenze e stato preparazione;
4. determinare una sola `next best action`;
5. aggiungere preferenza per riepilogo mattutino configurabile;
6. validare il verticale su mobile con HIM/HVA;
7. solo dopo scegliere il canale di notifica browser definitivo.

## Non fare

- non aggiungere nuove voci principali di navigazione;
- non creare una nuova pagina lunga per il riepilogo quotidiano;
- non mostrare contemporaneamente tutte le sezioni espanse;
- non duplicare Orario o Calendario dentro un nuovo archivio;
- non anticipare notifiche push senza opt-in e senza fallback in-app;
- non trasformare suggerimenti dell'assistente in decisioni professionali automatiche;
- non promuovere la PR finché il percorso quotidiano non è verificato nel browser reale.
