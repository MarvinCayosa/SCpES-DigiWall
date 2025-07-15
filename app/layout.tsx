import type { Metadata } from 'next'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'SCpES DigiWall',
  description: 'Digital Freedom Wall for Society of Computer Engineering Students',
  generator: 'Next.js',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  )
}
