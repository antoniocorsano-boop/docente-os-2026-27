import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { _android } from 'playwright'

const OUTPUT_ROOT = path.resolve('test-results/android-reality')
const INFRASTRUCTURE_PATH = path.join(OUTPUT_ROOT, 'infrastructure.json')

export function classifyInfrastructureError() {
  return 'INFRA_BLOCKED'
}

export async function connectAndroidRuntime() {
  const devices = await _android.devices()
  if (devices.length !== 1) {
    throw new Error(`Expected exactly one Android emulator, found ${devices.length}`)
  }

  const device = devices[0]
  const serial = device.serial()
  execFileSync('adb', ['-s', serial, 'reverse', 'tcp:3000', 'tcp:3000'], { stdio: 'pipe' })

  const [apiRaw, releaseRaw, chromeRaw] = await Promise.all([
    device.shell('getprop ro.build.version.sdk'),
    device.shell('getprop ro.build.version.release'),
    device.shell('dumpsys package com.android.chrome | grep versionName | head -1'),
  ])

  const metadata = {
    model: device.model(),
    serial,
    apiLevel: apiRaw.toString('utf8').trim(),
    androidRelease: releaseRaw.toString('utf8').trim(),
    chromeVersion: chromeRaw.toString('utf8').trim().replace(/^versionName=/, '') || 'unknown',
  }

  await device.shell('am force-stop com.android.chrome')
  const context = await device.launchBrowser({
    baseURL: 'http://127.0.0.1:3000',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: { width: 390, height: 844 },
  })
  const pages = context.pages()
  const page = pages[0] ?? await context.newPage()

  return { device, context, page, metadata }
}

export async function writeInfrastructureReceipt({ infrastructure, metadata = null, error = null }) {
  await mkdir(OUTPUT_ROOT, { recursive: true })
  const receipt = {
    infrastructure,
    metadata: sanitizeMetadata(metadata),
    error: error ? sanitizeError(error) : null,
  }
  await writeFile(INFRASTRUCTURE_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  return receipt
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null
  const allowed = ['model', 'serial', 'apiLevel', 'androidRelease', 'chromeVersion']
  return Object.fromEntries(allowed.filter((key) => typeof metadata[key] === 'string').map((key) => [key, metadata[key]]))
}

function sanitizeError(error) {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  let value = raw
  for (const name of ['E2E_EMAIL', 'E2E_PASSWORD', 'E2E_TOTP_SECRET']) {
    const secret = process.env[name]
    if (secret) value = value.split(secret).join('[REDACTED]')
  }
  return value.slice(0, 1200)
}
