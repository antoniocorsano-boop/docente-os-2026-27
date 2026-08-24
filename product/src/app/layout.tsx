import type { Metadata } from 'next'
import './tailwind.css'
import './globals.css'
import './app-shell.css'
import './assistant.css'
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

export const metadata: Metadata = {
  title: 'DOCENTE OS 2026/27',
  description: 'Sistema operativo personale per la gestione dell’anno scolastico del docente.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
