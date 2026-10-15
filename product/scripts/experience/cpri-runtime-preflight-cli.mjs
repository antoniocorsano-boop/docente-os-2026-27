import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  generateTotp,
  governedMfaRetryJitterMs,
  millisecondsUntilNextTotpStep,
} from '../../e2e/support/totp.mjs'
import { runCpriRuntimePreflight } from './cpri-runtime-preflight.mjs'

const outputPath = process.env.CPRI_PREFLIGHT_OUTPUT
  ?? 'test-results/experience/cpri-runtime-preflight.json'

const requiredEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  E2E_EMAIL: process.env.E2E_EMAIL,
  E2E_PASSWORD: process.env.E2E_PASSWORD,
  E2E_TOTP_SECRET: process.env.E2E_TOTP_SECRET,
}

try {
  requireEnvironment(requiredEnvironment)

  const supabase = createClient(
    requiredEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    requiredEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )

  const signIn = await supabase.auth.signInWithPassword({
    email: requiredEnvironment.E2E_EMAIL,
    password: requiredEnvironment.E2E_PASSWORD,
  })
  if (signIn.error || !signIn.data?.session) {
    throw new Error(`governed_sign_in_failed:${safeErrorCode(signIn.error ?? 'missing_session')}`)
  }

  const factors = await supabase.auth.mfa.listFactors()
  if (factors.error) {
    throw new Error(`governed_factor_read_failed:${safeErrorCode(factors.error)}`)
  }
  const factor = selectGovernedTotpFactor(factors.data?.totp)

  const jitterMs = governedMfaRetryJitterMs()
  const remainingMs = millisecondsUntilNextTotpStep()
  if (remainingMs < 6_000 + jitterMs) {
    await delay(remainingMs + 750 + jitterMs)
  } else if (jitterMs > 0) {
    await delay(jitterMs)
  }

  const verification = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: generateTotp(requiredEnvironment.E2E_TOTP_SECRET),
  })
  if (verification.error) {
    throw new Error(`governed_mfa_verification_failed:${safeErrorCode(verification.error)}`)
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance.error) {
    throw new Error(`governed_aal_read_failed:${safeErrorCode(assurance.error)}`)
  }
  if (assurance.data?.currentLevel !== 'aal2') {
    throw new Error(`governed_aal_not_aal2:${assurance.data?.currentLevel ?? 'unknown'}`)
  }

  const session = await supabase.auth.getSession()
  if (session.error || !session.data?.session?.access_token) {
    throw new Error(`governed_aal2_session_missing:${safeErrorCode(session.error ?? 'missing_access_token')}`)
  }

  const requiredCodes = parseRequiredCodes(process.env.CPRI_REQUIRED_CODES)
  const result = await runCpriRuntimePreflight({
    supabaseUrl: requiredEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    apiKey: requiredEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    accessToken: session.data.session.access_token,
    workspaceId: optionalValue(process.env.CPRI_WORKSPACE_ID),
    academicYearId: optionalValue(process.env.CPRI_ACADEMIC_YEAR_ID),
    ...(requiredCodes ? { requiredCodes } : {}),
  })

  await writeReceipt({
    ...result,
    assuranceLevel: 'aal2',
    testedSha: process.env.P6_TESTED_SHA ?? process.env.GITHUB_SHA ?? null,
  })

  process.stdout.write(`CPRI runtime preflight: ${result.status}\n`)
  if (result.blockers.length > 0) {
    process.stderr.write(`${result.blockers.join('\n')}\n`)
  }
  process.exitCode = result.status === 'READY' ? 0 : 1
} catch (error) {
  const blocker = `CPRI_PREFLIGHT_EXECUTION_FAILED:${safeErrorCode(error)}`
  await writeReceipt({
    status: 'BLOCKED',
    blockers: [blocker],
    assuranceLevel: 'unverified',
    testedSha: process.env.P6_TESTED_SHA ?? process.env.GITHUB_SHA ?? null,
  }).catch(() => {})
  process.stderr.write(`${blocker}\n`)
  process.exitCode = 1
}

function requireEnvironment(values) {
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(`missing_required_environment:${missing.join(',')}`)
  }
}

function selectGovernedTotpFactor(rawFactors) {
  const verified = Array.isArray(rawFactors)
    ? rawFactors.filter((factor) => factor?.status === 'verified' && factor?.id)
    : []
  const canonical = verified.filter((factor) => factor.friendly_name === 'Docente OS CI')
  if (canonical.length === 1) return canonical[0]
  if (canonical.length > 1) throw new Error('multiple_governed_docente_os_ci_factors')
  if (verified.length === 1) return verified[0]
  if (verified.length === 0) throw new Error('no_verified_totp_factor')
  throw new Error('ambiguous_verified_totp_factors')
}

function parseRequiredCodes(value) {
  if (!value) return null
  const codes = [...new Set(value.split(',').map((code) => code.trim()).filter(Boolean))]
  if (codes.length === 0) throw new Error('cpri_required_codes_empty')
  return codes
}

function optionalValue(value) {
  const normalized = value?.trim()
  return normalized || undefined
}

async function writeReceipt(receipt) {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function safeErrorCode(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[^A-Za-z0-9_.:,-]+/g, '_').slice(0, 200) || 'UNKNOWN'
}
