import type { Metadata, Viewport } from 'next'
import './tailwind.css'
import './globals.css'
import './app-shell.css'
import './assistant.css'
import './assistant-safe-area.css'
import './human-task.css'
import './navigation-performance.css'
import './home.css'
import './planner/planner-enhancements.css'
import './knowledge/knowledge.css'
import './knowledge/knowledge-provenance.css'
import './knowledge/knowledge-focus.css'
import './knowledge/knowledge-capture-modes.css'
import './knowledge/knowledge-disclosure.css'
import './communication.css'
import './brand-system.css'

export const metadata: Metadata = {
  applicationName: 'Docente OS',
  title: {
    default: 'Docente OS — Mantieni il filo.',
    template: '%s · Docente OS',
  },
  description: 'Il sistema operativo professionale che mantiene il filo del lavoro docente e porta in primo piano il prossimo passo pertinente.',
}

export const viewport: Viewport = {
  themeColor: '#0b2d5b',
  colorScheme: 'light',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
