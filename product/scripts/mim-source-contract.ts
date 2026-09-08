import assert from 'node:assert/strict'
import {
  MIM_ADOPTION_SNAPSHOT,
  MimTextbookAdoptionClient,
} from '../src/core/infrastructure/mim/mim-textbook-adoption-client'

const SCHOOL_CODE = 'AVIC849003'
const EXPECTED_SECONDARY_SCHOOL_CODE = 'AVMM849047'

function normalizeSchoolCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function main() {
  const client = new MimTextbookAdoptionClient()
  const result = await client.discoverBySchoolCode(
    SCHOOL_CODE,
    MIM_ADOPTION_SNAPSHOT.academicYearCode,
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
    `No 2026/2027 textbook adoption was returned for ${SCHOOL_CODE}`,
  )

  const technologyRecords = result.records.filter((record) =>
    record.discipline.toLocaleUpperCase('it').includes('TECNOLOG'),
  )
  const secondaryTechnologyRecords = technologyRecords.filter(
    (record) => normalizeSchoolCode(record.schoolCode) === EXPECTED_SECONDARY_SCHOOL_CODE,
  )

  assert.ok(
    technologyRecords.length > 0,
    `No Tecnologia adoption was returned for ${SCHOOL_CODE}; ` +
      `available disciplines: ${[...new Set(result.records.map((record) => record.discipline))].join(', ')}`,
  )
  assert.ok(
    secondaryTechnologyRecords.length > 0,
    `No Tecnologia adoption was returned for ${EXPECTED_SECONDARY_SCHOOL_CODE}`,
  )

  console.log(JSON.stringify({
    status: 'MIM_SOURCE_CONTRACT_PASS',
    schoolCode: SCHOOL_CODE,
    secondarySchoolCode: EXPECTED_SECONDARY_SCHOOL_CODE,
    academicYearCode: MIM_ADOPTION_SNAPSHOT.academicYearCode,
    snapshotPublishedOn: MIM_ADOPTION_SNAPSHOT.publishedOn,
    resolvedSchoolCodeCount: result.resolvedSchoolCodes.length,
    datasetCodes: result.datasetCodes,
    adoptionCount: result.records.length,
    technologyAdoptionCount: technologyRecords.length,
    secondaryTechnologyAdoptionCount: secondaryTechnologyRecords.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
