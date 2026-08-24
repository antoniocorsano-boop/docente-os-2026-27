import fs from 'node:fs'

const [fullPath, prodPath, toolPath] = process.argv.slice(2)
if (!fullPath || !prodPath || !toolPath) throw new Error('Usage: dependency-security.mjs <full> <prod> <tool>')

const readAudit = (path) => {
  const raw = fs.readFileSync(path, 'utf8').trim()
  if (!raw) return { metadata: { vulnerabilities: {} }, vulnerabilities: {} }
  return JSON.parse(raw)
}

const summary = (audit) => {
  const vulnerabilities = audit.metadata?.vulnerabilities ?? {}
  return {
    info: Number(vulnerabilities.info ?? 0),
    low: Number(vulnerabilities.low ?? 0),
    moderate: Number(vulnerabilities.moderate ?? 0),
    high: Number(vulnerabilities.high ?? 0),
    critical: Number(vulnerabilities.critical ?? 0),
    total: Number(vulnerabilities.total ?? 0),
  }
}

const full = readAudit(fullPath)
const prod = readAudit(prodPath)
const tool = readAudit(toolPath)
const receipt = {
  checkedAt: new Date().toISOString(),
  lockfilePresent: fs.existsSync('package-lock.json'),
  baseline: {
    repositoryFullGraph: summary(full),
    productionGraph: summary(prod),
    afterTemporaryPlaywright: summary(tool),
  },
  policy: {
    productionHighOrCriticalAllowed: 0,
    repositoryHighOrCriticalAllowed: 0,
    temporaryToolingFindingsBlockProduction: false,
  },
}

console.log(JSON.stringify(receipt, null, 2))

const prodBlocking = receipt.baseline.productionGraph.high + receipt.baseline.productionGraph.critical
const fullBlocking = receipt.baseline.repositoryFullGraph.high + receipt.baseline.repositoryFullGraph.critical
if (prodBlocking > 0 || fullBlocking > 0) process.exitCode = 1
