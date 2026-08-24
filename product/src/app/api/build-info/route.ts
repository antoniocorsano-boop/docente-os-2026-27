import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      commit: process.env.RENDER_GIT_COMMIT ?? null,
      service: process.env.RENDER_SERVICE_NAME ?? null,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
