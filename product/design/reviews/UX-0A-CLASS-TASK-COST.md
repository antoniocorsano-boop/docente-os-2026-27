# UX-0A — Class task simplification receipt

Status: IMPLEMENTATION_CANDIDATE  
Issue: #373  
Governance baseline: `develop@d70c8f45b217fc317ca6b7ba6904afd1734b0c53`  
Design classification: **COMPATIBLE**

## Design classification rationale

UX-0A changes hierarchy, orchestration and progressive disclosure inside the existing Design System V2 and Human Interaction grammar. It introduces no new visual tokens, brand geometry, decorative effects or global-navigation baseline and does not supersede the canonical design system.

## Scope

Journey slice:

`Home/Oggi → Classe → Lezione → Osserva → Registra → prossimo passo`

This receipt measures the Class workspace only. It does not claim closure of the full UX-0 programme.

## Before

The Class surface exposed several operational choices at the same level:

- `Prepara la lezione` / `Prepara questa fase`;
- `Registra / rivedi` toward Piano annuale;
- the full inline `TeachingSessionRecorder`;
- a conditional `Conferma come svolto` action;
- Calendar/Timetable fallbacks inside the same operational region;
- prepared materials before the primary lesson focus.

The capabilities were individually valid, but the teacher had to infer which product path represented the current task.

## After candidate

The Class workspace resolves one state-driven primary action:

- `PREPARE` → prepare the next lesson/fase;
- `TEACH` → continue the lesson;
- `RECORD` → record the completed lesson;
- `AFTER_RECORD` → either prepare the next meeting or, only when quantitatively pertinent, evaluate completion in Piano annuale;
- `COMPLETE` → no primary action.

The legacy inline recorder remains available as a governed fallback only when no modeled Lesson Workspace exists. Advanced recording, Plan completion and prepared materials are moved behind progressive disclosure. Domain authorities are unchanged.

## Task Cost — before → after

| Metric | Before | After candidate |
| --- | --- | --- |
| Decision count before the next normal step | multiple competing path choices on Class | one state-derived primary choice |
| Internal concepts exposed in the primary region | Piano advancement, real implementation, minute allocation, completion decision, temporal fallback | lesson/task state; internal distinctions remain behind disclosure |
| Competing actions in the densest Class state | prepare + plan review + inline record + conditional completion | one visible primary CTA; advanced actions are secondary |
| Surface transitions | user first chooses which workflow represents the task | one intentional transition to the resolved workflow, or governed inline fallback |
| Net work | teacher reconstructs the product model before acting | system resolves the next task while preserving human decisions |

## Preserved invariants

- `TeachingSession` remains authoritative for what happened.
- `AnnualPlanBlockProgress` remains a separate human decision.
- No automatic Plan/UDA completion.
- No EvidenceReference is invented.
- TE-1 observation draft/privacy Tier 1 semantics are unchanged.
- AAL2, provenance, idempotency and recovery boundaries are unchanged.
- No Arena/curriculum authority change.
- No global-navigation UX-0 hypothesis is promoted by this slice.

## Acceptance required before merge

This is not `SIMPLIFICATION_PASS` yet. The final exact head must pass Product CI, Human Interaction Model, Design Policy, WCAG/HVA and all other applicable repository gates. Browser acceptance must confirm that the normal Class journey exposes one primary next step on desktop and mobile without hiding required professional control.
