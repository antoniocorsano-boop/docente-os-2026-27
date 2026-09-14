# DOCENTE OS — Osservazioni ed evidenze — Experience Contract

Data: 2026-09-14  
Stato: CONTRACT FROZEN — TE-1A STORAGE ONLY — UI NOT YET AUTHORIZED

## Intento

Consentire al docente di **osservare senza smettere di insegnare** e ricostruire ex post ciò che è accaduto senza introdurre una seconda burocrazia.

La capability vive nelle superfici già esistenti: **Classe, Lezione, Diario, Progetta**. Non introduce una nuova destinazione primaria di navigazione.

## Semantica già consolidata

PR #361 ha unificato `Registra la lezione`: ogni percorso canonico produce una `TeachingSession`; la decisione sul Piano annuale resta separata e human-gated.

La sequenza di esperienza resta:

```text
Prepara → In classe → Osserva → Registra
```

## In aula

La futura TE-1B dovrà consentire 0–4 micro-rilevazioni tipiche con pochi tocchi, nessun obbligo di completare una griglia e nessuna scelta di alunni individuali.

Finché il docente non sceglie **Registra la lezione**:

- le micro-rilevazioni sono draft effimeri della superficie;
- nessuna `Observation` viene persistita;
- nessuna seconda “sessione in corso” canonica viene creata;
- il docente può modificare liberamente le selezioni.

`Registra` sarà l'unico gesto che invia sessione + observation draft + evidence-reference draft al boundary atomico TE-1A.

## Stati umani

- **Non osservato**
- **Da sostenere**
- **In sviluppo**
- **Consolidato**

Gli stati non hanno valore numerico implicito, non equivalgono a voti e non vengono mediati.

## Classe e lettura ex post

La Classe non diventa una tabella permanente di livelli. Dovrà privilegiare segnali recenti, aspetti da osservare, evidenze recenti e accesso `Perché?` alla provenienza.

Nel Tier 1 corrente l'analisi longitudinale è solo `CLASS`. I gruppi anonimi sono temporanei e session-local.

## Diario

`TeachingSessionReflection` e la proiezione Drive restano il Diario canonico. Observation/Evidence possono preparare una bozza di sintesi, ma non sovrascrivono silenziosamente una reflection già salvata.

## Progetta

Un pattern può generare una proposta, mai una mutazione automatica. Solo `Accetta` o `Modifica` può autorizzare un successivo write attraverso i boundary umani già esistenti.

## Mobile e accessibilità per TE-1B

La futura UI sarà mobile-first, utilizzabile con una mano, senza tabelle orizzontali, hover o testo lungo obbligatorio. Gli stati non dipenderanno dal solo colore; controlli, focus e feedback seguiranno il design system canonico e i gate WCAG/HVA/HIM.

## Anti-feature

Non costruire:

- pagina autonoma “Valutazione classe”;
- heatmap o semaforo globale;
- medie numeriche delle osservazioni;
- ranking;
- profili individuali persistenti;
- autosave di Observation prima della TeachingSession;
- secondo Diario;
- secondo modello di TeachingSession;
- chatbot o orchestratore AI parallelo.

## Confine TE-1A

TE-1A implementa **solo persistenza atomica, provenienza, idempotenza e sicurezza**. Non rende ancora persistente la UI `Osserva`. Il passaggio UI richiede una TE-1B separata e nuovi gate HVA/WCAG/mobile sul relativo exact head.
