import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DOCENTE OS 2026/27',
  description: 'Sistema operativo personale per la gestione dell’anno scolastico del docente.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
