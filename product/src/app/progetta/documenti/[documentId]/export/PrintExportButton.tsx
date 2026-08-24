'use client'

export function PrintExportButton() {
  return <button type="button" className="udaExportPrintButton" onClick={() => window.print()}>Stampa / Salva PDF</button>
}
