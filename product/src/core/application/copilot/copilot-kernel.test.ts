import assert from 'node:assert/strict'
import test from 'node:test'
import './knowledge-retrieval.test'
import {
  discoverCopilotSkills,
  modelVisibleCopilotSkills,
  resourceDescriptor,
  type CopilotResourceDescriptor,
} from './copilot-kernel'

const scope = { workspaceId: 'workspace-1', academicYearId: 'ay-1', localDate: '2026-09-15' }

function available(kind: CopilotResourceDescriptor['kind']): CopilotResourceDescriptor {
  return resourceDescriptor({
    id: `resource:${kind}`,
    kind,
    state: 'AVAILABLE',
    authority: 'AUTHORITATIVE',
    scope,
  })
}

test('TODAY espone prima il quadro della giornata quando HomeDailyContext è disponibile', () => {
  const result = discoverCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT'), available('PLANNER_CONTEXT')],
    availableCapabilities: ['TODAY_READ', 'PLANNER_READ'],
  })

  assert.equal(result[0]?.skill.id, 'TODAY_OVERVIEW')
  assert.equal(result[0]?.readiness, 'READY')

  const planner = result.find((candidate) => candidate.skill.id === 'PLANNER_PRIORITIZE')
  assert.equal(planner?.readiness, 'READY')
})

test('NEXT_LESSON_PREPARATION resta bloccata se manca il Lesson Brief', () => {
  const result = discoverCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT')],
    availableCapabilities: ['TODAY_READ', 'LESSON_READ'],
  })

  const candidate = result.find((item) => item.skill.id === 'NEXT_LESSON_PREPARATION')
  assert.equal(candidate?.readiness, 'BLOCKED')
  assert.deepEqual(candidate?.missingResources, ['LESSON_BRIEF'])
})

test('una risorsa temporale ambigua blocca skill che non possono inferire la giornata', () => {
  const ambiguous = resourceDescriptor({
    id: 'resource:today',
    kind: 'HOME_DAILY_CONTEXT',
    state: 'AMBIGUOUS',
    authority: 'TO_VERIFY',
    scope,
  })

  const result = discoverCopilotSkills({
    surface: 'TODAY',
    resources: [ambiguous],
    availableCapabilities: ['TODAY_READ'],
  })

  const candidate = result.find((item) => item.skill.id === 'TODAY_OVERVIEW')
  assert.equal(candidate?.readiness, 'BLOCKED')
  assert.deepEqual(candidate?.ambiguousResources, ['HOME_DAILY_CONTEXT'])
})

test('progressive discovery non espone skill di superfici non pertinenti', () => {
  const result = discoverCopilotSkills({
    surface: 'TIMETABLE',
    resources: [available('HOME_DAILY_CONTEXT'), available('KNOWLEDGE_INDEX')],
    availableCapabilities: ['TODAY_READ', 'KNOWLEDGE_READ', 'KNOWLEDGE_SEARCH'],
  })

  assert.equal(result.some((candidate) => candidate.skill.id === 'TODAY_OVERVIEW'), false)
  assert.equal(result.some((candidate) => candidate.skill.id === 'KNOWLEDGE_EXPLAIN'), false)
})

test('modelVisibleCopilotSkills esclude skill bloccate da capability o contesto', () => {
  const result = modelVisibleCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT'), available('PLANNER_CONTEXT')],
    availableCapabilities: ['TODAY_READ'],
  })

  assert.equal(result.some((candidate) => candidate.skill.id === 'TODAY_OVERVIEW'), true)
  assert.equal(result.some((candidate) => candidate.skill.id === 'PLANNER_PRIORITIZE'), false)
  assert.equal(result.every((candidate) => candidate.readiness !== 'BLOCKED'), true)
})

test('skill con policy PARTIAL può restare visibile dichiarando il contesto mancante', () => {
  const result = modelVisibleCopilotSkills({
    surface: 'TODAY',
    resources: [available('HOME_DAILY_CONTEXT')],
    availableCapabilities: ['TODAY_READ', 'TEACHING_SESSION_READ'],
  })

  const candidate = result.find((item) => item.skill.id === 'PENDING_LESSON_REGISTRATION')
  assert.equal(candidate?.readiness, 'PARTIAL')
  assert.deepEqual(candidate?.missingResources, ['TEACHING_SESSION_HISTORY'])
})
