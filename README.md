# AutoStack DCA

Non-custodial Dollar Cost Averaging on Base Mainnet. Your funds stay in your wallet until each swap executes.

## What This Does

AutoStack lets you set up recurring token purchases without depositing funds into a vault or trusting a centralized service. You grant a time-bounded, amount-limited permission to a smart contract, and it executes swaps on your behalf at the frequency you specify.

The key difference from existing DCA solutions: your tokens never leave your wallet until the moment of each swap. No lockups, no custody risk.

Demo Video - https://www.youtube.com/watch?v=ABd1zTpaeXs

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

**ERC-7715 Advanced Permissions (MetaMask Smart Accounts Kit)** - Instead of traditional ERC20 token approvals, AutoStack uses MetaMask's Smart Accounts Kit to request granular, time-limited permissions via `wallet_grantPermissions`. Users grant periodic spending permissions (e.g., "10 USDC per day for 30 days") that automatically expire. This is fundamentally more secure than unlimited approvals.

Key ERC-7715 features used:
- `erc20-token-periodic` - Time-bounded, amount-capped token permissions
- Session accounts - Dedicated accounts that hold permissions and execute on user's behalf
- Permission redemption - Backend can execute swaps using granted permissions without user signing each transaction

**Envio HyperIndex** - Real-time blockchain indexing. When you create a strategy or execute a swap, the dashboard updates within milliseconds. No polling, no stale data.

**x402 Protocol** - The Smart Money Feed pulls whale trading data from Nansen's API using HTTP-native micropayments. Each request costs ~$0.01 USDC on Solana. No API keys, no subscriptions.

**Uniswap V3** - Production swaps via SwapRouter02 on Base Mainnet with configurable pool fees (0.05%, 0.3%, 1%).

## Deployed Contracts

**Sepolia Testnet (ERC-7715 Required):**
- AutoStackDCA V2: Deploy your own (see Contract Deployment section)
- USDC (Circle): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
- Uniswap SwapRouter02: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`

**Note:** ERC-7715 Advanced Permissions only work on Sepolia. MetaMask's Gator Snaps are not yet deployed on Base or other mainnets.

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

### ERC-7715 Permission Flow

Instead of traditional ERC20 approvals, AutoStack uses MetaMask Advanced Permissions:

1. **Session Account Creation** - App generates a session keypair stored locally
2. **Permission Request** - App calls `wallet_grantPermissions` with:
   ```typescript
   {
     permission: {
       type: "erc20-token-periodic",
       data: {
         tokenAddress: USDC_ADDRESS,
         periodAmount: parseUnits("10", 6), // 10 USDC
         periodDuration: 86400, // 1 day
       }
     },
     signer: { type: "account", data: { address: sessionAccountAddress } },
     expiry: timestamp + 604800, // 1 week
   }
   ```
3. **User Approval** - MetaMask shows a clear permission dialog with exact limits
4. **Permission Granted** - Session account can now execute periodic swaps

### Creating a Strategy

1. User grants ERC-7715 permission via MetaMask (time-limited, amount-capped)
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

## Dependencies

Key packages used:

```json
{
  "@metamask/smart-accounts-kit": "^0.x.x",
  "viem": "^2.x.x",
  "wagmi": "^3.x.x",
  "@faremeter/fetch": "^0.15.x",
  "@faremeter/payment-solana": "^0.15.x"
}
```

## Network Requirements

**IMPORTANT: ERC-7715 Advanced Permissions currently only work on Sepolia testnet.**

The MetaMask Gator Snaps required for ERC-7715 are only deployed on Sepolia. The app is configured to use Sepolia for this reason.

To test the ERC-7715 permission flow:
1. Install MetaMask Flask (developer version)
2. Connect to Sepolia network
3. Get Sepolia USDC from a faucet
4. The Gator Snaps will auto-install when you first request permissions

## Known Limitations

- ERC-7715 Advanced Permissions only work on **Sepolia testnet** (MetaMask limitation)
- Requires MetaMask Flask (developer version) with Gator Snaps
- x402 payments require a funded Solana wallet with mainnet USDC
- Minimum execution frequency is 60 seconds (for testing; production would be longer)
- Smart Money triggers depend on Nansen API availability via Corbits

## Architecture Diagram

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed Mermaid diagrams of the system.

## License

MIT
