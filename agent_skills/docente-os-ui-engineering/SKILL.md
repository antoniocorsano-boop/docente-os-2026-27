---
name: docente-os-ui-engineering
description: >-
  Governed UI engineering skill for DOCENTE OS. Uses the canonical Design System,
  Human Task/HIM constraints, interaction-state coverage, responsive verification,
  accessibility and HVA to improve existing interfaces without creating a competing
  visual language or changing domain authority.
license: Apache-2.0
metadata:
  version: "1.0.0"
  upstream_inspiration: "TidyFactor/Styler"
---

# DOCENTE OS UI Engineering

## Purpose

Improve or audit an existing DOCENTE OS component, section or surface while preserving product semantics, domain authority and the canonical Design System.

This skill is an implementation discipline. It is not an authority for product requirements, domain semantics, permissions, privacy rules or human approval.

## Authority order

When instructions conflict, follow this order:

1. domain and safety contracts;
2. Human Task / Human Interaction Model contracts;
3. `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md`;
4. surface-specific specifications;
5. this skill;
6. local implementation convenience.

Never use a visual redesign to redefine an action, broaden an authority, bypass confirmation or conceal a blocked state.

## Core rule — conform, do not compete

Before creating styles, tokens, components or interaction conventions:

1. inspect the existing surface;
2. locate canonical primitives/composites already available;
3. reuse semantic tokens and established anatomy;
4. change only the smallest coherent surface required by the task;
5. create a new pattern only when no canonical equivalent exists and record why.

A change fails review if it introduces a local design language that duplicates an existing product convention.

## Required workflow

### 1. Recover the human task

State explicitly:

- user goal;
- primary action;
- secondary actions;
- required evidence/context;
- confirmation point, if any;
- success condition;
- recoverable error path;
- authority or privacy boundary relevant to the action.

If these are unclear, do not infer new product semantics from visual layout.

### 2. Inspect before changing

Audit the current implementation for:

- page anatomy;
- existing primitives and composites;
- semantic tokens;
- typography and spacing conventions;
- navigation pattern;
- feedback pattern;
- responsive behavior;
- accessibility semantics;
- duplicate or ad-hoc UI patterns.

### 3. Choose scope

Classify the operation as one of:

- `COMPONENT` — one reusable element;
- `SECTION` — one coherent region of a surface;
- `SURFACE` — one complete task surface;
- `AUDIT` — analysis only, no visual redesign;
- `REDESIGN` — allowed only when the Human Task remains unchanged and the current surface demonstrably fails its contract.

Do not broaden scope silently.

### 4. Apply the Human Interaction State Matrix

For every interactive element or task transition, evaluate the applicable dimensions defined in `docs/design/HUMAN_INTERACTION_STATE_MATRIX.md`.

At minimum consider:

- default;
- hover where relevant;
- active/pressed;
- keyboard focus;
- disabled;
- loading/in progress;
- empty/not yet available;
- error;
- blocked by authority;
- requires human confirmation;
- success/completed;
- read-only where relevant.

A technical `disabled` style must never be used as the sole representation of an authority decision.

### 5. Preserve human language

Raw provider states, database codes, UUIDs and implementation jargon stay in technical details unless the user explicitly needs them.

Every error must answer:

1. what did not succeed;
2. what remained unchanged or safe;
3. what the user can do now.

Every empty state must explain what is missing, why that may be normal and what action is available.

### 6. Responsive-first verification

A surface is not complete after desktop implementation.

Verify at least:

- narrow mobile viewport;
- tablet/intermediate width when layout changes structurally;
- desktop;
- no primary action depends on hover;
- touch targets remain at least 44 px;
- no unintended horizontal overflow;
- no double primary scroll;
- assistant/inspector follows the canonical desktop/mobile behavior.

### 7. Accessibility gate

Before acceptance verify:

- visible keyboard focus;
- complete keyboard path on desktop;
- associated labels and accessible names;
- semantic heading order;
- no color-only meaning;
- 200% zoom viability;
- reduced-motion behavior;
- icon-only controls have names;
- dialogs/sheets expose correct focus behavior;
- touch targets satisfy the canonical minimum.

### 8. Verification ladder

A UI change should progress through:

`structural tests -> interaction-state coverage -> responsive viewport audit -> live browser audit -> HVA`

Automated tests can reject a change but cannot replace the final human validation for a materially changed workflow.

## Prohibited behavior

Do not:

- redesign unrelated surfaces while touching one task;
- add a second token system;
- replace canonical DOCENTE OS composites with generic templates without a documented reason;
- make destructive or authoritative actions visually casual;
- hide required confirmation to reduce clicks;
- promote AI output as authoritative through styling;
- alter privacy, persistence or provider behavior as a side effect of visual work;
- declare HVA passed from screenshots or DOM tests alone.

## Audit output

For an `AUDIT`, report each surface against:

- task clarity;
- visual hierarchy;
- canonical component reuse;
- state coverage;
- mobile behavior;
- accessibility;
- authority/confirmation legibility;
- error/empty-state quality;
- visual debt;
- recommended intervention scope.

Use `PASS`, `PARTIAL`, `FAIL`, or `NOT_APPLICABLE` and attach concrete evidence.

## Definition of done

A UI intervention is done only when:

- Human Task semantics are unchanged or explicitly approved elsewhere;
- canonical components/tokens are reused where available;
- applicable interaction states are represented;
- desktop and mobile behavior are verified;
- accessibility gate is satisfied;
- no authority/privacy boundary is weakened;
- regressions are covered by tests where practical;
- HVA is completed when required by the release gate.

## Upstream note

This skill is inspired by the repository-level UI transformation discipline of TidyFactor/Styler, especially its emphasis on conforming to an existing design system, scoped transformations and explicit interactive states. DOCENTE OS extends that model with Human Task, authority, privacy, mobile-live-audit and HVA requirements. No upstream runtime dependency is required.
