const DAYS = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi']
const CLASSES = ['1A', '2A', '3A', '1B', '2B', '3B', '1C', '2C', '3C', '1D', '3D', '3E']

const LESSONS = new Set([
  'lunedi|4|3E',
  'lunedi|5|3A',
  'lunedi|6|3C',
  'martedi|5|2C',
  'martedi|6|2A',
  'mercoledi|5|1C',
  'mercoledi|6|1A',
  'giovedi|1|1A',
  'giovedi|2|2C',
  'giovedi|3|3E',
  'giovedi|5|3C',
  'venerdi|1|3A',
  'venerdi|4|1C',
  'venerdi|5|2A',
])

export function buildSanitizedTimetablePdf() {
  const commands = []
  const text = (x, y, value, size = 7) => {
    const escaped = String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    commands.push(`BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escaped}) Tj ET`)
  }

  text(310, 575, 'ORARIO PROVVISORIO DAL 28-09-2026', 9)

  const left = 20
  const dayX = left
  const hourX = 78
  const classStartX = 118
  const classStep = 56
  const headerY = 552
  const firstRowY = 532
  const rowStep = 16

  text(dayX, headerY, 'Classi')
  CLASSES.forEach((classLabel, index) => text(classStartX + index * classStep, headerY, classLabel))

  let row = 0
  for (const day of DAYS) {
    for (let ordinal = 1; ordinal <= 6; ordinal += 1) {
      const y = firstRowY - row * rowStep
      if (ordinal === 1) text(dayX, y, day)
      // Real 28/09 layout exposes plain numeric period cells under "Ora".
      text(hourX, y, String(ordinal))

      CLASSES.forEach((classLabel, classIndex) => {
        const x = classStartX + classIndex * classStep
        if (LESSONS.has(`${day}|${ordinal}|${classLabel}`)) {
          // Preserve one split-token case seen in compact timetable PDFs.
          if (day === 'giovedi' && ordinal === 5 && classLabel === '3C') {
            text(x, y, 'Cor')
            text(x + 14, y, 'sa')
            text(x + 24, y, 'no')
          } else {
            text(x, y, 'Corsano')
          }
        } else {
          text(x, y, 'Docente')
        }
      })
      row += 1
    }
  }

  return buildPdf(commands.join('\n'))
}

function buildPdf(content) {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'latin1')
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
