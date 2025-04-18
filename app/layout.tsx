import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ThemeAwareToast } from '../src/components/theme/ThemeAwareToast'
import 'react-toastify/dist/ReactToastify.css'
import { TRPCReactProvider } from '@/lib/trpc/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SambaScribe',
  description: 'AI-powered PDF transcription and analysis for Brazilian percussion notations and samba sheets',
  metadataBase: new URL('https://sambascribe.onrender.com'),
  openGraph: {
    title: 'SambaScribe',
    description: 'AI-powered PDF transcription and analysis for Brazilian percussion notations and samba sheets',
    url: 'https://sambascribe.onrender.com',
    siteName: 'SambaScribe',
    images: [
      {
        url: '/files/samba.png',
        width: 1200,
        height: 630,
        alt: 'SambaScribe - AI Samba Notation Analyzer',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SambaScribe',
    description: 'AI-powered PDF transcription and analysis for Brazilian percussion notations and samba sheets',
    images: ['/files/samba.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/files/samba.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900 dark:text-gray-50`}>
        <TRPCReactProvider>
          <Providers>
            {children}
            <ThemeAwareToast />
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  )
} 