/**
 * Smart Money DCA Worker with x402 Nansen Integration
 *
 * Production-level worker that monitors smart money activity via Nansen API
 * using x402 micropayments (~$0.01 USDC per request via Solana) and triggers DCA
 * executions when whale wallets make significant buys.
 *
 * x402 Payment Flow:
 * 1. Request Nansen API via Corbits proxy
 * 2. Receive 402 Payment Required
 * 3. Automatically pay 0.01 USDC via Solana
 * 4. Retry and receive data
 */

import { createPublicClient, createWalletClient, http, parseAbi, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { GraphQLClient, gql } from 'graphql-request';
import { wrap } from '@faremeter/fetch';
import { createPaymentHandler } from '@faremeter/payment-solana/exact';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

// ============ Configuration ============

const CONFIG = {
  // EVM Configuration (Base Mainnet for contract execution)
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  privateKey: process.env.WORKER_PRIVATE_KEY!,
  contractAddress: process.env.SMART_MONEY_CONTRACT_ADDRESS as `0x${string}`,

  // Envio Indexer
  envioGraphqlUrl: process.env.ENVIO_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
  hasuraSecret: process.env.HASURA_ADMIN_SECRET || 'testing',

  // x402 / Nansen Configuration
  corbitsProxyUrl: process.env.CORBITS_PROXY_URL || 'https://nansen.api.corbits.dev',
  x402Enabled: process.env.X402_ENABLED === 'true',

  // Solana Configuration (for x402 payments)
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,

  // Smart Money Settings
  pollInterval: 30, // seconds
  minWhaleAmountUsd: 10000, // $10k minimum transaction
  smartMoneyLabels: ['Smart Money', 'Fund', 'Whale', 'Institutional', 'Market Maker'],
  maxRetries: 3,
  retryDelayMs: 1000,
};

// Solana USDC mint address
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// ============ Contract ABI ============

const SMART_MONEY_DCA_ABI = parseAbi([
  'function executeWithSmartMoneySignal(uint256 strategyId, tuple(address wallet, uint256 amountUsd, uint8 labelScore, bytes32 txHash, uint256 timestamp) signal) external',
  'function executeDCA(uint256 strategyId) external',
  'function canExecuteTimeBased(uint256 strategyId) external view returns (bool)',
  'function canExecuteSmartMoney(uint256 strategyId) external view returns (bool)',
  'function getStrategy(uint256 strategyId) external view returns (tuple(address user, address tokenIn, address tokenOut, uint24 poolFee, uint256 amountPerExecution, uint256 frequency, uint256 executionsLeft, uint256 lastExecution, uint256 totalAmountIn, uint256 totalAmountOut, uint8 strategyType, tuple(uint256 minWhaleAmount, uint8 minLabelScore, uint8 signalThreshold, uint256 signalWindow, bool enabled) smartMoneyConfig, bool active))',
  'function getSmartMoneyConfig(uint256 strategyId) external view returns (tuple(uint256 minWhaleAmount, uint8 minLabelScore, uint8 signalThreshold, uint256 signalWindow, bool enabled))',
  'function getSignalAccumulator(uint256 strategyId) external view returns (uint8 signalCount, uint256 windowStart, uint256 processedCount)',
]);

// ============ Types ============

interface SmartMoneySignal {
  wallet: `0x${string}`;
  amountUsd: bigint;
  labelScore: number;
  txHash: `0x${string}`;
  timestamp: bigint;
}

interface NansenDexTrade {
  wallet_address: string;
  token_bought_address: string;
  token_sold_address: string;
  amount_bought: string;
  amount_sold: string;
  amount_usd: number;
  block_timestamp: string;
  transaction_hash: string;
  labels: string[];
  smart_money_score: number;
}

interface NansenSmartMoneyResponse {
  data: NansenDexTrade[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

interface Strategy {
  id: string;
  strategyId: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountPerExecution: string;
  frequency: string;
  totalExecutions: string;
  executionsCompleted: string;
  status: string;
  createdAt: string;
}

// ============ EVM Clients ============

const account = privateKeyToAccount(CONFIG.privateKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: base,
  transport: http(CONFIG.rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(CONFIG.rpcUrl),
});

const graphqlClient = new GraphQLClient(CONFIG.envioGraphqlUrl, {
  headers: {
    'x-hasura-admin-secret': CONFIG.hasuraSecret,
  },
});

// ============ x402 Payment Integration via Faremeter ============

let x402Fetch: typeof fetch | null = null;

/**
 * Initialize x402 payment-enabled fetch client using Faremeter SDK
 * Handles automatic Solana USDC payments for Nansen API access
 */
async function initializeX402Client(): Promise<typeof fetch> {
  if (x402Fetch) return x402Fetch;

  if (!CONFIG.solanaPrivateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not set. Required for x402 payments.');
  }

  // Parse Solana keypair from array format
  const secretKeyArray = JSON.parse(CONFIG.solanaPrivateKey);
  const solanaKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

  console.log(`[x402] Solana wallet: ${solanaKeypair.publicKey.toBase58()}`);

  // Create Solana connection
  const connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');

  // Check USDC balance
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    solanaKeypair.publicKey,
    { mint: USDC_MINT }
  );

  if (tokenAccounts.value.length > 0) {
    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    console.log(`[x402] USDC balance: ${balance} USDC`);

    if (balance < 0.01) {
      throw new Error(`Insufficient USDC balance: ${balance}. Need at least 0.01 USDC.`);
    }
  } else {
    console.warn('[x402] No USDC token account found. Please fund wallet with USDC.');
  }

  // Transaction sending function compatible with Faremeter SDK
  async function sendTransaction(transaction: any) {
    transaction.sign([solanaKeypair]);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
    console.log(`[x402] Payment tx: ${signature}`);
    return signature;
  }

  // Create Solana payment handler for x402
  const paymentHandler = await createPaymentHandler(
    {
      network: 'mainnet-beta',
      publicKey: solanaKeypair.publicKey,
      sendTransaction: sendTransaction as any,
    },
    USDC_MINT,
    connection
  );

  // Wrap fetch with automatic x402 payment handling
  x402Fetch = wrap(fetch, {
    handlers: [paymentHandler],
    payerChooser: async (executers) => executers[0],
    retryCount: CONFIG.maxRetries,
    initialRetryDelay: CONFIG.retryDelayMs,
  });

  console.log('[x402] Payment client initialized');
  return x402Fetch;
}

/**
 * Makes an x402 authenticated request to Nansen API via Corbits proxy
 * Each request costs ~$0.01 USDC paid via Solana
 */
async function makeNansenRequest<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!CONFIG.x402Enabled) {
    throw new Error('x402 is disabled. Set X402_ENABLED=true in .env');
  }

  const paywalledFetch = await initializeX402Client();

  const url = new URL(`${CONFIG.corbitsProxyUrl}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  console.log(`[Nansen] Requesting: ${endpoint}`);
  console.log(`[Nansen] Full URL: ${url.toString()}`);

  try {
    const response = await paywalledFetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nansen API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as T;
    console.log(`[Nansen] Request successful (payment processed via x402)`);
    return data;
  } catch (error: any) {
    console.error(`[Nansen] Request failed: ${error.message}`);
    throw error;
  }
}

// ============ Nansen API Functions ============

/**
 * Fetch recent smart money DEX trades for a specific token
 */
async function fetchSmartMoneyTrades(tokenAddress: string, chain = 'base'): Promise<NansenDexTrade[]> {
  console.log(`[Nansen] Fetching smart money trades for ${tokenAddress.slice(0, 10)}...`);

  const response = await makeNansenRequest<NansenSmartMoneyResponse>(
    '/v1/smart-money/dex-trades',
    {
      token_address: tokenAddress,
      chain: chain,
      limit: '50',
      min_amount_usd: CONFIG.minWhaleAmountUsd.toString(),
      time_range: '1h',
      sort_by: 'amount_usd',
      sort_order: 'desc',
    }
  );

  console.log(`[Nansen] Found ${response.data.length} trades`);
  return response.data;
}

/**
 * Fetch smart money token flows
 */
async function fetchTokenFlows(tokenAddress: string, chain = 'base'): Promise<{
  netFlow: number;
  buyVolume: number;
  sellVolume: number;
  uniqueBuyers: number;
  uniqueSellers: number;
}> {
  console.log(`[Nansen] Fetching token flows for ${tokenAddress.slice(0, 10)}...`);

  const response = await makeNansenRequest<{
    net_flow_24h: number;
    buy_volume_24h: number;
    sell_volume_24h: number;
    unique_buyers: number;
    unique_sellers: number;
  }>('/v1/smart-money/token-flow', {
    token_address: tokenAddress,
    chain: chain,
    time_range: '24h',
  });

  return {
    netFlow: response.net_flow_24h,
    buyVolume: response.buy_volume_24h,
    sellVolume: response.sell_volume_24h,
    uniqueBuyers: response.unique_buyers,
    uniqueSellers: response.unique_sellers,
  };
}

/**
 * Check if a trade qualifies as a valid smart money signal
 */
function isValidSmartMoneySignal(trade: NansenDexTrade): boolean {
  // Must have relevant label
  const hasRelevantLabel = trade.labels.some((label) =>
    CONFIG.smartMoneyLabels.some((smLabel) =>
      label.toLowerCase().includes(smLabel.toLowerCase())
    )
  );

  // Must meet minimum amount threshold
  const meetsMinAmount = trade.amount_usd >= CONFIG.minWhaleAmountUsd;

  // Must have good smart money score (0-100)
  const hasGoodScore = trade.smart_money_score >= 60;

  // Trade must be recent (within last 30 minutes)
  const tradeTime = new Date(trade.block_timestamp).getTime();
  const isRecent = Date.now() - tradeTime < 30 * 60 * 1000;

  return hasRelevantLabel && meetsMinAmount && hasGoodScore && isRecent;
}

/**
 * Convert Nansen trade to SmartMoneySignal for contract execution
 */
function tradeToSignal(trade: NansenDexTrade): SmartMoneySignal {
  return {
    wallet: trade.wallet_address as `0x${string}`,
    amountUsd: BigInt(Math.floor(trade.amount_usd * 1e6)), // Convert to 6 decimals
    labelScore: Math.floor(trade.smart_money_score),
    txHash: trade.transaction_hash as `0x${string}`,
    timestamp: BigInt(Math.floor(new Date(trade.block_timestamp).getTime() / 1000)),
  };
}

// ============ GraphQL Queries ============

const GET_ACTIVE_STRATEGIES = gql`
  query GetActiveStrategies {
    Strategy(
      where: {
        status: { _eq: "ACTIVE" }
      }
    ) {
      id
      strategyId
      user
      tokenIn
      tokenOut
      amountPerExecution
      frequency
      totalExecutions
      executionsCompleted
      status
      createdAt
    }
  }
`;

// ============ Strategy Execution ============

async function executeSmartMoneyStrategy(
  strategyId: string,
  signal: SmartMoneySignal
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log(`\n[Execute] Smart Money Strategy #${strategyId}`);
  console.log(`  Whale: ${signal.wallet.slice(0, 10)}...${signal.wallet.slice(-6)}`);
  console.log(`  Score: ${signal.labelScore}`);
  console.log(`  Amount: $${formatUnits(signal.amountUsd, 6)}`);

  try {
    // Check if strategy can be executed with smart money
    const canExec = await publicClient.readContract({
      address: CONFIG.contractAddress,
      abi: SMART_MONEY_DCA_ABI,
      functionName: 'canExecuteSmartMoney',
      args: [BigInt(strategyId)],
    }) as boolean;

    if (!canExec) {
      console.log(`  ❌ Cannot execute: Strategy not eligible for smart money execution`);
      return { success: false, error: 'Not eligible for smart money execution' };
    }

    // Get current signal accumulator state
    const [signalCount, windowStart, processedCount] = await publicClient.readContract({
      address: CONFIG.contractAddress,
      abi: SMART_MONEY_DCA_ABI,
      functionName: 'getSignalAccumulator',
      args: [BigInt(strategyId)],
    }) as [number, bigint, bigint];

    console.log(`  Signal accumulator: ${signalCount} signals in window`);

    // Execute with smart money signal
    const hash = await walletClient.writeContract({
      address: CONFIG.contractAddress,
      abi: SMART_MONEY_DCA_ABI,
      functionName: 'executeWithSmartMoneySignal',
      args: [BigInt(strategyId), signal],
    });

    console.log(`  📝 Transaction: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);

    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============ Main Worker Loop ============

async function runSmartMoneyWorker(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[${timestamp}] Smart Money Check`);
  console.log(`${'═'.repeat(60)}`);

  try {
    // Fetch all active strategies from indexer
    const { Strategy: strategies } = await graphqlClient.request<{ Strategy: Strategy[] }>(
      GET_ACTIVE_STRATEGIES
    );

    if (!strategies || strategies.length === 0) {
      console.log('📭 No active strategies found');
      return;
    }

    console.log(`📊 Found ${strategies.length} active strategies`);

    // Get unique tokens being tracked
    const trackedTokens = [...new Set(strategies.map((s) => s.tokenOut.toLowerCase()))];
    console.log(`🎯 Tracking ${trackedTokens.length} tokens for smart money activity`);

    // Process each tracked token
    for (const tokenOut of trackedTokens) {
      console.log(`\n[Token] ${tokenOut}`);

      try {
        // Fetch smart money trades via x402 Nansen API
        const trades = await fetchSmartMoneyTrades(tokenOut);

        // Filter for valid signals
        const validSignals = trades.filter(isValidSmartMoneySignal);

        if (validSignals.length === 0) {
          console.log('  📉 No qualifying smart money activity');
          continue;
        }

        console.log(`  🐋 Found ${validSignals.length} smart money signals!`);

        // Log top signal details
        const topSignal = validSignals[0];
        console.log(`  Top signal: ${topSignal.wallet_address.slice(0, 10)}...`);
        console.log(`    Labels: ${topSignal.labels.join(', ')}`);
        console.log(`    Amount: $${topSignal.amount_usd.toLocaleString()}`);
        console.log(`    Score: ${topSignal.smart_money_score}`);

        // Find strategies interested in this token
        const matchingStrategies = strategies.filter(
          (s) => s.tokenOut.toLowerCase() === tokenOut
        );

        console.log(`  📋 ${matchingStrategies.length} strategies targeting this token`);

        // Execute matching strategies with the smart money signal
        for (const strategy of matchingStrategies) {
          const signal = tradeToSignal(topSignal);
          const result = await executeSmartMoneyStrategy(strategy.strategyId, signal);

          if (result.success) {
            console.log(`  ✅ Strategy #${strategy.strategyId} executed: ${result.txHash}`);
          } else {
            console.log(`  ⚠️ Strategy #${strategy.strategyId} skipped: ${result.error}`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Error processing token: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Worker error:', error.message);

    if (error.message?.includes('x402') || error.message?.includes('Payment') || error.message?.includes('USDC')) {
      console.error('💰 x402 payment issue. Check Solana wallet USDC balance.');
      console.error(`   Wallet: Fund with USDC on Solana mainnet`);
    } else if (error.message?.includes('ECONNREFUSED')) {
      console.error('🔌 Connection refused. Is the Envio indexer running?');
    }
  }
}

// ============ Health Check ============

async function checkWorkerHealth(): Promise<void> {
  console.log('\n🏥 Worker Health Check');
  console.log('─'.repeat(40));

  // Check EVM wallet balance (Base Mainnet)
  const ethBalance = await publicClient.getBalance({ address: account.address });
  console.log(`  ETH Balance (Base): ${formatUnits(ethBalance, 18)} ETH`);

  // Check Solana wallet for x402 payments
  if (CONFIG.solanaPrivateKey) {
    try {
      const secretKeyArray = JSON.parse(CONFIG.solanaPrivateKey);
      const solanaKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
      const connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');

      const solBalance = await connection.getBalance(solanaKeypair.publicKey);
      console.log(`  SOL Balance (Mainnet): ${(solBalance / 1e9).toFixed(6)} SOL`);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        solanaKeypair.publicKey,
        { mint: USDC_MINT }
      );

      if (tokenAccounts.value.length > 0) {
        const usdcBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        console.log(`  USDC Balance (Solana Mainnet): ${usdcBalance} USDC`);

        const requestsAvailable = Math.floor(usdcBalance / 0.01);
        console.log(`  Available API requests: ~${requestsAvailable}`);
      } else {
        console.warn('  ⚠️ No USDC token account found');
      }
    } catch (error: any) {
      console.error(`  ❌ Solana wallet check failed: ${error.message}`);
    }
  }

  // Check indexer connectivity
  try {
    await graphqlClient.request(gql`query { __typename }`);
    console.log('  ✅ Envio indexer connected');
  } catch (error) {
    console.error('  ❌ Envio indexer not reachable');
  }

  // Check x402 config
  console.log(`  x402 Enabled: ${CONFIG.x402Enabled ? '✅' : '❌'}`);
  console.log(`  Corbits Proxy: ${CONFIG.corbitsProxyUrl}`);
  console.log('─'.repeat(40));
}

// ============ Entry Point ============

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     AutoStack Smart Money DCA Worker                       ║');
  console.log('║     x402 Micropayments (Solana) + Nansen API               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`🔑 EVM Worker: ${account.address}`);
  console.log(`📄 Contract: ${CONFIG.contractAddress}`);
  console.log(`💰 x402 Enabled: ${CONFIG.x402Enabled}`);
  console.log(`⏰ Poll Interval: ${CONFIG.pollInterval}s`);
  console.log(`💵 Min Whale Amount: $${CONFIG.minWhaleAmountUsd.toLocaleString()}`);
  console.log();

  // Validate configuration
  if (!CONFIG.privateKey) {
    console.error('❌ WORKER_PRIVATE_KEY not set!');
    process.exit(1);
  }

  if (!CONFIG.contractAddress) {
    console.error('❌ SMART_MONEY_CONTRACT_ADDRESS not set!');
    process.exit(1);
  }

  if (!CONFIG.x402Enabled) {
    console.error('❌ x402 is disabled. Set X402_ENABLED=true in .env');
    process.exit(1);
  }

  if (!CONFIG.solanaPrivateKey) {
    console.error('❌ SOLANA_PRIVATE_KEY not set. Required for x402 payments.');
    process.exit(1);
  }

  // Run health check
  await checkWorkerHealth();

  // Initialize x402 client
  console.log('\n[x402] Initializing payment client...');
  await initializeX402Client();

  // Run immediately on startup
  await runSmartMoneyWorker();

  // Schedule periodic runs
  const intervalMs = CONFIG.pollInterval * 1000;
  console.log(`\n📅 Scheduled: Every ${CONFIG.pollInterval} seconds`);
  console.log('🚀 Worker running. Press Ctrl+C to stop.\n');

  setInterval(async () => {
    await runSmartMoneyWorker();
  }, intervalMs);
}

main().catch((error) => {
  console.error('💀 Fatal error:', error);
  process.exit(1);
});
