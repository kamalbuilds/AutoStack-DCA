'use client'

import { useState, useCallback } from 'react'
import { parseUnits } from 'viem'
import { sepolia } from 'viem/chains'
import { useSessionAccount } from '@/providers/SessionAccountProvider'

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}

// Permission types for ERC-7715
export type PermissionType = 'erc20-token-periodic' | 'erc20-token-stream'

export interface PeriodicPermissionParams {
  tokenAddress: `0x${string}`
  periodAmount: bigint // Amount per period in token units
  periodDuration: number // Duration in seconds (e.g., 86400 for 1 day)
  expiry?: number // When the permission expires (timestamp in seconds)
  justification?: string
}

export interface GrantedPermission {
  context: string
  signerMeta: {
    delegationManager: `0x${string}`
  }
  permission: {
    type: PermissionType
    data: Record<string, unknown>
  }
}

export interface UseAdvancedPermissionsReturn {
  requestPermission: (params: PeriodicPermissionParams) => Promise<GrantedPermission[]>
  grantedPermissions: GrantedPermission[] | null
  isRequesting: boolean
  error: string | null
  isMetaMaskFlask: boolean
  checkFlaskInstalled: () => Promise<boolean>
}

// Storage key for permissions
const PERMISSIONS_STORAGE_KEY = 'autostack_permissions'

export function useAdvancedPermissions(): UseAdvancedPermissionsReturn {
  const { sessionAddress, walletClient, initializeSessionAccount } = useSessionAccount()
  const [grantedPermissions, setGrantedPermissions] = useState<GrantedPermission[] | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMetaMaskFlask, setIsMetaMaskFlask] = useState(false)

  // Check if MetaMask Flask is installed (required for ERC-7715)
  // Note: This is a soft check - we'll attempt the permission request anyway
  // since Gator Snaps should auto-install on first use
  const checkFlaskInstalled = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return false
    }

    try {
      // Try to detect Flask by checking for snaps capability
      // This is a best-effort check - we proceed regardless
      const clientVersion = await window.ethereum.request({
        method: 'web3_clientVersion',
      }) as string

      const isFlask = clientVersion?.toLowerCase().includes('flask') ||
                      clientVersion?.toLowerCase().includes('metamask')
      setIsMetaMaskFlask(isFlask)
      return true // Always return true to proceed - let the actual request fail if not supported
    } catch {
      return true // Proceed anyway - the actual permission request will fail with a clear error
    }
  }, [])

  // Request ERC-7715 periodic permission for ERC-20 token spending
  const requestPermission = useCallback(async (params: PeriodicPermissionParams): Promise<GrantedPermission[]> => {
    setIsRequesting(true)
    setError(null)

    try {
      // Check if MetaMask Flask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask Flask.')
      }

      // Soft check for Flask - we proceed regardless and let the actual request handle errors
      await checkFlaskInstalled()

      // Ensure session account is initialized
      if (!sessionAddress || !walletClient) {
        await initializeSessionAccount()
      }

      if (!sessionAddress) {
        throw new Error('Session account not initialized')
      }

      if (!walletClient) {
        throw new Error('Wallet client not available')
      }

      // Check if connected to Sepolia
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
      if (parseInt(chainId, 16) !== sepolia.id) {
        throw new Error(`Please switch to Sepolia network (chainId: ${sepolia.id}). ERC-7715 only works on Sepolia.`)
      }

      // Default expiry to 1 week from now if not specified
      const currentTime = Math.floor(Date.now() / 1000)
      const expiry = params.expiry || currentTime + 604800 // 1 week

      // Request permission using ERC-7715 (only works on Sepolia)
      // This will trigger Gator Snap installation if not already installed
      const permissions = await (walletClient as unknown as {
        requestExecutionPermissions: (params: Array<{
          chainId: number
          expiry: number
          signer: { type: string; data: { address: `0x${string}` } }
          permission: {
            type: string
            data: {
              tokenAddress: `0x${string}`
              periodAmount: bigint
              periodDuration: number
              justification?: string
            }
          }
          isAdjustmentAllowed: boolean
        }>) => Promise<GrantedPermission[]>
      }).requestExecutionPermissions([
        {
          chainId: sepolia.id,
          expiry,
          signer: {
            type: 'account',
            data: {
              address: sessionAddress,
            },
          },
          permission: {
            type: 'erc20-token-periodic',
            data: {
              tokenAddress: params.tokenAddress,
              periodAmount: params.periodAmount,
              periodDuration: params.periodDuration,
              justification: params.justification || 'AutoStack DCA: Permission to execute periodic token swaps',
            },
          },
          isAdjustmentAllowed: true,
        },
      ])

      // Store permissions locally
      setGrantedPermissions(permissions)

      // Save to localStorage for persistence
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify({
        permissions,
        tokenAddress: params.tokenAddress,
        timestamp: Date.now(),
      }))

      return permissions
    } catch (err) {
      console.error('ERC-7715 Permission Error:', err)

      let errorMessage = 'Failed to request permission'
      if (err instanceof Error) {
        // Parse common errors
        if (err.message.includes('does not exist') || err.message.includes('not available')) {
          errorMessage = 'ERC-7715 not available. Make sure you have:\n1. MetaMask Flask installed (not regular MetaMask)\n2. Connected to Sepolia network\n3. The Gator Snaps will install automatically on first request'
        } else if (err.message.includes('User rejected')) {
          errorMessage = 'Permission request was rejected by user'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsRequesting(false)
    }
  }, [sessionAddress, walletClient, initializeSessionAccount, checkFlaskInstalled])

  return {
    requestPermission,
    grantedPermissions,
    isRequesting,
    error,
    isMetaMaskFlask,
    checkFlaskInstalled,
  }
}

// Helper function to calculate permission parameters for DCA
export function calculateDCAPermission(
  tokenAddress: `0x${string}`,
  amountPerExecution: string,
  decimals: number,
  frequencySeconds: number,
  totalExecutions: number
): PeriodicPermissionParams {
  const amountInWei = parseUnits(amountPerExecution, decimals)

  // Calculate total duration needed (with some buffer)
  const totalDuration = frequencySeconds * totalExecutions
  const expiry = Math.floor(Date.now() / 1000) + totalDuration + 86400 // Add 1 day buffer

  return {
    tokenAddress,
    periodAmount: amountInWei,
    periodDuration: frequencySeconds,
    expiry,
    justification: `AutoStack DCA: Permission to swap ${amountPerExecution} tokens every ${frequencySeconds / 3600} hours for ${totalExecutions} executions`,
  }
}
