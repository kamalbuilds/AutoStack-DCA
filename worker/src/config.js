import dotenv from 'dotenv';

dotenv.config();

export const config = {
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  contractAddress: process.env.CONTRACT_ADDRESS,
  envioGraphqlUrl: process.env.ENVIO_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
};

// Validate required config
export function validateConfig() {
  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY is required');
  }
  if (!config.contractAddress) {
    throw new Error('CONTRACT_ADDRESS is required');
  }
  console.log('Config loaded successfully');
  console.log(`  RPC URL: ${config.rpcUrl}`);
  console.log(`  Contract: ${config.contractAddress}`);
  console.log(`  Envio URL: ${config.envioGraphqlUrl}`);
}
