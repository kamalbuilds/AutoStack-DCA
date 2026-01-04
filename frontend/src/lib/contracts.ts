// AutoStackDCA Contract Address on Base Sepolia
export const AUTOSTACK_DCA_ADDRESS = '0x29846754737248d7d81998762B32471967B0c862' as const

// SmartMoneyDCA Contract Address on Base Sepolia
export const SMART_MONEY_DCA_ADDRESS = '0xa60300243858f1392b199AB40e2b19EcE4330D06' as const

// Demo token addresses on Base Sepolia
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const // Base Sepolia USDC
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const // Base Sepolia WETH
export const DAI_ADDRESS = '0x7683022d84F726a96c4A6611cD31DBf5409c0Ac9' as const // Base Sepolia DAI
export const WBTC_ADDRESS = '0x0E8A53DD9c13589df6382F13dA6B3EEde26c8D7A' as const // Base Sepolia WBTC (mock)

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
  WBTC: {
    address: WBTC_ADDRESS,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    logo: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
} as const

export type TokenSymbol = keyof typeof SUPPORTED_TOKENS

// AutoStackDCA ABI - minimal ABI for the functions we need
export const AUTOSTACK_DCA_ABI = [
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
    name: 'executeStrategy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getStrategy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    outputs: [
      {
        name: 'strategy',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountPerExecution', type: 'uint256' },
          { name: 'frequency', type: 'uint256' },
          { name: 'totalExecutions', type: 'uint256' },
          { name: 'executionsCompleted', type: 'uint256' },
          { name: 'lastExecutedAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getUserStrategies',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'strategyIds', type: 'uint256[]' }],
  },
  {
    name: 'StrategyCreated',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'tokenIn', type: 'address', indexed: false },
      { name: 'tokenOut', type: 'address', indexed: false },
      { name: 'amountPerExecution', type: 'uint256', indexed: false },
      { name: 'frequency', type: 'uint256', indexed: false },
      { name: 'totalExecutions', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'StrategyExecuted',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
      { name: 'executionNumber', type: 'uint256', indexed: false },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'amountOut', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'StrategyCancelled',
    type: 'event',
    inputs: [
      { name: 'strategyId', type: 'uint256', indexed: true },
    ],
  },
] as const

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
  DAILY: 86400n,    // 24 hours
  WEEKLY: 604800n,  // 7 days
} as const
