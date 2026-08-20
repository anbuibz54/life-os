import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Literata } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * Content face. Literata is drawn for long-form reading on screen, which is
 * what note bodies and card faces are — see docs/design/SYSTEM.md.
 */
const literata = Literata({
  variable: '--font-literata',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'One place for what you are learning, across every domain.',
  applicationName: 'Life OS',
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    // iOS ignores the manifest's display mode; this is what gives an
    // added-to-home-screen launch the same chrome-less window Android gets.
    capable: true,
    title: 'Life OS',
    statusBarStyle: 'black-translucent',
  },
  // Phone numbers and dates in note bodies should not become tap targets.
  formatDetection: { telephone: false, date: false, address: false, email: false },
}

export const viewport: Viewport = {
  // Fills the notch area on an installed iOS app, and stops the layout being
  // letterboxed by the safe area.
  viewportFit: 'cover',
  // Dark is the primary context — two hours on a weekday evening, phone in
  // hand — but the OS preference is still honoured.
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfcfd' },
    { media: '(prefers-color-scheme: dark)', color: '#14171b' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
