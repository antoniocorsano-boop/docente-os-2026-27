import type { MetadataRoute } from 'next'
import { DOCENTE_OS_MARK_COLORS } from '@/components/brand/brand-mark-geometry'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Docente OS',
    short_name: 'Docente OS',
    description: 'Il sistema operativo professionale del docente.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: DOCENTE_OS_MARK_COLORS.white,
    theme_color: DOCENTE_OS_MARK_COLORS.navy,
    lang: 'it',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    share_target: {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [
          {
            name: 'files',
            accept: [
              'application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'text/plain',
              'text/markdown',
              'image/png',
              'image/jpeg',
              'image/webp',
            ],
          },
        ],
      },
    },
  }
}
