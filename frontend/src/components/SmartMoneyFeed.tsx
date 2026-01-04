'use client'

import { useState, useEffect, useCallback } from 'react'

interface SmartMoneySignal {
  id: string
  wallet: string
  label?: string
  token: string
  tokenSymbol: string
  amount?: number
  action: 'buy' | 'sell'
  timestamp: number
  txHash: string
  score?: number
}

interface ApiResponse {
  success: boolean
  data: SmartMoneySignal[]
  meta?: {
    chain: string
    count: number
    fetchedAt: string
    x402Cost: string
  }
  error?: string
  message?: string
}

interface CachedData {
  signals: SmartMoneySignal[]
  fetchedAt: string
  chain: string
}

const CACHE_KEY = 'smartmoney_feed_cache'

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatUSD(amount?: number): string {
  if (!amount && amount !== 0) return '$0'
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toFixed(0)}`
}

function getLabelColor(label?: string): string {
  if (!label) return 'from-[#6b7280] to-[#4b5563]'
  const labelLower = label.toLowerCase()
  if (labelLower.includes('smart') || labelLower.includes('trader')) {
    return 'from-[#10b981] to-[#059669]'
  }
  if (labelLower.includes('fund') || labelLower.includes('institutional')) {
    return 'from-[#7c3aed] to-[#5b21b6]'
  }
  if (labelLower.includes('whale')) {
    return 'from-[#06b6d4] to-[#0891b2]'
  }
  if (labelLower.includes('market maker')) {
    return 'from-[#f59e0b] to-[#d97706]'
  }
  return 'from-[#6b7280] to-[#4b5563]'
}

export function SmartMoneyFeed() {
  const [signals, setSignals] = useState<SmartMoneySignal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<string | null>(null)
  const [requestCost] = useState<string>('$0.01')
  const [hasFetched, setHasFetched] = useState(false)

  // Load cached data on mount (NO auto-fetch)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data: CachedData = JSON.parse(cached)
        setSignals(data.signals)
        setLastFetch(data.fetchedAt)
        setHasFetched(true)
      }
    } catch (e) {
      console.error('Failed to load cached data:', e)
    }
  }, [])

  // Fetch smart money data from API - MANUAL ONLY
  // Using Base chain with lower min_amount threshold for more results
  const fetchSmartMoneyData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/smart-money?chain=base&limit=20&min_amount=500')
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch data')
      }

      if (data.success && data.data) {
        setSignals(data.data)
        setError(null)
        setHasFetched(true)
        const fetchedAt = data.meta?.fetchedAt || new Date().toISOString()
        setLastFetch(fetchedAt)

        // Cache the successful response
        const cacheData: CachedData = {
          signals: data.data,
          fetchedAt,
          chain: data.meta?.chain || 'base'
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      }
    } catch (err: any) {
      console.error('SmartMoneyFeed error:', err)
      setError(err.message || 'Failed to fetch smart money data')
      // Don't clear signals on error - keep showing cached data
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[--text-primary]">Smart Money Feed</h3>
            <p className="text-xs text-[--text-tertiary]">Whale activity via Nansen x402 (~$0.01/request)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual Load Button - ONLY way to fetch */}
          <button
            onClick={fetchSmartMoneyData}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isLoading
                ? 'bg-[--surface-2] text-[--text-tertiary] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white hover:opacity-90 shadow-lg shadow-[#f59e0b]/20'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {hasFetched ? 'Refresh Feed' : 'Load Feed'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cost Warning */}
      {!hasFetched && !isLoading && (
        <div className="p-4 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#f59e0b]">x402 Micropayment Required</p>
              <p className="text-xs text-[--text-tertiary] mt-1">
                Each request costs ~$0.01 USDC on Solana. Click "Load Feed" to fetch live smart money data from Nansen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#ef4444]">Error fetching data</p>
              <p className="text-xs text-[--text-tertiary] mt-1">{error}</p>
              {error.includes('USDC') && (
                <p className="text-xs text-[--text-tertiary] mt-1">
                  Fund the Solana wallet with USDC for x402 payments.
                </p>
              )}
              {signals.length > 0 && (
                <p className="text-xs text-[#10b981] mt-2">
                  Showing cached data from previous successful fetch.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && signals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="spinner mb-4" />
          <p className="text-sm text-[--text-tertiary]">Fetching smart money data...</p>
          <p className="text-xs text-[--text-muted] mt-1">Processing x402 payment on Solana</p>
        </div>
      )}

      {/* Empty State - Never fetched */}
      {!isLoading && !hasFetched && signals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#fbbf24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <p className="text-[--text-secondary] font-medium">Smart Money Feed</p>
          <p className="text-xs text-[--text-tertiary] mt-1 text-center max-w-xs">
            Click "Load Feed" to fetch real-time whale trades from Nansen API via x402 micropayments.
          </p>
        </div>
      )}

      {/* Empty State - Fetched but no data */}
      {!isLoading && hasFetched && signals.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[--text-secondary]">No smart money activity detected</p>
          <p className="text-xs text-[--text-tertiary] mt-1">Try refreshing or lowering the minimum trade threshold</p>
        </div>
      )}

      {/* Signals List */}
      {signals.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-[--surface-1] hover:bg-[--surface-2] transition-colors group"
            >
              {/* Action indicator */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                signal.action === 'buy'
                  ? 'bg-[#10b981]/10'
                  : 'bg-[#ef4444]/10'
              }`}>
                {signal.action === 'buy' ? (
                  <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r ${getLabelColor(signal.label)} text-white`}>
                    {signal.label || 'Smart Money'}
                  </span>
                  {signal.score && signal.score >= 80 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] font-medium">
                      Score: {signal.score}
                    </span>
                  )}
                  <span className="text-xs text-[--text-tertiary]">
                    {signal.wallet.slice(0, 6)}...{signal.wallet.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    signal.action === 'buy' ? 'text-[#10b981]' : 'text-[#ef4444]'
                  }`}>
                    {signal.action === 'buy' ? 'Bought' : 'Sold'}
                  </span>
                  <span className="text-sm text-[--text-primary] font-medium">
                    {formatUSD(signal.amount)} {signal.tokenSymbol}
                  </span>
                </div>
              </div>

              {/* Time & Link */}
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-xs text-[--text-tertiary]">
                  {formatTimeAgo(signal.timestamp)}
                </span>
                <a
                  href={`https://basescan.org/tx/${signal.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#06b6d4] hover:text-[#22d3ee] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View tx →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* x402 Badge & Cost */}
      <div className="mt-4 pt-4 border-t border-[--border-subtle]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[--text-muted]">Powered by x402 + Nansen API</span>
            <span className="px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#a78bfa] font-medium">
              Solana USDC
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[--text-tertiary]">{requestCost}/request</span>
            {lastFetch && (
              <span className="text-[--text-muted]">
                Last: {new Date(lastFetch).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
