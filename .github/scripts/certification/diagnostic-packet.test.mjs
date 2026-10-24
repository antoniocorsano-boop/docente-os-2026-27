import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const SCRIPT = resolve('.github/scripts/diagnostics/diagnostic-packet.mjs')

function runPacket(files) {
  const root = mkdtempSync(join(tmpdir(), 'trama-diagnostic-'))
  const inputDir = join(root, 'input')
  mkdirSync(inputDir)
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(inputDir, name), content)
  }
  const changedFiles = join(root, 'changed-files.txt')
  writeFileSync(changedFiles, 'product/src/components/assistant/contextual-assistant-panel.tsx\n.github/workflows/product-ci.yml\n')
  const output = join(root, 'diagnostic-manifest.json')
  const brief = join(root, 'ai-brief.md')

  const result = spawnSync(process.execPath, [
    SCRIPT,
    '--input-dir', inputDir,
    '--source', 'product-ci',
    '--exact-head', 'abc123',
    '--base', 'base456',
    '--run-id', '42',
    '--changed-files', changedFiles,
    '--output', output,
    '--brief', brief,
  ], { encoding: 'utf8' })

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout)
    return {
      packet: JSON.parse(readFileSync(output, 'utf8')),
      brief: readFileSync(brief, 'utf8'),
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('builds a lint diagnostic packet from structured ESLint findings', () => {
  const eslint = [
    {
      filePath: 'product/src/components/assistant/contextual-assistant-panel.tsx',
      messages: [
        { severity: 2, ruleId: 'react-hooks/refs', line: 71, column: 26, message: 'Cannot access refs during render' },
        { severity: 2, ruleId: 'react-hooks/set-state-in-effect', line: 101, column: 7, message: 'Calling setState synchronously within an effect' },
      ],
    },
  ]

  const { packet, brief } = runPacket({
    'typecheck.exit': '0\n',
    'product-tests.exit': '0\n',
    'lint.exit': '1\n',
    'lint.log': 'eslint failed\n',
    'eslint.json': JSON.stringify(eslint),
  })

  assert.equal(packet.schemaVersion, 1)
  assert.equal(packet.source, 'product-ci')
  assert.equal(packet.exactHeadSha, 'abc123')
  assert.equal(packet.baseSha, 'base456')
  assert.equal(packet.workflowRunId, '42')
  assert.equal(packet.failingStage, 'lint')
  assert.equal(packet.counts.errors, 2)
  assert.deepEqual(packet.rules, {
    'react-hooks/refs': 1,
    'react-hooks/set-state-in-effect': 1,
  })
  assert.match(packet.failureFingerprint, /^[a-f0-9]{64}$/)
  assert.deepEqual(packet.changedFiles, [
    'product/src/components/assistant/contextual-assistant-panel.tsx',
    '.github/workflows/product-ci.yml',
  ])
  assert.match(brief, /PROPOSE_ONLY/)
  assert.match(brief, /react-hooks\/refs/)
})

test('extracts a TypeScript compiler error when typecheck is the first failing stage', () => {
  const { packet } = runPacket({
    'typecheck.exit': '2\n',
    'typecheck.log': "src/example.ts(4,9): error TS2322: Type 'string' is not assignable to type 'number'.\n",
  })

  assert.equal(packet.failingStage, 'typecheck')
  assert.equal(packet.findings[0].file, 'src/example.ts')
  assert.equal(packet.findings[0].line, 4)
  assert.equal(packet.findings[0].column, 9)
  assert.equal(packet.findings[0].code, 'TS2322')
  assert.match(packet.findings[0].message, /not assignable/)
})

test('redacts credential-like values from manifest and AI brief', () => {
  const { packet, brief } = runPacket({
    'typecheck.exit': '0\n',
    'product-tests.exit': '0\n',
    'lint.exit': '0\n',
    'build.exit': '1\n',
    'build.log': 'Authorization: Bearer abc.def.ghi\nAPI_KEY=super-secret-value\nError: build exploded\n',
  })

  const serialized = JSON.stringify(packet)
  assert.doesNotMatch(serialized, /abc\.def\.ghi/)
  assert.doesNotMatch(serialized, /super-secret-value/)
  assert.doesNotMatch(brief, /abc\.def\.ghi/)
  assert.doesNotMatch(brief, /super-secret-value/)
  assert.match(serialized, /\[REDACTED\]/)
})
