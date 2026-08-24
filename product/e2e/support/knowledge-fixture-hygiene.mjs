export async function knowledgeFixtureAssetIds(page, titleFragment) {
  await page.goto(`/knowledge?q=${encodeURIComponent(titleFragment)}`)
  return page.locator('a.knowledgeResult, a.knowledgeAssetRow').evaluateAll((links, fragment) => {
    const needle = String(fragment).toLocaleLowerCase('it')
    const ids = links.flatMap((link) => {
      if (!link.textContent?.toLocaleLowerCase('it').includes(needle)) return []
      const href = link.getAttribute('href') ?? ''
      const match = href.match(/^\/knowledge\/([^/?#]+)$/)
      return match ? [decodeURIComponent(match[1])] : []
    })
    return [...new Set(ids)]
  }, titleFragment)
}

export async function deleteKnowledgeAsset(page, assetId, { tolerateMissing = true } = {}) {
  const response = await page.request.delete(`/api/knowledge/${encodeURIComponent(assetId)}`)
  if (response.status() === 204) return true
  if (tolerateMissing && response.status() === 404) return false
  const body = await response.text().catch(() => '')
  throw new Error(`Knowledge cleanup failed for ${assetId}: HTTP ${response.status()} ${body}`)
}

export async function deleteAllKnowledgeFixtures(page, titleFragment) {
  const ids = await knowledgeFixtureAssetIds(page, titleFragment)
  for (const id of ids) await deleteKnowledgeAsset(page, id)
  return ids.length
}

export async function retainNewestKnowledgeFixture(page, titleFragment) {
  const ids = await knowledgeFixtureAssetIds(page, titleFragment)
  const [keep, ...duplicates] = ids
  for (const id of duplicates) await deleteKnowledgeAsset(page, id)
  return keep ?? null
}
