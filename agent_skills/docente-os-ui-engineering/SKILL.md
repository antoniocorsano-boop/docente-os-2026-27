---
name: docente-os-ui-engineering
description: Governed UI engineering discipline for DOCENTE OS.
license: Apache-2.0
metadata:
  version: "1.0.1"
  upstream_inspiration: "TidyFactor/Styler"
---

# DOCENTE OS UI Engineering

## Authority

This skill is subordinate to domain and safety contracts, Human Task/HIM, `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md`, and surface-specific canonical specifications.

`docs/design/HUMAN_INTERACTION_STATE_MATRIX.md` is currently marked `PROPOSED CANONICAL EXTENSION`. Until it is explicitly promoted and indexed, it is an advisory audit aid only. It MUST NOT create mandatory acceptance criteria or override canonical requirements.

## Operating rule

Conform to the existing product language and Design System. Inspect before changing, reuse canonical components and tokens, keep scope local, and never change product semantics through visual work.

## Required workflow

1. Recover the human task: goal, primary action, secondary actions, evidence, confirmation, success, recoverable error and relevant authority/privacy boundaries.
2. Inspect the current implementation: anatomy, components, tokens, responsive behavior, accessibility and duplicated local patterns.
3. Classify scope as `COMPONENT`, `SECTION`, `SURFACE`, `AUDIT` or justified `REDESIGN`.
4. Apply all interaction-state requirements already present in canonical Human Task/HIM and Design System documents. The proposed Human Interaction State Matrix may be used only as an advisory cross-check until promoted.
5. Preserve human language for empty, error, confirmation and blocked states.
6. Verify mobile, intermediate and desktop layouts when applicable; do not depend on hover; preserve canonical touch-target requirements and avoid unintended overflow.
7. Verify visible keyboard focus for every keyboard-operable control, including native disclosure `summary` elements; verify labels, names, heading order, reduced motion and zoom viability.
8. Progress through structural checks, canonical interaction checks, responsive viewport audit, live browser audit and HVA when the release gate requires it.

## Prohibited

Do not introduce a second design system, broaden authority, remove required confirmation, alter privacy or persistence as a visual side effect, treat a non-promoted document as mandatory, or declare HVA passed from automated evidence alone.

## Audit output

Report task clarity, hierarchy, canonical reuse, interaction coverage, mobile behavior, accessibility, authority/confirmation legibility, error/empty quality, visual debt and recommended scope. Use `PASS`, `PARTIAL`, `FAIL` or `NOT_APPLICABLE` with concrete evidence. Findings derived only from proposed documents must be labelled advisory.

## Upstream note

Inspired by TidyFactor/Styler's repository-level discipline of conforming to an existing design system and keeping transformations scoped. DOCENTE OS retains its own Human Task, authority, privacy, mobile-live-audit and HVA governance. No upstream runtime dependency is required.
