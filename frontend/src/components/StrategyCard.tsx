'use client'

import { formatUnits } from 'viem'
import type { Strategy } from '@/lib/envio'
import { getTokenSymbol, getTokenLogo, getTokenDecimals } from '@/lib/tokens'
import { STRATEGY_TYPES } from '@/lib/contracts'

interface StrategyCardProps {
  strategy: Strategy
}

function formatFrequency(frequency: string): string {
  const seconds = BigInt(frequency)
  if (seconds === 3600n) return 'Hourly'
  if (seconds === 86400n) return 'Daily'
  if (seconds === 604800n) return 'Weekly'
  if (seconds < 3600n) return `Every ${seconds / 60n} min`
  if (seconds < 86400n) return `Every ${seconds / 3600n} hrs`
  return `Every ${seconds / 86400n} days`
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp || timestamp === '0') return 'Never'
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStrategyTypeInfo(strategyType?: number): { name: string; color: string; gradient: string } {
  switch (strategyType) {
    case STRATEGY_TYPES.SMART_MONEY_DCA:
      return { name: 'Smart Money', color: 'text-[#f59e0b]', gradient: 'from-[#f59e0b] to-[#d97706]' }
    case STRATEGY_TYPES.SMART_ACCUMULATE:
      return { name: 'Accumulate', color: 'text-[#10b981]', gradient: 'from-[#10b981] to-[#059669]' }
    case STRATEGY_TYPES.HYBRID:
      return { name: 'Hybrid', color: 'text-[#7c3aed]', gradient: 'from-[#7c3aed] to-[#5b21b6]' }
    default:
      return { name: 'Basic DCA', color: 'text-[#6b7280]', gradient: 'from-[#6b7280] to-[#4b5563]' }
  }
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const tokenInSymbol = getTokenSymbol(strategy.tokenIn)
  const tokenOutSymbol = getTokenSymbol(strategy.tokenOut)
  const tokenInLogo = getTokenLogo(strategy.tokenIn)
  const tokenOutLogo = getTokenLogo(strategy.tokenOut)
  const tokenInDecimals = getTokenDecimals(strategy.tokenIn)
  const amountFormatted = formatUnits(BigInt(strategy.amountPerExecution), tokenInDecimals)
  const progress = (Number(strategy.executionsCompleted) / Number(strategy.totalExecutions)) * 100
  const strategyTypeInfo = getStrategyTypeInfo(strategy.strategyType)
  const isSmartMoney = strategy.strategyType && strategy.strategyType !== STRATEGY_TYPES.BASIC_DCA

  return (
    <div className="glass-card p-6 hover:border-[--border-default] transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Token icons */}
          <div className="flex -space-x-2">
            <div className="w-9 h-9 rounded-full bg-[--surface-2] flex items-center justify-center border-2 border-[--bg-primary] z-10 overflow-hidden">
              <img
                src={tokenInLogo}
                alt={tokenInSymbol}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
                }}
              />
            </div>
            <div className="w-9 h-9 rounded-full bg-[--surface-2] flex items-center justify-center border-2 border-[--bg-primary] overflow-hidden">
              <img
                src={tokenOutLogo}
                alt={tokenOutSymbol}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
                }}
              />
            </div>
          </div>
          <div>
            <span className="text-base font-semibold text-[--text-primary]">
              {tokenInSymbol} → {tokenOutSymbol}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${strategyTypeInfo.gradient} text-white`}>
            {strategyTypeInfo.name}
          </span>
          <span className={`badge ${strategy.isActive ? 'badge-active' : 'badge-inactive'}`}>
            {strategy.isActive ? 'Active' : strategy.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[--text-tertiary]">Amount per execution</span>
          <span className="text-sm font-semibold text-[--text-primary]">
            {amountFormatted} {tokenInSymbol}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-[--text-tertiary]">Frequency</span>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-[--text-primary]">{formatFrequency(strategy.frequency)}</span>
          </div>
        </div>

        {/* Smart Money Info */}
        {isSmartMoney && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[--text-tertiary]">Trigger</span>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-semibold text-[#f59e0b]">Whale Activity</span>
            </div>
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[--text-tertiary]">Progress</span>
            <span className="text-sm font-semibold text-[--text-primary]">
              {strategy.executionsCompleted} / {strategy.totalExecutions}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-[--text-tertiary]">Created</span>
          <span className="text-sm text-[--text-secondary]">{formatTimestamp(strategy.createdAt)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-[--border-subtle] flex items-center justify-between">
        <span className="text-xs text-[--text-muted] font-mono">ID: {strategy.strategyId}</span>
        {strategy.isActive && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-animation" />
            <span className="text-xs text-[#10b981]">Running</span>
          </div>
        )}
      </div>
    </div>
  )
}
