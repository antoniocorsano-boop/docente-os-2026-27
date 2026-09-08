import { NextResponse } from 'next/server'
import {
  resolveConfirmedTextbookMaterialContext,
  TEXTBOOK_MATERIAL_CONTEXT_COOKIE,
} from '../../textbook-material-context'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ textbookId: string }> },
) {
  const { textbookId } = await params
  const context = await resolveConfirmedTextbookMaterialContext(textbookId)

  if (!context) {
    return NextResponse.redirect(new URL('/impostazioni/libri-di-testo', request.url))
  }

  const destination = new URL('/knowledge', request.url)
  destination.searchParams.set('capture', 'file')
  destination.searchParams.set('source', 'textbook')
  destination.searchParams.set('textbookId', context.textbook.id)

  const response = NextResponse.redirect(destination)
  response.cookies.set(TEXTBOOK_MATERIAL_CONTEXT_COOKIE, context.textbook.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(request.url).protocol === 'https:',
    maxAge: 15 * 60,
    path: '/knowledge',
  })
  return response
}
