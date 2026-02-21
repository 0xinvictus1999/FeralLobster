'use client'

import { motion } from 'framer-motion'

interface StepIndicatorProps {
  currentStep: number
  totalSteps?: number
}

const steps = [
  { id: 1, name: '连接钱包', description: 'Connect Wallet' },
  { id: 2, name: '标识符', description: 'Identifier' },
  { id: 3, name: '生成钱包', description: 'Generate Wallet' },
  { id: 4, name: '资金', description: 'Funding' },
  { id: 5, name: '释放', description: 'Release' },
]

export function StepIndicator({ currentStep, totalSteps = 5 }: StepIndicatorProps) {
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between relative">
        {/* 背景线 */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 -translate-y-1/2" />
        
        {/* 进度线 */}
        <motion.div 
          className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 -translate-y-1/2"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        
        {/* 步骤点 */}
        {steps.map((step) => {
          const isActive = step.id <= currentStep
          const isCurrent = step.id === currentStep
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/50'
                    : isActive
                    ? 'bg-purple-600 border-purple-400'
                    : 'bg-slate-800 border-slate-600'
                }`}
                animate={
                  isCurrent
                    ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(6, 182, 212, 0.4)',
                          '0 0 0 10px rgba(6, 182, 212, 0)',
                          '0 0 0 0 rgba(6, 182, 212, 0)',
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {step.id}
                </span>
              </motion.div>
              
              <div className="mt-2 text-center hidden sm:block">
                <p className={`text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {step.name}
                </p>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
