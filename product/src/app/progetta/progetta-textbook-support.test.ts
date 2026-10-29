import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProgettaTextbookSupport } from './progetta-textbook-support'

test('presenta il libro come supporto secondario e rivela solo le pagine verificate', () => {
  const view = buildProgettaTextbookSupport('1-01')

  assert.ok(view)
  assert.equal(view.priority, 'secondary')
  assert.equal(view.heading, 'Supporto dal libro adottato')
  assert.equal(view.bookLabel, 'Tecnologia.verde · Tecnologia + Disegno')
  assert.equal(view.stateLabel, 'Pagine verificate')
  assert.equal(view.chapterLabel, 'Sostenibilità: 2030 e oltre')
  assert.equal(view.pageLabel, 'pp. 16–18, 19–23, 24–27, 28–31')
})

test('quando il dettaglio non è verificato non mostra numeri di pagina inventati', () => {
  const view = buildProgettaTextbookSupport('1-00')

  assert.ok(view)
  assert.equal(view.priority, 'secondary')
  assert.equal(view.stateLabel, 'Dettagli da verificare')
  assert.equal(view.chapterLabel, null)
  assert.equal(view.pageLabel, null)
  assert.match(view.description, /capitoli e pagine specifici sono ancora da verificare/i)
})

test('un gap parziale resta leggibile come bisogno di fonte complementare', () => {
  const view = buildProgettaTextbookSupport('1-06')

  assert.ok(view)
  assert.equal(view.stateLabel, 'Copertura parziale')
  assert.equal(view.pageLabel, null)
  assert.match(view.description, /fonte complementare/i)
})

test('il gap Informatica è esplicito e non viene presentato come copertura del libro adottato', () => {
  const view = buildProgettaTextbookSupport('3-07')

  assert.ok(view)
  assert.equal(view.stateLabel, 'Fonte complementare necessaria')
  assert.equal(view.pageLabel, null)
  assert.match(view.description, /configurazione adottata non comprende Informatica/i)
})

test('un codice UDA sconosciuto non genera una scheda di supporto', () => {
  assert.equal(buildProgettaTextbookSupport('9-99'), null)
})
