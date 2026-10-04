import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function TimetableManageLegacyRoute() {
  redirect('/orario/aggiorna?fase=controllo')
}
