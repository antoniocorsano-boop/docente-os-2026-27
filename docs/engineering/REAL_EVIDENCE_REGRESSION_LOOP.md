# Real Evidence Regression Loop

## Scopo

Questo ciclo è il percorso predefinito per i difetti o le regressioni scoperti durante prove reali su Docente OS.

L'obiettivo è evitare che il collaudo umano diventi il principale strumento di debugging.

## Ciclo permanente

1. **Evidenza reale**
   - screenshot, documento, comportamento osservato o percorso utente reale;
   - si registra il difetto concreto e il risultato atteso.

2. **Riduzione sicura dell'evidenza**
   - il documento originale non viene committato se contiene dati non necessari;
   - si crea una fixture sanitizzata oppure un generatore deterministico che preserva soltanto la struttura necessaria a riprodurre il difetto.

3. **Regressione automatica**
   - il difetto deve diventare un test automatico;
   - quando possibile il test deve usare la stessa superficie e lo stesso viewport del percorso reale;
   - il risultato atteso deve derivare dall'evidenza corrente, non da baseline storiche incomplete.

4. **Certificazione focalizzata**
   - le modifiche alla capability devono richiamare automaticamente i test di regressione pertinenti;
   - non si aggiungono gate generici se è sufficiente estendere lo scope focalizzato esistente.

5. **Deploy beta**
   - il commit qualificato viene distribuito sull'ambiente beta canonico;
   - il commit/deploy deve essere tracciabile.

6. **Smoke automatico**
   - quando tecnicamente possibile, si verifica automaticamente che il percorso pubblico/deployato risponda e che la versione pubblicata corrisponda allo SHA qualificato.

7. **Collaudo umano finale**
   - il docente verifica soltanto gli aspetti non affidabili da automatizzare: touch reale, Share Target Android, installazione PWA, percezione d'uso e coerenza operativa;
   - un difetto trovato qui torna al punto 1 e diventa una nuova regressione permanente.

## Regola di chiusura

Un difetto osservato su un percorso reale non è considerato chiuso finché non esiste una prova automatica che impedisca la stessa regressione, salvo impossibilità tecnica documentata.

## Regola sulle baseline

Le fixture non possono essere costruite copiando implicitamente dati storici se esiste un'evidenza più recente. La baseline deve essere esplicita, datata e coerente con il caso corrente.

## Applicazione corrente: Orario mobile

Per l'Orario:
- il PDF completo reale non viene committato;
- la fixture è generata deterministicamente;
- il caso 28/09/2026 richiede 14 lezioni per Corsano;
- il Browser Certification focused scope deve eseguire la regressione quando cambiano Orario o Share Target;
- il test umano Android resta il collaudo finale.
