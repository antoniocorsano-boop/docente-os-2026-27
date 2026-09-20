import assert from 'node:assert/strict'
import test from 'node:test'
import { bindArenaDisciplineRefToDocenteOs } from './cml-discipline-binding'

test('binds Arena Tecnologia to the canonical Docente OS technology key', () => {
  assert.equal(bindArenaDisciplineRefToDocenteOs('tecnologia'), 'technology')
  assert.equal(bindArenaDisciplineRefToDocenteOs('Tecnologia'), 'technology')
  assert.equal(bindArenaDisciplineRefToDocenteOs('technology'), 'technology')
})

test('preserves unknown non-empty discipline refs until a canonical alias is defined', () => {
  assert.equal(bindArenaDisciplineRefToDocenteOs('matematica'), 'matematica')
  assert.throws(() => bindArenaDisciplineRefToDocenteOs('   '), /disciplineRef is required/)
})
