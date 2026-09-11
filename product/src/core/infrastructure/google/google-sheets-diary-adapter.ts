import type { DriveDiaryProjection } from '@/core/domain/teaching-session-reflection'
import { activeGoogleAccessToken } from './google-oauth'

export type DriveDiarySyncOutcome = 'SYNCED' | 'NOT_CONNECTED' | 'NOT_CONFIGURED'

type ValuesResponse = { values?: unknown[][] }

export async function syncDriveDiaryProjection(
  workspaceId: string,
  projection: DriveDiaryProjection,
): Promise<DriveDiarySyncOutcome> {
  const spreadsheetId = process.env.DOCENTE_OS_DIARY_SPREADSHEET_ID?.trim()
  if (!spreadsheetId) return 'NOT_CONFIGURED'

  const accessToken = await activeGoogleAccessToken(workspaceId)
  if (!accessToken) return 'NOT_CONNECTED'

  const sheetName = validatedSheetName(process.env.DOCENTE_OS_DIARY_SHEET_NAME?.trim() || 'Diario')
  const rowNumber = await findDiaryRow({ spreadsheetId, sheetName, accessToken, recordId: projection.recordId })

  if (rowNumber) {
    await patchExistingDiaryRow({ spreadsheetId, sheetName, rowNumber, accessToken, projection })
  } else {
    await appendDiaryRow({ spreadsheetId, sheetName, accessToken, projection })
  }

  return 'SYNCED'
}

async function findDiaryRow(input: {
  spreadsheetId: string
  sheetName: string
  accessToken: string
  recordId: string
}) {
  const range = `${a1Sheet(input.sheetName)}!Z:Z`
  const response = await googleSheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    input.accessToken,
  )
  const payload = await response.json() as ValuesResponse
  const values = Array.isArray(payload.values) ? payload.values : []
  const index = values.findIndex((row) => Array.isArray(row) && String(row[0] ?? '').trim() === input.recordId)
  return index >= 0 ? index + 1 : null
}

async function patchExistingDiaryRow(input: {
  spreadsheetId: string
  sheetName: string
  rowNumber: number
  accessToken: string
  projection: DriveDiaryProjection
}) {
  const { reflection } = input.projection
  const data = [
    cell(input.sheetName, 'F', input.rowNumber, `${input.projection.actualMinutes} min`),
    cell(input.sheetName, 'J', input.rowNumber, reflection.activityDone),
    cell(input.sheetName, 'M', input.rowNumber, reflection.observations),
    cell(input.sheetName, 'N', input.rowNumber, reflection.difficulties),
    cell(input.sheetName, 'P', input.rowNumber, reflection.ideas),
    cell(input.sheetName, 'Q', input.rowNumber, reflection.ideas ? 'Lezione / osservazione docente' : ''),
    cell(input.sheetName, 'S', input.rowNumber, reflection.nextActivity),
    cell(input.sheetName, 'W', input.rowNumber, 'COMPILATA'),
    cell(input.sheetName, 'X', input.rowNumber, reflection.difficulties || reflection.nextActivity ? 'SÌ' : 'NO'),
  ]
  if (reflection.udaChangeProposal) {
    data.push(cell(input.sheetName, 'V', input.rowNumber, `Proposta UDA: ${reflection.udaChangeProposal}`))
  }

  await googleSheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values:batchUpdate`,
    input.accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
    },
  )
}

async function appendDiaryRow(input: {
  spreadsheetId: string
  sheetName: string
  accessToken: string
  projection: DriveDiaryProjection
}) {
  const p = input.projection
  const r = p.reflection
  const values = [[
    italianDate(p.localDate),
    italianWeekday(p.localDate),
    p.startTime ?? '',
    p.classLabel,
    p.disciplineLabel,
    `${p.actualMinutes} min`,
    p.udaLabel ?? '',
    p.udaPhase ?? '',
    p.plannedActivity,
    r.activityDone,
    '',
    '',
    r.observations,
    r.difficulties,
    '',
    r.ideas,
    r.ideas ? 'Lezione / osservazione docente' : '',
    '',
    r.nextActivity,
    p.materialHref ?? '',
    p.assessmentLabel ?? '',
    r.udaChangeProposal ? `Proposta UDA: ${r.udaChangeProposal}` : '',
    'COMPILATA',
    r.difficulties || r.nextActivity ? 'SÌ' : 'NO',
    p.curriculumLink ?? '',
    p.recordId,
  ]]
  const range = `${a1Sheet(input.sheetName)}!A:Z`
  await googleSheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    input.accessToken,
    { method: 'POST', body: JSON.stringify({ values }) },
  )
}

function cell(sheetName: string, column: string, rowNumber: number, value: string) {
  return { range: `${a1Sheet(sheetName)}!${column}${rowNumber}`, values: [[value]] }
}

async function googleSheetsFetch(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Google Sheets diary sync failed (${response.status}): ${body.slice(0, 500)}`)
  }
  return response
}

function validatedSheetName(value: string) {
  if (!value || value.length > 100 || /[\[\]*?:/\\]/.test(value)) throw new Error('Invalid Google Sheets diary tab name')
  return value
}

function a1Sheet(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

function italianDate(localDate: string) {
  const [year, month, day] = localDate.split('-')
  return `${day}/${month}/${year}`
}

function italianWeekday(localDate: string) {
  const [year, month, day] = localDate.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}
