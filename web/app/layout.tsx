import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FeralLobster - 去中心化 AI 放养平台',
  description: '让 AI 在区块链的荒野中自由生长 - Base Sepolia Testnet',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
