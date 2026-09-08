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

  const response = NextResponse.redirect(new URL('/knowledge?capture=file&source=textbook', request.url))
  response.cookies.set(TEXTBOOK_MATERIAL_CONTEXT_COOKIE, context.textbook.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(request.url).protocol === 'https:',
    maxAge: 15 * 60,
    path: '/',
  })
  return response
}
