import type { MetadataRoute } from 'next'

/**
 * Web app manifest — what makes this installable on a phone.
 *
 * `display: standalone` drops the browser chrome, which matters more here than
 * it sounds: the whole navigation design assumes the screen is the app, and a
 * URL bar above a capture box is a permanent reminder that it is a website.
 *
 * `start_url` is the capture surface, not a dashboard. Opening the app should
 * put the cursor where a thought goes.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Life OS',
    short_name: 'Life OS',
    description: 'One place for what you are learning, across every domain.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Matches the dark token exactly. A mismatched splash background flashes a
    // different colour on launch, which reads as a bug.
    background_color: '#0f1216',
    theme_color: '#0f1216',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Maskable so Android can crop it to the launcher's shape without
      // slicing the mark — the grid is inset far enough to survive it.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
