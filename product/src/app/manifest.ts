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
    prefer_related_applications: false,
    background_color: DOCENTE_OS_MARK_COLORS.white,
    theme_color: DOCENTE_OS_MARK_COLORS.navy,
    lang: 'it',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/pwa/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
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
              '.pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              '.docx',
              'text/plain',
              '.txt',
              'text/markdown',
              '.md',
              'image/png',
              '.png',
              'image/jpeg',
              '.jpg',
              '.jpeg',
              'image/webp',
              '.webp',
            ],
          },
        ],
      },
    },
  }
}
