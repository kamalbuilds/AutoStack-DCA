import { ethers } from 'ethers';
import cron from 'node-cron';
import { GraphQLClient, gql } from 'graphql-request';
import { config, validateConfig } from './config.js';
import { DCA_ABI } from './abi.js';

// Initialize provider and wallet
let provider;
let wallet;
let contract;
let graphqlClient;

function init() {
  validateConfig();

  provider = new ethers.JsonRpcProvider(config.rpcUrl);
  wallet = new ethers.Wallet(config.privateKey, provider);
  contract = new ethers.Contract(config.contractAddress, DCA_ABI, wallet);
  graphqlClient = new GraphQLClient(config.envioGraphqlUrl);

  console.log(`Worker wallet address: ${wallet.address}`);
}

// Query for active strategies that are due for execution
const GET_DUE_STRATEGIES = gql`
  query GetDueStrategies($currentTime: numeric!) {
    Strategy(
      where: {
        active: { _eq: true },
        nextExecution: { _lte: $currentTime }
      }
    ) {
      id
      owner
      sourceToken
      targetToken
      amount
      interval
      lastExecution
      nextExecution
    }
  }
`;

async function fetchDueStrategies() {
  const currentTime = Math.floor(Date.now() / 1000);

  try {
    const data = await graphqlClient.request(GET_DUE_STRATEGIES, {
      currentTime: currentTime.toString()
    });
    return data.Strategy || [];
  } catch (error) {
    console.error('Error fetching strategies from Envio:', error.message);
    return [];
  }
}

async function executeDCA(strategyId) {
  try {
    console.log(`Executing DCA for strategy ${strategyId}...`);

    const tx = await contract.executeDCA(strategyId);
    console.log(`  Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`  Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error(`  Error executing strategy ${strategyId}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runWorker() {
  console.log(`\n[${new Date().toISOString()}] Checking for due strategies...`);

  const strategies = await fetchDueStrategies();

  if (strategies.length === 0) {
    console.log('No strategies due for execution');
    return;
  }

  console.log(`Found ${strategies.length} strategies due for execution`);

  for (const strategy of strategies) {
    console.log(`\nStrategy ${strategy.id}:`);
    console.log(`  Owner: ${strategy.owner}`);
    console.log(`  Source Token: ${strategy.sourceToken}`);
    console.log(`  Target Token: ${strategy.targetToken}`);
    console.log(`  Amount: ${strategy.amount}`);

    const result = await executeDCA(strategy.id);

    if (result.success) {
      console.log(`  Successfully executed!`);
    } else {
      console.log(`  Failed: ${result.error}`);
    }

    // Small delay between executions to avoid nonce issues
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Main entry point
async function main() {
  console.log('=================================');
  console.log('  AutoStack DCA Worker Starting  ');
  console.log('=================================\n');

  init();

  // Run immediately on startup
  await runWorker();

  // Schedule to run every minute
  cron.schedule('* * * * *', async () => {
    await runWorker();
  });

  console.log('\nWorker scheduled to run every minute');
  console.log('Press Ctrl+C to stop\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
