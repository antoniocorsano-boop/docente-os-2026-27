import assert from 'node:assert/strict'
import test from 'node:test'
import { finalReportCanonicalTemplate } from './final-report-canonical-template'
import { assertInstitutionalOutputPurity, renderInstitutionalPreview } from './institutional-document-preview'

test('normal school-professional text passes output purity', () => {
  assert.doesNotThrow(() => assertInstitutionalOutputPurity('Relazione finale · Tecnologia · Classe 2C'))
})

for (const sample of [
  'Blocco B03',
  'CAN-PRG-2',
  '123e4567-e89b-12d3-a456-426614174000',
  'TeachingSession',
  'AUTO_DOCUMENTED',
  '/Google Drive/Relazioni/finale.docx',
  'GPT-5.6',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'generato automaticamente dal sistema',
]) {
  test(`technical output is blocked: ${sample}`, () => {
    assert.throws(() => assertInstitutionalOutputPurity(sample), /riferimenti tecnici/i)
  })
}

test('preview renders human labels for tables and checklists without emitting internal keys', () => {
  const preview = renderInstitutionalPreview({
    template: finalReportCanonicalTemplate(),
    values: {
      'academic_year.label': '2026/27',
      'class.label': '2C',
      'discipline.label': 'Tecnologia',
      'teacher.display_name': 'Docente',
      'learning.executed_path': {
        columns: ['Ambiti / nuclei', 'Conoscenze e contenuti', 'Abilità sviluppate', 'Competenze perseguite'],
        rows: [['Materiali', 'Proprietà e impieghi', 'Confrontare materiali', 'Scegliere in base alla funzione']],
      },
      'methods.selected': ['LABORATORY', 'PROBLEM_SOLVING'],
    },
  })
  assert.match(preview.text, /Ambiti \/ nuclei/)
  assert.match(preview.text, /Didattica laboratoriale/)
  assert.match(preview.text, /Problem solving/)
  assert.doesNotMatch(preview.text, /learning\.executed_path|LABORATORY|AUTO_DOCUMENTED/)
})
