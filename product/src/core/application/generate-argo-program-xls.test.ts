import assert from 'node:assert/strict'
import test from 'node:test'
import type { ArgoProgram } from '@/core/domain/argo-program'
import {
  ARGO_XLS_HEADERS,
  ARGO_XLS_SHEET_NAME,
  buildArgoXlsRows,
  generateArgoProgramXls,
  inspectArgoProgramXls,
} from './generate-argo-program-xls'

function specimen(): ArgoProgram {
  return {
    schoolYear: '2026/2027',
    classRef: '2C',
    subjectRef: 'Tecnologia',
    sourceAssetId: 'asset-programming-2c',
    sourceGenerationId: 'generation-2c-v1',
    modules: [{
      id: 'MOD-01',
      order: '1',
      description: 'Tecnica e tecnologia',
      arguments: [
        {
          id: 'ARG-01',
          order: '1',
          description: 'Tecnica',
          performedStatus: 'NOT_PERFORMED',
        },
        {
          id: 'ARG-02',
          order: '2',
          description: 'Tecnologia',
          performedStatus: 'PERFORMED',
          performedAt: '2026-10-01',
        },
      ],
    }],
  }
}

test('maps the governed Argo program to the exact six-column didUP row grammar', () => {
  assert.deepEqual(buildArgoXlsRows(specimen()), [
    [...ARGO_XLS_HEADERS],
    ['1', 'Tecnica e tecnologia', '', '', '', ''],
    ['', '', '1', 'Tecnica', 'Non Svolto', ''],
    ['', '', '2', 'Tecnologia', 'Svolto', '01-10-2026'],
  ])
})

test('writes a true OLE/BIFF8 .xls workbook and round-trips the semantic table', () => {
  const bytes = generateArgoProgramXls(specimen())

  console.log(`G5C_REFERENCE_XLS_BASE64=${bytes.toString('base64')}`)

  assert.ok(Buffer.isBuffer(bytes))
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1],
  )

  const inspected = inspectArgoProgramXls(bytes)

  assert.deepEqual(inspected.sheetNames, [ARGO_XLS_SHEET_NAME])
  assert.deepEqual(inspected.rows, [
    [...ARGO_XLS_HEADERS],
    ['1', 'Tecnica e tecnologia', '', '', '', ''],
    ['', '', '1', 'Tecnica', 'Non Svolto', ''],
    ['', '', '2', 'Tecnologia', 'Svolto', '01-10-2026'],
  ])
  assert.equal(inspected.hasVba, false)
  assert.deepEqual(inspected.formulaCells, [])
  assert.deepEqual(inspected.hyperlinkCells, [])
})

test('blocks workbook generation when the profile validator rejects the program', () => {
  const program = specimen()
  program.modules[0]!.description = ''

  assert.throws(
    () => generateArgoProgramXls(program),
    /MODULE_DESCRIPTION_REQUIRED/,
  )
})
