'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface IdentifierInputProps {
  onValidIdentifier: (arweaveId: string, hash: string) => void
  onCheckStatus: (hash: string) => void
  isChecking: boolean
  soulExists?: boolean
}

export function IdentifierInput({
  onValidIdentifier,
  onCheckStatus,
  isChecking,
  soulExists
}: IdentifierInputProps) {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')

  const parseIdentifier = (value: string) => {
    // 格式: {arweave_id}::{hash}
    const parts = value.split('::')
    if (parts.length !== 2) {
      setError('标识符格式错误，应为: arweave_id::hash')
      return null
    }
    return {
      arweaveId: parts[0].trim(),
      hash: parts[1].trim()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setIdentifier(value)
    setError('')

    const parsed = parseIdentifier(value)
    if (parsed) {
      onValidIdentifier(parsed.arweaveId, parsed.hash)
      onCheckStatus(parsed.hash as `0x${string}`)
    }
  }

  const getStatusDisplay = () => {
    if (isChecking) {
      return (
        <span className="text-yellow-400 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          检查中...
        </span>
      )
    }
    if (soulExists === undefined) return null
    if (soulExists) {
      return (
        <span className="text-red-400 flex items-center gap-2">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          已使用 - 此分身已注册
        </span>
      )
    }
    return (
      <span className="text-green-400 flex items-center gap-2">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        有效 - 可以注册
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          粘贴您的标识符
        </label>
        <input
          type="text"
          value={identifier}
          onChange={handleChange}
          placeholder="xxxxxxxx...::0x..."
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
        />
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-red-400"
          >
            {error}
          </motion.p>
        )}
      </div>

      {identifier && !error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">状态检查:</span>
            {getStatusDisplay()}
          </div>
        </motion.div>
      )}

      <div className="text-xs text-slate-500">
        标识符格式: <code className="bg-slate-800 px-1 py-0.5 rounded">arweave_id::hash</code>
      </div>
    </motion.div>
  )
}
