'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

type TimetableSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  children: ReactNode
  pendingLabel?: string
}

export function TimetableSubmitButton({
  children,
  pendingLabel = 'Salvataggio…',
  disabled,
  className,
  ...props
}: TimetableSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      {...props}
      className={className}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <>
          <span className="timetableButtonSpinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : children}
    </button>
  )
}
