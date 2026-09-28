# DOS-TT-IMPORT-01 — G1.6-D Import Preview

## Stato
**DESIGN / CONTRACT — PREVIEW_ONLY / READ_ONLY**

Baseline: `develop@3493eb1829044fc482aef7a4d9316e71b5bd07b3`.

G1.6-D proietta il `TimetableImportCandidate` governato da G1.6-C in una rappresentazione comprensibile al docente. Non crea, modifica o attiva alcun orario.

## Autorità del contratto
La sola sorgente autorevole per G1.6-D è `product/src/core/domain/timetable-import-candidate.ts` (G1.6-C), inclusi `candidateId`, provenienza, fingerprint, stato e risoluzione docente derivata da G1.6-B.

I moduli preesistenti `timetable-import-preview.ts` e `timetable-import.ts` sono legacy rispetto a G1.6-D e **non costituiscono autorità semantica** per questa slice. In particolare G1.6-D non adotta:
- identificazione tramite solo cognome (`teacherSurname`);
- confidence/probabilità come sostituto dell'evidenza governata;
- `AUTO_RESOLVED` come secondo resolver;
- `canConfirmDraft` come autorizzazione alla scrittura;
- `DifferencePlan` o operazioni KEEP/ADD/MOVE/CHANGE/REMOVE;
- inferenza o imposizione di T/D/DIS.

La loro eventuale deprecazione/rimozione è fuori scope e richiede una slice separata.

## Scopo
Trasformazione pura:

`TimetableImportCandidate -> TimetableImportPreviewModel`

Il preview deve permettere al docente di vedere:
- fonte leggibile e fingerprint;
- decorrenza `effectiveFrom`;
- stato complessivo `PREVIEW_READY | REVIEW_REQUIRED`;
- griglia settimanale derivata dagli slot canonicalizzati;
- classe e label docente sorgente;
- cattedra risolta, quando G1.6-B/G1.6-C l'hanno già risolta;
- reason code ed elementi che richiedono intervento umano.

## Invarianti
- read-only: nessuna Server Action e nessun repository Supabase;
- nessuna creazione/modifica di `TimetableVersion`;
- nessuna creazione/modifica di slot persistiti;
- nessun DRAFT -> ACTIVE;
- nessuna conferma equivale ad applicazione;
- nessun secondo resolver docente;
- nessuna risoluzione per cognome, fuzzy matching o confidence;
- nessuna T/D/DIS derivata dal documento;
- `candidateId = null` resta non confermabile/non persistibile;
- `provenance = null` resta evidenza insufficiente, mai ricostruita o inventata;
- `sourceLabel` è solo informativa; fingerprint + identità governata restano l'ancoraggio;
- la preview non modifica il candidato ricevuto;
- stesso candidato canonico -> stesso modello logico di preview.

## Riutilizzo UI
La griglia esistente di `/orario` è riutilizzabile come linguaggio visuale, ma non come superficie di mutazione.

G1.6-D può riusare o estrarre primitive pure da:
- `timetable-grid-model.ts`;
- convenzioni giorno/fascia della griglia;
- componenti visuali solo se possono operare in modalità esplicitamente read-only.

Non deve invocare le action mutative di `product/src/app/orario/actions.ts`.

## Decisione umana
G1.6-D può rappresentare l'intenzione del docente di proseguire, ma **non materializza ancora una conferma persistita né un DRAFT**.

Un futuro artefatto di conferma dovrà essere legato all'exact `candidateId` e invalidarsi se il candidato cambia. Questo boundary appartiene a una slice successiva e non viene anticipato qui.

## Gate automatici minimi
1. `PREVIEW_READY` valido -> preview read-only completa;
2. `REVIEW_REQUIRED` -> blocchi/reason code visibili;
3. `candidateId = null` -> nessuna azione di prosecuzione abilitabile;
4. `provenance = null` -> nessuna provenienza inventata;
5. ordine canonico stabile;
6. label sorgente e cattedra risolta restano semanticamente distinte;
7. input immutato dopo la proiezione;
8. nessuna importazione da repository Supabase o Server Action;
9. nessuna regressione G1.6-A/B/C;
10. nessun T/D/DIS introdotto.

## Fuori scope
- parser/OCR;
- acquisizione/upload;
- persistenza del candidato;
- correzione persistita delle anomalie;
- `TimetableImportConfirmation`;
- confronto/apply con ACTIVE;
- creazione o modifica DRAFT;
- DRAFT -> ACTIVE;
- chiusura dell'intervallo precedente;
- replan;
- CAN-PLAN;
- DOS-A1.

Restano invariati `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED`.

## Gate di chiusura
- contratto e implementazione coerenti;
- projection builder puro e deterministico;
- test fail-closed/read-only PASS;
- G1.6-A/B/C senza regressioni;
- CI completa PASS;
- revisione tecnica indipendente PASS;
- HUMAN REVIEW prima del merge.
