# Docente OS — Source Provenance Visual System

**Data:** 24 settembre 2026  
**Stato:** PROPOSED / CANONICAL CANDIDATE  
**Classificazione:** `COMPATIBLE`  
**Dipende da:** Design System V2 · Brand Identity Canonical · Design Governance Canonical · Language & Collaboration System  
**Evidence:** ECO-02/P1 human pilot

## 1. Scopo

Definire il pattern canonico con cui Docente OS rende immediatamente percepibile la provenienza di contenuti, materiali, proposte ed evidenze provenienti da sistemi o fonti differenti.

Il pattern implementa operativamente il composito `SourceProvenance` già previsto dal Design System V2.

## 2. Principio

> Ogni contenuto source-derived deve dichiarare la propria provenienza in modo visivamente percepibile, semanticamente chiaro e accessibile.

Il pattern base è:

**source mark/icon + human label**

La label non può essere eliminata nelle superfici ordinarie.

## 3. Non-obiettivi

Questa specifica non:
- modifica `sourceKind` o il domain model;
- attribuisce authority a una fonte;
- introduce ranking tra fonti;
- modifica stato/approval;
- crea nuovi runtime cross-product;
- autorizza Docente OS → Atlas;
- introduce nuove palette locali;
- ridisegna i marchi Atlas o Docente OS.

## 4. Separazione semantica

### SourceProvenance
Dice **da dove viene**.

### HumanStatusBadge
Dice **a che punto è**.

### Authority/provenance details
Spiegano **chi possiede authority**, binding, versione e identificativi quando necessario.

I tre livelli non devono essere fusi in un unico badge.

## 5. API concettuale

`SourceProvenance` deve poter rappresentare almeno:

```ts
type SourceProvenanceKind =
  | 'ATLAS'
  | 'KNOWLEDGE'
  | 'EDITORIAL_KNOWLEDGE'
  | 'TEACHER'
  | 'WEB'
  | 'AI_TOOL'

type SourceProvenanceView = {
  kind: SourceProvenanceKind
  label: string
  accessibleLabel: string
  mark: 'ATLAS_MARK' | 'DOCENTE_OS_MARK' | 'LUCIDE'
  icon?: string
  detail?: string
}
```

Questa API è descrittiva; l’implementazione può adattarsi ai tipi esistenti purché preservi il mapping canonico.

## 6. Registry canonico

Il mapping deve vivere in un unico registry/component layer, non essere ricreato in ogni feature.

Baseline:

| `sourceKind` | Label UI | Segno/icona | Note |
|---|---|---|---|
| `ATLAS` | Atlas | `✦` Atlas mark | segno prodotto sorgente |
| `KNOWLEDGE` | Conoscenza | simbolo Docente OS ridotto canonico | provenance nativa Docente OS |
| `EDITORIAL_KNOWLEDGE` | Dal libro | `BookOpen` | origine editoriale prevale sul sistema ospitante |
| `TEACHER` | Docente | `PenLine` o equivalente canonico | decisione/inserimento umano |
| `WEB` | Web | `Globe2` o equivalente canonico | fonte esterna |
| `AI_TOOL` | Strumento assistito | `Sparkles` | non usare “AI” come sigillo di qualità |

Lucide resta il set funzionale canonico.

## 7. Atlas mark

Per `ATLAS` usare il segno già presente nel prodotto Atlas:

**`✦`**

Regole:
- non sostituirlo con `Diamond`, `Gem` o altre icone;
- non ridisegnarlo localmente;
- nel badge Docente OS usarlo preferibilmente in `currentColor`/monocromatico;
- la label “Atlas” deve essere presente nella vista ordinaria;
- il mark può essere `aria-hidden=true` quando accompagnato dalla label.

La provenienza completa può mostrare, in progressive disclosure:
- Curriculum Atlas;
- lesson/material id;
- versione;
- stato;
- URL pubblico.

## 8. Docente OS mark

Per provenance nativa `KNOWLEDGE`, il sistema può usare il simbolo Docente OS ridotto **solo se ottenuto dal componente/asset canonico condiviso**.

È vietato:
- ricostruire una D approssimativa;
- usare un’icona Lucide come “logo Docente OS”;
- creare una variante geometrica locale.

Se il mark canonico ridotto non è ancora esposto come componente riusabile, la prima tranche deve centralizzarlo prima dell’uso.

Label: **Conoscenza**.

Il mark identifica il sistema di origine; la label identifica il significato professionale.

## 9. Origine editoriale

`EDITORIAL_KNOWLEDGE` usa:

- `BookOpen`;
- label **Dal libro**.

Non usa il marchio Docente OS come segno primario perché per il docente conta maggiormente l’origine editoriale.

Nei dettagli può comparire:
“Gestito nella Conoscenza di Docente OS”.

## 10. Origine docente

`TEACHER` usa:
- `PenLine` o icona funzionale equivalente già canonica;
- label **Docente**.

Non deve usare il logo Docente OS: “creato/inserito dal docente” è semanticamente diverso da “proveniente dal sistema Docente OS”.

## 11. Web e strumenti assistiti

`WEB`:
- `Globe2`;
- label **Web**.

`AI_TOOL`:
- `Sparkles`;
- label **Strumento assistito**.

La label “AI” da sola è sconsigliata perché descrive tecnologia, non rapporto professionale. I dettagli possono specificare provider/tool quando rilevante.

## 12. Anatomia del componente

Forma ordinaria:

`[mark 14–16px] [label 12–13px]`

Vincoli:
- inline-flex;
- gap ridotto;
- altezza compatta 22–28 px;
- peso visuale inferiore al titolo;
- nessuna ombra;
- nessun gradiente;
- bordo/background solo tramite token canonici;
- nessun colore raw source-specific nella prima versione.

Il componente non deve sembrare una CTA.

## 13. Varianti

### Inline
Per card, materiale allegato, metadata.

### Compact
Per liste dense/mobile; mantiene comunque label testuale quando c’è spazio ordinario.

### Detail
Aggiunge source label estesa, versione, binding o link nei dettagli progressivi.

### Icon-only
Eccezionale:
- solo quando vincoli di spazio reali lo richiedono;
- nome accessibile obbligatorio;
- tooltip;
- non usare come default.

## 14. Posizionamento

### Lesson Design — proposta
Vicino alla micro-label di origine, prima del titolo o immediatamente sopra.

Esempio:
`✦ Atlas`  
**Mappa del sistema agricolo**

### Materiali allegati
Il marker resta visibile anche dopo l’adozione.

Esempio:
**Mappa del sistema agricolo**  
`✦ Atlas` · Materiale allegato

### Conoscenza
Mostrare provenance nel primo viewport quando source-derived.

### Planner/Oggi
Usare `SourceProvenance` per task derivati da fonti quando aiuta a capire l’origine.

## 15. Lifecycle

La provenance è immutabile rispetto al lifecycle UI.

Per una stessa risorsa:
- PROPOSED → Atlas;
- ACCEPTED → Atlas;
- DISMISSED/rimossa → se riproposta resta Atlas;
- MODIFIED → provenance originaria resta Atlas, mentre la UI può indicare separatamente “modificato dal docente” se necessario.

Una modifica del contenuto non deve cancellare l’origine.

## 16. Provenance primaria e contributi

V1 mostra **una provenance primaria**.

Se in futuro un contenuto ha più contributi:
- il marker principale resta quello della fonte primaria;
- i contributi ulteriori vanno in progressive disclosure;
- evitare pile di badge nel primo viewport.

## 17. Accessibilità

Obbligatorio:
- label testuale nelle viste ordinarie;
- icona decorativa con `aria-hidden` quando la label è presente;
- `aria-label`/tooltip per icon-only;
- nessuna dipendenza dal colore;
- contrasto WCAG AA per testo/icone;
- non usare emoji come unico contenuto accessibile;
- screen reader deve ricevere “Provenienza: Atlas”, “Provenienza: Conoscenza”, ecc. nei contesti in cui la semantica non è già chiara.

## 18. Responsive

Desktop/tablet:
- variant inline standard.

Mobile 360–430:
- non aumentare altezza card in modo sproporzionato;
- marker può stare sulla stessa riga dei metadata;
- non troncare la label primaria in forma ambigua;
- niente horizontal overflow.

## 19. Stato e authority

Il componente non deve mostrare:
- READY;
- VERIFIED;
- APPROVED;
- authority;
- “consigliato”;
- “ufficiale”;

come parte della provenance.

Questi concetti appartengono a componenti/testi separati.

Esempio corretto:
`✦ Atlas` + `Pronto`

non:
`✦ Atlas verificato` se “verificato” non è uno stato canonico specifico della risorsa.

## 20. Microcopy

Preferire:
- Atlas
- Conoscenza
- Dal libro
- Docente
- Web
- Strumento assistito

Dettaglio:
- Provenienza: Curriculum Atlas
- Provenienza: Conoscenza di Docente OS
- Provenienza: libro confermato per la classe
- Inserito dal docente
- Fonte web
- Proposto da strumento assistito

Evitare:
- Fonte interna
- Sistema
- Provider
- sourceKind
- AI generated
- Asset

nella superficie ordinaria.

## 21. Enforcement

La prima implementazione deve:
- centralizzare mapping e rendering;
- vietare mapping duplicati nelle feature migrate;
- usare Lucide per icone funzionali;
- non introdurre raw colors;
- passare DPG-1/DPG-2;
- includere test del registry;
- includere test che `ATLAS` renda `✦` + “Atlas”;
- includere test accessibilità del nome;
- includere HVA desktop/mobile.

## 22. Rollout consigliato

### P1 — Lesson Design
- Da Atlas;
- Potrebbe servirti qui;
- Materiali allegati;
- Da controllare source-derived.

### P2 — Conoscenza
- lista e dettaglio.

### P3 — Planner/Oggi
- task derivati da fonti.

### P4 — superfici assistente
- citazioni/proposte source-derived.

Ogni fase deve riusare lo stesso registry.

## 23. Acceptance criteria P1

PASS quando:
1. una risorsa Atlas mostra `✦ Atlas` prima e dopo l’adozione;
2. la rimozione e riproposta non cambiano la provenance;
3. Knowledge mostra “Conoscenza” con il marker previsto;
4. Editorial Knowledge mostra “Dal libro”;
5. Teacher/Web/AI_TOOL hanno mapping canonico;
6. status resta separato;
7. nessuna informazione dipende dal colore;
8. mobile 360–430 non introduce overflow;
9. screen reader riceve un nome comprensibile;
10. non sono introdotti nuovi token raw/locali.

## 24. Decisioni differite

Non vengono decisi in questa specifica:
- palette source-specific;
- marker multipli simultanei;
- provenance filter globale;
- click del badge verso un provenance inspector;
- formalizzazione domain-level di `originSystem` separato da `sourceKind`.

Questi punti richiedono evidenza d’uso successiva.

## 25. Classificazione e gate

**COMPATIBLE**

Motivazione:
- completa `SourceProvenance` già previsto dal Design System V2;
- non cambia la geometria dei brand;
- non cambia authority o domain model;
- non introduce nuova libreria iconografica;
- non cambia navigazione o gerarchie primarie.

Gate per la futura implementazione:
- Product CI;
- Design Policy Gate DPG-1/DPG-2;
- Human Interaction Model;
- HVA desktop/mobile;
- accessibility smoke;
- Browser Certification sulle superfici P1.

## 26. Relazione con TRAMA

La specifica rende percepibile in Docente OS la separazione dei domini TRAMA:
- Atlas resta Atlas anche dopo l’adozione;
- Docente OS non assorbe o riscrive la provenienza;
- il docente vede l’origine senza dover conoscere l’architettura;
- la decisione professionale resta distinta dalla fonte.

Questo sostiene il principio: **provenienza visibile, authority preservata, decisione umana esplicita**.
