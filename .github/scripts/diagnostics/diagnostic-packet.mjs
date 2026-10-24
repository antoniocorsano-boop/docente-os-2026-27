#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const STAGES = ['typecheck', 'product-tests', 'lint', 'build']

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument sequence near ${key ?? '<end>'}`)
    }
    args[key.slice(2)] = value
  }
  return args
}

function requireArg(args, name) {
  const value = args[name]
  if (!value) throw new Error(`Missing required argument --${name}`)
  return value
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function redact(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/(authorization|api[_-]?key|token|password|secret)(\s*[:=]\s*)([^\s]+)/gi, '$1$2[REDACTED]')
}

function normalizeFile(filePath) {
  if (!filePath) return null
  const cwd = process.cwd()
  const normalized = filePath.replaceAll('\\', '/')
  if (!normalized.startsWith('/')) return normalized
  const rel = relative(cwd, filePath).replaceAll('\\', '/')
  return rel.startsWith('../') ? normalized : rel
}

function readExitCode(inputDir, stage) {
  const raw = readOptional(join(inputDir, `${stage}.exit`)).trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : null
}

function parseEslint(inputDir) {
  const path = join(inputDir, 'eslint.json')
  if (!existsSync(path)) return []
  const results = JSON.parse(readFileSync(path, 'utf8'))
  return results.flatMap((result) =>
    (result.messages ?? []).map((message) => ({
      stage: 'lint',
      severity: message.severity === 2 ? 'error' : message.severity === 1 ? 'warning' : 'info',
      ruleId: message.ruleId ?? null,
      file: normalizeFile(result.filePath),
      line: message.line ?? null,
      column: message.column ?? null,
      endLine: message.endLine ?? null,
      endColumn: message.endColumn ?? null,
      message: redact(message.message ?? ''),
    })),
  )
}

function parseTypeScript(log) {
  const findings = []
  const pattern = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm
  for (const match of log.matchAll(pattern)) {
    findings.push({
      stage: 'typecheck',
      severity: 'error',
      ruleId: null,
      code: match[4],
      file: normalizeFile(match[1]),
      line: Number(match[2]),
      column: Number(match[3]),
      message: redact(match[5]),
    })
  }
  return findings
}

function genericFindings(stage, log) {
  const markers = /(?:^|\b)(?:Error:|FAIL\b|failed\b|failure\b|Module not found|Failed to compile)/i
  return log
    .split(/\r?\n/)
    .map((line) => redact(line.trim()))
    .filter((line) => line && markers.test(line))
    .slice(-40)
    .map((message) => ({
      stage,
      severity: 'error',
      ruleId: null,
      file: null,
      line: null,
      column: null,
      message,
    }))
}

function tail(log, maxLines = 120) {
  return redact(log)
    .split(/\r?\n/)
    .slice(-maxLines)
    .join('\n')
    .trim()
}

function ruleCounts(findings) {
  const entries = findings
    .filter((finding) => finding.ruleId)
    .reduce((acc, finding) => {
      acc[finding.ruleId] = (acc[finding.ruleId] ?? 0) + 1
      return acc
    }, {})
  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)))
}

function fingerprint(packet) {
  const signature = {
    source: packet.source,
    failingStage: packet.failingStage,
    findings: packet.findings.map((finding) => ({
      stage: finding.stage,
      severity: finding.severity,
      ruleId: finding.ruleId ?? null,
      code: finding.code ?? null,
      file: finding.file ?? null,
      line: finding.line ?? null,
      column: finding.column ?? null,
      message: finding.message,
    })),
  }
  return createHash('sha256').update(JSON.stringify(signature)).digest('hex')
}

function makeBrief(packet) {
  const findings = packet.findings.length
    ? packet.findings.map((finding) => {
        const classifier = finding.ruleId ?? finding.code ?? 'unclassified'
        const location = finding.file
          ? `${finding.file}${finding.line ? `:${finding.line}${finding.column ? `:${finding.column}` : ''}` : ''}`
          : 'no-location'
        return `- [${finding.severity}] ${classifier} — ${location} — ${finding.message}`
      })
    : ['- No structured finding extracted; inspect the redacted evidence tail in the manifest.']

  return [
    '# TRAMA Diagnostic Agent — AI brief',
    '',
    '**Mode: PROPOSE_ONLY**',
    '',
    `- Source: \`${packet.source}\``,
    `- Exact head: \`${packet.exactHeadSha}\``,
    `- Base: \`${packet.baseSha}\``,
    `- Workflow run: \`${packet.workflowRunId}\``,
    `- First failing stage: \`${packet.failingStage ?? 'none'}\``,
    `- Failure fingerprint: \`${packet.failureFingerprint}\``,
    '',
    '## Structured findings',
    '',
    ...findings,
    '',
    '## Agent contract',
    '',
    '1. Classify the root cause from this evidence before proposing a repair.',
    '2. Do not infer missing diagnostics and do not suppress a failing rule or gate.',
    '3. Propose the smallest causal repair and identify the verification that must turn GREEN.',
    '4. Do not merge, deploy, publish, or mutate canonical data.',
    '5. Bind every conclusion and proposed verification to the exact tested SHA above.',
    '',
  ].join('\n')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const inputDir = requireArg(args, 'input-dir')
  const source = requireArg(args, 'source')
  const exactHeadSha = requireArg(args, 'exact-head')
  const baseSha = requireArg(args, 'base')
  const workflowRunId = requireArg(args, 'run-id')
  const changedFilesPath = requireArg(args, 'changed-files')
  const outputPath = requireArg(args, 'output')
  const briefPath = requireArg(args, 'brief')

  const stages = STAGES.map((stage) => {
    const log = readOptional(join(inputDir, `${stage}.log`))
    return {
      stage,
      exitCode: readExitCode(inputDir, stage),
      logPresent: Boolean(log),
      log,
    }
  })

  const failingStage = stages.find((stage) => stage.exitCode !== null && stage.exitCode !== 0)?.stage ?? null
  let findings = []
  if (failingStage === 'lint') {
    findings = parseEslint(inputDir)
  } else if (failingStage === 'typecheck') {
    const log = stages.find((stage) => stage.stage === 'typecheck')?.log ?? ''
    findings = parseTypeScript(log)
  }

  if (failingStage && findings.length === 0) {
    const log = stages.find((stage) => stage.stage === failingStage)?.log ?? ''
    findings = genericFindings(failingStage, log)
  }

  const sanitizedFindings = findings.map((finding) => ({
    ...finding,
    message: redact(finding.message),
  }))
  const errors = sanitizedFindings.filter((finding) => finding.severity === 'error')
  const warnings = sanitizedFindings.filter((finding) => finding.severity === 'warning')
  const evidence = stages
    .filter((stage) => stage.logPresent && (stage.stage === failingStage || stage.exitCode !== 0))
    .map((stage) => ({ stage: stage.stage, logTail: tail(stage.log) }))
  const changedFiles = readOptional(changedFilesPath)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const packet = {
    schemaVersion: 1,
    source,
    exactHeadSha,
    baseSha,
    workflowRunId: String(workflowRunId),
    status: failingStage ? 'FAIL' : 'PASS',
    failingStage,
    failureFingerprint: '',
    counts: {
      errors: errors.length,
      warnings: warnings.length,
      total: sanitizedFindings.length,
    },
    rules: ruleCounts(sanitizedFindings),
    changedFiles,
    stages: stages.map(({ stage, exitCode, logPresent }) => ({ stage, exitCode, logPresent })),
    findings: sanitizedFindings,
    evidence,
  }
  packet.failureFingerprint = fingerprint(packet)

  mkdirSync(dirname(outputPath), { recursive: true })
  mkdirSync(dirname(briefPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`)
  writeFileSync(briefPath, makeBrief(packet))
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
