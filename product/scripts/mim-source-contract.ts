import assert from 'node:assert/strict'
import {
  MIM_ADOPTION_SNAPSHOT,
  MimTextbookAdoptionClient,
} from '../src/core/infrastructure/mim/mim-textbook-adoption-client'

const SCHOOL_CODE = 'AVIC849003'

const client = new MimTextbookAdoptionClient()
const result = await client.discoverBySchoolCode(
  SCHOOL_CODE,
  MIM_ADOPTION_SNAPSHOT.academicYearCode,
)

assert.ok(result.resolvedSchoolCodes.length > 0, 'MIM did not resolve any school/plesso code')
assert.ok(
  result.resolvedSchoolCodes.every((code) => code.startsWith('AV')),
  `Unexpected resolved school code(s): ${result.resolvedSchoolCodes.join(', ')}`,
)
assert.ok(
  result.datasetCodes.includes('ALTCAMPANIA'),
  `Expected ALTCAMPANIA, received: ${result.datasetCodes.join(', ') || 'none'}`,
)
assert.ok(
  result.records.length > 0,
  `No 2026/2027 textbook adoption was returned for ${SCHOOL_CODE}; ` +
    `resolved codes: ${result.resolvedSchoolCodes.join(', ')}`,
)

const technologyRecords = result.records.filter((record) =>
  record.discipline.toLocaleUpperCase('it').includes('TECNOLOG'),
)

console.log(JSON.stringify({
  status: 'MIM_SOURCE_CONTRACT_PASS',
  schoolCode: SCHOOL_CODE,
  academicYearCode: MIM_ADOPTION_SNAPSHOT.academicYearCode,
  snapshotPublishedOn: MIM_ADOPTION_SNAPSHOT.publishedOn,
  resolvedSchoolCodes: result.resolvedSchoolCodes,
  datasetCodes: result.datasetCodes,
  adoptionCount: result.records.length,
  technologyAdoptionCount: technologyRecords.length,
}, null, 2))
