# TRAMA Diagnostic Agent v1 — Design

## Purpose

Reduce time spent diagnosing CI failures by making every relevant failure produce a deterministic, AI-readable evidence packet before any repair is proposed.

The system does not authorize code changes, merges, deploys, or data mutations. It provides evidence only. The human/agent workflow remains: observe → classify root cause → propose the smallest repair → verify on the exact SHA.

## Core contract

A diagnostic packet MUST contain:

- schema version;
- source gate (`product-ci` or `hva`);
- exact tested head SHA and base SHA;
- workflow run id;
- first failing stage;
- stage exit codes and commands;
- structured findings when a machine-readable source exists;
- a redacted log tail for opaque failures;
- changed-file inventory;
- deterministic failure fingerprint;
- an `ai-brief.md` instructing an agent to operate in `PROPOSE_ONLY` mode until the cause is supported by evidence.

A diagnostic packet MUST NOT contain environment dumps, secrets, tokens, passwords, authorization headers, or private credential values.

## Failure semantics

Diagnostics are observational. They MUST preserve the canonical gate result:

- a failing command remains failing;
- diagnostic generation runs under `if: failure()`/`if: always()` as appropriate;
- diagnostic generation must not turn a red gate green;
- inability to generate a packet is itself visible and must not suppress the original failure.

## Product CI v1

Product CI captures deterministic evidence for these stages, in order:

1. `typecheck`;
2. `product-tests`;
3. `lint`;
4. `build`.

The existing product-test diagnostics remain valid. The new layer normalizes them into the common packet. If lint fails, CI performs a non-gating second ESLint invocation with JSON formatting to obtain exact `ruleId`, file, line, column, and message without guessing from pretty console output.

The current standalone `Product Lint Diagnostics` workflow is temporary scaffolding and is removed once Product CI emits the common packet itself.

## HVA v1

HVA reuses the same packet schema. It does not duplicate browser execution. It consumes the existing Playwright/acceptance evidence and records failing test identity, acceptance receipt gates, relevant server-log tail, exact SHA, and evidence paths.

HVA integration is applied only after the current #747 HVA candidate leaves the governed MFA queue, so the diagnostic work cannot invalidate or restart that candidate.

## AI usage

No external model API, provider key, or paid inference is introduced. GitHub Actions produces deterministic evidence; ChatGPT/Codex reads the artifact through the connected GitHub surface and performs classification/recommendation. This keeps inference outside the trusted CI runtime while making the handoff machine-readable.

## Non-goals

- automatic patching;
- automatic merge/deploy;
- suppressing or downgrading lint/test/HVA rules;
- copying full CI environments into artifacts;
- replacing canonical Product CI or HVA gates.
