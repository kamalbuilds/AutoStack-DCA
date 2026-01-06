# AutoStack DCA

Non-custodial Dollar Cost Averaging on Base Mainnet. Your funds stay in your wallet until each swap executes.

## What This Does

AutoStack lets you set up recurring token purchases without depositing funds into a vault or trusting a centralized service. You grant a time-bounded, amount-limited permission to a smart contract, and it executes swaps on your behalf at the frequency you specify.

The key difference from existing DCA solutions: your tokens never leave your wallet until the moment of each swap. No lockups, no custody risk.

## Smart Money Integration

AutoStack now features **Smart Money DCA** - automatically trigger your DCA based on whale activity tracked by Nansen.

### Strategy Types

| Type | Description |
|------|-------------|
| **Basic DCA** | Traditional time-based DCA. Executes at fixed intervals. |
| **Smart Money DCA** | Triggers when Nansen-labeled wallets (VCs, Funds, Smart Money) make qualifying purchases. |
| **Signal Accumulation** | Waits for multiple whale signals within a time window before triggering. |
| **Hybrid** | Combines time-based and smart money triggers for maximum coverage. |

### Smart Money Configuration

Configure your whale tracking parameters:

- **Minimum Whale Size** - Trade size threshold ($1K - $1M)
- **Wallet Reputation** - Nansen credibility score (0-100)
- **Signal Threshold** - Number of whale signals required before trigger
- **Time Window** - Signal accumulation period (1-24 hours)

Each signal verification costs ~$0.01 via x402 micropayments.

## Tech Stack

This project demonstrates cutting-edge technologies working together:

**ERC-7715 Permissions** - The smart contract only gets permission to spend a specific amount over a specific time period. You can revoke anytime.

**Envio HyperIndex** - Real-time blockchain indexing. When you create a strategy or execute a swap, the dashboard updates within milliseconds. No polling, no stale data.

**x402 Protocol** - The Smart Money Feed pulls whale trading data from Nansen's API using HTTP-native micropayments. Each request costs ~$0.01 USDC on Solana. No API keys, no subscriptions.

**Uniswap V3** - Production swaps via SwapRouter02 on Base Mainnet with configurable pool fees (0.05%, 0.3%, 1%).

## Deployed Contracts

**Base Mainnet:**
- AutoStackDCA V2: `0x29846754737248d7d81998762B32471967B0c862`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- WETH: `0x4200000000000000000000000000000000000006`
- Uniswap SwapRouter02: `0x2626664c2603336E57B271c5C0b26F421741e481`

## Project Structure

```
autostack-dca/
├── contracts/          # Foundry project with AutoStackDCA.sol
├── frontend/           # Next.js 14 app with wagmi
├── indexer/            # Envio indexer for real-time data
└── scripts/            # Deployment and execution scripts
```

## Running Locally

### Prerequisites

- Node.js 18+
- pnpm
- Foundry (for contract deployment)
- Docker (for Envio indexer)

### 1. Start the Indexer

```bash
cd indexer
pnpm install
pnpm dev
```

This spins up a local Postgres + Hasura instance. The GraphQL playground is available at http://localhost:8080.

### 2. Start the Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
pnpm install
pnpm dev
```

The app runs at http://localhost:3000.

### 3. Environment Variables

Frontend `.env.local`:

```
NEXT_PUBLIC_ENVIO_ENDPOINT=http://localhost:8080/v1/graphql
NEXT_PUBLIC_CONTRACT_ADDRESS=0x29846754737248d7d81998762B32471967B0c862

# For x402 Smart Money Feed
X402_ENABLED=true
SOLANA_PRIVATE_KEY=[your-solana-keypair-array]
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
CORBITS_PROXY_URL=https://nansen.api.corbits.dev
```

## How It Works

### Creating a Strategy

1. User approves USDC spending for the contract
2. User calls `createStrategy()` or `createSmartMoneyStrategy()` with parameters:
   - Token pair (e.g., USDC -> WETH)
   - Amount per execution
   - Frequency (minimum 60 seconds)
   - Total number of executions
   - Strategy type (Basic, Smart Money, Accumulate, Hybrid)
   - Pool fee tier
3. Contract transfers the total USDC amount upfront
4. Envio indexes the `StrategyCreated` event immediately

### Smart Money DCA Execution

For Smart Money strategies:

1. Backend monitors Nansen-labeled wallets via x402 API
2. When a qualifying whale purchase is detected:
   - Trade size >= minimum whale amount
   - Wallet reputation >= minimum score
3. Signal is accumulated (for Accumulate mode)
4. When threshold is met, DCA execution is triggered
5. Contract swaps via Uniswap V3 and sends output to user

### x402 Payment Flow

```
Frontend → /api/smart-money → Faremeter SDK → Corbits Proxy
                                    ↓
                            HTTP 402 Response
                                    ↓
                      Solana USDC micropayment (~$0.01)
                                    ↓
                            Nansen whale data
```

Data is cached in localStorage to avoid repeated payments.

## GraphQL Queries

Query strategies for a user:

```graphql
query {
  Strategy(where: { user: { _eq: "0x..." } }) {
    id
    strategyId
    status
    executionsCompleted
    totalExecutions
    tokenIn
    tokenOut
    strategyType
    poolFee
  }
}
```

Query recent executions with whale data:

```graphql
query {
  Execution(order_by: { executedAt: desc }, limit: 10) {
    strategyId
    amountIn
    amountOut
    transactionHash
    executedAt
    triggeredBySmartMoney
    whaleWallet
    whaleAmountUsd
  }
}
```

## Testing

Run contract tests:

```bash
cd contracts
forge test
```

## Manual Execution

For testing, you can manually trigger DCA execution:

```bash
export CONTRACT=0x29846754737248d7d81998762B32471967B0c862
export RPC=https://mainnet.base.org
export PRIVATE_KEY=your-key

cast send $CONTRACT "executeDCA(uint256)" 0 --rpc-url $RPC --private-key $PRIVATE_KEY
```

## Known Limitations

- x402 payments require a funded Solana wallet with mainnet USDC
- Minimum execution frequency is 60 seconds (for testing; production would be longer)
- Smart Money triggers depend on Nansen API availability via Corbits

## Architecture Diagram

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed Mermaid diagrams of the system.

## License

MIT
