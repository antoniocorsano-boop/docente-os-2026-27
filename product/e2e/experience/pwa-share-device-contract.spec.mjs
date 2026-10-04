import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

test('PWA device contract: manifest and Share Target are exposed by the deployed app', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest')
  expect(manifestResponse.status()).toBeLessThan(400)
  const manifest = await manifestResponse.json()

  expect(manifest.name).toBe('Docente OS')
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  expect(manifest.icons.some((icon) => icon.src === '/pwa/icon-192.png' && icon.sizes === '192x192')).toBe(true)
  expect(manifest.icons.some((icon) => icon.src === '/pwa/icon-512.png' && icon.sizes === '512x512')).toBe(true)
  expect(manifest.icons.some((icon) => icon.src === '/pwa/icon-maskable-512.png' && icon.purpose === 'maskable')).toBe(true)
  expect(manifest.share_target?.action).toBe('/share-target')
  expect(manifest.share_target?.method).toBe('POST')
  expect(manifest.share_target?.enctype).toBe('multipart/form-data')
  const accepted = manifest.share_target?.params?.files?.[0]?.accept ?? []
  expect(accepted).toContain('application/pdf')
  expect(accepted).toContain('.pdf')

  const workerResponse = await request.get('/sw.js')
  expect(workerResponse.status()).toBeLessThan(400)
  const worker = await workerResponse.text()
  expect(worker).toContain("request.method === 'POST'")
  expect(worker).toContain("url.pathname === '/share-target'")
  expect(worker).toContain("Response.redirect('/share-target?id='")
})

test('Impostazioni documents the browser-native install path without replacing it', async ({ page }) => {
  await loginE2E(page)
  await page.goto('/impostazioni#installazione')

  const installSection = page.locator('#installazione')
  await expect(installSection).toBeVisible()
  await expect(page.locator('[aria-label="Installazione Docente OS"]')).toHaveCount(0)

  const hasInstalledState = await installSection.getByText('Docente OS è installato.').count()
  if (!hasInstalledState) {
    await expect(installSection.getByText('L’installazione è gestita dal browser.', { exact: false })).toBeVisible()
    await expect(installSection.getByText('Installa app', { exact: true })).toBeVisible()
    await expect(installSection.getByText('Aggiungi a schermata Home', { exact: true })).toBeVisible()
    await expect(installSection.getByRole('button', { name: /Installa Docente OS/i })).toHaveCount(0)
  }
})

test('Share Target stays task-first and never shows the floating install prompt', async ({ page }) => {
  const response = await page.goto('/share-target')
  if (!response) throw new Error('No navigation response for /share-target')
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByRole('heading', { name: 'Condividi con Docente OS' })).toBeVisible()

  await expect(page.locator('[aria-label="Installazione Docente OS"]')).toHaveCount(0)
})
