'use client'

import { ReactNode } from 'react'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { baseSepolia } from 'wagmi/chains'
import '@rainbow-me/rainbowkit/styles.css'

// ============================================
// ⚠️ Base Sepolia Testnet Only Configuration
// ============================================

const config = getDefaultConfig({
  appName: 'Axobase',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'axo-lobster-default',
  chains: [baseSepolia], // 强制只支持 Base Sepolia
  ssr: true,
})

const queryClient = new QueryClient()

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          coolMode
          locale="zh-CN"
          appInfo={{
            appName: 'Axobase',
            learnMoreUrl: 'https://github.com/0xinvictus1999/Axobase',
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
