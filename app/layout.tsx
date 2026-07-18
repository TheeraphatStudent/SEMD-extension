import './globals.css'
import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SEMD - URL Monitor',
  description: 'Suspicious URL Evaluation for Malicious Detection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
