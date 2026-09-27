# Independent Review Protocol

**Status:** GOVERNED
**Scope:** Docente OS pull requests and governed TRAMA work in this repository
**Effective from:** 2026-09-27

## Purpose

Define the default independent-review mode without depending on paid AI review services. The protocol separates deterministic evidence, independent semantic review, and the final human decision.

## Canonical review sequence

1. **Freeze the exact head.**
   - Record the full commit SHA under review.
   - A review applies only to that exact head.
   - Any material commit after the review invalidates the review for merge purposes and requires a new review of the new exact head.

2. **Run deterministic repository gates.**
   - Use the GitHub Actions gates applicable to the classified impact of the change.
   - Product CI, security, accessibility/browser, Human Interaction, TRAMA Perceptible Write, Design Policy, release/infrastructure and other governed gates remain authoritative for what they actually test.
   - A green status from a reviewer bot is not a substitute for deterministic gates.

3. **Perform direct independent diff review.**
   - Review the actual diff against its base and the relevant canonical contracts.
   - Verify invariants, ownership boundaries, fail-closed behaviour, concurrency/idempotency where applicable, data/history preservation, user feedback, tests and absence of unintended scope expansion.
   - Inspect implementation paths, not only PR prose or generated summaries.
   - Classify material findings by severity and keep merge on hold while blocking findings remain.

4. **Record the review on the PR.**
   - Use `INDEPENDENT REVIEW — PASS` only when no blocking finding remains on the reviewed exact head.
   - Otherwise record `INDEPENDENT REVIEW — CHANGES REQUIRED` with concrete, reproducible findings.
   - The receipt must name the exact head, the principal checks performed and the deterministic-gate state considered.

5. **Keep human decision separate.**
   - Independent review does not merge the PR and does not impersonate human approval.
   - Human review/decision remains a separate governance step whenever required by the governing contract.
   - Merge must use the expected exact head so a moved head cannot be merged under stale evidence.

## Review services policy

External AI review services such as Codex, Copilot, CodeRabbit or Devin are **optional supplementary evidence**, never mandatory dependencies of this protocol unless a specific governing contract explicitly requires one.

- A service that is unavailable, quota-limited, inactive for the target branch or only reports a generic PASS must not block work merely because it did not run.
- Findings produced by an available service are not ignored: they must be independently verified against the actual code and resolved or explicitly dispositioned.
- Do not repeatedly invoke an unavailable paid service.
- Do not treat absence of bot findings as evidence of correctness.

## PASS criteria

An independent PASS requires all of the following:

- exact head is known and unchanged during the review;
- applicable deterministic gates are PASS, or any intentionally non-applicable gate is explained by the governed classifier;
- actual changed files and critical call paths have been inspected;
- tests exercise the production behaviour claimed by the PR rather than self-constructed values only;
- no unresolved blocking review finding remains;
- the change respects the relevant canonical contracts and does not silently create a parallel owner, bypass or ungoverned write path;
- runtime/production/merge HOLDs remain in force whenever the governing contract requires them.

## Changes-required criteria

Record CHANGES REQUIRED when any material issue remains, including:

- bypass of a canonical boundary or invariant;
- stale/concurrent writes not handled according to the contract;
- loss or silent rewrite of governed history/data;
- missing fail-closed behaviour at an unresolved boundary;
- tests that do not exercise the production path they claim to protect;
- mismatch between PR description, governing documentation and implementation;
- unresolved high/critical security, accessibility or interaction finding;
- exact head changed after the evidence being relied upon.

## Minimal review receipt

```text
INDEPENDENT REVIEW — PASS|CHANGES REQUIRED
Exact head: <full SHA>
Scope: <PR/change>
Deterministic gates: <relevant status>
Direct diff review: <principal invariants checked>
Findings: <none | concise list>
Human decision: separate / pending where required
```

## Governance invariant

The normal path is therefore:

**deterministic free gates → direct independent diff review → human decision → exact-head merge**.

Paid or quota-limited review bots may enrich this path, but they must not become a hidden availability dependency for ordinary governed development.