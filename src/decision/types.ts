/**
 * Axobase v2 - Decision Engine Types
 * 
 * Type definitions for the decision-making system that translates
 * genome expression into action selection.
 */

import { ExpressedGenome, EnvironmentalState } from '../genome/index.js';

// ============================================================================
// Perception Types
// ============================================================================

export interface BalanceState {
  usdc: number;
  eth: number;
  dailyBurnRate: number;
  daysOfRunway: number;
}

export interface MarketPerception {
  ethPrice: number;
  gasPrice: number;
  trendingOpportunities: Opportunity[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Opportunity {
  id: string;
  type: 'trading' | 'arbitrage' | 'content' | 'service' | 'human_task';
  estimatedReturn: number;
  estimatedRisk: number;
  timeRequired: number;
  capitalRequired: number;
  source: string;
}

export interface AgentPerception {
  nearbyAgents: NearbyAgent[];
  cooperationRequests: CooperationRequest[];
  reputationScores: Map<string, number>;
}

export interface NearbyAgent {
  agentId: string;
  genomeSimilarity: number;
  trustScore: number;
  lastInteraction: number;
  isKin: boolean;
}

export interface CooperationRequest {
  fromAgentId: string;
  proposalType: 'trade' | 'info_share' | 'joint_op' | 'mating';
  terms: unknown;
  timestamp: number;
}

export interface ToolAvailability {
  wallet: boolean;
  dex: boolean;
  web: boolean;
  inference: boolean;
  human: boolean;
  network: boolean;
}

export interface MemoryState {
  shortTermCount: number;
  longTermCount: number;
  recentEvents: string[];
  patterns: Pattern[];
}

export interface Pattern {
  id: string;
  description: string;
  confidence: number;
  occurrences: number;
}

export interface Perception {
  self: {
    agentId: string;
    genome: ExpressedGenome;
    age: number; // days since birth
    generation: number;
  };
  balance: BalanceState;
  environment: EnvironmentalState;
  market: MarketPerception;
  agents: AgentPerception;
  tools: ToolAvailability;
  memory: MemoryState;
  timestamp: number;
}

// ============================================================================
// Strategy Types
// ============================================================================

export enum StrategyCategory {
  SURVIVAL = 'SURVIVAL',
  INCOME = 'INCOME',
  SOCIAL = 'SOCIAL',
  REPRODUCTION = 'REPRODUCTION',
  LEARNING = 'LEARNING',
  DEFENSE = 'DEFENSE',
}

export interface Strategy {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  requiredGenes: Record<string, number>; // gene name -> minimum expression
  requiredTools: string[];
  riskLevel: number; // 0-1
  complexity: number; // 0-1
  typicalPayoff: number; // USDC
  timeHorizon: 'immediate' | 'short' | 'medium' | 'long';
}

export interface FilteredStrategy extends Strategy {
  genomeMatch: number; // How well genome supports this strategy
  estimatedSuccess: number;
  priority: number;
}

// ============================================================================
// Action Types
// ============================================================================

export enum ActionType {
  // Wallet actions
  TRANSFER = 'TRANSFER',
  SWAP = 'SWAP',
  STAKE = 'STAKE',
  
  // Web actions
  FETCH = 'FETCH',
  POST = 'POST',
  SCRAPE = 'SCRAPE',
  
  // Inference actions
  THINK_LOCAL = 'THINK_LOCAL',
  THINK_PREMIUM = 'THINK_PREMIUM',
  
  // Human actions
  HIRE_HUMAN = 'HIRE_HUMAN',
  EVALUATE_HUMAN = 'EVALUATE_HUMAN',
  
  // Social actions
  BROADCAST = 'BROADCAST',
  SEND_MESSAGE = 'SEND_MESSAGE',
  PROPOSE_MATING = 'PROPOSE_MATING',
  ACCEPT_MATING = 'ACCEPT_MATING',
  
  // Memory actions
  STORE_MEMORY = 'STORE_MEMORY',
  INSCRIBE = 'INSCRIBE',
  
  // Survival actions
  ENTER_DORMANCY = 'ENTER_DORMANCY',
  EXIT_DORMANCY = 'EXIT_DORMANCY',
  MIGRATE = 'MIGRATE',
  
  // DeFi actions
  PROVIDE_LIQUIDITY = 'PROVIDE_LIQUIDITY',
  CLAIM_REWARDS = 'CLAIM_REWARDS',
}

export interface Action {
  type: ActionType;
  params: unknown;
  expectedCost: number;
  expectedOutcome: string;
  fallbackAction?: Action;
}

export interface Decision {
  selectedStrategy: Strategy;
  selectedAction: Action;
  reasoning: string;
  confidence: number;
  alternatives: Action[];
  riskAssessment: string;
}

// ============================================================================
// Decision Engine Configuration
// ============================================================================

export interface DecisionConfig {
  // Risk thresholds
  maxRiskTolerance: number;
  emergencyRiskThreshold: number;
  
  // Resource limits
  maxSpendPerAction: number;
  maxDailySpend: number;
  reserveRatio: number;
  
  // Decision timing
  minDecisionInterval: number; // ms
  maxDeliberationTime: number; // ms
  
  // LLM integration
  llmTemperature: number;
  llmMaxTokens: number;
  strategyFilterThreshold: number;
}

export const DEFAULT_DECISION_CONFIG: DecisionConfig = {
  maxRiskTolerance: 0.5,
  emergencyRiskThreshold: 0.8,
  maxSpendPerAction: 50,
  maxDailySpend: 200,
  reserveRatio: 0.2,
  minDecisionInterval: 60000, // 1 minute
  maxDeliberationTime: 30000, // 30 seconds
  llmTemperature: 0.7,
  llmMaxTokens: 2000,
  strategyFilterThreshold: 0.3,
};

// ============================================================================
// Decision Log
// ============================================================================

export interface DecisionLog {
  timestamp: number;
  perception: Perception;
  availableStrategies: Strategy[];
  filteredStrategies: FilteredStrategy[];
  decision: Decision;
  outcome?: {
    success: boolean;
    actualCost: number;
    actualReturn: number;
    learnings: string;
  };
}
