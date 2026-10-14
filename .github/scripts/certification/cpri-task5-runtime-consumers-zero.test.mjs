import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const canonicalSourceSymbol = ['CANONICAL', 'PLAN', 'SOURCES'].join('_')

const activeConsumerPaths = [
  'product/src/app/api/assistant/lesson-context-loader.ts',
  'product/src/app/api/copilot/lesson-reflection-context-loader.ts',
  'product/src/app/classi/[sectionId]/actions.ts',
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/design-actions.ts',
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx',
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/preparation-approval-actions.ts',
  'product/src/app/classi/[sectionId]/lezioni/actions.ts',
  'product/src/app/classi/[sectionId]/page.tsx',
  'product/src/app/classi/class-workspace-model.test.ts',
  'product/src/app/classi/class-workspace-model.ts',
  'product/src/app/feedback/actions.ts',
  'product/src/app/piano-annuale/actions.ts',
  'product/src/app/piano-annuale/AnnualPlanClient.tsx',
  'product/src/app/piano-annuale/model.ts',
  'product/src/core/application/human-task-content-pipeline.ts',
  'product/src/core/application/human-task-plan-guided-uda-projection-recipe.ts',
  'product/src/core/application/human-task-projection-recipes-b16-b19.ts',
  'product/src/core/application/human-task-projection-recipes-b20-b22.ts',
  'product/src/core/application/human-task-projection-recipes-b23-b27.ts',
]

const forbiddenRuntimeAuthority = [
  canonicalSourceSymbol,
  ['4a027986', '5b6d', '49db', '9b52', '01cfae679c08'].join('-'),
  ['d327355b', '76a9', '496f', '99cb', 'dc942fd950e4'].join('-'),
  ['36ef3be5', '925f', '4e28', 'afff', 'df11097827a9'].join('-'),
  ['a1066c0a', '2720', '40b0', '841e', '306cb998ce3e'].join('-'),
  ['978702f8', '4579', '452d', '925b', '8e4d890e19f9'].join('-'),
  ['bd4cb766', '5d46', '4420', 'bc82', 'f979528a14b2'].join('-'),
]

test('CPRI Task 5 removes static production authority from every frozen active runtime consumer', () => {
  const residuals = []

  for (const relativePath of activeConsumerPaths) {
    const source = readFileSync(path.join(repoRoot, relativePath), 'utf8')
    const lines = source.split(/\r?\n/)
    lines.forEach((line, index) => {
      for (const token of forbiddenRuntimeAuthority) {
        if (line.includes(token)) residuals.push(`${relativePath}:${index + 1} ${token}`)
      }
    })
  }

  assert.deepEqual(
    residuals,
    [],
    `Static CPRI runtime authority remains in Task 5 consumers:\n${residuals.join('\n')}`,
  )
})
