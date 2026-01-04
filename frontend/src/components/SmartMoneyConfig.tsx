'use client'

import { useState, useEffect } from 'react'

export interface SmartMoneyConfigData {
  minWhaleAmount: number
  minLabelScore: number
  signalThreshold: number
  signalWindow: number
}

interface SmartMoneyConfigProps {
  config: SmartMoneyConfigData
  onChange: (config: SmartMoneyConfigData) => void
  showSignalAccumulation?: boolean
}

export const DEFAULT_SMART_MONEY_CONFIG: SmartMoneyConfigData = {
  minWhaleAmount: 50000,
  minLabelScore: 70,
  signalThreshold: 2,
  signalWindow: 4,
}

function formatAmount(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function ConfigSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  color = 'amber',
  icon,
  description,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  onChange: (value: number) => void
  color?: 'amber' | 'purple' | 'cyan' | 'emerald'
  icon: React.ReactNode
  description: string
}) {
  const percentage = ((value - min) / (max - min)) * 100

  const colorClasses = {
    amber: {
      bg: 'bg-amber-500',
      shadow: 'shadow-amber-500/30',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    },
    purple: {
      bg: 'bg-violet-500',
      shadow: 'shadow-violet-500/30',
      text: 'text-violet-400',
      border: 'border-violet-500/20',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',
    },
    cyan: {
      bg: 'bg-cyan-500',
      shadow: 'shadow-cyan-500/30',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    },
    emerald: {
      bg: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/30',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    },
  }

  const colors = colorClasses[color]

  return (
    <div className={`relative p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] ${colors.glow} transition-all duration-300 hover:bg-white/[0.04]`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg}/10 flex items-center justify-center ${colors.text}`}>
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-white/90">{label}</div>
            <div className="text-xs text-white/40 mt-0.5">{description}</div>
          </div>
        </div>
        <div className={`text-right`}>
          <div className={`text-lg font-bold ${colors.text} tabular-nums`}>{displayValue}</div>
        </div>
      </div>

      <div className="relative mt-2">
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bg} rounded-full transition-all duration-150 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${colors.bg} border-2 border-white shadow-lg ${colors.shadow} transition-all duration-150 ease-out pointer-events-none`}
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  )
}

export function SmartMoneyConfig({ config, onChange, showSignalAccumulation = false }: SmartMoneyConfigProps) {
  const updateConfig = (key: keyof SmartMoneyConfigData, value: number) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0d0d12] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Smart Money Triggers</h3>
          <p className="text-xs text-white/40">Powered by Nansen + x402 Protocol</p>
        </div>
      </div>

      {/* Whale Amount Slider */}
      <ConfigSlider
        label="Minimum Whale Size"
        value={config.minWhaleAmount}
        min={1000}
        max={1000000}
        step={1000}
        displayValue={formatAmount(config.minWhaleAmount)}
        onChange={(v) => updateConfig('minWhaleAmount', v)}
        color="amber"
        description="Minimum trade size to trigger"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {/* Label Score Slider */}
      <ConfigSlider
        label="Wallet Reputation"
        value={config.minLabelScore}
        min={0}
        max={100}
        step={5}
        displayValue={`${config.minLabelScore}/100`}
        onChange={(v) => updateConfig('minLabelScore', v)}
        color="cyan"
        description="Nansen credibility score threshold"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        }
      />

      {showSignalAccumulation && (
        <>
          {/* Signal Threshold Slider */}
          <ConfigSlider
            label="Signal Threshold"
            value={config.signalThreshold}
            min={1}
            max={10}
            step={1}
            displayValue={`${config.signalThreshold} ${config.signalThreshold === 1 ? 'signal' : 'signals'}`}
            onChange={(v) => updateConfig('signalThreshold', v)}
            color="purple"
            description="Whale signals required to trigger"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />

          {/* Signal Window Slider */}
          <ConfigSlider
            label="Time Window"
            value={config.signalWindow}
            min={1}
            max={24}
            step={1}
            displayValue={`${config.signalWindow}h`}
            onChange={(v) => updateConfig('signalWindow', v)}
            color="emerald"
            description="Signal accumulation period"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </>
      )}

      {/* Info Card */}
      <div className="relative mt-6 p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-white/70 leading-relaxed">
              Your DCA triggers automatically when Nansen-labeled wallets (Smart Money, VCs, Funds)
              make qualifying purchases. Each signal verification costs ~$0.01 via x402.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
