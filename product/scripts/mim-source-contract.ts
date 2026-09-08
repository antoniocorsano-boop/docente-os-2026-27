import assert from 'node:assert/strict'
import type { MimTeachingContext } from '../src/core/domain/mim-textbook-discovery'
import {
  MIM_TARGETED_ADOPTION_SNAPSHOT,
  MimTargetedAdoptionClient,
} from '../src/core/infrastructure/mim/mim-targeted-adoption-client'

const SCHOOL_CODE = 'AVIC849003'
const EXPECTED_SECONDARY_SCHOOL_CODE = 'AVMM849047'
const PILOT_CONTEXTS: MimTeachingContext[] = [
  {
    teachingAssignmentId: 'contract-1b-tecnologia',
    grade: 'PRIMA',
    sectionCode: 'B',
    disciplineName: 'Tecnologia',
  },
  {
    teachingAssignmentId: 'contract-2a-tecnologia',
    grade: 'SECONDA',
    sectionCode: 'A',
    disciplineName: 'Tecnologia',
  },
]

function normalizeSchoolCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function main() {
  const client = new MimTargetedAdoptionClient()
  const result = await client.discoverBySchoolCode(
    SCHOOL_CODE,
    MIM_TARGETED_ADOPTION_SNAPSHOT.academicYearCode,
    PILOT_CONTEXTS,
  )

  assert.ok(
    result.resolvedSchoolCodes.map(normalizeSchoolCode).includes(EXPECTED_SECONDARY_SCHOOL_CODE),
    `MIM did not resolve ${SCHOOL_CODE} to ${EXPECTED_SECONDARY_SCHOOL_CODE}; ` +
      `resolved codes: ${result.resolvedSchoolCodes.join(', ') || 'none'}`,
  )
  assert.ok(
    result.datasetCodes.includes('ALTCAMPANIA'),
    `Expected ALTCAMPANIA, received: ${result.datasetCodes.join(', ') || 'none'}`,
  )
  assert.ok(
    result.records.length > 0,
    `No targeted 2026/2027 textbook adoption was returned for ${SCHOOL_CODE}`,
  )

  const secondaryTechnologyRecords = result.records.filter(
    (record) => normalizeSchoolCode(record.schoolCode) === EXPECTED_SECONDARY_SCHOOL_CODE,
  )
  assert.ok(
    secondaryTechnologyRecords.length > 0,
    `No targeted Tecnologia adoption was returned for ${EXPECTED_SECONDARY_SCHOOL_CODE}`,
  )

  const allowedClassSections = new Set(['1:B', '2:A'])
  assert.ok(
    result.records.every((record) => allowedClassSections.has(`${record.gradeNumber}:${record.sectionCode.trim().toUpperCase()}`)),
    `Targeted discovery returned an out-of-scope class: ${result.records.map((record) => `${record.gradeNumber}${record.sectionCode}`).join(', ')}`,
  )
  assert.ok(
    result.records.every((record) => record.discipline.toLocaleUpperCase('it').includes('TECNOLOG')),
    `Targeted discovery returned a non-Tecnologia discipline: ${[...new Set(result.records.map((record) => record.discipline))].join(', ')}`,
  )

  console.log(JSON.stringify({
    status: 'MIM_TARGETED_SOURCE_CONTRACT_PASS',
    schoolCode: SCHOOL_CODE,
    secondarySchoolCode: EXPECTED_SECONDARY_SCHOOL_CODE,
    academicYearCode: MIM_TARGETED_ADOPTION_SNAPSHOT.academicYearCode,
    snapshotPublishedOn: MIM_TARGETED_ADOPTION_SNAPSHOT.publishedOn,
    requestedClasses: PILOT_CONTEXTS.map((context) => `${context.grade}:${context.sectionCode}`),
    resolvedSchoolCodeCount: result.resolvedSchoolCodes.length,
    datasetCodes: result.datasetCodes,
    scopedAdoptionCount: result.records.length,
    secondaryScopedAdoptionCount: secondaryTechnologyRecords.length,
    transport: 'SPARQL_TARGETED_NO_REGIONAL_ADOPTION_CSV',
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
