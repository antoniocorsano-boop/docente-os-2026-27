# UX-0F — HUMAN_USE validation receipt

Stato: **PENDING HUMAN_USE**  
Issue: **#383**  
Parent: **#368**  
Runtime candidato: `develop@3605912f764468b547aeb344c29f548734eca123`  
Target: Render Beta

## 1. Scopo

Questa receipt chiude il solo finding UX-0 / `M5-00D — Critical journey simplification / Task Cost` quando esiste evidenza di **uso umano reale** sufficiente.

Non è una receipt HVA automatica e non promuove automaticamente `M5-02A/B/C` a COMPLETE.

## 2. Regole di raccolta

- usare soltanto dati Tier-1-safe;
- non inserire dati personali di studenti;
- non preparare il percorso “per farlo passare”: usare il prodotto come durante lavoro normale;
- classificare ogni journey come `PASS`, `FRICTION`, `WORKAROUND` o `FAIL`;
- non cancellare friction o workaround dalla receipt dopo una correzione: aggiungere l’esito di recovery/closure;
- Task Cost after va misurato sul percorso realmente eseguito;
- se la baseline before è solo qualitativa, mantenere il confronto qualitativo invece di inventare un valore numerico retrospettivo.

## 3. Evidence tecnica già disponibile

Baseline runtime UX-0E:

- merge canonico: `3605912f764468b547aeb344c29f548734eca123`;
- Render Beta serve lo stesso SHA;
- P6 Render Beta: PASS;
- K1 Render Beta: PASS;
- X3 application + Render Beta: PASS;
- HVA runtime: PASS;
- HVA finale: 48 test PASS, 24/24 osservazioni, journey UX-0E mobile+desktop PASS, nessun finding automatico.

Questa evidence dimostra correttezza tecnica/automatica, non sostituisce la sezione HUMAN_USE seguente.

## 4. Journey 1 — Iniziare la giornata

Obiettivo umano: aprire DOCENTE OS e capire cosa richiede attenzione senza esplorare la tassonomia del prodotto.

- Stato: `PENDING`
- Esito: `—`
- Decision count after: `—`
- Internal concepts after: `—`
- Competing actions max: `—`
- Surface transitions: `—`
- Mandatory input burden: `—`
- Recovery burden: `—`
- Net work: `—`
- Tempo/orientamento percepito: `—`
- Friction / workaround / osservazioni: `—`

Baseline before: **ALTO/MEDIO** — il docente doveva interpretare più destinazioni e ricostruire il percorso quotidiano.

## 5. Journey 2 — Entrare in classe

Obiettivo umano: raggiungere la classe pertinente e capire immediatamente il task corrente/prossimo.

- Stato: `PENDING`
- Esito: `—`
- Decision count after: `—`
- Internal concepts after: `—`
- Competing actions max: `—`
- Surface transitions: `—`
- Mandatory input burden: `—`
- Recovery burden: `—`
- Net work: `—`
- Tempo/orientamento percepito: `—`
- Friction / workaround / osservazioni: `—`

Baseline before: **ALTO** — la Classe era il punto di massima densità, con preparazione, registrazione, Piano, materiali e fallback temporali concorrenti.

## 6. Journey 3 — Condurre una lezione

Obiettivo umano: avere supporti/materiali pertinenti quando servono senza uscire mentalmente dal compito lezione.

- Stato: `PENDING`
- Esito: `—`
- Decision count after: `—`
- Internal concepts after: `—`
- Competing actions max: `—`
- Surface transitions: `—`
- Mandatory input burden: `—`
- Recovery burden: `—`
- Net work: `—`
- Tempo/orientamento percepito: `—`
- Friction / workaround / osservazioni: `—`

Baseline before: **MEDIO/ALTO** — materiali, Conoscenza e Progetta potevano apparire come superfici da scegliere invece che supporti del task.

## 7. Journey 4 — Chiudere/registrare una lezione

Obiettivo umano: registrare ciò che è accaduto e tornare alla Classe senza comprendere entità interne.

- Stato: `PENDING`
- Esito: `—`
- Decision count after: `—`
- Internal concepts after: `—`
- Competing actions max: `—`
- Surface transitions: `—`
- Mandatory input burden: `—`
- Recovery burden: `—`
- Net work: `—`
- Tempo/orientamento percepito: `—`
- Friction / workaround / osservazioni: `—`

Baseline before: **ALTO** — il docente poteva dover distinguere registrazione reale, revisione/completamento Piano e concetti come TeachingSession/AnnualPlanBlockProgress.

## 8. Journey 5 — Preparare la successiva

Obiettivo umano: preparare o trovare ciò che serve e tornare al contesto corrente senza ricostruire classe/blocco.

- Stato: `PENDING`
- Esito: `—`
- Decision count after: `—`
- Internal concepts after: `—`
- Competing actions max: `—`
- Surface transitions: `—`
- Mandatory input burden: `—`
- Recovery burden: `—`
- Net work: `—`
- Tempo/orientamento percepito: `—`
- Friction / workaround / osservazioni: `—`

Baseline before: **MEDIO/ALTO** — ricerca materiali e progettazione potevano spezzare la continuità del task e perdere il contesto.

## 9. Roll-up Task Cost

| Journey | Before | After | Esito |
| --- | --- | --- | --- |
| Iniziare la giornata | ALTO/MEDIO | PENDING | PENDING |
| Entrare in classe | ALTO | PENDING | PENDING |
| Condurre una lezione | MEDIO/ALTO | PENDING | PENDING |
| Chiudere/registrare | ALTO | PENDING | PENDING |
| Preparare la successiva | MEDIO/ALTO | PENDING | PENDING |

## 10. Visual review HVA

Stato: **PENDING HUMAN REVIEW**.

Verificare almeno:

- una CTA primaria dominante nei passaggi critici;
- gerarchia leggibile titolo → contesto → stato → azione → contenuto;
- mobile 360–430 px senza sovrapposizioni o target ambigui;
- navigazione contestuale che non perde classe/ritorno;
- stati espressi con parole umane;
- assenza di concetti interni nei journey ordinari.

## 11. Criterio di chiusura

`UX-0F = PASS` soltanto se:

1. tutti i cinque journey sono eseguiti realmente;
2. nessun journey è `FAIL`;
3. nessuna friction/workaround bloccante resta non classificata;
4. il confronto Task Cost mostra riduzione coerente senza perdita di controllo umano;
5. zero concetti interni risultano obbligatori nei task ordinari;
6. visual review non apre finding bloccanti;
7. M5 Readiness e stato CURRENT vengono aggiornati con receipt e SHA finale;
8. #368 viene chiusa solo dopo l’integrazione della receipt.

Fino ad allora: **UX-0F PENDING / #368 OPEN / M5-00D REWORK_REQUIRED**.
