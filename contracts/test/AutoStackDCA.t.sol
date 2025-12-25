// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AutoStackDCA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract AutoStackDCATest is Test {
    AutoStackDCA public autoStackDCA;
    MockERC20 public tokenIn;
    MockERC20 public tokenOut;

    address public user = address(0x1);
    address public executor = address(0x2);

    uint256 public constant AMOUNT_PER_EXECUTION = 100e18;
    uint256 public constant FREQUENCY = 1 days;
    uint256 public constant TOTAL_EXECUTIONS = 5;

    function setUp() public {
        autoStackDCA = new AutoStackDCA();
        tokenIn = new MockERC20("Token In", "TIN");
        tokenOut = new MockERC20("Token Out", "TOUT");

        // Mint tokens to user
        tokenIn.mint(user, 1000e18);

        // Approve contract to spend user's tokens
        vm.prank(user);
        tokenIn.approve(address(autoStackDCA), type(uint256).max);
    }

    function test_CreateStrategy() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        assertEq(strategyId, 0);

        AutoStackDCA.Strategy memory strategy = autoStackDCA.getStrategy(strategyId);
        assertEq(strategy.user, user);
        assertEq(strategy.tokenIn, address(tokenIn));
        assertEq(strategy.tokenOut, address(tokenOut));
        assertEq(strategy.amountPerExecution, AMOUNT_PER_EXECUTION);
        assertEq(strategy.frequency, FREQUENCY);
        assertEq(strategy.executionsLeft, TOTAL_EXECUTIONS);
        assertTrue(strategy.active);
    }

    function test_ExecuteDCA() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        // First execution should work immediately
        autoStackDCA.executeDCA(strategyId);

        AutoStackDCA.Strategy memory strategy = autoStackDCA.getStrategy(strategyId);
        assertEq(strategy.executionsLeft, TOTAL_EXECUTIONS - 1);
    }

    function test_ExecuteDCA_TooEarly() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        // First execution
        autoStackDCA.executeDCA(strategyId);

        // Second execution too early should fail
        vm.expectRevert("Too early to execute");
        autoStackDCA.executeDCA(strategyId);
    }

    function test_ExecuteDCA_AfterFrequency() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        // First execution
        autoStackDCA.executeDCA(strategyId);

        // Warp time forward
        vm.warp(block.timestamp + FREQUENCY);

        // Second execution should work
        autoStackDCA.executeDCA(strategyId);

        AutoStackDCA.Strategy memory strategy = autoStackDCA.getStrategy(strategyId);
        assertEq(strategy.executionsLeft, TOTAL_EXECUTIONS - 2);
    }

    function test_CancelStrategy() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        uint256 balanceBefore = tokenIn.balanceOf(user);

        vm.prank(user);
        autoStackDCA.cancelStrategy(strategyId);

        AutoStackDCA.Strategy memory strategy = autoStackDCA.getStrategy(strategyId);
        assertFalse(strategy.active);
        assertEq(strategy.executionsLeft, 0);

        // User should get refund
        uint256 balanceAfter = tokenIn.balanceOf(user);
        assertEq(balanceAfter - balanceBefore, AMOUNT_PER_EXECUTION * TOTAL_EXECUTIONS);
    }

    function test_CancelStrategy_NotOwner() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        vm.prank(executor);
        vm.expectRevert("Not strategy owner");
        autoStackDCA.cancelStrategy(strategyId);
    }

    function test_CanExecute() public {
        vm.prank(user);
        uint256 strategyId = autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            TOTAL_EXECUTIONS
        );

        assertTrue(autoStackDCA.canExecute(strategyId));

        autoStackDCA.executeDCA(strategyId);

        assertFalse(autoStackDCA.canExecute(strategyId));

        vm.warp(block.timestamp + FREQUENCY);
        assertTrue(autoStackDCA.canExecute(strategyId));
    }

    function test_GetUserStrategies() public {
        vm.startPrank(user);

        autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            2
        );

        autoStackDCA.createStrategy(
            address(tokenIn),
            address(tokenOut),
            AMOUNT_PER_EXECUTION,
            FREQUENCY,
            2
        );

        vm.stopPrank();

        uint256[] memory strategies = autoStackDCA.getUserStrategies(user);
        assertEq(strategies.length, 2);
        assertEq(strategies[0], 0);
        assertEq(strategies[1], 1);
    }
}
