/**
 * Axobase v2 - Decision Engine
 * 
 * The decision-making system that translates genome expression into action.
 * 
 * Core principle: The genome filters the strategy space, and the LLM selects
 * within that constrained space. Different genomes = different behaviors.
 * 
 * @module decision
 */

// Types
export {
  Perception,
  BalanceState,
  MarketPerception,
  Opportunity,
  AgentPerception,
  MemoryState,
  Strategy,
  FilteredStrategy,
  StrategyCategory,
  Action,
  ActionType,
  Decision,
  DecisionConfig,
  DEFAULT_DECISION_CONFIG,
  DecisionLog,
} from './types.js';

// Strategies
export {
  ALL_STRATEGIES,
  SURVIVAL_STRATEGIES,
  INCOME_STRATEGIES,
  SOCIAL_STRATEGIES,
  REPRODUCTION_STRATEGIES,
  LEARNING_STRATEGIES,
  DEFENSE_STRATEGIES,
  STRATEGY_COUNT,
  getStrategyById,
  getStrategiesByCategory,
  getStrategiesByRequiredTool,
} from './strategies.js';

// Strategy Filter
export {
  filterStrategies,
  getRecommendedStrategies,
  canAttemptStrategy,
  getDominantCategories,
  FilterResult,
} from './StrategyFilter.js';

// Decision Engine
export {
  DecisionEngine,
  createDecisionEngine,
  LLMProvider,
  DecisionEngineConfig,
} from './DecisionEngine.js';
