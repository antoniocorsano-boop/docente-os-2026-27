import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const routes = [
  '/workspace',
  '/planner',
  '/knowledge',
  '/classi',
  '/piano-annuale',
  '/progetta',
  '/orario',
  '/calendario',
]

const samplesPerRoute = Number(process.env.P6_SAMPLES_PER_ROUTE ?? 3)
const routeBudgetMs = Number(process.env.P6_ROUTE_BUDGET_MS ?? 3000)
const p95BudgetMs = Number(process.env.P6_P95_BUDGET_MS ?? 2200)

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)
  return sorted[Math.max(0, index)] ?? 0
}

test('P6 baseline: superfici principali restano entro il budget dopo warm-up', async ({ page }) => {
  if (!email || !password) throw new Error('E2E_EMAIL and E2E_PASSWORD are required')

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.getByLabel('Password').fill(password)
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /Entra nel tuo spazio docente/i }).click(),
  ])

  // Warm-up: Render Free può avere cold start. Il gate misura il comportamento
  // operativo dopo che l'istanza ha risposto, non il tempo di risveglio del piano.
  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    expect(response?.ok(), `warm-up ${route}`).toBeTruthy()
  }

  const observations = []
  for (const route of routes) {
    const samples = []
    for (let i = 0; i < samplesPerRoute; i += 1) {
      const started = performance.now()
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      const elapsedMs = Math.round(performance.now() - started)
      expect(response?.ok(), `${route} sample ${i + 1}`).toBeTruthy()
      samples.push(elapsedMs)
    }
    observations.push({
      route,
      samplesMs: samples,
      medianMs: percentile(samples, 0.5),
      p95Ms: percentile(samples, 0.95),
      maxMs: Math.max(...samples),
    })
  }

  const allSamples = observations.flatMap((entry) => entry.samplesMs)
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target: process.env.E2E_BASE_URL,
    datasetMode: 'CURRENT_BETA_NON_MUTATING',
    samplesPerRoute,
    budgets: {
      routeMaxMs: routeBudgetMs,
      aggregateP95Ms: p95BudgetMs,
    },
    aggregate: {
      samples: allSamples.length,
      medianMs: percentile(allSamples, 0.5),
      p95Ms: percentile(allSamples, 0.95),
      maxMs: Math.max(...allSamples),
    },
    routes: observations,
  }

  await fs.mkdir('test-results', { recursive: true })
  await fs.writeFile('test-results/p6-performance-receipt.json', JSON.stringify(receipt, null, 2))

  for (const observation of observations) {
    expect(observation.maxMs, `${observation.route} max latency`).toBeLessThanOrEqual(routeBudgetMs)
  }
  expect(receipt.aggregate.p95Ms, 'aggregate p95 latency').toBeLessThanOrEqual(p95BudgetMs)
})
