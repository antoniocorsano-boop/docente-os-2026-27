import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEngineeringRoleView,
  type EngineeringRoleViewInput,
} from './roleview-engineering-collector'

function baseInput(): EngineeringRoleViewInput {
  return {
    repository: 'antoniocorsano-boop/docente-os-2026-27',
    prNumber: 473,
    exactHeadSha: '99767ce059a03bf73504027f2b742cea4fe601d4',
    baseRef: 'develop',
    headRef: 'feat/rv1-roleview-next-lesson',
    checks: [
      {
        id: 'PRODUCT_CI',
        label: 'Product CI',
        state: 'SUCCESS',
        required: true,
        ref: 'github:check:product-ci',
      },
      {
        id: 'HVA',
        label: 'Human + Visual Acceptance',
        state: 'SUCCESS',
        required: true,
        ref: 'github:check:hva',
      },
      {
        id: 'X4',
        label: 'Planner acceptance',
        state: 'SKIPPED',
        required: false,
        ref: 'github:check:x4',
      },
    ],
  }
}

test('Engineering RoleView READY richiede exact head e tutti i gate required PASS', () => {
  const snapshot = buildEngineeringRoleView(baseInput())

  assert.equal(snapshot.schemaVersion, 'roleview.v0')
  assert.equal(snapshot.product, 'DOCENTE_OS')
  assert.equal(snapshot.role, 'DEVELOPER')
  assert.equal(snapshot.scope.kind, 'ENGINEERING_PULL_REQUEST')
  assert.equal(snapshot.status, 'READY')
  assert.equal(snapshot.blockers.length, 0)
  assert.equal(snapshot.nextActions[0]?.id, 'MERGE_PR_ON_EXACT_HEAD')

  assert.equal(snapshot.gates.find((gate) => gate.id === 'PRODUCT_CI')?.status, 'PASS')
  assert.equal(snapshot.gates.find((gate) => gate.id === 'HVA')?.status, 'PASS')
  assert.equal(snapshot.gates.find((gate) => gate.id === 'X4')?.status, 'NOT_APPLICABLE')

  const required = snapshot.kpis.find((kpi) => kpi.id === 'required_gate_count')
  const passed = snapshot.kpis.find((kpi) => kpi.id === 'passed_required_gates')
  const pending = snapshot.kpis.find((kpi) => kpi.id === 'pending_required_gates')
  assert.equal(required?.value, 2)
  assert.equal(passed?.value, 2)
  assert.equal(passed?.target, 2)
  assert.equal(pending?.value, 0)

  assert.ok(snapshot.provenance.some((item) => item.kind === 'GITHUB_EXACT_HEAD'))
  assert.equal(snapshot.maturity.every((item) => item.score === undefined), true)
})

test('Engineering RoleView ATTENTION non promuove gate required in corso', () => {
  const input = baseInput()
  input.checks[1] = {
    ...input.checks[1]!,
    state: 'IN_PROGRESS',
  }

  const snapshot = buildEngineeringRoleView(input, 'REVIEWER')

  assert.equal(snapshot.role, 'REVIEWER')
  assert.equal(snapshot.status, 'ATTENTION')
  assert.match(snapshot.focus, /Exact head/)
  assert.equal(snapshot.gates.find((gate) => gate.id === 'HVA')?.status, 'WARN')
  assert.equal(snapshot.nextActions[0]?.id, 'RECHECK_REQUIRED_GATES')
  assert.equal(snapshot.blockers.length, 0)

  const pending = snapshot.kpis.find((kpi) => kpi.id === 'pending_required_gates')
  assert.equal(pending?.value, 1)
})

test('Engineering RoleView BLOCKED conserva failure e skipped dei gate required', () => {
  const input = baseInput()
  input.checks = [
    {
      id: 'PRODUCT_CI',
      label: 'Product CI',
      state: 'FAILURE',
      required: true,
      ref: 'github:check:product-ci',
    },
    {
      id: 'WCAG',
      label: 'WCAG 2.2 AA',
      state: 'SKIPPED',
      required: true,
      ref: 'github:check:wcag',
    },
    {
      id: 'OPTIONAL_AUDIT',
      label: 'Audit opzionale',
      state: 'FAILURE',
      required: false,
      ref: 'github:check:optional-audit',
    },
  ]

  const snapshot = buildEngineeringRoleView(input)

  assert.equal(snapshot.status, 'BLOCKED')
  assert.equal(snapshot.gates.find((gate) => gate.id === 'PRODUCT_CI')?.status, 'BLOCKED')
  assert.equal(snapshot.gates.find((gate) => gate.id === 'WCAG')?.status, 'BLOCKED')
  assert.equal(snapshot.gates.find((gate) => gate.id === 'OPTIONAL_AUDIT')?.status, 'WARN')
  assert.equal(snapshot.blockers.length, 2)
  assert.ok(snapshot.blockers.some((blocker) => blocker.code === 'CI_GATE:PRODUCT_CI:FAILURE'))
  assert.ok(snapshot.blockers.some((blocker) => blocker.code === 'CI_GATE:WCAG:SKIPPED'))
  assert.equal(snapshot.nextActions[0]?.id, 'RESOLVE_ENGINEERING_BLOCKERS')

  const blocked = snapshot.kpis.find((kpi) => kpi.id === 'blocked_required_gates')
  assert.equal(blocked?.value, 2)
})

test('Engineering RoleView fallisce chiuso quando manca exact head', () => {
  const input = baseInput()
  input.exactHeadSha = '   '

  const snapshot = buildEngineeringRoleView(input)

  assert.equal(snapshot.status, 'BLOCKED')
  assert.ok(snapshot.blockers.some((blocker) => blocker.code === 'EXACT_HEAD_MISSING'))
  assert.equal(snapshot.provenance.some((item) => item.kind === 'GITHUB_EXACT_HEAD'), false)
  assert.equal(
    snapshot.maturity.find((item) => item.id === 'EXACT_HEAD_IDENTITY')?.state,
    'BLOCKED',
  )
})

test('Engineering RoleView senza gate required resta ATTENTION', () => {
  const input = baseInput()
  input.checks = [{
    id: 'OPTIONAL_AUDIT',
    label: 'Audit opzionale',
    state: 'SUCCESS',
    required: false,
  }]

  const snapshot = buildEngineeringRoleView(input)

  assert.equal(snapshot.status, 'ATTENTION')
  assert.equal(snapshot.nextActions[0]?.id, 'RECHECK_REQUIRED_GATES')
  assert.equal(snapshot.kpis.find((kpi) => kpi.id === 'required_gate_count')?.value, 0)
})
