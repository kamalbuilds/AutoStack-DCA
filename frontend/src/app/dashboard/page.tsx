'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@/components/ConnectButton'
import { StrategyCard } from '@/components/StrategyCard'
import { SmartMoneyFeed } from '@/components/SmartMoneyFeed'
import {
  getUserStrategies,
  getAllExecutionsByUser,
  type Strategy,
  type Execution,
} from '@/lib/envio'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!address) return

      setIsLoading(true)
      setError(null)

      try {
        const [strategiesData, executionsData] = await Promise.all([
          getUserStrategies(address),
          getAllExecutionsByUser(address),
        ])

        setStrategies(strategiesData)
        setExecutions(executionsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data. Make sure Envio indexer is running.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [address])

  const activeStrategies = strategies.filter((s) => s.isActive)
  const completedStrategies = strategies.filter((s) => !s.isActive)

  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#7c3aed]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] bg-[#06b6d4]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-[#8b5cf6]/5 rounded-full blur-[150px]" />
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
          <div className="flex items-center gap-4">
            <Link
              href="/create"
              className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Strategy
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-[--surface-2] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[--text-primary] mb-3">Connect Your Wallet</h2>
            <p className="text-[--text-secondary] mb-8">View your DCA strategies and execution history</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            {/* Smart Money Feed + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Smart Money Feed - spans 2 columns on large screens */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <SmartMoneyFeed />
              </div>

              {/* Stats Cards */}
              <div className="space-y-4 order-1 lg:order-2">
              <div className="stat-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c3aed]/20 to-[#7c3aed]/5 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-[--text-tertiary] mb-1">Total Strategies</p>
                <p className="text-3xl font-bold text-[--text-primary]">{strategies.length}</p>
              </div>

              <div className="stat-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="badge badge-active">Live</span>
                </div>
                <p className="text-sm text-[--text-tertiary] mb-1">Active Strategies</p>
                <p className="text-3xl font-bold text-[#10b981]">{activeStrategies.length}</p>
              </div>

              <div className="stat-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#06b6d4]/20 to-[#06b6d4]/5 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#06b6d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-[--text-tertiary] mb-1">Total Executions</p>
                <p className="text-3xl font-bold text-[#06b6d4]">{executions.length}</p>
              </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-20">
                <div className="spinner mx-auto mb-4" />
                <p className="text-[--text-secondary]">Loading your strategies...</p>
              </div>
            ) : error ? (
              <div className="glass-card p-8 text-center border-[#f59e0b]/20">
                <div className="w-14 h-14 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-[#f59e0b] font-medium mb-2">{error}</p>
                <p className="text-sm text-[--text-tertiary]">
                  The Envio indexer may not be running. Strategies you create will still be saved on-chain.
                </p>
              </div>
            ) : (
              <>
                {/* Active Strategies */}
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[--text-primary]">Active Strategies</h2>
                    <span className="text-sm text-[--text-tertiary]">{activeStrategies.length} strategies</span>
                  </div>
                  {activeStrategies.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-[--text-secondary] mb-6">No active strategies yet</p>
                      <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                        Create Your First Strategy
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeStrategies.map((strategy) => (
                        <StrategyCard key={strategy.id} strategy={strategy} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Completed Strategies */}
                {completedStrategies.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-[--text-primary]">Completed Strategies</h2>
                      <span className="text-sm text-[--text-tertiary]">{completedStrategies.length} strategies</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {completedStrategies.map((strategy) => (
                        <StrategyCard key={strategy.id} strategy={strategy} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Recent Executions */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[--text-primary]">Recent Executions</h2>
                    <span className="text-sm text-[--text-tertiary]">{executions.length} total</span>
                  </div>
                  {executions.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-[--surface-2] flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-[--text-secondary]">No executions yet</p>
                    </div>
                  ) : (
                    <div className="data-table overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th>Strategy ID</th>
                            <th>Execution #</th>
                            <th>Amount In</th>
                            <th>Amount Out</th>
                            <th>Date</th>
                            <th>Transaction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {executions.slice(0, 10).map((execution) => (
                            <tr key={execution.id}>
                              <td className="font-mono text-[--text-primary]">
                                #{execution.strategyId}
                              </td>
                              <td className="text-[--text-secondary]">
                                {execution.executionNumber}
                              </td>
                              <td className="text-[--text-primary] font-medium">
                                {(Number(execution.amountIn) / 1e6).toFixed(2)} USDC
                              </td>
                              <td className="text-[--text-primary] font-medium">
                                {(Number(execution.amountOut) / 1e18).toFixed(6)} WETH
                              </td>
                              <td className="text-[--text-secondary]">
                                {new Date(Number(execution.executedAt) * 1000).toLocaleDateString()}
                              </td>
                              <td>
                                <a
                                  href={`https://sepolia.basescan.org/tx/${execution.transactionHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-accent inline-flex items-center gap-1 text-sm"
                                >
                                  View
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
