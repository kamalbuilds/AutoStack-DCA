// AutoStackDCA V2 Contract Address on Base Mainnet
// Note: Deploy this contract before using
export const AUTOSTACK_DCA_V2_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000' as const

// Legacy contract address (for backward compatibility)
export const AUTOSTACK_DCA_ADDRESS = AUTOSTACK_DCA_V2_ADDRESS

// Base Mainnet token addresses
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const // Base USDC
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const // Base WETH
export const DAI_ADDRESS = '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as const // Base DAI
export const WBTC_ADDRESS = '0x0000000000000000000000000000000000000000' as const // WBTC not on Base yet
export const CBETH_ADDRESS = '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' as const // Base cbETH

// Uniswap V3 addresses on Base Mainnet
export const UNISWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as const
export const UNISWAP_QUOTER = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const

// Pool fees
export const POOL_FEES = {
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000,   // 1%
} as const

// Strategy types
export const STRATEGY_TYPES = {
  BASIC_DCA: 0,
  SMART_MONEY_DCA: 1,
  SMART_ACCUMULATE: 2,
  HYBRID: 3,
} as const

// Supported tokens with metadata
export const SUPPORTED_TOKENS = {
  USDC: {
    address: USDC_ADDRESS,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  WETH: {
    address: WETH_ADDRESS,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  DAI: {
    address: DAI_ADDRESS,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
  cbETH: {
    address: CBETH_ADDRESS,
    symbol: 'cbETH',
    name: 'Coinbase Wrapped ETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
  },
} as const

export type TokenSymbol = keyof typeof SUPPORTED_TOKENS

// AutoStackDCA V2 ABI with Smart Money support
export const AUTOSTACK_DCA_V2_ABI = [
  // Basic DCA
  {
    name: 'createStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'frequency', type: 'uint256' },
      { name: 'totalExecutions', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
    ],
    outputs: [{ name: 'strategyId', type: 'uint256' }],
  },
  // Smart Money DCA
  {
    name: 'createSmartMoneyStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'frequency', type: 'uint256' },
      { name: 'totalExecutions', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
      { name: 'minWhaleAmount', type: 'uint256' },
      { name: 'minLabelScore', type: 'uint8' },
      { name: 'signalThreshold', type: 'uint8' },
      { name: 'signalWindow', type: 'uint256' },
    ],
    outputs: [{ name: 'strategyId', type: 'uint256' }],
  },
  // Hybrid Strategy
  {
    name: 'createHybridStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountPerExecution', type: 'uint256' },
      { name: 'frequency', type: 'uint256' },
      { name: 'totalExecutions', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
      { name: 'minWhaleAmount', type: 'uint256' },
      { name: 'minLabelScore', type: 'uint8' },
      { name: 'signalThreshold', type: 'uint8' },
      { name: 'signalWindow', type: 'uint256' },
    ],
    outputs: [{ name: 'strategyId', type: 'uint256' }],
  },
  {
    name: 'cancelStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'executeDCA',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'updateSmartMoneyConfig',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'strategyId', type: 'uint256' },
      { name: 'minWhaleAmount', type: 'uint256' },
      { name: 'minLabelScore', type: 'uint8' },
      { name: 'signalThreshold', type: 'uint8' },
      { name: 'signalWindow', type: 'uint256' },
      { name: 'enabled', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'getStrategy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'poolFee', type: 'uint24' },
          { name: 'amountPerExecution', type: 'uint256' },
          { name: 'frequency', type: 'uint256' },
          { name: 'executionsLeft', type: 'uint256' },
          { name: 'lastExecution', type: 'uint256' },
          { name: 'totalAmountIn', type: 'uint256' },
          { name: 'totalAmountOut', type: 'uint256' },
          { name: 'strategyType', type: 'uint8' },
          {
            name: 'smartMoneyConfig',
            type: 'tuple',
            components: [
              { name: 'minWhaleAmount', type: 'uint256' },
              { name: 'minLabelScore', type: 'uint8' },
              { name: 'signalThreshold', type: 'uint8' },
              { name: 'signalWindow', type: 'uint256' },
              { name: 'enabled', type: 'bool' },
            ],
          },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getUserStrategies',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getSmartMoneyConfig',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'minWhaleAmount', type: 'uint256' },
          { name: 'minLabelScore', type: 'uint8' },
          { name: 'signalThreshold', type: 'uint8' },
          { name: 'signalWindow', type: 'uint256' },
          { name: 'enabled', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'canExecuteTimeBased',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'canExecuteSmartMoney',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Events
  {
    name: 'StrategyCreated',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'tokenIn', type: 'address', indexed: false },
      { name: 'tokenOut', type: 'address', indexed: false },
      { name: 'amountPerExecution', type: 'uint256', indexed: false },
      { name: 'frequency', type: 'uint256', indexed: false },
      { name: 'totalExecutions', type: 'uint256', indexed: false },
      { name: 'strategyType', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'DCAExecuted',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'executionsLeft', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'SmartMoneyTriggered',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'whaleWallet', type: 'address', indexed: false },
      { name: 'whaleAmountUsd', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'StrategyCompleted',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
    ],
  },
  {
    name: 'StrategyCancelled',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
    ],
  },
] as const

// Legacy ABI alias
export const AUTOSTACK_DCA_ABI = AUTOSTACK_DCA_V2_ABI

// ERC20 ABI for token approvals
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

// Frequency constants (in seconds)
export const FREQUENCY = {
  HOURLY: 3600n,    // 1 hour
  DAILY: 86400n,    // 24 hours
  WEEKLY: 604800n,  // 7 days
} as const

// Smart Money config defaults
export const SMART_MONEY_DEFAULTS = {
  minWhaleAmount: 10000n * 10n ** 6n, // $10,000 in 6 decimals
  minLabelScore: 70, // 70/100 minimum score
  signalThreshold: 2, // 2 signals needed
  signalWindow: 3600n, // 1 hour window
} as const
