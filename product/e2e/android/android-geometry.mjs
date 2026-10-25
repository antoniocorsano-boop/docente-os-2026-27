export async function rectFor(locator) {
  const box = await locator.boundingBox()
  if (!box) return null
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  }
}

export function intersection(a, b) {
  if (!a || !b) return { area: 0, rect: null }
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  if (right <= left || bottom <= top) return { area: 0, rect: null }
  const width = right - left
  const height = bottom - top
  return {
    area: width * height,
    rect: { left, top, right, bottom, width, height },
  }
}

export function classifyIntersection(a, b, { essential = true, warningGap = 8 } = {}) {
  if (!a || !b) return 'CLEAR'
  if (intersection(a, b).area > 0) return essential ? 'BLOCKING' : 'WARNING'
  if (warningGap > 0 && rectangleGap(a, b) <= warningGap) return 'WARNING'
  return 'CLEAR'
}

function rectangleGap(a, b) {
  const horizontal = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right))
  const vertical = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom))
  return Math.hypot(horizontal, vertical)
}
