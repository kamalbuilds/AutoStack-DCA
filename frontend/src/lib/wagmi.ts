import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// NOTE: ERC-7715 Advanced Permissions currently only work on Sepolia
// See: https://docs.metamask.io/smart-accounts-kit/get-started/supported-networks/
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    metaMask({
      dappMetadata: {
        name: 'AutoStack DCA',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://autostack-dca.app',
      },
    }),
  ],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
