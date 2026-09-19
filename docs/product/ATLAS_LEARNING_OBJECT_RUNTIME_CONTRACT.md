# DOS-A1 — Atlas Learning Object runtime experience contract

Status: PRODUCT_CONTRACT_DRAFT  
Date: 2026-09-19

## Goal

A teacher can consume Atlas Learning Objects from the current Docente OS task without creating a second source of truth.

## Entry points

- Progetta
- Classe
- Lesson Workspace
- Copilota contextual suggestion

## Primary UI

Show human labels first:
- material title;
- class/grade;
- duration;
- lifecycle/version;
- relevant actions.

Do not lead with LO/PAT/APP/ART technical ids.

## Material actions

- Proietta
- Scheda studente
- Guida docente
- Valutazione

Each action opens the declared canonical asset or a clearly marked disposable delivery derivative.

## Lifecycle behavior

CANONICAL:
may be auto-suggested when contextually relevant.

REVIEWED:
may be suggested with review state visible.

GENERATED:
available only with a clear “da validare” state.

DRAFT / RETIRED:
not auto-suggested.

Docente OS cannot promote lifecycle.

## Provenance

Resource detail retains:
- LO id;
- version;
- lifecycle;
- Atlas source;
- curriculum node relation;
- app/pattern reference where useful;
- asset version.

## Return context

Moving to Atlas or an asset must preserve:
- class;
- lesson/block;
- UDA;
- originating task.

## Classroom validation

After the lesson the teacher sees a very small validation prompt.

The private workspace keeps detailed context.
Only a minimized `TeachingUseReceipt` may leave Docente OS.

## Acceptance journey

`Oggi/Classi → Lezione → Materiali → Proietta → torna alla lezione → validazione breve`.

No manual Drive folder navigation.
