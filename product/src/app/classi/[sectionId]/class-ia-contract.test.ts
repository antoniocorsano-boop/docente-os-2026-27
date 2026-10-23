import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const classesSource = readFileSync(new URL('../page.tsx', import.meta.url), 'utf8')
const classSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const secondaryToolsUrl = new URL('./class-secondary-tools.tsx', import.meta.url)
const secondaryToolsSource = existsSync(secondaryToolsUrl) ? readFileSync(secondaryToolsUrl, 'utf8') : ''

test('Classi is a selector, not a status dashboard', () => {
  assert.match(classesSource, /aria-label="Seleziona una classe"/)
  assert.doesNotMatch(classesSource, /className="classesSummary"/)
})

test('Classe keeps one dominant continuity surface with actual work, next activity and essential context', () => {
  assert.match(classSource, /data-testid="class-continuity-primary"/)
  assert.match(classSource, /lastActualWork/)
  assert.match(classSource, /nextActivity/)
  assert.match(classSource, /recentContext/)
})

test('Diario is always visible outside secondary tools', () => {
  assert.match(classSource, />Apri Diario</)
  assert.match(classSource, /\/diario/)
  assert.match(classSource, /<ClassSecondaryTools/)
  assert.doesNotMatch(secondaryToolsSource, /Apri Diario/)
})

test('Classe exposes exactly one Altro della classe disclosure and no legacy first-level disclosures', () => {
  assert.equal((secondaryToolsSource.match(/Altro della classe/g) ?? []).length, 1)
  assert.equal((secondaryToolsSource.match(/<details/g) ?? []).length, 1)
  assert.doesNotMatch(classSource, /<summary>Supporti per questa lezione<\/summary>/)
  assert.doesNotMatch(classSource, /Contesto della classe e altri percorsi/)
  assert.doesNotMatch(classSource, /<summary><span><strong>Dettagli tecnici<\/strong>/)
})
