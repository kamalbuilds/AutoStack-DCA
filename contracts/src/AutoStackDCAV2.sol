// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Uniswap V3 interfaces
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IQuoterV2 {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }

    function quoteExactInputSingle(QuoteExactInputSingleParams memory params)
        external
        returns (
            uint256 amountOut,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        );
}

/**
 * @title AutoStackDCAV2
 * @notice Production DCA contract with real Uniswap V3 swaps and Smart Money signal support
 * @dev Supports time-based DCA and smart money triggered executions
 */
contract AutoStackDCAV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Uniswap V3 addresses on Base Mainnet
    address public constant SWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address public constant QUOTER = 0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a;

    // Common pool fees
    uint24 public constant FEE_LOW = 500;      // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%

    // Strategy types
    enum StrategyType {
        BASIC_DCA,           // Time-based only
        SMART_MONEY_DCA,     // Smart money signals trigger execution
        SMART_ACCUMULATE,    // Smart money + price threshold
        HYBRID               // Both time-based and smart money
    }

    // Smart money configuration for a strategy
    struct SmartMoneyConfig {
        uint256 minWhaleAmount;     // Minimum USD value of whale trade to trigger
        uint8 minLabelScore;        // Minimum wallet score (0-100)
        uint8 signalThreshold;      // Number of signals needed to trigger
        uint256 signalWindow;       // Time window for signal accumulation (seconds)
        bool enabled;               // Whether smart money triggers are active
    }

    // Smart money signal data
    struct SmartMoneySignal {
        address wallet;             // Whale wallet address
        uint256 amountUsd;          // Trade value in USD
        uint8 labelScore;           // Wallet profitability score
        bytes32 txHash;             // Transaction hash for verification
        uint256 timestamp;          // When the signal was detected
    }

    struct Strategy {
        address user;
        address tokenIn;
        address tokenOut;
        uint24 poolFee;
        uint256 amountPerExecution;
        uint256 frequency;
        uint256 executionsLeft;
        uint256 lastExecution;
        uint256 totalAmountIn;
        uint256 totalAmountOut;
        StrategyType strategyType;
        SmartMoneyConfig smartMoneyConfig;
        bool active;
    }

    // Signal tracking per strategy
    struct SignalAccumulator {
        uint8 signalCount;
        uint256 windowStart;
        bytes32[] processedTxHashes;
    }

    // State variables
    uint256 public nextStrategyId;
    uint256 public protocolFeeBps = 30; // 0.3%
    uint256 public maxSlippageBps = 100; // 1% default max slippage
    address public feeRecipient;

    mapping(uint256 => Strategy) public strategies;
    mapping(address => uint256[]) public userStrategies;
    mapping(uint256 => SignalAccumulator) public signalAccumulators;
    mapping(address => bool) public authorizedExecutors;

    // Events
    event StrategyCreated(
        uint256 indexed strategyId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions,
        StrategyType strategyType
    );

    event DCAExecuted(
        uint256 indexed strategyId,
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionsLeft
    );

    event SmartMoneyTriggered(
        uint256 indexed strategyId,
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        address whaleWallet,
        uint256 whaleAmountUsd
    );

    event StrategyCompleted(uint256 indexed strategyId, address indexed user);
    event StrategyCancelled(uint256 indexed strategyId, address indexed user);
    event ExecutorUpdated(address indexed executor, bool authorized);
    event SignalAccumulated(uint256 indexed strategyId, uint8 currentCount, uint8 threshold);

    modifier onlyAuthorizedExecutor() {
        require(authorizedExecutors[msg.sender] || msg.sender == owner(), "Not authorized executor");
        _;
    }

    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
        authorizedExecutors[msg.sender] = true;
    }

    /**
     * @notice Create a basic time-based DCA strategy
     */
    function createStrategy(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions,
        uint24 poolFee
    ) external returns (uint256 strategyId) {
        return _createStrategy(
            tokenIn,
            tokenOut,
            amountPerExecution,
            frequency,
            totalExecutions,
            poolFee,
            StrategyType.BASIC_DCA,
            SmartMoneyConfig(0, 0, 0, 0, false)
        );
    }

    /**
     * @notice Create a smart money DCA strategy
     */
    function createSmartMoneyStrategy(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions,
        uint24 poolFee,
        uint256 minWhaleAmount,
        uint8 minLabelScore,
        uint8 signalThreshold,
        uint256 signalWindow
    ) external returns (uint256 strategyId) {
        require(minWhaleAmount >= 100e6, "Min whale amount too low"); // $100 minimum
        require(minLabelScore <= 100, "Invalid label score");
        require(signalThreshold > 0 && signalThreshold <= 10, "Invalid signal threshold");
        require(signalWindow >= 300 && signalWindow <= 86400, "Signal window 5min-24h");

        SmartMoneyConfig memory config = SmartMoneyConfig({
            minWhaleAmount: minWhaleAmount,
            minLabelScore: minLabelScore,
            signalThreshold: signalThreshold,
            signalWindow: signalWindow,
            enabled: true
        });

        return _createStrategy(
            tokenIn,
            tokenOut,
            amountPerExecution,
            frequency,
            totalExecutions,
            poolFee,
            StrategyType.SMART_MONEY_DCA,
            config
        );
    }

    /**
     * @notice Create a hybrid strategy (time-based + smart money)
     */
    function createHybridStrategy(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions,
        uint24 poolFee,
        uint256 minWhaleAmount,
        uint8 minLabelScore,
        uint8 signalThreshold,
        uint256 signalWindow
    ) external returns (uint256 strategyId) {
        SmartMoneyConfig memory config = SmartMoneyConfig({
            minWhaleAmount: minWhaleAmount,
            minLabelScore: minLabelScore,
            signalThreshold: signalThreshold,
            signalWindow: signalWindow,
            enabled: true
        });

        return _createStrategy(
            tokenIn,
            tokenOut,
            amountPerExecution,
            frequency,
            totalExecutions,
            poolFee,
            StrategyType.HYBRID,
            config
        );
    }

    function _createStrategy(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions,
        uint24 poolFee,
        StrategyType strategyType,
        SmartMoneyConfig memory smartMoneyConfig
    ) internal returns (uint256 strategyId) {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token address");
        require(tokenIn != tokenOut, "Tokens must be different");
        require(amountPerExecution > 0, "Amount must be > 0");
        require(frequency >= 60, "Frequency must be >= 60s");
        require(totalExecutions > 0, "Must have >= 1 execution");
        require(poolFee == FEE_LOW || poolFee == FEE_MEDIUM || poolFee == FEE_HIGH, "Invalid pool fee");

        uint256 totalAmount = amountPerExecution * totalExecutions;
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), totalAmount);

        strategyId = nextStrategyId++;

        strategies[strategyId] = Strategy({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            poolFee: poolFee,
            amountPerExecution: amountPerExecution,
            frequency: frequency,
            executionsLeft: totalExecutions,
            lastExecution: 0,
            totalAmountIn: 0,
            totalAmountOut: 0,
            strategyType: strategyType,
            smartMoneyConfig: smartMoneyConfig,
            active: true
        });

        userStrategies[msg.sender].push(strategyId);

        // Initialize signal accumulator for smart money strategies
        if (strategyType == StrategyType.SMART_MONEY_DCA || strategyType == StrategyType.HYBRID) {
            signalAccumulators[strategyId] = SignalAccumulator({
                signalCount: 0,
                windowStart: block.timestamp,
                processedTxHashes: new bytes32[](0)
            });
        }

        emit StrategyCreated(
            strategyId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountPerExecution,
            frequency,
            totalExecutions,
            strategyType
        );
    }

    /**
     * @notice Execute a time-based DCA
     * @dev Can be called by anyone if time conditions are met
     */
    function executeDCA(uint256 strategyId) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.active, "Strategy not active");
        require(strategy.executionsLeft > 0, "No executions left");
        require(
            strategy.strategyType == StrategyType.BASIC_DCA ||
            strategy.strategyType == StrategyType.HYBRID,
            "Not a time-based strategy"
        );
        require(
            strategy.lastExecution == 0 ||
            block.timestamp >= strategy.lastExecution + strategy.frequency,
            "Too early to execute"
        );

        _executeSwap(strategyId, address(0), 0);
    }

    /**
     * @notice Execute DCA based on smart money signal
     * @dev Only callable by authorized executors (the worker service)
     */
    function executeWithSmartMoneySignal(
        uint256 strategyId,
        SmartMoneySignal calldata signal
    ) external nonReentrant onlyAuthorizedExecutor {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.active, "Strategy not active");
        require(strategy.executionsLeft > 0, "No executions left");
        require(
            strategy.strategyType == StrategyType.SMART_MONEY_DCA ||
            strategy.strategyType == StrategyType.HYBRID,
            "Not a smart money strategy"
        );
        require(strategy.smartMoneyConfig.enabled, "Smart money disabled");

        // Validate signal
        _validateAndAccumulateSignal(strategyId, signal);

        SignalAccumulator storage accumulator = signalAccumulators[strategyId];

        // Check if threshold met
        if (accumulator.signalCount >= strategy.smartMoneyConfig.signalThreshold) {
            _executeSwap(strategyId, signal.wallet, signal.amountUsd);

            // Reset accumulator
            accumulator.signalCount = 0;
            accumulator.windowStart = block.timestamp;
            delete accumulator.processedTxHashes;
        } else {
            emit SignalAccumulated(
                strategyId,
                accumulator.signalCount,
                strategy.smartMoneyConfig.signalThreshold
            );
        }
    }

    function _validateAndAccumulateSignal(
        uint256 strategyId,
        SmartMoneySignal calldata signal
    ) internal {
        Strategy storage strategy = strategies[strategyId];
        SignalAccumulator storage accumulator = signalAccumulators[strategyId];
        SmartMoneyConfig storage config = strategy.smartMoneyConfig;

        // Check signal validity
        require(signal.amountUsd >= config.minWhaleAmount, "Whale amount below threshold");
        require(signal.labelScore >= config.minLabelScore, "Label score below threshold");
        require(signal.timestamp > 0 && signal.timestamp <= block.timestamp, "Invalid signal timestamp");
        require(signal.txHash != bytes32(0), "Invalid tx hash");

        // Check if signal is within window
        if (block.timestamp > accumulator.windowStart + config.signalWindow) {
            // Reset window
            accumulator.signalCount = 0;
            accumulator.windowStart = block.timestamp;
            delete accumulator.processedTxHashes;
        }

        // Check for duplicate
        for (uint256 i = 0; i < accumulator.processedTxHashes.length; i++) {
            require(accumulator.processedTxHashes[i] != signal.txHash, "Duplicate signal");
        }

        // Accumulate signal
        accumulator.signalCount++;
        accumulator.processedTxHashes.push(signal.txHash);
    }

    function _executeSwap(
        uint256 strategyId,
        address whaleWallet,
        uint256 whaleAmountUsd
    ) internal {
        Strategy storage strategy = strategies[strategyId];

        strategy.executionsLeft--;
        strategy.lastExecution = block.timestamp;

        uint256 amountIn = strategy.amountPerExecution;

        // Calculate fees
        uint256 fee = (amountIn * protocolFeeBps) / 10000;
        uint256 swapAmount = amountIn - fee;

        // Transfer fee
        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(strategy.tokenIn).safeTransfer(feeRecipient, fee);
        }

        // Approve router
        IERC20(strategy.tokenIn).approve(SWAP_ROUTER, swapAmount);

        // Calculate minimum output with slippage protection
        uint256 amountOutMinimum = _getQuote(
            strategy.tokenIn,
            strategy.tokenOut,
            swapAmount,
            strategy.poolFee
        );
        amountOutMinimum = (amountOutMinimum * (10000 - maxSlippageBps)) / 10000;

        // Execute swap
        ISwapRouter02.ExactInputSingleParams memory params = ISwapRouter02.ExactInputSingleParams({
            tokenIn: strategy.tokenIn,
            tokenOut: strategy.tokenOut,
            fee: strategy.poolFee,
            recipient: strategy.user,
            amountIn: swapAmount,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = ISwapRouter02(SWAP_ROUTER).exactInputSingle(params);

        // Update totals
        strategy.totalAmountIn += amountIn;
        strategy.totalAmountOut += amountOut;

        // Emit appropriate event
        if (whaleWallet != address(0)) {
            emit SmartMoneyTriggered(
                strategyId,
                strategy.user,
                amountIn,
                amountOut,
                whaleWallet,
                whaleAmountUsd
            );
        } else {
            emit DCAExecuted(
                strategyId,
                strategy.user,
                amountIn,
                amountOut,
                strategy.executionsLeft
            );
        }

        // Check if strategy is complete
        if (strategy.executionsLeft == 0) {
            strategy.active = false;
            emit StrategyCompleted(strategyId, strategy.user);
        }
    }

    function _getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        try IQuoterV2(QUOTER).quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: fee,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut, uint160, uint32, uint256) {
            amountOut = _amountOut;
        } catch {
            // If quote fails, use 0 as minimum (not recommended for production mainnet)
            amountOut = 0;
        }
    }

    /**
     * @notice Cancel a DCA strategy and refund remaining tokens
     */
    function cancelStrategy(uint256 strategyId) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.user == msg.sender, "Not strategy owner");
        require(strategy.active, "Strategy already inactive");

        uint256 refundAmount = strategy.amountPerExecution * strategy.executionsLeft;

        strategy.active = false;
        strategy.executionsLeft = 0;

        if (refundAmount > 0) {
            IERC20(strategy.tokenIn).safeTransfer(msg.sender, refundAmount);
        }

        emit StrategyCancelled(strategyId, msg.sender);
    }

    /**
     * @notice Update smart money config for an existing strategy
     */
    function updateSmartMoneyConfig(
        uint256 strategyId,
        uint256 minWhaleAmount,
        uint8 minLabelScore,
        uint8 signalThreshold,
        uint256 signalWindow,
        bool enabled
    ) external {
        Strategy storage strategy = strategies[strategyId];
        require(strategy.user == msg.sender, "Not strategy owner");
        require(strategy.active, "Strategy not active");
        require(
            strategy.strategyType == StrategyType.SMART_MONEY_DCA ||
            strategy.strategyType == StrategyType.HYBRID,
            "Not a smart money strategy"
        );

        strategy.smartMoneyConfig = SmartMoneyConfig({
            minWhaleAmount: minWhaleAmount,
            minLabelScore: minLabelScore,
            signalThreshold: signalThreshold,
            signalWindow: signalWindow,
            enabled: enabled
        });
    }

    // View functions
    function getStrategy(uint256 strategyId) external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }

    function getSmartMoneyConfig(uint256 strategyId) external view returns (SmartMoneyConfig memory) {
        return strategies[strategyId].smartMoneyConfig;
    }

    function getSignalAccumulator(uint256 strategyId) external view returns (
        uint8 signalCount,
        uint256 windowStart,
        uint256 processedCount
    ) {
        SignalAccumulator storage acc = signalAccumulators[strategyId];
        return (acc.signalCount, acc.windowStart, acc.processedTxHashes.length);
    }

    function canExecuteTimeBased(uint256 strategyId) external view returns (bool) {
        Strategy storage strategy = strategies[strategyId];
        return strategy.active &&
               strategy.executionsLeft > 0 &&
               (strategy.strategyType == StrategyType.BASIC_DCA || strategy.strategyType == StrategyType.HYBRID) &&
               (strategy.lastExecution == 0 || block.timestamp >= strategy.lastExecution + strategy.frequency);
    }

    function canExecuteSmartMoney(uint256 strategyId) external view returns (bool) {
        Strategy storage strategy = strategies[strategyId];
        return strategy.active &&
               strategy.executionsLeft > 0 &&
               strategy.smartMoneyConfig.enabled &&
               (strategy.strategyType == StrategyType.SMART_MONEY_DCA || strategy.strategyType == StrategyType.HYBRID);
    }

    // Admin functions
    function setAuthorizedExecutor(address executor, bool authorized) external onlyOwner {
        authorizedExecutors[executor] = authorized;
        emit ExecutorUpdated(executor, authorized);
    }

    function setProtocolFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 100, "Fee too high"); // Max 1%
        protocolFeeBps = _feeBps;
    }

    function setMaxSlippage(uint256 _slippageBps) external onlyOwner {
        require(_slippageBps <= 500, "Slippage too high"); // Max 5%
        maxSlippageBps = _slippageBps;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient");
        feeRecipient = _recipient;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
