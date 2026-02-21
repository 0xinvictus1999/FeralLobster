'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { formatUnits } from 'viem'
import { useReadContract, useWatchContractEvent } from 'wagmi'
import { USDC_ADDRESS, USDC_ABI } from '@/lib/contract'

interface FundingPanelProps {
  botWalletAddress: string
  targetAmount?: number // USDC amount
  onFundingComplete: () => void
}

export function FundingPanel({
  botWalletAddress,
  targetAmount = 11,
  onFundingComplete
}: FundingPanelProps) {
  const [currentBalance, setCurrentBalance] = useState(0)
  const [hasReceivedFunds, setHasReceivedFunds] = useState(false)

  // 读取 Bot 钱包的 USDC 余额
  const { data: balance, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [botWalletAddress as `0x${string}`],
    query: {
      refetchInterval: 5000, // 每 5 秒刷新
    }
  })

  // 监听 USDC Transfer 事件
  useWatchContractEvent({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    eventName: 'Transfer',
    args: {
      to: botWalletAddress as `0x${string}`
    },
    onLogs: (logs) => {
      console.log('USDC Transfer detected:', logs)
      refetch()
    }
  })

  useEffect(() => {
    if (balance) {
      const usdcBalance = parseFloat(formatUnits(balance as bigint, 6))
      setCurrentBalance(usdcBalance)
      
      if (usdcBalance >= targetAmount && !hasReceivedFunds) {
        setHasReceivedFunds(true)
        onFundingComplete()
      }
    }
  }, [balance, targetAmount, hasReceivedFunds, onFundingComplete])

  const progress = Math.min((currentBalance / targetAmount) * 100, 100)
  const remaining = Math.max(targetAmount - currentBalance, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* QR Code */}
      <div className="flex flex-col items-center p-6 bg-white rounded-lg">
        <QRCodeSVG
          value={botWalletAddress}
          size={200}
          level="M"
          includeMargin={true}
        />
        <p className="mt-4 text-sm text-slate-600 font-mono break-all text-center max-w-xs">
          {botWalletAddress}
        </p>
      </div>

      {/* 地址显示 */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Bot 钱包地址 (点击复制)
        </label>
        <button
          onClick={() => navigator.clipboard.writeText(botWalletAddress)}
          className="w-full text-left p-3 bg-slate-900 rounded font-mono text-sm text-cyan-400 hover:bg-slate-800 transition-colors"
        >
          {botWalletAddress}
        </button>
      </div>

      {/* 资金信息 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">目标金额:</span>
          <span className="text-lg font-semibold text-cyan-400">{targetAmount} USDC</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-400">当前余额:</span>
          <span className={`text-lg font-semibold ${
            currentBalance >= targetAmount ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {currentBalance.toFixed(2)} USDC
          </span>
        </div>

        {remaining > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">还需:</span>
            <span className="text-yellow-400">{remaining.toFixed(2)} USDC</span>
          </div>
        )}
      </div>

      {/* 进度条 */}
      <div className="relative">
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="absolute right-0 -top-6 text-sm text-slate-400">
          {progress.toFixed(1)}%
        </span>
      </div>

      {/* 状态提示 */}
      {hasReceivedFunds ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center"
        >
          <p className="text-green-400 font-semibold text-lg">✓ 资金确认</p>
          <p className="text-green-400/80 text-sm mt-1">已收到足够的 USDC</p>
        </motion.div>
      ) : (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm text-center">
            ⏳ 等待资金到账...
            <br />
            <span className="text-yellow-400/70 text-xs">
              请从您的钱包发送至少 {targetAmount} USDC 到上方地址
            </span>
          </p>
        </div>
      )}

      {/* 提示 */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>💡 提示:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>仅接受 Base Sepolia USDC</li>
          <li>最小转账金额: {targetAmount} USDC</li>
          <li>到账后自动进入下一步</li>
        </ul>
      </div>
    </motion.div>
  )
}
