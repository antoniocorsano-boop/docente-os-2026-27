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


const RASTER_IMAGE_FLATE = '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'

export function buildSanitizedRasterTimetablePdf() {
  const image = Buffer.from(RASTER_IMAGE_FLATE, 'base64')
  const content = Buffer.from('q 780 0 0 540 0 0 cm /Im0 Do Q\n', 'ascii')
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'ascii'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'ascii'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 780 540] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>', 'ascii'),
    Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width 780 /Height 540 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`, 'ascii'),
      image,
      Buffer.from('\nendstream', 'ascii'),
    ]),
    Buffer.concat([
      Buffer.from(`<< /Length ${content.length} >>\nstream\n`, 'ascii'),
      content,
      Buffer.from('endstream', 'ascii'),
    ]),
  ]
  return buildBinaryPdf(objects)
}

function buildBinaryPdf(objects) {
  const parts = [Buffer.from('%PDF-1.4\n', 'ascii')]
  const offsets = [0]
  let length = parts[0].length

  objects.forEach((object, index) => {
    offsets[index + 1] = length
    const header = Buffer.from(`${index + 1} 0 obj\n`, 'ascii')
    const footer = Buffer.from('\nendobj\n', 'ascii')
    parts.push(header, object, footer)
    length += header.length + object.length + footer.length
  })

  const xref = length
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index += 1) {
    trailer += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  parts.push(Buffer.from(trailer, 'ascii'))
  return Buffer.concat(parts)
}
