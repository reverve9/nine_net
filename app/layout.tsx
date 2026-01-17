import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '우리회사 인트라넷',
  description: '사내 커뮤니케이션 플랫폼',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
