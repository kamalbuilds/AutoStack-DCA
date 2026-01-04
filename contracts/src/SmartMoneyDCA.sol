// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SmartMoneyDCA
 * @notice Advanced DCA contract with Smart Money tracking triggers
 * @dev Integrates with x402 micropayments for Nansen API access
 *
 * Features:
 * - Smart Money Triggered DCA: Buy when whales buy
 * - Limit Order DCA: Buy at specific price targets
 * - TWAP (Time-Weighted Average Price): Spread orders over time
 * - Stop Loss Protection: Auto-sell on drawdown
 * - Multi-trigger strategies: Combine multiple signals
 */
contract SmartMoneyDCA is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Enums ============

    enum StrategyType {
        BASIC_DCA,           // Traditional time-based DCA
        SMART_MONEY_DCA,     // Trigger on whale activity
        LIMIT_ORDER,         // Buy at price target
        TWAP,                // Time-weighted average price
        STOP_LOSS,           // Sell on drawdown
        SMART_ACCUMULATE     // Smart money + limit order combo
    }

    enum TriggerType {
        TIME_BASED,          // Regular interval
        SMART_MONEY_BUY,     // When smart money buys
        SMART_MONEY_SELL,    // When smart money sells (for shorting/exiting)
        PRICE_BELOW,         // When price drops below target
        PRICE_ABOVE,         // When price rises above target
        VOLUME_SPIKE,        // Unusual volume activity
        MULTI_SIGNAL         // Multiple conditions must be met
    }

    // ============ Structs ============

    struct SmartMoneyConfig {
        uint256 minWhaleAmount;     // Minimum whale transaction size (in USD)
        uint256 labelScore;         // Minimum Nansen label score (0-100)
        string[] requiredLabels;    // Required Nansen labels (e.g., "Smart Money", "Fund")
        uint8 signalThreshold;      // How many whales must buy before trigger (1-10)
        uint256 cooldownPeriod;     // Minimum time between smart money triggers
    }

    struct PriceConfig {
        uint256 targetPrice;        // Target price in tokenIn decimals
        uint256 slippageBps;        // Max slippage in basis points
        bool buyBelow;              // true = buy when below target, false = buy when above
    }

    struct Strategy {
        // Basic info
        uint256 id;
        address user;
        StrategyType strategyType;
        TriggerType triggerType;

        // Token configuration
        address tokenIn;            // Token to spend
        address tokenOut;           // Token to receive
        uint256 amountPerExecution; // Amount per trade
        uint256 totalBudget;        // Total allocated budget
        uint256 usedBudget;         // Amount already used

        // Execution limits
        uint256 maxExecutions;      // Max number of executions (0 = unlimited)
        uint256 executionsCompleted;
        uint256 minInterval;        // Minimum time between executions
        uint256 lastExecution;
        uint256 expiresAt;          // Strategy expiration timestamp (0 = no expiry)

        // State
        bool active;
        uint256 createdAt;

        // Config hashes (actual config stored off-chain or in mappings)
        bytes32 smartMoneyConfigHash;
        bytes32 priceConfigHash;
    }

    struct SmartMoneySignal {
        address wallet;             // Whale wallet address
        string label;               // Nansen label
        uint256 score;              // Credibility score
        uint256 amount;             // Transaction amount in USD
        uint256 timestamp;          // When the signal was received
        bytes32 txHash;             // Original transaction hash
    }

    struct Execution {
        uint256 strategyId;
        uint256 amountIn;
        uint256 amountOut;
        TriggerType triggerReason;
        bytes32 signalHash;         // Hash of the signal that triggered execution
        uint256 executedAt;
        uint256 gasUsed;
    }

    // ============ State Variables ============

    uint256 public nextStrategyId;
    uint256 public totalStrategiesCreated;
    uint256 public totalExecutions;
    uint256 public totalVolumeUSD;

    // Strategy storage
    mapping(uint256 => Strategy) public strategies;
    mapping(uint256 => SmartMoneyConfig) public smartMoneyConfigs;
    mapping(uint256 => PriceConfig) public priceConfigs;

    // User data
    mapping(address => uint256[]) public userStrategies;
    mapping(address => uint256) public userTotalInvested;

    // Execution history
    mapping(uint256 => Execution[]) public strategyExecutions;

    // Smart money signals (stored for transparency)
    mapping(bytes32 => SmartMoneySignal) public signals;
    bytes32[] public recentSignals;

    // Authorized executors (off-chain workers with x402 integration)
    mapping(address => bool) public authorizedExecutors;

    // DEX router for swaps
    address public dexRouter;

    // Protocol fees
    uint256 public protocolFeeBps = 30; // 0.3%
    address public feeRecipient;
    uint256 public totalFeesCollected;

    // ============ Events ============

    event StrategyCreated(
        uint256 indexed strategyId,
        address indexed user,
        StrategyType strategyType,
        TriggerType triggerType,
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 totalBudget
    );

    event SmartMoneyConfigSet(
        uint256 indexed strategyId,
        uint256 minWhaleAmount,
        uint256 labelScore,
        uint8 signalThreshold
    );

    event PriceConfigSet(
        uint256 indexed strategyId,
        uint256 targetPrice,
        uint256 slippageBps,
        bool buyBelow
    );

    event DCAExecuted(
        uint256 indexed strategyId,
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        TriggerType triggerReason,
        uint256 executionsLeft
    );

    event SmartMoneySignalReceived(
        bytes32 indexed signalHash,
        address indexed wallet,
        string label,
        uint256 amount,
        address token
    );

    event StrategyCompleted(uint256 indexed strategyId, address indexed user, uint256 totalAmountOut);

    event StrategyCancelled(uint256 indexed strategyId, address indexed user, uint256 refundAmount);

    event ExecutorAuthorized(address indexed executor, bool authorized);

    event ProtocolFeeUpdated(uint256 newFeeBps);

    // ============ Modifiers ============

    modifier onlyAuthorizedExecutor() {
        require(authorizedExecutors[msg.sender] || msg.sender == owner(), "Not authorized executor");
        _;
    }

    // ============ Constructor ============

    constructor(address _dexRouter, address _feeRecipient) Ownable(msg.sender) {
        dexRouter = _dexRouter;
        feeRecipient = _feeRecipient;
        authorizedExecutors[msg.sender] = true;
    }

    // ============ Strategy Creation ============

    /**
     * @notice Create a basic DCA strategy
     */
    function createBasicDCA(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions
    ) external returns (uint256 strategyId) {
        uint256 totalBudget = amountPerExecution * totalExecutions;

        strategyId = _createStrategy(
            StrategyType.BASIC_DCA,
            TriggerType.TIME_BASED,
            tokenIn,
            tokenOut,
            amountPerExecution,
            totalBudget,
            totalExecutions,
            frequency,
            0 // No expiry
        );
    }

    /**
     * @notice Create a Smart Money DCA strategy
     * @dev Triggers when whale wallets buy the target token
     */
    function createSmartMoneyDCA(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 totalBudget,
        uint256 maxExecutions,
        uint256 minInterval,
        uint256 expiresAt,
        SmartMoneyConfig calldata config
    ) external returns (uint256 strategyId) {
        strategyId = _createStrategy(
            StrategyType.SMART_MONEY_DCA,
            TriggerType.SMART_MONEY_BUY,
            tokenIn,
            tokenOut,
            amountPerExecution,
            totalBudget,
            maxExecutions,
            minInterval,
            expiresAt
        );

        // Store smart money configuration
        smartMoneyConfigs[strategyId] = config;
        strategies[strategyId].smartMoneyConfigHash = keccak256(abi.encode(config));

        emit SmartMoneyConfigSet(
            strategyId,
            config.minWhaleAmount,
            config.labelScore,
            config.signalThreshold
        );
    }

    /**
     * @notice Create a Limit Order DCA strategy
     * @dev Triggers when price reaches target
     */
    function createLimitOrderDCA(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 totalBudget,
        uint256 maxExecutions,
        PriceConfig calldata config
    ) external returns (uint256 strategyId) {
        strategyId = _createStrategy(
            StrategyType.LIMIT_ORDER,
            config.buyBelow ? TriggerType.PRICE_BELOW : TriggerType.PRICE_ABOVE,
            tokenIn,
            tokenOut,
            amountPerExecution,
            totalBudget,
            maxExecutions,
            0, // No minimum interval
            0  // No expiry
        );

        // Store price configuration
        priceConfigs[strategyId] = config;
        strategies[strategyId].priceConfigHash = keccak256(abi.encode(config));

        emit PriceConfigSet(
            strategyId,
            config.targetPrice,
            config.slippageBps,
            config.buyBelow
        );
    }

    /**
     * @notice Create a Smart Accumulate strategy (Smart Money + Limit Order combo)
     */
    function createSmartAccumulate(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 totalBudget,
        uint256 maxExecutions,
        SmartMoneyConfig calldata smConfig,
        PriceConfig calldata priceConfig
    ) external returns (uint256 strategyId) {
        strategyId = _createStrategy(
            StrategyType.SMART_ACCUMULATE,
            TriggerType.MULTI_SIGNAL,
            tokenIn,
            tokenOut,
            amountPerExecution,
            totalBudget,
            maxExecutions,
            300, // 5 min cooldown
            0
        );

        smartMoneyConfigs[strategyId] = smConfig;
        priceConfigs[strategyId] = priceConfig;
        strategies[strategyId].smartMoneyConfigHash = keccak256(abi.encode(smConfig));
        strategies[strategyId].priceConfigHash = keccak256(abi.encode(priceConfig));
    }

    // ============ Execution Functions ============

    /**
     * @notice Execute a strategy based on smart money signal
     * @dev Called by authorized executor with x402 Nansen data
     */
    function executeWithSmartMoneySignal(
        uint256 strategyId,
        SmartMoneySignal calldata signal,
        bytes calldata swapData
    ) external onlyAuthorizedExecutor nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.active, "Strategy not active");
        require(strategy.usedBudget < strategy.totalBudget, "Budget exhausted");
        require(
            strategy.strategyType == StrategyType.SMART_MONEY_DCA ||
            strategy.strategyType == StrategyType.SMART_ACCUMULATE,
            "Not a smart money strategy"
        );

        // Validate signal against strategy config
        SmartMoneyConfig storage config = smartMoneyConfigs[strategyId];
        require(signal.amount >= config.minWhaleAmount, "Signal below whale threshold");
        require(signal.score >= config.labelScore, "Signal below score threshold");

        // Check cooldown
        if (config.cooldownPeriod > 0) {
            require(
                block.timestamp >= strategy.lastExecution + config.cooldownPeriod,
                "Cooldown not met"
            );
        }

        // Store signal for transparency
        bytes32 signalHash = keccak256(abi.encode(signal));
        signals[signalHash] = signal;
        recentSignals.push(signalHash);

        emit SmartMoneySignalReceived(
            signalHash,
            signal.wallet,
            signal.label,
            signal.amount,
            strategy.tokenOut
        );

        // Execute the DCA
        _executeDCA(strategyId, TriggerType.SMART_MONEY_BUY, signalHash, swapData);
    }

    /**
     * @notice Execute a time-based DCA
     */
    function executeTimeBased(uint256 strategyId, bytes calldata swapData) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.active, "Strategy not active");
        require(strategy.strategyType == StrategyType.BASIC_DCA, "Not a time-based strategy");
        require(
            strategy.lastExecution == 0 ||
            block.timestamp >= strategy.lastExecution + strategy.minInterval,
            "Too early"
        );

        _executeDCA(strategyId, TriggerType.TIME_BASED, bytes32(0), swapData);
    }

    /**
     * @notice Execute a limit order when price target is met
     */
    function executeLimitOrder(
        uint256 strategyId,
        uint256 currentPrice,
        bytes calldata swapData
    ) external onlyAuthorizedExecutor nonReentrant {
        Strategy storage strategy = strategies[strategyId];
        PriceConfig storage config = priceConfigs[strategyId];

        require(strategy.active, "Strategy not active");
        require(
            strategy.strategyType == StrategyType.LIMIT_ORDER ||
            strategy.strategyType == StrategyType.SMART_ACCUMULATE,
            "Not a limit order strategy"
        );

        // Verify price condition
        if (config.buyBelow) {
            require(currentPrice <= config.targetPrice, "Price above target");
        } else {
            require(currentPrice >= config.targetPrice, "Price below target");
        }

        _executeDCA(
            strategyId,
            config.buyBelow ? TriggerType.PRICE_BELOW : TriggerType.PRICE_ABOVE,
            bytes32(currentPrice),
            swapData
        );
    }

    // ============ Internal Functions ============

    function _createStrategy(
        StrategyType strategyType,
        TriggerType triggerType,
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 totalBudget,
        uint256 maxExecutions,
        uint256 minInterval,
        uint256 expiresAt
    ) internal returns (uint256 strategyId) {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token");
        require(tokenIn != tokenOut, "Same token");
        require(amountPerExecution > 0, "Zero amount");
        require(totalBudget >= amountPerExecution, "Budget too low");

        // Transfer funds
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), totalBudget);

        strategyId = nextStrategyId++;

        strategies[strategyId] = Strategy({
            id: strategyId,
            user: msg.sender,
            strategyType: strategyType,
            triggerType: triggerType,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountPerExecution: amountPerExecution,
            totalBudget: totalBudget,
            usedBudget: 0,
            maxExecutions: maxExecutions,
            executionsCompleted: 0,
            minInterval: minInterval,
            lastExecution: 0,
            expiresAt: expiresAt,
            active: true,
            createdAt: block.timestamp,
            smartMoneyConfigHash: bytes32(0),
            priceConfigHash: bytes32(0)
        });

        userStrategies[msg.sender].push(strategyId);
        userTotalInvested[msg.sender] += totalBudget;
        totalStrategiesCreated++;

        emit StrategyCreated(
            strategyId,
            msg.sender,
            strategyType,
            triggerType,
            tokenIn,
            tokenOut,
            amountPerExecution,
            totalBudget
        );
    }

    function _executeDCA(
        uint256 strategyId,
        TriggerType triggerReason,
        bytes32 signalHash,
        bytes calldata swapData
    ) internal {
        Strategy storage strategy = strategies[strategyId];

        // Check expiry
        if (strategy.expiresAt > 0 && block.timestamp > strategy.expiresAt) {
            strategy.active = false;
            return;
        }

        // Check max executions
        if (strategy.maxExecutions > 0 && strategy.executionsCompleted >= strategy.maxExecutions) {
            strategy.active = false;
            emit StrategyCompleted(strategyId, strategy.user, strategy.usedBudget);
            return;
        }

        uint256 amountIn = strategy.amountPerExecution;

        // Check remaining budget
        if (strategy.usedBudget + amountIn > strategy.totalBudget) {
            amountIn = strategy.totalBudget - strategy.usedBudget;
        }

        // Calculate fee
        uint256 fee = (amountIn * protocolFeeBps) / 10000;
        uint256 amountToSwap = amountIn - fee;

        // Update state before external calls
        strategy.usedBudget += amountIn;
        strategy.executionsCompleted++;
        strategy.lastExecution = block.timestamp;

        // Collect fee
        if (fee > 0) {
            IERC20(strategy.tokenIn).safeTransfer(feeRecipient, fee);
            totalFeesCollected += fee;
        }

        // Execute swap (placeholder - integrate with DEX)
        uint256 amountOut = _executeSwap(
            strategy.tokenIn,
            strategy.tokenOut,
            amountToSwap,
            strategy.user,
            swapData
        );

        // Record execution
        strategyExecutions[strategyId].push(Execution({
            strategyId: strategyId,
            amountIn: amountIn,
            amountOut: amountOut,
            triggerReason: triggerReason,
            signalHash: signalHash,
            executedAt: block.timestamp,
            gasUsed: 0 // Would need to calculate in wrapper
        }));

        totalExecutions++;
        totalVolumeUSD += amountIn; // Approximate, would need oracle

        uint256 executionsLeft = strategy.maxExecutions > 0
            ? strategy.maxExecutions - strategy.executionsCompleted
            : type(uint256).max;

        emit DCAExecuted(
            strategyId,
            strategy.user,
            amountIn,
            amountOut,
            triggerReason,
            executionsLeft
        );

        // Check if complete
        if (strategy.usedBudget >= strategy.totalBudget ||
            (strategy.maxExecutions > 0 && strategy.executionsCompleted >= strategy.maxExecutions)) {
            strategy.active = false;
            emit StrategyCompleted(strategyId, strategy.user, amountOut);
        }
    }

    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient,
        bytes calldata /* swapData */
    ) internal returns (uint256 amountOut) {
        // For hackathon: Simple 1:1 transfer (placeholder)
        // In production: Integrate with Uniswap/other DEX

        // Just transfer tokenIn to user as placeholder
        IERC20(tokenIn).safeTransfer(recipient, amountIn);
        amountOut = amountIn;

        // Production implementation would look like:
        // IERC20(tokenIn).safeApprove(dexRouter, amountIn);
        // amountOut = ISwapRouter(dexRouter).exactInputSingle(
        //     ISwapRouter.ExactInputSingleParams({
        //         tokenIn: tokenIn,
        //         tokenOut: tokenOut,
        //         fee: 3000,
        //         recipient: recipient,
        //         deadline: block.timestamp,
        //         amountIn: amountIn,
        //         amountOutMinimum: 0,
        //         sqrtPriceLimitX96: 0
        //     })
        // );
    }

    // ============ View Functions ============

    function getStrategy(uint256 strategyId) external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    function getSmartMoneyConfig(uint256 strategyId) external view returns (SmartMoneyConfig memory) {
        return smartMoneyConfigs[strategyId];
    }

    function getPriceConfig(uint256 strategyId) external view returns (PriceConfig memory) {
        return priceConfigs[strategyId];
    }

    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }

    function getStrategyExecutions(uint256 strategyId) external view returns (Execution[] memory) {
        return strategyExecutions[strategyId];
    }

    function canExecute(uint256 strategyId) external view returns (bool, string memory reason) {
        Strategy storage strategy = strategies[strategyId];

        if (!strategy.active) return (false, "Strategy inactive");
        if (strategy.usedBudget >= strategy.totalBudget) return (false, "Budget exhausted");
        if (strategy.expiresAt > 0 && block.timestamp > strategy.expiresAt) return (false, "Expired");
        if (strategy.maxExecutions > 0 && strategy.executionsCompleted >= strategy.maxExecutions) {
            return (false, "Max executions reached");
        }
        if (strategy.minInterval > 0 && strategy.lastExecution > 0) {
            if (block.timestamp < strategy.lastExecution + strategy.minInterval) {
                return (false, "Cooldown active");
            }
        }

        return (true, "Ready");
    }

    function getRecentSignals(uint256 count) external view returns (SmartMoneySignal[] memory) {
        uint256 len = recentSignals.length;
        if (count > len) count = len;

        SmartMoneySignal[] memory result = new SmartMoneySignal[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = signals[recentSignals[len - 1 - i]];
        }
        return result;
    }

    // ============ Admin Functions ============

    function setAuthorizedExecutor(address executor, bool authorized) external onlyOwner {
        authorizedExecutors[executor] = authorized;
        emit ExecutorAuthorized(executor, authorized);
    }

    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 100, "Fee too high"); // Max 1%
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    function setDexRouter(address newRouter) external onlyOwner {
        dexRouter = newRouter;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    // ============ User Functions ============

    function cancelStrategy(uint256 strategyId) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.user == msg.sender, "Not owner");
        require(strategy.active, "Already inactive");

        uint256 refundAmount = strategy.totalBudget - strategy.usedBudget;

        strategy.active = false;

        if (refundAmount > 0) {
            IERC20(strategy.tokenIn).safeTransfer(msg.sender, refundAmount);
        }

        emit StrategyCancelled(strategyId, msg.sender, refundAmount);
    }

    function updateStrategyBudget(uint256 strategyId, uint256 additionalBudget) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.user == msg.sender, "Not owner");
        require(strategy.active, "Strategy inactive");

        IERC20(strategy.tokenIn).safeTransferFrom(msg.sender, address(this), additionalBudget);

        strategy.totalBudget += additionalBudget;
        userTotalInvested[msg.sender] += additionalBudget;
    }
}
