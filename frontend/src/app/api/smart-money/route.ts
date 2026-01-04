/**
 * Smart Money API Route
 *
 * Fetches real-time whale/smart money activity from Nansen API via Corbits proxy
 * Uses x402 micropayments (~$0.01 USDC per request on Solana)
 */

import { NextResponse } from 'next/server';
import axios from 'axios';
import * as dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';

// Force IPv4 resolution globally
dns.setDefaultResultOrder('ipv4first');

// Custom axios instance with IPv4 only
const axiosInstance = axios.create({
  timeout: 60000,
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
});

// Custom fetch using axios (better IPv4/IPv6 handling)
const customFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  console.log('[customFetch] Fetching:', url);
  console.log('[customFetch] Method:', init?.method || 'GET');

  try {
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, init.headers);
      }
    }

    const response = await axiosInstance({
      url,
      method: (init?.method || 'GET') as 'GET' | 'POST',
      headers,
      data: init?.body,
      validateStatus: () => true, // Don't throw on any status
    });

    console.log('[customFetch] Response status:', response.status);

    // Convert axios response to fetch-like response
    const fetchResponse = new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers as Record<string, string>),
    });

    return fetchResponse;
  } catch (error: any) {
    console.error('[customFetch] Error:', error.message);
    throw error;
  }
};

// Corbits Nansen proxy URL
const CORBITS_PROXY_URL = process.env.CORBITS_PROXY_URL || 'https://nansen.api.corbits.dev';
const X402_ENABLED = process.env.X402_ENABLED === 'true';

// Solana keypair for x402 payments (server-side only)
const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

interface NansenDexTrade {
  chain: string;
  block_timestamp: string;
  transaction_hash: string;
  trader_address: string;
  trader_address_label: string;
  token_bought_address: string;
  token_sold_address: string;
  token_bought_amount: number;
  token_sold_amount: number;
  token_bought_symbol: string;
  token_sold_symbol: string;
  trade_value_usd?: number;
}

// Initialize x402 client lazily
// Reset to null to force re-init with new config
let x402FetchClient: typeof fetch | null = null;
let clientInitAttempts = 0;

async function getX402Client(): Promise<typeof fetch> {
  if (x402FetchClient) return x402FetchClient;

  console.log('[x402] Initializing client...');
  console.log('[x402] X402_ENABLED:', X402_ENABLED);
  console.log('[x402] SOLANA_PRIVATE_KEY set:', !!SOLANA_PRIVATE_KEY);

  if (!X402_ENABLED || !SOLANA_PRIVATE_KEY) {
    throw new Error('x402 not configured. Set X402_ENABLED=true and SOLANA_PRIVATE_KEY in .env');
  }

  try {
    // Dynamic imports for server-side only packages
    console.log('[x402] Loading Faremeter SDK...');
    const { wrap } = await import('@faremeter/fetch');
    const { createPaymentHandler } = await import('@faremeter/payment-solana/exact');
    const { Connection, Keypair, PublicKey } = await import('@solana/web3.js');

    const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

    // Parse keypair
    console.log('[x402] Parsing Solana keypair...');
    const secretKeyArray = JSON.parse(SOLANA_PRIVATE_KEY);
    const solanaKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
    console.log('[x402] Solana wallet:', solanaKeypair.publicKey.toBase58());

    const connection = new Connection(SOLANA_RPC_URL, {
      commitment: 'confirmed',
      fetch: customFetch, // Use custom fetch with extended timeouts
    });

    console.log('[x402] Connection created');

    // Transaction sender compatible with Faremeter SDK signature
    // SDK calls: wallet.sendTransaction(tx: VersionedTransaction) => Promise<string>
    async function sendTransaction(transaction: any): Promise<string> {
      try {
        console.log('[x402] === SENDING PAYMENT TRANSACTION ===');
        console.log('[x402] Transaction constructor:', transaction?.constructor?.name);

        // VersionedTransaction needs to be signed with signers
        transaction.sign([solanaKeypair]);
        console.log('[x402] Transaction signed');

        // Serialize and send
        const serialized = transaction.serialize();
        console.log('[x402] Sending to Solana network...');

        const signature = await connection.sendRawTransaction(serialized, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3,
        });
        console.log(`[x402] ✅ Transaction sent: ${signature}`);

        // Confirm with longer timeout
        console.log('[x402] Waiting for confirmation...');
        const latestBlockhash = await connection.getLatestBlockhash();
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log(`[x402] ✅ Payment CONFIRMED: ${signature}`);
        console.log(`[x402] View on Solscan: https://solscan.io/tx/${signature}`);

        return signature;
      } catch (txError: any) {
        console.error('[x402] ❌ Transaction error:', txError.message);
        throw txError;
      }
    }

    // Create payment handler with our wallet
    // Network must be "mainnet-beta" - the SDK converts to ["solana-mainnet-beta", "solana"]
    // Disable settlement accounts - use ToSpec mode where we provide transaction and Corbits submits
    console.log('[x402] Creating payment handler (ToSpec mode)...');
    const paymentHandler = await createPaymentHandler(
      {
        network: 'mainnet-beta',
        publicKey: solanaKeypair.publicKey,
        // updateTransaction: sign the transaction before encoding
        updateTransaction: async (tx) => {
          console.log('[x402] Signing transaction for ToSpec...');
          tx.sign([solanaKeypair]);
          console.log('[x402] Transaction signed for ToSpec');
          return tx;
        },
      },
      USDC_MINT,
      connection,
      {
        features: {
          enableSettlementAccounts: false, // Use ToSpec mode
        },
      }
    );

    // Wrap fetch with detailed error handling
    console.log('[x402] Wrapping fetch with x402 using custom fetch...');
    x402FetchClient = wrap(customFetch, {
      handlers: [paymentHandler],
      payerChooser: async (executers) => {
        console.log('[x402] payerChooser called with', executers.length, 'options');
        if (executers.length === 0) {
          console.error('[x402] No payment handlers available!');
          throw new Error('No compatible payment handlers for this resource');
        }
        console.log('[x402] Selecting first executer');
        return executers[0];
      },
      retryCount: 3,
      initialRetryDelay: 1000,
      onPaymentAttempt: (attempt: any) => {
        console.log('[x402] Payment attempt:', JSON.stringify(attempt, null, 2));
      },
    });

    console.log('[x402] Client initialized successfully');
    return x402FetchClient;
  } catch (error: any) {
    console.error('[x402] Initialization error:', error.message);
    console.error('[x402] Stack:', error.stack);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'base';
    const limit = searchParams.get('limit') || '20';
    const minAmount = searchParams.get('min_amount') || '10000';

    // If x402 is not enabled, return error
    if (!X402_ENABLED) {
      return NextResponse.json(
        {
          error: 'x402 not enabled',
          message: 'Smart Money API requires x402 to be enabled. Set X402_ENABLED=true in .env'
        },
        { status: 503 }
      );
    }

    console.log(`[SmartMoney API] Fetching trades for chain=${chain}, limit=${limit}`);

    // Get x402 client
    const paywalledFetch = await getX402Client();

    // Build URL and request body (Nansen API uses POST with JSON)
    // Correct path is /api/v1/smart-money/dex-trades per Nansen docs
    const url = `${CORBITS_PROXY_URL}/api/v1/smart-money/dex-trades`;
    const requestBody = {
      chains: [chain],
      pagination: {
        page: 1,
        per_page: parseInt(limit),
      },
      filters: {
        trade_value_usd: {
          min: parseInt(minAmount),
        },
      },
    };

    console.log(`[SmartMoney API] Calling: ${url}`);
    console.log(`[SmartMoney API] Body:`, JSON.stringify(requestBody));

    // Make request with x402 payment
    let response;
    try {
      // Use AbortController for timeout - 2 minutes for x402 payment flow
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

      response = await paywalledFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[SmartMoney API] Response status: ${response.status}`);
    } catch (fetchError: any) {
      console.error(`[SmartMoney API] Fetch error:`, fetchError.message);
      console.error(`[SmartMoney API] Fetch error cause:`, fetchError.cause);
      console.error(`[SmartMoney API] Fetch error stack:`, fetchError.stack);

      // Log full error details
      if (fetchError.cause?.message) {
        console.error(`[SmartMoney API] Cause message:`, fetchError.cause.message);
      }
      if (fetchError.cause?.cause) {
        console.error(`[SmartMoney API] Nested cause:`, fetchError.cause.cause);
      }

      // If payment fails, reset client to try fresh init next time
      if (fetchError.message?.includes('payment')) {
        console.log('[SmartMoney API] Payment error - resetting client for fresh init');
        x402FetchClient = null;
      }

      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SmartMoney API] Nansen error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: 'Nansen API error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[SmartMoney API] Raw response keys:`, Object.keys(data));
    console.log(`[SmartMoney API] Raw data sample:`, JSON.stringify(data).slice(0, 500));
    console.log(`[SmartMoney API] Received ${data.data?.length || 0} trades`);

    // Transform to frontend format
    const signals = (data.data as NansenDexTrade[]).map((trade, index) => ({
      id: `${trade.transaction_hash}-${index}`,
      wallet: trade.trader_address,
      walletLabel: trade.trader_address_label || 'Smart Money',
      chain: trade.chain,
      tokenBought: trade.token_bought_address,
      tokenBoughtSymbol: trade.token_bought_symbol || getTokenSymbol(trade.token_bought_address),
      tokenBoughtAmount: trade.token_bought_amount,
      tokenSold: trade.token_sold_address,
      tokenSoldSymbol: trade.token_sold_symbol || 'TOKEN',
      tokenSoldAmount: trade.token_sold_amount,
      tradeValueUsd: trade.trade_value_usd,
      action: 'buy' as const,
      timestamp: Math.floor(new Date(trade.block_timestamp).getTime() / 1000),
      txHash: trade.transaction_hash,
    }));

    return NextResponse.json({
      success: true,
      data: signals,
      meta: {
        chain,
        count: signals.length,
        fetchedAt: new Date().toISOString(),
        x402Cost: '$0.01',
      },
    });
  } catch (error: any) {
    console.error('[SmartMoney API] Error:', error.message);

    // Handle specific errors
    if (error.message?.includes('USDC') || error.message?.includes('balance')) {
      return NextResponse.json(
        {
          error: 'Payment failed',
          message: 'Insufficient USDC balance for x402 payment. Fund Solana wallet.',
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Helper to get token symbol from address (Base tokens)
function getTokenSymbol(address: string): string {
  const tokens: Record<string, string> = {
    '0x4200000000000000000000000000000000000006': 'WETH',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
    '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH',
    '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452': 'wstETH',
  };
  return tokens[address.toLowerCase()] || 'TOKEN';
}
