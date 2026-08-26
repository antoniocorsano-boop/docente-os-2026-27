---
name: human-interaction-model
description: >-
  Governs human-centred product design through reusable Human Task, journey,
  interaction-contract, pattern, acceptance and evidence rules.
license: Apache-2.0
metadata:
  version: "1.0.0"
  scope: "repository-installable"
---

# Human Interaction Model — Agent Skill

## Purpose

Apply HIM before treating a meaningful product capability as complete.

Core rule:

> Model the human task before optimizing the feature surface.

## Read first

When installed, inspect:

1. `.human/him.config.json`
2. `.human/tasks/`
3. relevant product/domain contracts
4. current accessibility and visual-acceptance evidence
5. runtime/test files affected by the task

## Required reasoning sequence

For each meaningful capability determine:

1. actor and real context;
2. human intent;
3. entry point;
4. success outcome;
5. dominant action;
6. secondary actions;
7. failure states;
8. recovery;
9. whether the action has material consequences;
10. whether explicit human authority is required;
11. accessibility constraints;
12. evidence required for acceptance.

Do not derive the interaction model from database tables, routes, APIs or component inventory.

## Interaction rules

- Prefer domain language over technical identifiers.
- Preserve task context across internal navigation.
- In focused contexts expose one dominant action.
- Use progressive disclosure for technical and secondary detail.
- Make non-trivial processing state visible.
- Prevent errors before merely explaining them.
- Every recoverable failure needs an explicit recovery path.
- Consequential actions require preview/consequence visibility and explicit human decision unless the installed contract explicitly documents a safe exception.
- Provide receipt after committed mutation.
- Provide reversal or recovery when feasible.
- AI proposals do not become consequential canonical actions without the required human boundary.

## Pattern selection

Use the repository pattern registry when present. Do not create a new pattern family merely because wording or domain objects differ.

A new pattern is justified only when an existing interaction contract cannot represent a recurring human problem without semantic distortion.

## HIA

Treat Human Interaction Acceptance as distinct from technical correctness.

Minimum checks for critical tasks:

- identifiable task;
- discoverable entry;
- clear primary action;
- understandable domain language;
- preserved context;
- visible state;
- failure recovery;
- protected consequential actions;
- adequate reversibility;
- accessibility;
- coherent visual hierarchy;
- no technical leakage in primary interaction.

Automation may verify governance and structural completeness. It must not claim subjective usability has been proven solely by static validation.

## Compatibility

Existing Human Task and HVA assets remain valid inputs. HIM generalizes them; it does not invalidate established repository evidence.

## Fail-closed conditions

Return the capability to review when:

- the human task is ambiguous;
- success cannot be stated independently from implementation;
- a consequential action lacks an authority boundary;
- an error has no recovery strategy;
- technical identifiers are required for normal primary interaction without domain justification;
- acceptance evidence is claimed but absent;
- automation is being used to replace a genuinely human evaluation.

## Completion report

Report:

- HIM profile/version;
- Human Task IDs affected;
- interaction contracts/patterns used;
- consequential boundaries;
- recovery coverage;
- accessibility state;
- HIA evidence state;
- automated validation result;
- unresolved human decisions.
