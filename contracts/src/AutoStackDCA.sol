// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AutoStackDCA
 * @notice Automated Dollar Cost Averaging (DCA) contract for token purchases
 * @dev Allows users to create recurring DCA strategies
 */
contract AutoStackDCA is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Strategy {
        address user;
        address tokenIn;      // Token to spend (e.g., USDC)
        address tokenOut;     // Token to receive (e.g., WETH)
        uint256 amountPerExecution;  // Amount of tokenIn per DCA execution
        uint256 frequency;    // Time between executions in seconds
        uint256 executionsLeft;  // Number of DCA executions remaining
        uint256 lastExecution;   // Timestamp of last execution
        bool active;          // Strategy status
    }

    // Strategy ID counter
    uint256 public nextStrategyId;

    // Mapping from strategy ID to Strategy
    mapping(uint256 => Strategy) public strategies;

    // Mapping from user to their strategy IDs
    mapping(address => uint256[]) public userStrategies;

    // Events
    event StrategyCreated(
        uint256 indexed strategyId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions
    );

    event DCAExecuted(
        uint256 indexed strategyId,
        address indexed user,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionsLeft
    );

    event StrategyCompleted(uint256 indexed strategyId, address indexed user);

    event StrategyCancelled(uint256 indexed strategyId, address indexed user);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new DCA strategy
     * @param tokenIn Address of token to spend
     * @param tokenOut Address of token to receive
     * @param amountPerExecution Amount of tokenIn per execution
     * @param frequency Time between executions in seconds
     * @param totalExecutions Total number of DCA executions
     * @return strategyId The ID of the created strategy
     */
    function createStrategy(
        address tokenIn,
        address tokenOut,
        uint256 amountPerExecution,
        uint256 frequency,
        uint256 totalExecutions
    ) external returns (uint256 strategyId) {
        require(tokenIn != address(0), "Invalid tokenIn address");
        require(tokenOut != address(0), "Invalid tokenOut address");
        require(tokenIn != tokenOut, "Tokens must be different");
        require(amountPerExecution > 0, "Amount must be greater than 0");
        require(frequency >= 60, "Frequency must be at least 60 seconds");
        require(totalExecutions > 0, "Must have at least 1 execution");

        // Calculate total amount needed
        uint256 totalAmount = amountPerExecution * totalExecutions;

        // Transfer total amount from user to contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), totalAmount);

        strategyId = nextStrategyId++;

        strategies[strategyId] = Strategy({
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountPerExecution: amountPerExecution,
            frequency: frequency,
            executionsLeft: totalExecutions,
            lastExecution: 0,  // Allow immediate first execution
            active: true
        });

        userStrategies[msg.sender].push(strategyId);

        emit StrategyCreated(
            strategyId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountPerExecution,
            frequency,
            totalExecutions
        );
    }

    /**
     * @notice Execute a DCA for a given strategy
     * @dev Can be called by anyone (for automation) but only if conditions are met
     * @param strategyId The ID of the strategy to execute
     */
    function executeDCA(uint256 strategyId) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.active, "Strategy is not active");
        require(strategy.executionsLeft > 0, "No executions left");
        require(
            strategy.lastExecution == 0 || block.timestamp >= strategy.lastExecution + strategy.frequency,
            "Too early to execute"
        );

        // Update state before external calls
        strategy.executionsLeft--;
        strategy.lastExecution = block.timestamp;

        uint256 amountIn = strategy.amountPerExecution;

        // Simple token transfer for now (will add DEX swap later)
        // For hackathon: Just transfer tokenIn to user as a placeholder
        // In production, this would swap via a DEX
        uint256 amountOut = amountIn;  // 1:1 placeholder ratio

        // Transfer tokenOut to user (assumes contract has tokenOut balance)
        // NOTE: For hackathon demo, we'll just transfer tokenIn back as tokenOut placeholder
        // In production, integrate with Uniswap/other DEX
        IERC20(strategy.tokenIn).safeTransfer(strategy.user, amountIn);

        emit DCAExecuted(
            strategyId,
            strategy.user,
            amountIn,
            amountOut,
            strategy.executionsLeft
        );

        // Check if strategy is complete
        if (strategy.executionsLeft == 0) {
            strategy.active = false;
            emit StrategyCompleted(strategyId, strategy.user);
        }
    }

    /**
     * @notice Cancel a DCA strategy and refund remaining tokens
     * @param strategyId The ID of the strategy to cancel
     */
    function cancelStrategy(uint256 strategyId) external nonReentrant {
        Strategy storage strategy = strategies[strategyId];

        require(strategy.user == msg.sender, "Not strategy owner");
        require(strategy.active, "Strategy already inactive");

        // Calculate refund amount
        uint256 refundAmount = strategy.amountPerExecution * strategy.executionsLeft;

        // Update state before external calls
        strategy.active = false;
        strategy.executionsLeft = 0;

        // Refund remaining tokens
        if (refundAmount > 0) {
            IERC20(strategy.tokenIn).safeTransfer(msg.sender, refundAmount);
        }

        emit StrategyCancelled(strategyId, msg.sender);
    }

    /**
     * @notice Get all strategy IDs for a user
     * @param user The user address
     * @return Array of strategy IDs
     */
    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }

    /**
     * @notice Get strategy details
     * @param strategyId The strategy ID
     * @return Strategy struct
     */
    function getStrategy(uint256 strategyId) external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    /**
     * @notice Check if a strategy can be executed
     * @param strategyId The strategy ID
     * @return canExecute Boolean indicating if execution is possible
     */
    function canExecute(uint256 strategyId) external view returns (bool) {
        Strategy storage strategy = strategies[strategyId];
        return strategy.active &&
               strategy.executionsLeft > 0 &&
               (strategy.lastExecution == 0 || block.timestamp >= strategy.lastExecution + strategy.frequency);
    }

    /**
     * @notice Emergency withdraw function for owner
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
