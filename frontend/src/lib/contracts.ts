// AutoStackDCA V2 Contract Address on Sepolia
// Note: ERC-7715 Advanced Permissions currently only work on Sepolia
// See: https://docs.metamask.io/smart-accounts-kit/get-started/supported-networks/
export const AUTOSTACK_DCA_V2_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000' as const

// Legacy contract address (for backward compatibility)
export const AUTOSTACK_DCA_ADDRESS = AUTOSTACK_DCA_V2_ADDRESS

// Sepolia testnet token addresses (required for ERC-7715)
export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const // Sepolia USDC (Circle)
export const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as const // Sepolia WETH
export const DAI_ADDRESS = '0x68194a729C2450ad26072b3D33ADaCbcef39D574' as const // Sepolia DAI
export const WBTC_ADDRESS = '0x0000000000000000000000000000000000000000' as const // WBTC not on Sepolia
export const CBETH_ADDRESS = '0x0000000000000000000000000000000000000000' as const // cbETH not on Sepolia

// Uniswap V3 addresses on Sepolia
export const UNISWAP_ROUTER = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as const // SwapRouter02 on Sepolia
export const UNISWAP_QUOTER = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3' as const // QuoterV2 on Sepolia

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

// Supported tokens with metadata (Sepolia testnet)
export const SUPPORTED_TOKENS = {
  USDC: {
    address: USDC_ADDRESS,
    symbol: 'USDC',
    name: 'USD Coin (Sepolia)',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  WETH: {
    address: WETH_ADDRESS,
    symbol: 'WETH',
    name: 'Wrapped Ether (Sepolia)',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  DAI: {
    address: DAI_ADDRESS,
    symbol: 'DAI',
    name: 'Dai Stablecoin (Sepolia)',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
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
