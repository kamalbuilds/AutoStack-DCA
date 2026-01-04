// Token configuration with real images and metadata
export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logo: string
}

// Base Mainnet token addresses mapped to their metadata
export const TOKENS: Record<string, TokenInfo> = {
  // USDC on Base Mainnet
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  // WETH on Base Mainnet
  '0x4200000000000000000000000000000000000006': {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  // DAI on Base Mainnet
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
  // cbETH on Base Mainnet
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': {
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    symbol: 'cbETH',
    name: 'Coinbase Wrapped ETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
  },
  // USDbC (bridged USDC) on Base Mainnet
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': {
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    symbol: 'USDbC',
    name: 'Bridged USDC',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
}

// Get token info by address (case-insensitive)
export function getTokenInfo(address: string): TokenInfo | undefined {
  return TOKENS[address.toLowerCase()]
}

// Get token symbol by address
export function getTokenSymbol(address: string): string {
  const token = getTokenInfo(address)
  return token?.symbol || address.slice(0, 6) + '...'
}

// Get token logo by address
export function getTokenLogo(address: string): string {
  const token = getTokenInfo(address)
  return token?.logo || 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
}

// Get token decimals by address
export function getTokenDecimals(address: string): number {
  const token = getTokenInfo(address)
  return token?.decimals || 18
}

// Format token amount with proper decimals
export function formatTokenAmount(amount: string | bigint, address: string): string {
  const decimals = getTokenDecimals(address)
  const value = typeof amount === 'string' ? BigInt(amount) : amount
  const divisor = BigInt(10 ** decimals)
  const intPart = value / divisor
  const fracPart = value % divisor

  if (fracPart === 0n) {
    return intPart.toString()
  }

  const fracStr = fracPart.toString().padStart(decimals, '0')
  // Trim trailing zeros
  const trimmed = fracStr.replace(/0+$/, '')
  return trimmed ? `${intPart}.${trimmed}` : intPart.toString()
}
