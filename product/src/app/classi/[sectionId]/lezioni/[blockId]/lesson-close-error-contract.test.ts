import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./lesson-close-client.tsx', import.meta.url), 'utf8')

test('lesson close never exposes minified React server errors to the teacher', () => {
  assert.ok(source.includes('/Minified React error|react\\.dev\\/errors|Server Components render/i'))
  assert.ok(source.includes('La registrazione non è stata confermata. I dati inseriti restano disponibili'))
})
