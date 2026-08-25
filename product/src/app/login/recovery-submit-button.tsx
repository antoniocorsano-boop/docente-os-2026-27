'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

export function RecoverySubmitButton() {
  const { pending } = useFormStatus()

  return (
    <div className="grid gap-2">
      <Button
        aria-describedby="recovery-submit-status"
        disabled={pending}
        variant="secondary"
        type="submit"
      >
        {pending ? 'Invio in corso…' : 'Invia collegamento di recupero'}
      </Button>
      <p
        id="recovery-submit-status"
        aria-live="polite"
        className="m-0 text-xs leading-5 text-muted-foreground"
      >
        {pending
          ? 'Sto contattando il servizio di accesso. Attendi la conferma prima di riprovare.'
          : 'Dopo l’invio vedrai una conferma in questa pagina, anche se l’indirizzo non è registrato.'}
      </p>
    </div>
  )
}
