import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluatePolicy, normalizeSvg, parseAddedLines } from './design-policy.mjs'

function file(path, addedLines, content = addedLines.join('\n')) {
  return { path, addedLines, content }
}

test('parseAddedLines keeps only real additions', () => {
  assert.deepEqual(parseAddedLines('--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new\n context'), ['new'])
})

test('requires design classification for visual runtime changes', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/home.css', ['.x { color: var(--foreground); }'])],
    prBody: 'No classification here',
    requireClassification: true,
  })
  assert.equal(result.status, 'FAIL')
  assert.ok(result.findings.some((item) => item.code === 'DPG-20'))
})

test('rejects raw colors outside canonical token and brand files', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/home.css', ['.x { color: #123456; }'])],
    prBody: 'Classificazione: COMPATIBLE',
  })
  assert.ok(result.findings.some((item) => item.code === 'DPG-04'))
})

test('allows raw brand values in canonical brand geometry', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/components/brand/brand-mark-geometry.ts', ["blue: '#2F6DF6'"])],
    prBody: 'Classificazione: COMPATIBLE',
  })
  assert.equal(result.findings.some((item) => item.code === 'DPG-04'), false)
})

test('rejects new motion without reduced-motion handling', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/home.css', ['.x { transition: opacity 180ms ease; }'], '.x { transition: opacity 180ms ease; }')],
    prBody: 'COMPATIBLE',
  })
  assert.ok(result.findings.some((item) => item.code === 'DPG-13'))
})

test('accepts motion when the style contract contains prefers-reduced-motion', () => {
  const content = '.x { transition: opacity 180ms ease; }\n@media (prefers-reduced-motion: reduce) { .x { transition: none; } }'
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/home.css', ['.x { transition: opacity 180ms ease; }'], content)],
    prBody: 'COMPATIBLE',
  })
  assert.equal(result.findings.some((item) => item.code === 'DPG-13'), false)
})

test('rejects alternate icon libraries', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/page.tsx', ["import { HomeIcon } from '@heroicons/react/24/outline'"])],
    prBody: 'COMPATIBLE',
  })
  assert.ok(result.findings.some((item) => item.code === 'DPG-14'))
})

test('rejects local visual tokens outside canonical token files', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/home.css', ['--brand-special: var(--primary);'])],
    prBody: 'COMPATIBLE',
  })
  assert.ok(result.findings.some((item) => item.code === 'DPG-19'))
})

test('flags decorative effects as WATCH rather than pretending aesthetic automation', () => {
  const result = evaluatePolicy({
    changedFiles: [file('product/src/app/home.css', ['.x { backdrop-filter: blur(12px); }'])],
    prBody: 'COMPATIBLE',
  })
  assert.equal(result.status, 'WATCH')
  assert.ok(result.warnings.some((item) => item.code === 'DPG-07'))
})

test('normalizes SVG whitespace for parity checks', () => {
  assert.equal(normalizeSvg('<svg>\n <path />\n</svg>'), normalizeSvg('<svg><path /></svg>'))
})
