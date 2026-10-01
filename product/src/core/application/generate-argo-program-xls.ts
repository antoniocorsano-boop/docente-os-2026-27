import { read, utils, write } from 'xlsx'
import type { ArgoProgram, ArgoPerformedStatus } from '@/core/domain/argo-program'
import { validateArgoProgram } from './validate-argo-program'

export const ARGO_XLS_SHEET_NAME = 'Dati'
export const ARGO_XLS_HEADERS = [
  'ORD. MODULO',
  'MODULO',
  'ORD. ARGOMENTO',
  'ARGOMENTO',
  'STATO SVOLGIMENTO',
  'DATA SVOLGIMENTO',
] as const

const STATUS_LABEL: Record<ArgoPerformedStatus, string> = {
  NOT_PERFORMED: 'Non Svolto',
  PARTIALLY_PERFORMED: 'Parzialmente Svolto',
  PERFORMED: 'Svolto',
}

export function buildArgoXlsRows(program: ArgoProgram): string[][] {
  const validation = validateArgoProgram(program)
  if (validation.status !== 'PASS') {
    throw new Error(`Argo XLS generation blocked: ${validation.findings.map((finding) => finding.code).join(', ')}`)
  }

  const rows: string[][] = [[...ARGO_XLS_HEADERS]]

  for (const programModule of program.modules) {
    rows.push([
      programModule.order ?? '',
      programModule.description,
      '',
      '',
      '',
      '',
    ])

    for (const argument of programModule.arguments) {
      rows.push([
        '',
        '',
        argument.order ?? '',
        argument.description,
        argument.performedStatus ? STATUS_LABEL[argument.performedStatus] : '',
        argument.performedAt ? formatArgoDate(argument.performedAt) : '',
      ])
    }
  }

  return rows
}

export function generateArgoProgramXls(program: ArgoProgram): Buffer {
  const worksheet = utils.aoa_to_sheet(buildArgoXlsRows(program))
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, ARGO_XLS_SHEET_NAME)

  return write(workbook, {
    bookType: 'biff8',
    type: 'buffer',
    bookSST: true,
  })
}

export function inspectArgoProgramXls(bytes: Buffer) {
  const workbook = read(bytes, { type: 'buffer', bookVBA: true })
  const worksheet = workbook.Sheets[ARGO_XLS_SHEET_NAME]
  if (!worksheet) throw new Error('Argo XLS sheet Dati missing')

  const rows = utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  })

  const formulaCells: string[] = []
  const hyperlinkCells: string[] = []

  for (const [address, cell] of Object.entries(worksheet)) {
    if (address.startsWith('!')) continue
    if (cell && typeof cell === 'object') {
      if ('f' in cell && cell.f) formulaCells.push(address)
      if ('l' in cell && cell.l) hyperlinkCells.push(address)
    }
  }

  return {
    sheetNames: workbook.SheetNames,
    rows,
    hasVba: Boolean(workbook.vbaraw),
    formulaCells,
    hyperlinkCells,
  }
}

function formatArgoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Unsupported Argo date: ${value}`)
  return `${match[3]}-${match[2]}-${match[1]}`
}
