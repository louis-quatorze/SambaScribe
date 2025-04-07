import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ThemeAwareToast } from '../src/components/theme/ThemeAwareToast'
import 'react-toastify/dist/ReactToastify.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SambaScribe',
  description: 'AI-powered PDF transcription and analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900 dark:text-gray-50`}>
        <Providers>
          {children}
          <ThemeAwareToast />
        </Providers>
      </body>
    </html>
  )
} 