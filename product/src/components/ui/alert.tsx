import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-[var(--radius-sm)] border p-4 text-sm leading-6',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-foreground',
        info: 'border-primary/25 bg-[var(--brand-soft)] text-foreground',
        success: 'border-success/25 bg-[var(--success-soft)] text-foreground',
        warning: 'border-warning/25 bg-[var(--warning-soft)] text-foreground',
        destructive: 'border-destructive/25 bg-[var(--danger-soft)] text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('mb-1 font-semibold leading-none', className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('m-0 text-sm leading-6', className)} {...props} />
}
