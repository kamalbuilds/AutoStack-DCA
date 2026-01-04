// Token configuration with real images and metadata
export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logo: string
}

// Base Sepolia token addresses mapped to their metadata
export const TOKENS: Record<string, TokenInfo> = {
  // USDC on Base Sepolia
  '0x036cbd53842c5426634e7929541ec2318f3dcf7e': {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  // WETH on Base Sepolia
  '0x4200000000000000000000000000000000000006': {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  // Mock Token (for testing)
  '0x79af545b3a91ac01ecb6c7a9f17ba6aee9ffcccd': {
    address: '0x79aF545B3A91Ac01ecb6c7a9F17Ba6aee9fFCcCd',
    symbol: 'MTK',
    name: 'Mock Token',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  // DAI
  '0x7683022d84f726a96c4a6611cd31dbf5409c0ac9': {
    address: '0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
  // cbETH
  '0x774ef4152d80e1c4f8d2b6a9a5dce10ed3b5a3c8': {
    address: '0x774eF4152d80E1c4f8d2b6a9a5dce10eD3B5a3c8',
    symbol: 'cbETH',
    name: 'Coinbase Wrapped ETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
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
