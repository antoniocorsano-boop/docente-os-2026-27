import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import { loginE2E, requireE2ECredentials } from './support/e2e-auth.mjs'

const routes = [
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
  requireE2ECredentials()

  // Authentication is a precondition, not part of the performance sample.
  // Use the same governed AAL2 path as the other authenticated acceptance gates
  // so P6 never bypasses MFA and never measures an AAL1-only session.
  await loginE2E(page)

  // /workspace è un endpoint di transizione che reindirizza sempre a /planner:
  // non è una superficie da cronometrare. Il gate misura soltanto destinazioni
  // operative stabili, mantenendo invariati i budget di latenza.
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
