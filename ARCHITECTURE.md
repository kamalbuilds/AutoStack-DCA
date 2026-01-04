# AutoStack DCA - Architecture

## System Overview

```mermaid
flowchart TB
    subgraph User["👤 User"]
        Wallet["MetaMask Wallet"]
    end

    subgraph Frontend["🖥️ Next.js Frontend"]
        UI["React UI"]
        Wagmi["Wagmi Hooks"]
        API["API Routes"]
    end

    subgraph Blockchain["⛓️ Base Sepolia"]
        Contract["AutoStack DCA Contract"]
        USDC["USDC Token"]
        WETH["WETH Token"]
        Uniswap["Uniswap V3"]
    end

    subgraph Indexer["📊 Envio HyperIndex"]
        EventListener["Event Listener"]
        Processor["Event Processor"]
        Hasura["Hasura GraphQL"]
        PostgreSQL["PostgreSQL"]
    end

    subgraph x402["💳 x402 Micropayments"]
        Corbits["Corbits Proxy"]
        Nansen["Nansen API"]
        Solana["Solana Network"]
        SolUSDC["Solana USDC"]
    end

    %% User Interactions
    Wallet <--> Wagmi
    UI <--> Wagmi
    UI <--> API

    %% Frontend to Blockchain
    Wagmi <-->|"ERC-7715 Permissions"| Contract
    Wagmi <-->|"Approve Tokens"| USDC

    %% Contract Operations
    Contract <-->|"transferFrom"| USDC
    Contract <-->|"Swap"| Uniswap
    Uniswap <--> WETH
    Contract -->|"Transfer WETH"| Wallet

    %% Indexing Flow
    Contract -->|"Emit Events"| EventListener
    EventListener --> Processor
    Processor --> PostgreSQL
    PostgreSQL <--> Hasura
    Hasura <-->|"GraphQL Queries"| UI

    %% x402 Flow
    API -->|"HTTP Request"| Corbits
    Corbits -->|"402 Payment Required"| API
    API -->|"Sign & Pay"| Solana
    SolUSDC -->|"$0.01 USDC"| Corbits
    Corbits -->|"Forward Request"| Nansen
    Nansen -->|"Smart Money Data"| Corbits
    Corbits -->|"Response"| API
```

## DCA Strategy Flow

```mermaid
sequenceDiagram
    participant U as User Wallet
    participant F as Frontend
    participant C as DCA Contract
    participant T as USDC Token
    participant X as Uniswap V3
    participant E as Envio Indexer

    Note over U,E: Strategy Creation
    U->>F: Connect Wallet
    F->>T: approve(contract, amount)
    U->>T: Sign Approval
    T-->>F: Approval Confirmed
    F->>C: createStrategy(tokenIn, tokenOut, amount, frequency, executions)
    U->>C: Sign Transaction
    C->>C: Store Strategy
    C-->>E: Emit StrategyCreated Event
    E-->>F: Real-time Update

    Note over U,E: Strategy Execution (Daily)
    rect rgb(40, 40, 60)
        C->>T: transferFrom(user, contract, amount)
        T-->>C: USDC Transferred
        C->>X: exactInputSingle(USDC → WETH)
        X-->>C: WETH Received
        C->>U: transfer(WETH)
        C-->>E: Emit StrategyExecuted Event
        E-->>F: Real-time Update
    end

    Note over U,E: Funds flow: User → Contract → Uniswap → User
```

## x402 Payment Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant A as API Route
    participant C as Corbits Proxy
    participant S as Solana RPC
    participant N as Nansen API

    F->>A: GET /api/smart-money
    A->>C: POST /api/v1/smart-money/dex-trades
    C-->>A: HTTP 402 Payment Required
    Note over A: Payment Header contains:<br/>- Amount: 10000 (0.01 USDC)<br/>- Recipient: Corbits wallet<br/>- Network: Solana

    A->>A: Build Solana Transaction
    A->>S: Send Transaction
    S-->>A: Transaction Signature

    A->>C: POST /api/v1/smart-money/dex-trades<br/>+ X-Payment header with signature
    C->>C: Verify Payment on Solana
    C->>N: Forward Request
    N-->>C: Smart Money Data
    C-->>A: HTTP 200 + Data
    A-->>F: JSON Response
```

## Component Architecture

```mermaid
flowchart LR
    subgraph Frontend["Frontend Layer"]
        direction TB
        Pages["Pages<br/>/create, /dashboard"]
        Components["Components<br/>SmartMoneyFeed<br/>StrategyCard"]
        Hooks["Wagmi Hooks<br/>useWriteContract<br/>useAccount"]
        APIRoutes["API Routes<br/>/api/smart-money"]
    end

    subgraph Contracts["Smart Contract Layer"]
        direction TB
        AutoStack["AutoStackDCA.sol<br/>- createStrategy()<br/>- executeStrategy()<br/>- cancelStrategy()"]
        ERC20["ERC20 Interface<br/>- approve()<br/>- transferFrom()"]
    end

    subgraph Indexer["Indexing Layer"]
        direction TB
        Config["config.yaml<br/>Contract Address<br/>Event Handlers"]
        Handlers["Event Handlers<br/>StrategyCreated<br/>StrategyExecuted<br/>StrategyCancelled"]
        Schema["Schema<br/>Strategy<br/>Execution<br/>GlobalStats"]
    end

    subgraph External["External Services"]
        direction TB
        Corbits2["Corbits x402 Proxy"]
        Nansen2["Nansen API"]
        Solana2["Solana Mainnet"]
    end

    Pages --> Components
    Components --> Hooks
    Pages --> APIRoutes
    Hooks --> Contracts
    APIRoutes --> External
    Contracts --> Indexer
```

## Data Models

```mermaid
erDiagram
    Strategy {
        string id PK
        string user
        string tokenIn
        string tokenOut
        bigint amountPerExecution
        bigint frequency
        int totalExecutions
        int executionsCompleted
        bigint lastExecutedAt
        string status
        bigint createdAt
        string transactionHash
    }

    Execution {
        string id PK
        string strategyId FK
        int executionNumber
        bigint amountIn
        bigint amountOut
        bigint executedAt
        string transactionHash
    }

    GlobalStats {
        string id PK
        int totalStrategies
        int activeStrategies
        int totalExecutions
        int uniqueUsers
        bigint totalVolumeUSD
    }

    Strategy ||--o{ Execution : "has many"
```

## Technology Stack

```mermaid
mindmap
    root((AutoStack DCA))
        Frontend
            Next.js 15
            React 19
            TypeScript
            Wagmi v2
            Viem
            TailwindCSS
        Smart Contracts
            Solidity
            Foundry
            Base Sepolia
            ERC-7715
        Indexing
            Envio HyperIndex
            Hasura GraphQL
            PostgreSQL
            ReScript
        x402 Integration
            Faremeter SDK
            Corbits Proxy
            Nansen API
            Solana USDC
```

## Key Innovation Points

### 1. ERC-7715 Non-Custodial Permissions
```
Traditional DCA:  User → Deposit to Vault → Vault Executes → User Withdraws
AutoStack DCA:    User → Grant Permission → Contract Pulls on Execute → Direct to User
```

### 2. Envio Real-Time Indexing
```
Traditional:  Block Mined → Wait 1-5 min → Index → Query → UI Update
Envio:        Block Mined → <1 sec → Index → GraphQL Push → UI Update
```

### 3. x402 Micropayments
```
Traditional API:  Sign Up → KYC → Pay $200/month → Get API Key → Make Requests
x402 Protocol:    Make Request → Pay $0.01 → Get Data (No account needed)
```
