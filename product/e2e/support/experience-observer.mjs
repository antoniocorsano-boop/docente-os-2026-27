import fs from 'node:fs/promises'
import path from 'node:path'

const OUTPUT_ROOT = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

export function createExperienceObserver(page) {
  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []
  const httpErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText ?? 'request failed',
    })
  })
  page.on('response', (response) => {
    const status = response.status()
    const url = response.url()
    if (status >= 400 && !url.endsWith('/favicon.ico')) {
      httpErrors.push({ status, url, resourceType: response.request().resourceType() })
    }
  })

  return {
    async capture({ surface, label, project }) {
      const layout = await page.evaluate(() => {
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0)
        const documentHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0)
        const h1 = document.querySelector('h1')?.textContent?.trim() ?? ''
        const interactive = [...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea,[role="button"]')]
          .flatMap((element) => {
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
            if (!visible) return []
            if (rect.bottom < 0 || rect.top > viewportHeight) return []
            const label = element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('name') || element.tagName.toLowerCase()
            return [{
              label: String(label).replace(/\s+/g, ' ').slice(0, 120),
              tag: element.tagName.toLowerCase(),
              width: Math.round(rect.width * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
            }]
          })
        return {
          viewportWidth,
          viewportHeight,
          documentWidth,
          documentHeight,
          horizontalOverflow: Math.max(0, documentWidth - viewportWidth),
          h1,
          smallInteractiveTargets: interactive.filter((item) => item.width < 36 || item.height < 36),
        }
      })

      const observation = {
        schemaVersion: 1,
        surface,
        label,
        project,
        url: page.url(),
        title: await page.title(),
        capturedAt: new Date().toISOString(),
        ...layout,
        consoleErrors,
        pageErrors,
        requestFailures,
        httpErrors,
      }

      const observationsDir = path.join(OUTPUT_ROOT, 'observations')
      await fs.mkdir(observationsDir, { recursive: true })
      await fs.writeFile(path.join(observationsDir, `${safe(project)}--${safe(surface)}.json`), `${JSON.stringify(observation, null, 2)}\n`)
      return observation
    },
  }
}

export async function screenshotPath(project, surface) {
  const screenshotsDir = path.join(OUTPUT_ROOT, 'screenshots')
  await fs.mkdir(screenshotsDir, { recursive: true })
  return path.join(screenshotsDir, `${safe(project)}--${safe(surface)}.png`)
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
