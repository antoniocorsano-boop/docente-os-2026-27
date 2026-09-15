import { NextResponse } from 'next/server'
import { loadCurrentTodayCopilotContext } from '../today-context-loader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const loaded = await loadCurrentTodayCopilotContext()
  if (!loaded) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return privateJson(loaded.context)
}

function privateJson(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
