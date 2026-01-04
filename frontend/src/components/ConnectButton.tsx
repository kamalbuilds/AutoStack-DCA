'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useCallback, useMemo } from 'react'

export function ConnectButton() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  // Find the best available connector (prefer MetaMask, then injected)
  const connector = useMemo(() => {
    const metaMaskConnector = connectors.find(c => c.id === 'metaMaskSDK' || c.id === 'metaMask')
    const injectedConnector = connectors.find(c => c.id === 'injected')
    return metaMaskConnector || injectedConnector || connectors[0]
  }, [connectors])

  const handleConnect = useCallback(() => {
    if (connector) {
      connect({ connector })
    }
  }, [connect, connector])

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[--surface-2] border border-[--border-subtle]">
          <div className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="text-sm font-medium text-[--text-primary] font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 bg-[--surface-2] border border-[--border-subtle] text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-default] hover:bg-[--surface-3]"
        >
          Disconnect
        </button>
      </div>
    )
  }

  const isLoading = isPending || isConnecting

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading || !connector}
      className="group relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl" />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ filter: 'brightness(1.2)' }} />

      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>

      {/* Content */}
      <span className="relative flex items-center gap-2 text-white">
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect Wallet
          </>
        )}
      </span>
    </button>
  )
}
