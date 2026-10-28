import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { presentClassCivicEducationProgress } from './class-civic-progress'

const classPageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

test('QL2-A presents annual civic progress without inventing an institutional target', () => {
  assert.equal(
    presentClassCivicEducationProgress(0),
    'Educazione civica: nessun contributo registrato finora.',
  )
  assert.equal(
    presentClassCivicEducationProgress(45),
    'Educazione civica: 45 minuti registrati nell’anno.',
  )
})

test('QL2-A class context derives civic progress from the canonical current-session total', () => {
  assert.match(classPageSource, /civicEducationMinutes\(teachingSnapshot\)/)
  assert.match(classPageSource, /presentClassCivicEducationProgress\(annualCivicEducationMinutes\)/)
})
