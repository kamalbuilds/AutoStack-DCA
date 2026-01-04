import {
  AutoStackDCA,
  Strategy,
  Execution,
  UserStats,
  GlobalStats,
} from "../generated";

// Helper function to get or create UserStats
async function getOrCreateUserStats(
  context: any,
  userAddress: string
): Promise<UserStats> {
  let userStats = await context.UserStats.get(userAddress);

  if (!userStats) {
    userStats = {
      id: userAddress,
      user: userAddress,
      totalStrategies: 0n,
      activeStrategies: 0n,
      completedStrategies: 0n,
      cancelledStrategies: 0n,
      totalExecutions: 0n,
      totalAmountIn: 0n,
      totalAmountOut: 0n,
    };
  }

  return userStats;
}

// Helper function to get or create GlobalStats
async function getOrCreateGlobalStats(context: any): Promise<GlobalStats> {
  const globalId = "global";
  let globalStats = await context.GlobalStats.get(globalId);

  if (!globalStats) {
    globalStats = {
      id: globalId,
      totalStrategies: 0n,
      activeStrategies: 0n,
      completedStrategies: 0n,
      cancelledStrategies: 0n,
      totalExecutions: 0n,
      totalAmountIn: 0n,
      totalAmountOut: 0n,
      uniqueUsers: 0n,
    };
  }

  return globalStats;
}

// StrategyCreated event handler
AutoStackDCA.StrategyCreated.handler(async ({ event, context }) => {
  const strategyId = event.params.strategyId.toString();
  const user = event.params.user.toLowerCase(); // Lowercase for consistent querying

  // Create the Strategy entity
  const strategy: Strategy = {
    id: strategyId,
    strategyId: strategyId,
    user: user,
    tokenIn: event.params.tokenIn,
    tokenOut: event.params.tokenOut,
    amountPerExecution: event.params.amountPerExecution,
    frequency: event.params.frequency,
    totalExecutions: event.params.totalExecutions,
    executionsCompleted: 0n,
    totalAmountIn: 0n,
    totalAmountOut: 0n,
    status: "ACTIVE",
    createdAt: BigInt(event.block.timestamp),
    createdAtBlock: BigInt(event.block.number),
    completedAt: undefined,
    cancelledAt: undefined,
  };

  context.Strategy.set(strategy);

  // Update UserStats
  let userStats = await getOrCreateUserStats(context, user);
  const isNewUser = userStats.totalStrategies === 0n;

  userStats = {
    ...userStats,
    totalStrategies: userStats.totalStrategies + 1n,
    activeStrategies: userStats.activeStrategies + 1n,
  };
  context.UserStats.set(userStats);

  // Update GlobalStats
  let globalStats = await getOrCreateGlobalStats(context);
  globalStats = {
    ...globalStats,
    totalStrategies: globalStats.totalStrategies + 1n,
    activeStrategies: globalStats.activeStrategies + 1n,
    uniqueUsers: isNewUser
      ? globalStats.uniqueUsers + 1n
      : globalStats.uniqueUsers,
  };
  context.GlobalStats.set(globalStats);
});

// DCAExecuted event handler
AutoStackDCA.DCAExecuted.handler(async ({ event, context }) => {
  const strategyId = event.params.strategyId.toString();
  const user = event.params.user.toLowerCase();
  const amountIn = event.params.amountIn;
  const amountOut = event.params.amountOut;

  // Create Execution entity - use block number and logIndex for unique ID
  const executionId = `${event.block.number}-${event.logIndex}`;
  const execution: Execution = {
    id: executionId,
    strategy_id: strategyId,
    strategyId: strategyId,
    user: user,
    amountIn: amountIn,
    amountOut: amountOut,
    executionsLeft: event.params.executionsLeft,
    executedAt: BigInt(event.block.timestamp),
    executedAtBlock: BigInt(event.block.number),
    transactionHash: `${event.block.hash}`,
  };

  context.Execution.set(execution);

  // Update Strategy entity
  let strategy = await context.Strategy.get(strategyId);
  if (strategy) {
    strategy = {
      ...strategy,
      executionsCompleted: strategy.executionsCompleted + 1n,
      totalAmountIn: strategy.totalAmountIn + amountIn,
      totalAmountOut: strategy.totalAmountOut + amountOut,
    };
    context.Strategy.set(strategy);
  }

  // Update UserStats
  let userStats = await getOrCreateUserStats(context, user);
  userStats = {
    ...userStats,
    totalExecutions: userStats.totalExecutions + 1n,
    totalAmountIn: userStats.totalAmountIn + amountIn,
    totalAmountOut: userStats.totalAmountOut + amountOut,
  };
  context.UserStats.set(userStats);

  // Update GlobalStats
  let globalStats = await getOrCreateGlobalStats(context);
  globalStats = {
    ...globalStats,
    totalExecutions: globalStats.totalExecutions + 1n,
    totalAmountIn: globalStats.totalAmountIn + amountIn,
    totalAmountOut: globalStats.totalAmountOut + amountOut,
  };
  context.GlobalStats.set(globalStats);
});

// StrategyCompleted event handler
AutoStackDCA.StrategyCompleted.handler(async ({ event, context }) => {
  const strategyId = event.params.strategyId.toString();
  const user = event.params.user.toLowerCase();

  // Update Strategy entity
  let strategy = await context.Strategy.get(strategyId);
  if (strategy) {
    strategy = {
      ...strategy,
      status: "COMPLETED",
      completedAt: BigInt(event.block.timestamp),
    };
    context.Strategy.set(strategy);
  }

  // Update UserStats
  let userStats = await getOrCreateUserStats(context, user);
  userStats = {
    ...userStats,
    activeStrategies: userStats.activeStrategies - 1n,
    completedStrategies: userStats.completedStrategies + 1n,
  };
  context.UserStats.set(userStats);

  // Update GlobalStats
  let globalStats = await getOrCreateGlobalStats(context);
  globalStats = {
    ...globalStats,
    activeStrategies: globalStats.activeStrategies - 1n,
    completedStrategies: globalStats.completedStrategies + 1n,
  };
  context.GlobalStats.set(globalStats);
});

// StrategyCancelled event handler
AutoStackDCA.StrategyCancelled.handler(async ({ event, context }) => {
  const strategyId = event.params.strategyId.toString();
  const user = event.params.user.toLowerCase();

  // Update Strategy entity
  let strategy = await context.Strategy.get(strategyId);
  if (strategy) {
    strategy = {
      ...strategy,
      status: "CANCELLED",
      cancelledAt: BigInt(event.block.timestamp),
    };
    context.Strategy.set(strategy);
  }

  // Update UserStats
  let userStats = await getOrCreateUserStats(context, user);
  userStats = {
    ...userStats,
    activeStrategies: userStats.activeStrategies - 1n,
    cancelledStrategies: userStats.cancelledStrategies + 1n,
  };
  context.UserStats.set(userStats);

  // Update GlobalStats
  let globalStats = await getOrCreateGlobalStats(context);
  globalStats = {
    ...globalStats,
    activeStrategies: globalStats.activeStrategies - 1n,
    cancelledStrategies: globalStats.cancelledStrategies + 1n,
  };
  context.GlobalStats.set(globalStats);
});
