'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createWalletClient, createPublicClient, custom, http } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'
import { toMetaMaskSmartAccount, Implementation } from '@metamask/smart-accounts-kit'

const SESSION_KEY_STORAGE = 'autostack_session_key'

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}

interface SessionAccountContextType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionAccount: any
  sessionAddress: `0x${string}` | null
  isInitializing: boolean
  error: string | null
  initializeSessionAccount: () => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletClient: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any
}

const SessionAccountContext = createContext<SessionAccountContextType | null>(null)

export function useSessionAccount() {
  const context = useContext(SessionAccountContext)
  if (!context) {
    throw new Error('useSessionAccount must be used within SessionAccountProvider')
  }
  return context
}

export function SessionAccountProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessionAccount, setSessionAccount] = useState<any>(null)
  const [sessionAddress, setSessionAddress] = useState<`0x${string}` | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [walletClient, setWalletClient] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [publicClient, setPublicClient] = useState<any>(null)

  const initializeSessionAccount = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not detected')
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      // Create public client for Sepolia (ERC-7715 only works on Sepolia)
      const pubClient = createPublicClient({
        chain: sepolia,
        transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
      })
      setPublicClient(pubClient)

      // Create wallet client with ERC-7715 actions
      const walClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      }).extend(erc7715ProviderActions())
      setWalletClient(walClient)

      // Get or generate session private key
      let sessionPrivateKey = localStorage.getItem(SESSION_KEY_STORAGE)
      if (!sessionPrivateKey) {
        sessionPrivateKey = generatePrivateKey()
        localStorage.setItem(SESSION_KEY_STORAGE, sessionPrivateKey)
      }

      // Create session account (EOA that will hold permissions)
      const account = privateKeyToAccount(sessionPrivateKey as `0x${string}`)

      // Create MetaMask smart account for the session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const smartAccount = await toMetaMaskSmartAccount({
        client: pubClient as any,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: '0x',
        signer: { account },
      })

      setSessionAccount(smartAccount)
      setSessionAddress(smartAccount.address)
    } catch (err) {
      console.error('Failed to initialize session account:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize session account')
    } finally {
      setIsInitializing(false)
    }
  }, [])

  return (
    <SessionAccountContext.Provider
      value={{
        sessionAccount,
        sessionAddress,
        isInitializing,
        error,
        initializeSessionAccount,
        walletClient,
        publicClient,
      }}
    >
      {children}
    </SessionAccountContext.Provider>
  )
}
