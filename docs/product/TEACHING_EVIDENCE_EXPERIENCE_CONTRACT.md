# DOCENTE OS — Osservazioni ed evidenze — Experience Contract

Data: **2026-10-03**  
Stato: **TE-1B IMPLEMENTED / WHOLE-JOURNEY QUALIFICATION PENDING**  
Classificazione DOS-CRM: `DOS-OBSERVATION-EVIDENCE` — CRL 3 / IMPLEMENTED / CURRENT

## Intento

Consentire al docente di **osservare senza smettere di insegnare** e ricostruire ex post ciò che è accaduto senza introdurre una seconda burocrazia.

La capability vive nelle superfici esistenti: **Classe, Lezione, Diario, Progetta**. Non introduce una nuova destinazione primaria di navigazione.

## Stato runtime corrente

Il precedente confine “TE-1A storage only / UI not yet authorized” è superato.

Il runtime corrente include:
- una superficie `Osserva` nel workspace Lezione;
- 0–1 osservazione professionale sintetica di classe nel percorso corrente;
- dimensione canonica + stato osservato;
- nota facoltativa;
- draft effimero in `sessionStorage`;
- blocco/fail-closed quando un'osservazione authored non può essere conservata localmente;
- rifiuto di nominativi di studenti nelle note class-level;
- passaggio del draft al flusso `Registra la lezione`;
- persistenza atomica con TeachingSession attraverso TE-1A;
- ricevuta coerente sessione + observations + evidence references;
- replay/idempotency/security hardening lato database.

## Sequenza di esperienza

`Prepara → In classe → Osserva → Registra`

Finché il docente non registra:
- le spunte di attenzione restano promemoria locali;
- l'osservazione professionale resta draft effimero;
- nessuna `Observation` canonica viene persistita;
- non viene creata una seconda sessione canonica.

`Registra` resta il gesto che attraversa il boundary atomico.

## Stati umani

- **Non osservato**
- **Da sostenere**
- **In sviluppo**
- **Consolidato**

Gli stati non hanno valore numerico implicito, non equivalgono a voti e non vengono mediati.

## Privacy e minimizzazione

Nel perimetro corrente:
- scope primario `CLASS`;
- nessun profilo individuale persistente;
- nessun nominativo studente ammesso nella nota class-level;
- gruppi anonimi, quando usati, non diventano identità permanenti;
- la nota è limitata dimensionalmente;
- l'assenza di osservazione non blocca la registrazione della lezione.

## Persistenza atomica

`recordTeachingSessionWithEvidence` deve mantenere:
- una sola TeachingSession autorevole;
- cardinalità coerente tra draft e receipt;
- fail-closed su evidence non valide;
- idempotenza/replay coerenti;
- separazione tra registrazione della lezione e decisioni sul Piano annuale.

Le migrazioni di hardening 0055–0057 restano parte del confine di sicurezza.

## Mobile e accessibilità

La UI deve restare mobile-first:
- nessuna tabella orizzontale;
- nessun hover necessario;
- input essenziali e facoltativi distinguibili;
- stati non dipendenti dal solo colore;
- focus/feedback coerenti col design system.

Questa implementazione **non viene però dichiarata qualificata**: manca una prova browser whole-journey dedicata `Osserva → Registra` su mobile e desktop e manca HUMAN_USE del task in contesto reale.

## Anti-feature

Non costruire:
- pagina autonoma “Valutazione classe”;
- heatmap o semaforo globale;
- medie numeriche delle osservazioni;
- ranking;
- profili individuali persistenti;
- autosave canonico di Observation prima della TeachingSession;
- secondo Diario;
- secondo modello di TeachingSession;
- chatbot o orchestratore AI parallelo.

## Criterio di promozione DOS-CRM

Per CRL 4 serve dimostrare sul journey reale:
1. apertura `Osserva`;
2. draft opzionale;
3. privacy guards;
4. navigazione a `Registra`;
5. persistenza atomica;
6. replay/recovery;
7. lettura ex-post/provenance;
8. Browser Certification mobile + desktop.

CRL 5 richiede inoltre HUMAN_USE e failure/recovery evidence adeguate al rischio.
