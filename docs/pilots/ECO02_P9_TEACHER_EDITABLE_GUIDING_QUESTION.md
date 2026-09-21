# ECO-02/P9 — Teacher-editable guiding question

Status: **IMPLEMENTATION CANDIDATE / HUMAN FINDING RECORDED / DOS-A1 RUNTIME_DEFERRED**

Date: 2026-09-21

## Human finding

During the real Beta review of Technology 2C · B01, the teacher identified three connected usability and pedagogical-control problems:

1. the activation-question tool and the already accepted sequence item were shown at the same time, creating a perceptual duplicate;
2. the automatically proposed question was too generic for the lesson;
3. an accepted question could be removed but was not visibly editable by the teacher.

The observed UI therefore did not make the distinction between **proposal**, **teacher revision**, and **effective lesson content** sufficiently clear.

## Product decision

A guiding question remains a proposal until the teacher explicitly confirms it.

The canonical flow is:

`local proposal → teacher review/edit → explicit confirmation → lesson sequence`

If the teacher edits an already accepted question:

`accepted → teacher revision → MODIFIED → explicit reconfirmation → accepted`

The existing governed revision boundary `revise_lesson_design_extension` is reused. No parallel persistence path is introduced.

## UX decision

- The tool card is shown only before a guiding-question instance exists, eliminating the duplicate tool/sequence presentation.
- A pending guiding question is directly editable before confirmation.
- An accepted guiding question exposes **Modifica domanda**.
- Saving a modification removes the question from the effective sequence until the teacher confirms it again.
- The UI explicitly labels a modified item as **da riconfermare**.
- The tool name becomes **Domanda guida**.

## Pedagogical quality

The local deterministic generator no longer defaults to the generic “Che cosa sai già…”.

It uses simple grounded patterns. For lessons about systems, including Technology 2C · B01, the proposal asks the class to identify the elements that make the subject a system and the relations among them.

The generated text remains only a starting point: the teacher may rewrite it before use.

## Acceptance criteria

- no simultaneous duplicate presentation of the tool card and its current question instance;
- `PROPOSED` and `MODIFIED` questions are both visible in the review area;
- question text is editable by the teacher;
- editing an accepted question clears its acceptance through the existing governed revision RPC;
- a modified question requires a new explicit confirmation before it contributes to the lesson sequence;
- the current Technology 2C system lesson receives a relational, non-generic default question;
- no autonomous approval, curriculum adoption, lesson execution, or recording;
- Arena authority unchanged;
- `DOS-A1` remains `RUNTIME_DEFERRED`.

## Human retest

After Beta deployment, verify on Technology 2C · B01:

1. only one guiding-question representation is visible at a time;
2. **Modifica domanda** is available on an accepted question;
3. saving an edit moves the question to **Da controllare**;
4. the question does not return to the lesson sequence until **Conferma e usa**;
5. the edited text appears in guided lesson mode after reconfirmation.
