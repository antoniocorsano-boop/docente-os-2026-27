import { NextResponse } from 'next/server'
import { publicRequestUrl } from '../../request-public-url'
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
    return NextResponse.redirect(publicRequestUrl('/impostazioni/libri-di-testo', request))
  }

  const destination = publicRequestUrl('/knowledge', request)
  destination.searchParams.set('capture', 'file')
  destination.searchParams.set('source', 'textbook')
  destination.searchParams.set('textbookId', context.textbook.id)

  const response = NextResponse.redirect(destination)
  response.cookies.set(TEXTBOOK_MATERIAL_CONTEXT_COOKIE, context.textbook.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: destination.protocol === 'https:',
    maxAge: 15 * 60,
    path: '/knowledge',
  })
  return response
}
