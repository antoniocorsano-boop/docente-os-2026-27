import fs from 'node:fs'
import { classifyCertificationImpact } from './classifier.mjs'

const input = fs.readFileSync(0, 'utf8')
const paths = input.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
const receipt = classifyCertificationImpact(paths)

const enriched = {
  ...receipt,
  baseSha: process.env.CERTIFICATION_BASE_SHA ?? '',
  testedSha: process.env.CERTIFICATION_TESTED_SHA ?? '',
}

const output = process.env.CERTIFICATION_IMPACT_OUTPUT || 'certification-impact.json'
fs.mkdirSync(new URL('.', `file://${process.cwd()}/${output}`).pathname, { recursive: true })
fs.writeFileSync(output, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(enriched, null, 2)}\n`)
