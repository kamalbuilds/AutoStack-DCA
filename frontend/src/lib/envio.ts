import { GraphQLClient, gql } from 'graphql-request'

// Envio GraphQL endpoint - update this with your actual Envio endpoint
const ENVIO_ENDPOINT = process.env.NEXT_PUBLIC_ENVIO_ENDPOINT || 'http://localhost:8080/v1/graphql'

export const envioClient = new GraphQLClient(ENVIO_ENDPOINT)

// Types for GraphQL responses (matching schema.graphql)
export interface Strategy {
  id: string
  strategyId: string
  user: string
  tokenIn: string
  tokenOut: string
  amountPerExecution: string
  frequency: string
  totalExecutions: string
  executionsCompleted: string
  totalAmountIn: string
  totalAmountOut: string
  status: string
  createdAt: string
  createdAtBlock: string
  completedAt: string | null
  cancelledAt: string | null
  // Computed for compatibility
  isActive?: boolean
}

export interface Execution {
  id: string
  strategyId: string
  user: string
  amountIn: string
  amountOut: string
  executionsLeft: string
  executedAt: string
  executedAtBlock: string
  transactionHash: string
  // Computed for compatibility
  executionNumber?: string
}

// GraphQL Queries - matching actual Envio schema
export const GET_USER_STRATEGIES = gql`
  query GetUserStrategies($user: String!) {
    Strategy(where: { user: { _eq: $user } }, order_by: { createdAt: desc }) {
      id
      strategyId
      user
      tokenIn
      tokenOut
      amountPerExecution
      frequency
      totalExecutions
      executionsCompleted
      totalAmountIn
      totalAmountOut
      status
      createdAt
      createdAtBlock
      completedAt
      cancelledAt
    }
  }
`

export const GET_STRATEGY_EXECUTIONS = gql`
  query GetStrategyExecutions($strategyId: String!) {
    Execution(where: { strategyId: { _eq: $strategyId } }, order_by: { executedAt: desc }) {
      id
      strategyId
      user
      amountIn
      amountOut
      executionsLeft
      executedAt
      executedAtBlock
      transactionHash
    }
  }
`

export const GET_ALL_EXECUTIONS_BY_USER = gql`
  query GetAllExecutionsByUser($user: String!) {
    Execution(
      where: { user: { _eq: $user } }
      order_by: { executedAt: desc }
      limit: 50
    ) {
      id
      strategyId
      user
      amountIn
      amountOut
      executionsLeft
      executedAt
      executedAtBlock
      transactionHash
    }
  }
`

export const GET_USER_STATS = gql`
  query GetUserStats($user: String!) {
    Strategy_aggregate(where: { user: { _eq: $user } }) {
      aggregate {
        count
      }
    }
    Strategy_aggregate(where: { user: { _eq: $user }, status: { _eq: "ACTIVE" } }) {
      aggregate {
        count
      }
    }
    Execution_aggregate(where: { user: { _eq: $user } }) {
      aggregate {
        count
      }
    }
  }
`

// Query functions
export async function getUserStrategies(userAddress: string): Promise<Strategy[]> {
  try {
    const data = await envioClient.request<{ Strategy: Strategy[] }>(GET_USER_STRATEGIES, {
      user: userAddress.toLowerCase(),
    })
    // Add computed isActive field for backward compatibility
    return data.Strategy.map(s => ({
      ...s,
      isActive: s.status === 'ACTIVE'
    }))
  } catch (error) {
    console.error('Error fetching user strategies:', error)
    return []
  }
}

export async function getStrategyExecutions(strategyId: string): Promise<Execution[]> {
  try {
    const data = await envioClient.request<{ Execution: Execution[] }>(GET_STRATEGY_EXECUTIONS, {
      strategyId,
    })
    return data.Execution
  } catch (error) {
    console.error('Error fetching strategy executions:', error)
    return []
  }
}

export async function getAllExecutionsByUser(userAddress: string): Promise<Execution[]> {
  try {
    const data = await envioClient.request<{ Execution: Execution[] }>(GET_ALL_EXECUTIONS_BY_USER, {
      user: userAddress.toLowerCase(),
    })
    return data.Execution
  } catch (error) {
    console.error('Error fetching user executions:', error)
    return []
  }
}

export interface UserStats {
  totalStrategies: number
  activeStrategies: number
  totalExecutions: number
}

export async function getUserStats(userAddress: string): Promise<UserStats> {
  try {
    const data = await envioClient.request<{
      Strategy_aggregate: { aggregate: { count: number } }[]
      Execution_aggregate: { aggregate: { count: number } }
    }>(GET_USER_STATS, {
      user: userAddress.toLowerCase(),
    })

    return {
      totalStrategies: data.Strategy_aggregate[0]?.aggregate?.count || 0,
      activeStrategies: data.Strategy_aggregate[1]?.aggregate?.count || 0,
      totalExecutions: data.Execution_aggregate?.aggregate?.count || 0,
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      totalStrategies: 0,
      activeStrategies: 0,
      totalExecutions: 0,
    }
  }
}
