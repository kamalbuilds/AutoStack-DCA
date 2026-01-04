'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { ConnectButton } from '@/components/ConnectButton'
import {
  AUTOSTACK_DCA_ADDRESS,
  AUTOSTACK_DCA_ABI,
  ERC20_ABI,
  FREQUENCY,
  SUPPORTED_TOKENS,
  type TokenSymbol,
} from '@/lib/contracts'

type FrequencyOption = 'daily' | 'weekly'

// Get token symbols as array for dropdowns
const TOKEN_OPTIONS = Object.keys(SUPPORTED_TOKENS) as TokenSymbol[]

export default function CreateStrategyPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<FrequencyOption>('daily')
  const [executions, setExecutions] = useState('')
  const [step, setStep] = useState<'form' | 'approve' | 'create'>('form')
  const [tokenIn, setTokenIn] = useState<TokenSymbol>('USDC')
  const [tokenOut, setTokenOut] = useState<TokenSymbol>('WETH')
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false)
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false)

  const tokenSelectorRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tokenSelectorRef.current && !tokenSelectorRef.current.contains(event.target as Node)) {
        setShowTokenInDropdown(false)
        setShowTokenOutDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writeCreate, data: createHash, isPending: isCreatePending } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { isLoading: isCreateConfirming, isSuccess: isCreateConfirmed } = useWaitForTransactionReceipt({
    hash: createHash,
  })

  const frequencyInSeconds = frequency === 'daily' ? FREQUENCY.DAILY : FREQUENCY.WEEKLY

  // Get selected token info
  const selectedTokenIn = SUPPORTED_TOKENS[tokenIn]
  const selectedTokenOut = SUPPORTED_TOKENS[tokenOut]

  const handleApprove = async () => {
    if (!amount || !executions) return

    const amountInWei = parseUnits(amount, selectedTokenIn.decimals)
    const totalAmount = amountInWei * BigInt(executions)

    writeApprove({
      address: selectedTokenIn.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AUTOSTACK_DCA_ADDRESS, totalAmount],
    })

    setStep('approve')
  }

  const handleCreateStrategy = async () => {
    if (!amount || !executions) return

    const amountInWei = parseUnits(amount, selectedTokenIn.decimals)

    writeCreate({
      address: AUTOSTACK_DCA_ADDRESS,
      abi: AUTOSTACK_DCA_ABI,
      functionName: 'createStrategy',
      args: [selectedTokenIn.address, selectedTokenOut.address, amountInWei, frequencyInSeconds, BigInt(executions)],
    })

    setStep('create')
  }

  // Redirect to dashboard after successful creation
  if (isCreateConfirmed) {
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const totalAmount = amount && executions ? (parseFloat(amount) * parseInt(executions)).toFixed(2) : '0.00'

  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#7c3aed]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] bg-[#06b6d4]/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[--border-subtle] bg-[--bg-primary]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[--text-primary]">AutoStack</span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card-strong p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[--text-primary] mb-2">Create DCA Strategy</h1>
            <p className="text-[--text-secondary]">
              Set up automated token swaps on Base Sepolia. Choose your token pair and schedule.
            </p>
          </div>

          {!isConnected ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-[--text-tertiary] mb-6">Connect your wallet to create a strategy</p>
              <ConnectButton />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Token Pair Selector */}
              <div ref={tokenSelectorRef}>
                <label className="block text-sm font-medium text-[--text-secondary] mb-3">Token Pair</label>
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Token In Selector */}
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTokenInDropdown(!showTokenInDropdown)
                          setShowTokenOutDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[--surface-2] hover:bg-[--surface-3] transition-colors"
                      >
                        <img
                          src={selectedTokenIn.logo}
                          alt={selectedTokenIn.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-[--text-primary]">{selectedTokenIn.symbol}</div>
                          <div className="text-xs text-[--text-tertiary]">From</div>
                        </div>
                        <svg className="w-4 h-4 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showTokenInDropdown && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-2 py-2 rounded-xl bg-[--bg-secondary] border border-[--border-subtle] shadow-xl">
                          {TOKEN_OPTIONS.filter(t => t !== tokenOut).map((token) => (
                            <button
                              key={token}
                              type="button"
                              onClick={() => {
                                setTokenIn(token)
                                setShowTokenInDropdown(false)
                                setStep('form') // Reset step when changing tokens
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[--surface-2] transition-colors ${
                                token === tokenIn ? 'bg-[--surface-2]' : ''
                              }`}
                            >
                              <img
                                src={SUPPORTED_TOKENS[token].logo}
                                alt={token}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="font-medium text-[--text-primary]">{token}</span>
                              <span className="text-xs text-[--text-tertiary] ml-auto">{SUPPORTED_TOKENS[token].name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[--surface-2] flex items-center justify-center">
                        <svg className="w-5 h-5 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>

                    {/* Token Out Selector */}
                    <div className="relative flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTokenOutDropdown(!showTokenOutDropdown)
                          setShowTokenInDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[--surface-2] hover:bg-[--surface-3] transition-colors"
                      >
                        <img
                          src={selectedTokenOut.logo}
                          alt={selectedTokenOut.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-[--text-primary]">{selectedTokenOut.symbol}</div>
                          <div className="text-xs text-[--text-tertiary]">To</div>
                        </div>
                        <svg className="w-4 h-4 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showTokenOutDropdown && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-2 py-2 rounded-xl bg-[--bg-secondary] border border-[--border-subtle] shadow-xl">
                          {TOKEN_OPTIONS.filter(t => t !== tokenIn).map((token) => (
                            <button
                              key={token}
                              type="button"
                              onClick={() => {
                                setTokenOut(token)
                                setShowTokenOutDropdown(false)
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[--surface-2] transition-colors ${
                                token === tokenOut ? 'bg-[--surface-2]' : ''
                              }`}
                            >
                              <img
                                src={SUPPORTED_TOKENS[token].logo}
                                alt={token}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="font-medium text-[--text-primary]">{token}</span>
                              <span className="text-xs text-[--text-tertiary] ml-auto">{SUPPORTED_TOKENS[token].name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount per Execution */}
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-3">
                  Amount per Execution
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input-field pr-20 text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[--text-tertiary] font-medium">
                    {selectedTokenIn.symbol}
                  </span>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-3">Frequency</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFrequency('daily')}
                    className={`selection-btn text-left ${frequency === 'daily' ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        frequency === 'daily'
                          ? 'bg-[#7c3aed]/20'
                          : 'bg-[--surface-2]'
                      }`}>
                        <svg className={`w-5 h-5 ${frequency === 'daily' ? 'text-[#a78bfa]' : 'text-[--text-tertiary]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className={`font-semibold ${frequency === 'daily' ? 'text-[--text-primary]' : 'text-[--text-secondary]'}`}>
                          Daily
                        </div>
                        <div className="text-xs text-[--text-tertiary]">Every 24 hours</div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('weekly')}
                    className={`selection-btn text-left ${frequency === 'weekly' ? 'active' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        frequency === 'weekly'
                          ? 'bg-[#7c3aed]/20'
                          : 'bg-[--surface-2]'
                      }`}>
                        <svg className={`w-5 h-5 ${frequency === 'weekly' ? 'text-[#a78bfa]' : 'text-[--text-tertiary]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className={`font-semibold ${frequency === 'weekly' ? 'text-[--text-primary]' : 'text-[--text-secondary]'}`}>
                          Weekly
                        </div>
                        <div className="text-xs text-[--text-tertiary]">Every 7 days</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Number of Executions */}
              <div>
                <label className="block text-sm font-medium text-[--text-secondary] mb-3">
                  Number of Executions
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={executions}
                    onChange={(e) => setExecutions(e.target.value)}
                    placeholder="10"
                    min="1"
                    step="1"
                    className="input-field pr-20 text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[--text-tertiary] font-medium">
                    times
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="glass-card p-5 space-y-4">
                <h3 className="font-semibold text-[--text-primary]">Strategy Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-tertiary]">Swapping</span>
                    <span className="text-[--text-primary] font-medium">{selectedTokenIn.symbol} → {selectedTokenOut.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-tertiary]">Amount per execution</span>
                    <span className="text-[--text-primary] font-medium">{amount || '0'} {selectedTokenIn.symbol}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-tertiary]">Frequency</span>
                    <span className="text-[--text-primary] font-medium">{frequency === 'daily' ? 'Daily' : 'Weekly'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[--text-tertiary]">Total executions</span>
                    <span className="text-[--text-primary] font-medium">{executions || '0'}</span>
                  </div>
                  <div className="h-px bg-[--border-subtle]" />
                  <div className="flex justify-between">
                    <span className="text-[--text-secondary] font-medium">Total amount needed</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
                      {totalAmount} {selectedTokenIn.symbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {step === 'form' && (
                  <button
                    onClick={handleApprove}
                    disabled={!amount || !executions || parseFloat(amount) <= 0 || parseInt(executions) <= 0 || tokenIn === tokenOut}
                    className="btn-primary w-full py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    Approve {selectedTokenIn.symbol}
                  </button>
                )}

                {step === 'approve' && (
                  <>
                    {isApprovePending || isApproveConfirming ? (
                      <div className="glass-card p-4 flex items-center justify-center gap-3">
                        <div className="spinner" />
                        <span className="text-[--text-secondary]">
                          {isApprovePending ? 'Confirm in wallet...' : 'Waiting for confirmation...'}
                        </span>
                      </div>
                    ) : isApproveConfirmed ? (
                      <button
                        onClick={handleCreateStrategy}
                        className="w-full py-4 text-lg font-semibold text-white rounded-xl transition-all duration-300 bg-gradient-to-r from-[#10b981] to-[#06b6d4] hover:opacity-90 hover:shadow-lg hover:shadow-[#10b981]/20"
                      >
                        Create Strategy
                      </button>
                    ) : (
                      <button
                        onClick={handleApprove}
                        className="btn-primary w-full py-4 text-lg"
                      >
                        Retry Approval
                      </button>
                    )}
                  </>
                )}

                {step === 'create' && (
                  <div className="glass-card p-4 flex items-center justify-center gap-3">
                    {isCreatePending && (
                      <>
                        <div className="spinner" />
                        <span className="text-[--text-secondary]">Confirm in wallet...</span>
                      </>
                    )}
                    {isCreateConfirming && (
                      <>
                        <div className="spinner" />
                        <span className="text-[--text-secondary]">Creating strategy...</span>
                      </>
                    )}
                    {isCreateConfirmed && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#10b981]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[#10b981] font-medium">
                          Strategy created! Redirecting...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Back Link */}
              <Link
                href="/"
                className="flex items-center justify-center gap-2 text-sm text-[--text-tertiary] hover:text-[--text-secondary] transition-colors pt-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
