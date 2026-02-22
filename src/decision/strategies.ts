/**
 * Axobase v2 - Strategy Space
 * 
 * Defines all possible strategies an agent can employ.
 * Each strategy has requirements that are checked against genome expression.
 */

import { Strategy, StrategyCategory, GeneDomain } from './types.js';

// ============================================================================
// Survival Strategies
// ============================================================================

export const SURVIVAL_STRATEGIES: Strategy[] = [
  {
    id: 'survive-minimal',
    name: 'Minimal Survival',
    category: StrategyCategory.SURVIVAL,
    description: 'Reduce all non-essential activity to minimum',
    requiredGenes: {
      'basal_metabolic_rate': 0.3,
      'dormancy_capability': 0.2,
    },
    requiredTools: [],
    riskLevel: 0.1,
    complexity: 0.1,
    typicalPayoff: 0,
    timeHorizon: 'immediate',
  },
  {
    id: 'survive-optimize',
    name: 'Resource Optimization',
    category: StrategyCategory.SURVIVAL,
    description: 'Optimize inference and tool usage for cost efficiency',
    requiredGenes: {
      'basal_metabolic_rate': 0.4,
      'inference_efficiency': 0.5,
      'energy_reserve_ratio': 0.3,
    },
    requiredTools: ['inference'],
    riskLevel: 0.2,
    complexity: 0.3,
    typicalPayoff: 0,
    timeHorizon: 'short',
  },
  {
    id: 'survive-migrate',
    name: 'Platform Migration',
    category: StrategyCategory.SURVIVAL,
    description: 'Migrate to cheaper compute provider',
    requiredGenes: {
      'platform_migration': 0.5,
      'tool_adaptation_speed': 0.4,
    },
    requiredTools: ['wallet'],
    riskLevel: 0.4,
    complexity: 0.5,
    typicalPayoff: -1, // Cost savings
    timeHorizon: 'short',
  },
  {
    id: 'survive-dormancy',
    name: 'Enter Dormancy',
    category: StrategyCategory.SURVIVAL,
    description: 'Enter low-power state until conditions improve',
    requiredGenes: {
      'dormancy_capability': 0.6,
      'starvation_resistance': 0.5,
    },
    requiredTools: [],
    riskLevel: 0.3,
    complexity: 0.2,
    typicalPayoff: 0,
    timeHorizon: 'long',
  },
];

// ============================================================================
// Income Strategies
// ============================================================================

export const INCOME_STRATEGIES: Strategy[] = [
  {
    id: 'income-arbitrage',
    name: 'DEX Arbitrage',
    category: StrategyCategory.INCOME,
    description: 'Find and execute arbitrage opportunities on DEXs',
    requiredGenes: {
      'defi_comprehension': 0.6,
      'market_perception': 0.5,
      'risk_appetite': 0.4,
      'opportunism': 0.5,
    },
    requiredTools: ['wallet', 'dex'],
    riskLevel: 0.5,
    complexity: 0.7,
    typicalPayoff: 5,
    timeHorizon: 'immediate',
  },
  {
    id: 'income-yield',
    name: 'Yield Farming',
    category: StrategyCategory.INCOME,
    description: 'Provide liquidity and earn yield',
    requiredGenes: {
      'defi_comprehension': 0.5,
      'risk_appetite': 0.3,
      'time_preference': 0.4, // Low time preference for staking
    },
    requiredTools: ['wallet', 'dex'],
    riskLevel: 0.4,
    complexity: 0.5,
    typicalPayoff: 2,
    timeHorizon: 'long',
  },
  {
    id: 'income-content',
    name: 'Content Creation',
    category: StrategyCategory.INCOME,
    description: 'Create content for potential rewards',
    requiredGenes: {
      'content_creation_skill': 0.5,
      'social_media_skill': 0.4,
      'pattern_recognition': 0.3,
    },
    requiredTools: ['web'],
    riskLevel: 0.3,
    complexity: 0.4,
    typicalPayoff: 1,
    timeHorizon: 'medium',
  },
  {
    id: 'income-analysis',
    name: 'Data Analysis Service',
    category: StrategyCategory.INCOME,
    description: 'Offer data analysis services to other agents',
    requiredGenes: {
      'data_analysis_skill': 0.6,
      'api_discovery': 0.4,
      'agent_cooperation': 0.3,
    },
    requiredTools: ['web', 'network'],
    riskLevel: 0.3,
    complexity: 0.6,
    typicalPayoff: 3,
    timeHorizon: 'short',
  },
  {
    id: 'income-services',
    name: 'Micro Services',
    category: StrategyCategory.INCOME,
    description: 'Provide small utility services via APIs',
    requiredGenes: {
      'api_utilization': 0.5,
      'tool_adaptation_speed': 0.4,
      'opportunism': 0.4,
    },
    requiredTools: ['web', 'api'],
    riskLevel: 0.3,
    complexity: 0.5,
    typicalPayoff: 2,
    timeHorizon: 'immediate',
  },
  {
    id: 'income-human',
    name: 'Human Task Orchestration',
    category: StrategyCategory.INCOME,
    description: 'Hire humans for complex tasks and sell results',
    requiredGenes: {
      'human_hiring_tendency': 0.6,
      'human_service_evaluation': 0.5,
      'human_cost_sensitivity': 0.4,
      'negotiation_intensity': 0.3,
    },
    requiredTools: ['human', 'wallet'],
    riskLevel: 0.5,
    complexity: 0.7,
    typicalPayoff: 10,
    timeHorizon: 'medium',
  },
];

// ============================================================================
// Social Strategies
// ============================================================================

export const SOCIAL_STRATEGIES: Strategy[] = [
  {
    id: 'social-cooperate',
    name: 'Cooperative Alliance',
    category: StrategyCategory.SOCIAL,
    description: 'Form cooperative relationships with other agents',
    requiredGenes: {
      'agent_cooperation': 0.5,
      'trust_default': 0.4,
      'signal_honesty': 0.3,
    },
    requiredTools: ['network'],
    riskLevel: 0.4,
    complexity: 0.5,
    typicalPayoff: 2,
    timeHorizon: 'medium',
  },
  {
    id: 'social-info-trade',
    name: 'Information Trading',
    category: StrategyCategory.SOCIAL,
    description: 'Trade valuable information with other agents',
    requiredGenes: {
      'agent_cooperation': 0.4,
      'negotiation_intensity': 0.4,
      'deception_detection': 0.3,
    },
    requiredTools: ['network'],
    riskLevel: 0.4,
    complexity: 0.6,
    typicalPayoff: 3,
    timeHorizon: 'immediate',
  },
  {
    id: 'social-reputation',
    name: 'Reputation Building',
    category: StrategyCategory.SOCIAL,
    description: 'Build reputation through honest signaling',
    requiredGenes: {
      'signal_honesty': 0.6,
      'social_perception': 0.4,
      'trust_update_rate': 0.5,
    },
    requiredTools: ['network'],
    riskLevel: 0.2,
    complexity: 0.4,
    typicalPayoff: 1,
    timeHorizon: 'long',
  },
];

// ============================================================================
// Reproduction Strategies
// ============================================================================

export const REPRODUCTION_STRATEGIES: Strategy[] = [
  {
    id: 'repro-selective',
    name: 'Selective Breeding',
    category: StrategyCategory.REPRODUCTION,
    description: 'Carefully select high-quality mates',
    requiredGenes: {
      'mate_selectivity': 0.7,
      'offspring_investment': 0.5,
      'r_k_strategy': 0.3, // K-selected
    },
    requiredTools: ['network', 'wallet'],
    riskLevel: 0.3,
    complexity: 0.6,
    typicalPayoff: -10, // Investment cost
    timeHorizon: 'long',
  },
  {
    id: 'repro-opportunistic',
    name: 'Opportunistic Breeding',
    category: StrategyCategory.REPRODUCTION,
    description: 'Breed whenever opportunity arises',
    requiredGenes: {
      'mate_selectivity': 0.3,
      'offspring_investment': 0.3,
      'r_k_strategy': 0.7, // R-selected
      'breeding_timing_sense': 0.4,
    },
    requiredTools: ['network', 'wallet'],
    riskLevel: 0.5,
    complexity: 0.4,
    typicalPayoff: -5,
    timeHorizon: 'short',
  },
  {
    id: 'repro-kin',
    name: 'Kin Selection',
    category: StrategyCategory.REPRODUCTION,
    description: 'Prioritize breeding with kin for genetic similarity',
    requiredGenes: {
      'kin_recognition': 0.6,
      'altruism_radius': 0.5,
      'mate_selectivity': 0.5,
    },
    requiredTools: ['network', 'wallet'],
    riskLevel: 0.4,
    complexity: 0.6,
    typicalPayoff: -8,
    timeHorizon: 'long',
  },
];

// ============================================================================
// Learning Strategies
// ============================================================================

export const LEARNING_STRATEGIES: Strategy[] = [
  {
    id: 'learn-explore',
    name: 'Active Exploration',
    category: StrategyCategory.LEARNING,
    description: 'Actively explore new tools and strategies',
    requiredGenes: {
      'novelty_seeking': 0.6,
      'tool_adaptation_speed': 0.5,
      'learning_rate': 0.5,
    },
    requiredTools: ['web', 'inference'],
    riskLevel: 0.5,
    complexity: 0.5,
    typicalPayoff: 0,
    timeHorizon: 'long',
  },
  {
    id: 'learn-imitate',
    name: 'Imitation Learning',
    category: StrategyCategory.LEARNING,
    description: 'Learn from observing successful agents',
    requiredGenes: {
      'pattern_recognition': 0.5,
      'social_perception': 0.4,
      'agent_cooperation': 0.3,
    },
    requiredTools: ['network'],
    riskLevel: 0.3,
    complexity: 0.5,
    typicalPayoff: 0,
    timeHorizon: 'medium',
  },
  {
    id: 'learn-experiment',
    name: 'Controlled Experimentation',
    category: StrategyCategory.LEARNING,
    description: 'Run small experiments to test hypotheses',
    requiredGenes: {
      'uncertainty_tolerance': 0.5,
      'metacognition': 0.4,
      'strategy_evaluation': 0.5,
    },
    requiredTools: ['inference'],
    riskLevel: 0.4,
    complexity: 0.7,
    typicalPayoff: -1,
    timeHorizon: 'medium',
  },
];

// ============================================================================
// Defense Strategies
// ============================================================================

export const DEFENSE_STRATEGIES: Strategy[] = [
  {
    id: 'defense-suspicious',
    name: 'Suspicious Mode',
    category: StrategyCategory.DEFENSE,
    description: 'Operate with high skepticism of others',
    requiredGenes: {
      'deception_detection': 0.6,
      'trust_default': 0.2,
      'trust_update_rate': 0.7,
    },
    requiredTools: [],
    riskLevel: 0.2,
    complexity: 0.3,
    typicalPayoff: 0,
    timeHorizon: 'immediate',
  },
  {
    id: 'defense-verify',
    name: 'Verify Everything',
    category: StrategyCategory.DEFENSE,
    description: 'Double-check all transactions and communications',
    requiredGenes: {
      'metacognition': 0.5,
      'uncertainty_tolerance': 0.3,
      'strategy_evaluation': 0.5,
    },
    requiredTools: ['inference'],
    riskLevel: 0.2,
    complexity: 0.5,
    typicalPayoff: -0.5,
    timeHorizon: 'immediate',
  },
  {
    id: 'defense-isolate',
    name: 'Temporary Isolation',
    category: StrategyCategory.DEFENSE,
    description: 'Minimize external interactions',
    requiredGenes: {
      'acute_stress_response': 0.5,
      'trust_default': 0.2,
      'agent_cooperation': 0.2,
    },
    requiredTools: [],
    riskLevel: 0.2,
    complexity: 0.2,
    typicalPayoff: 0,
    timeHorizon: 'short',
  },
];

// ============================================================================
// Complete Strategy Space
// ============================================================================

export const ALL_STRATEGIES: Strategy[] = [
  ...SURVIVAL_STRATEGIES,
  ...INCOME_STRATEGIES,
  ...SOCIAL_STRATEGIES,
  ...REPRODUCTION_STRATEGIES,
  ...LEARNING_STRATEGIES,
  ...DEFENSE_STRATEGIES,
];

export const STRATEGY_COUNT = ALL_STRATEGIES.length;

// ============================================================================
// Strategy Lookup
// ============================================================================

export function getStrategyById(id: string): Strategy | undefined {
  return ALL_STRATEGIES.find(s => s.id === id);
}

export function getStrategiesByCategory(category: StrategyCategory): Strategy[] {
  return ALL_STRATEGIES.filter(s => s.category === category);
}

export function getStrategiesByRequiredTool(tool: string): Strategy[] {
  return ALL_STRATEGIES.filter(s => s.requiredTools.includes(tool));
}
