# Docente OS — Design Conformance DPG-2

Data: 2026-09-11  
Stato: CANONICAL / ENFORCED  
Classificazione: `COMPATIBLE`

## Scopo

DPG-2 governa il debito visuale storico dell'intero runtime. DPG-1 impedisce nuove violazioni deterministiche nel diff; DPG-2 misura l'eredità già presente e applica un ratchet: **il debito può restare uguale o diminuire, non aumentare**.

DPG-2 non dichiara automaticamente “bello” o “coerente” il prodotto. Trasforma invece il debito tecnico-visuale misurabile in una quantità governata e progressivamente riducibile.

## Perimetro

La scansione copre i file visuali sotto:

- `product/src/app/**`;
- `product/src/components/**`.

Le metriche iniziali sono:

1. `rawColors` — colori literal fuori dai file canonici di brand/token;
2. `localTokens` — definizioni di token visuali fuori dal punto canonico;
3. `legacyBrand` — riferimenti alle precedenti primitive di marchio;
4. `decorativeEffects` — effetti che richiedono giustificazione percettiva;
5. `rawRadii` — raggi locali non espressi tramite token canonici;
6. `rawShadows` — ombre locali non espresse tramite token canonici.

## Baseline iniziale

La prima scansione full-runtime ha analizzato 176 file e ha congelato il seguente tetto:

- raw colors: **697**;
- local tokens: **25**;
- legacy brand references: **8**;
- decorative effects: **9**;
- raw radii: **358**;
- raw shadows: **43**.

Questi numeri **non sono un target accettabile** e non costituiscono una deroga alle 20 regole. Sono il massimo storico ammesso dal ratchet. Ogni cleanup può sostituire la baseline con valori inferiori; nessuna PR può elevarli.

## Aree prioritarie emerse

Il primo inventario concentra il debito soprattutto in:

- `globals.css`;
- cockpit e workspace della lezione;
- assistant;
- impostazioni;
- piano annuale;
- conoscenza;
- orario.

La riduzione deve procedere per tranche piccole con HVA, senza riscritture massive che mettano a rischio i flussi didattici.

## Contratto di enforcement

Il workflow `Design Policy Gate` esegue in sequenza:

1. DPG-1 sul diff;
2. DPG-2 sull'intero runtime;
3. produzione delle ricevute JSON/Markdown.

Se una metrica DPG-2 supera la baseline congelata, la PR fallisce. Se una metrica diminuisce, la baseline può essere abbassata nello stesso PR dopo HVA.

## Relazione con HVA

DPG-2 misura debito staticamente osservabile. Restano di competenza HVA:

- una sola CTA realmente dominante;
- gerarchia informativa;
- calma e qualità percettiva;
- qualità tipografica;
- leggibilità reale mobile;
- preservazione del contesto;
- stati umani e copy;
- autorità percepita dei dati.

DPG-2 non auto-promuove queste regole a PASS.

## Regola di evoluzione

La baseline è **monotona decrescente**. Non può essere rialzata per far passare una feature. Un aumento richiede la correzione della feature; non è ammessa una “baseline refresh” che normalizzi una regressione.
