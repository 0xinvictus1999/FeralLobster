'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'ethers'

interface WalletGeneratorProps {
  onWalletGenerated: (address: string, privateKey: string) => void
  onSubmit: (address: string) => void
}

export function WalletGenerator({ onWalletGenerated, onSubmit }: WalletGeneratorProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const generateWallet = () => {
    const newWallet = Wallet.createRandom()
    setWallet(newWallet)
    onWalletGenerated(newWallet.address, newWallet.privateKey)
  }

  const downloadKeystore = async (encrypt: boolean) => {
    if (!wallet) return

    let json: string
    if (encrypt && password) {
      // 加密版本
      json = await wallet.encrypt(password)
    } else {
      // 明文版本 (不推荐用于生产)
      json = JSON.stringify({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase
      }, null, 2)
    }

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `axo-wallet-${wallet.address.slice(0, 6)}-${encrypt ? 'encrypted' : 'plain'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSubmit = async () => {
    if (!wallet) return
    setIsSubmitting(true)
    
    // 调用后端 API 准备钱包
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_PLATFORM_API_URL}/api/prepare-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address })
      })
      
      if (response.ok) {
        onSubmit(wallet.address)
      } else {
        alert('钱包准备失败，请重试')
      }
    } catch (error) {
      console.error('Error preparing wallet:', error)
      // 即使 API 失败也允许继续
      onSubmit(wallet.address)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!wallet) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <button
          onClick={generateWallet}
          className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-semibold text-white hover:from-cyan-500 hover:to-purple-500 transition-all shadow-lg shadow-cyan-500/25"
        >
          🎲 生成 Bot 钱包
        </button>
        <p className="mt-4 text-sm text-slate-400">
          将创建一个新的以太坊钱包作为您的 AI 代理身份
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="p-4 bg-slate-800/50 rounded-lg border border-cyan-500/30">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Bot 钱包地址
        </label>
        <code className="block w-full p-3 bg-slate-900 rounded text-cyan-400 font-mono text-sm break-all">
          {wallet.address}
        </code>
      </div>

      <div className="p-4 bg-slate-800/50 rounded-lg border border-red-500/30">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-red-400">
            ⚠️ 私钥 (务必保存)
          </label>
          <button
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            {showPrivateKey ? '隐藏' : '显示'}
          </button>
        </div>
        <code className={`block w-full p-3 bg-slate-900 rounded font-mono text-sm break-all ${
          showPrivateKey ? 'text-red-400' : 'text-slate-600'
        }`}>
          {showPrivateKey ? wallet.privateKey : '•'.repeat(64)}
        </code>
        <p className="mt-2 text-xs text-red-400/80">
          丢失私钥将无法恢复您的 AI 代理!
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-300">下载密钥文件:</p>
        
        <div className="flex gap-2">
          <button
            onClick={() => downloadKeystore(false)}
            className="flex-1 px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors text-sm"
          >
            📄 下载明文 (调试)
          </button>
          
          <div className="flex-[2] flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码"
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => downloadKeystore(true)}
              disabled={!password}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              🔐 加密下载
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-700">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-green-600 rounded-lg font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? '确认中...' : '✓ 确认钱包生成，进入下一步'}
        </button>
      </div>
    </motion.div>
  )
}
