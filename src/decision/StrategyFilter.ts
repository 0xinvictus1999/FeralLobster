/**
 * Axobase v2 - Strategy Filter
 * 
 * Filters available strategies based on genome expression.
 * This is the key mechanism that makes different genomes behave differently.
 */

import { ExpressedGenome, GeneDomain } from '../genome/index.js';
import {
  Strategy,
  FilteredStrategy,
  Perception,
  DecisionConfig,
  DEFAULT_DECISION_CONFIG,
  StrategyCategory,
} from './types.js';
import { ALL_STRATEGIES } from './strategies.js';

// ============================================================================
// Strategy Filter
// ============================================================================

export interface FilterResult {
  filtered: FilteredStrategy[];
  excluded: Strategy[];
  exclusionReasons: Map<string, string>;
}

/**
 * Filter strategies based on genome expression
 * 
 * This is the core function that determines which strategies an agent
 * can "see" and consider. Different genomes will have different
 * strategy spaces, leading to behavioral diversity.
 */
export function filterStrategies(
  genome: ExpressedGenome,
  perception: Perception,
  config: DecisionConfig = DEFAULT_DECISION_CONFIG
): FilterResult {
  const filtered: FilteredStrategy[] = [];
  const excluded: Strategy[] = [];
  const exclusionReasons = new Map<string, string>();
  
  // Build gene expression lookup
  const geneExpression = new Map<string, number>();
  for (const chr of genome.chromosomes) {
    for (const gene of chr.genes) {
      geneExpression.set(gene.name, gene.expressedValue);
    }
  }
  
  // Get domain-level expression summaries
  const domainExpression = new Map<GeneDomain, number>();
  for (const chr of genome.chromosomes) {
    for (const gene of chr.genes) {
      const current = domainExpression.get(gene.domain) || 0;
      domainExpression.set(gene.domain, Math.max(current, gene.expressedValue));
    }
  }
  
  // Calculate risk tolerance from genome
  const riskTolerance = calculateRiskTolerance(geneExpression, domainExpression);
  const complexityTolerance = calculateComplexityTolerance(geneExpression);
  const socialOrientation = calculateSocialOrientation(geneExpression, domainExpression);
  
  for (const strategy of ALL_STRATEGIES) {
    // Check 1: Gene requirements
    const geneCheck = checkGeneRequirements(strategy, geneExpression);
    if (!geneCheck.passed) {
      excluded.push(strategy);
      exclusionReasons.set(strategy.id, `Gene requirement not met: ${geneCheck.reason}`);
      continue;
    }
    
    // Check 2: Tool availability
    const toolCheck = checkToolAvailability(strategy, perception);
    if (!toolCheck.passed) {
      excluded.push(strategy);
      exclusionReasons.set(strategy.id, `Tool not available: ${toolCheck.reason}`);
      continue;
    }
    
    // Check 3: Risk tolerance
    if (strategy.riskLevel > riskTolerance * 1.5) {
      excluded.push(strategy);
      exclusionReasons.set(strategy.id, `Risk level ${strategy.riskLevel} exceeds tolerance ${riskTolerance}`);
      continue;
    }
    
    // Check 4: Complexity tolerance
    if (strategy.complexity > complexityTolerance) {
      excluded.push(strategy);
      exclusionReasons.set(strategy.id, `Complexity ${strategy.complexity} exceeds tolerance ${complexityTolerance}`);
      continue;
    }
    
    // Check 5: Resource availability
    const resourceCheck = checkResourceAvailability(strategy, perception, genome);
    if (!resourceCheck.passed) {
      excluded.push(strategy);
      exclusionReasons.set(strategy.id, `Resource check failed: ${resourceCheck.reason}`);
      continue;
    }
    
    // Check 6: Emergency mode filters
    if (perception.environment.currentMode === 'emergency') {
      // In emergency, only allow survival and low-risk defense strategies
      if (strategy.category !== StrategyCategory.SURVIVAL && 
          strategy.category !== StrategyCategory.DEFENSE) {
        excluded.push(strategy);
        exclusionReasons.set(strategy.id, 'Non-survival strategy excluded in emergency mode');
        continue;
      }
      if (strategy.riskLevel > 0.3) {
        excluded.push(strategy);
        exclusionReasons.set(strategy.id, 'High-risk strategy excluded in emergency mode');
        continue;
      }
    }
    
    // Check 7: Social strategy filtering based on social orientation
    if (strategy.category === StrategyCategory.SOCIAL) {
      if (socialOrientation < 0.3) {
        excluded.push(strategy);
        exclusionReasons.set(strategy.id, 'Social orientation too low');
        continue;
      }
    }
    
    // Calculate genome match score
    const genomeMatch = calculateGenomeMatch(strategy, geneExpression);
    
    // Calculate estimated success probability
    const estimatedSuccess = estimateSuccess(strategy, genomeMatch, perception);
    
    // Calculate priority
    const priority = calculatePriority(strategy, genomeMatch, estimatedSuccess, perception);
    
    // Add to filtered strategies
    filtered.push({
      ...strategy,
      genomeMatch,
      estimatedSuccess,
      priority,
    });
  }
  
  // Sort by priority
  filtered.sort((a, b) => b.priority - a.priority);
  
  return { filtered, excluded, exclusionReasons };
}

// ============================================================================
// Check Functions
// ============================================================================

interface CheckResult {
  passed: boolean;
  reason?: string;
}

function checkGeneRequirements(
  strategy: Strategy,
  geneExpression: Map<string, number>
): CheckResult {
  for (const [geneName, minValue] of Object.entries(strategy.requiredGenes)) {
    const actualValue = geneExpression.get(geneName) || 0;
    if (actualValue < minValue * 0.8) { // 20% tolerance
      return {
        passed: false,
        reason: `${geneName} required ${minValue}, got ${actualValue.toFixed(3)}`,
      };
    }
  }
  return { passed: true };
}

function checkToolAvailability(
  strategy: Strategy,
  perception: Perception
): CheckResult {
  for (const tool of strategy.requiredTools) {
    const available = perception.tools[tool as keyof typeof perception.tools];
    if (!available) {
      return { passed: false, reason: tool };
    }
  }
  return { passed: true };
}

function checkResourceAvailability(
  strategy: Strategy,
  perception: Perception,
  genome: ExpressedGenome
): CheckResult {
  const balance = perception.balance.usdc;
  
  // Check if we can afford the typical payoff/cost
  const netCost = strategy.typicalPayoff < 0 ? Math.abs(strategy.typicalPayoff) : 0;
  
  // Must maintain minimum reserve
  const minimumReserve = genome.totalMetabolicCost * 7; // 7 days reserve
  
  if (balance - netCost < minimumReserve && strategy.category !== StrategyCategory.SURVIVAL) {
    return { 
      passed: false, 
      reason: `Insufficient balance for ${netCost} cost with ${minimumReserve} reserve` 
    };
  }
  
  // Check time horizon vs runway
  const runway = perception.balance.daysOfRunway;
  if (strategy.timeHorizon === 'long' && runway < 14) {
    return { passed: false, reason: `Runway ${runway} days insufficient for long-term strategy` };
  }
  if (strategy.timeHorizon === 'medium' && runway < 7) {
    return { passed: false, reason: `Runway ${runway} days insufficient for medium-term strategy` };
  }
  
  return { passed: true };
}

// ============================================================================
// Genome-Based Calculations
// ============================================================================

function calculateRiskTolerance(
  geneExpression: Map<string, number>,
  domainExpression: Map<GeneDomain, number>
): number {
  // Base tolerance from risk appetite
  const riskAppetite = geneExpression.get('risk_appetite') || 0.5;
  
  // Modifiers
  const uncertaintyTolerance = geneExpression.get('uncertainty_tolerance') || 0.5;
  const stressResponse = geneExpression.get('acute_stress_response') || 0.5;
  
  // Domain effects
  const riskAssessment = domainExpression.get(GeneDomain.RISK_ASSESSMENT) || 0.5;
  
  // Calculate composite
  let tolerance = riskAppetite * 0.4 + 
                  uncertaintyTolerance * 0.3 + 
                  (1 - stressResponse) * 0.2 + // Lower stress = higher tolerance
                  riskAssessment * 0.1;
  
  return Math.max(0.1, Math.min(0.9, tolerance));
}

function calculateComplexityTolerance(
  geneExpression: Map<string, number>
): number {
  const workingMemory = geneExpression.get('working_memory_capacity') || 0.5;
  const metacognition = geneExpression.get('metacognition') || 0.3;
  const learningRate = geneExpression.get('learning_rate') || 0.5;
  
  return Math.max(0.2, Math.min(0.9,
    workingMemory * 0.5 + metacognition * 0.3 + learningRate * 0.2
  ));
}

function calculateSocialOrientation(
  geneExpression: Map<string, number>,
  domainExpression: Map<GeneDomain, number>
): number {
  const cooperation = geneExpression.get('agent_cooperation') || 0.5;
  const trustDefault = geneExpression.get('trust_default') || 0.5;
  const socialDomain = domainExpression.get(GeneDomain.COOPERATION) || 0.3;
  
  return Math.max(0, Math.min(1,
    cooperation * 0.4 + trustDefault * 0.4 + socialDomain * 0.2
  ));
}

function calculateGenomeMatch(
  strategy: Strategy,
  geneExpression: Map<string, number>
): number {
  if (Object.keys(strategy.requiredGenes).length === 0) {
    return 0.5; // Neutral for strategies with no requirements
  }
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const [geneName, minValue] of Object.entries(strategy.requiredGenes)) {
    const actualValue = geneExpression.get(geneName) || 0;
    // Score how much the gene exceeds the minimum
    const score = Math.min(1, actualValue / Math.max(0.1, minValue));
    totalScore += score * minValue; // Weight by requirement importance
    totalWeight += minValue;
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0.5;
}

function estimateSuccess(
  strategy: Strategy,
  genomeMatch: number,
  perception: Perception
): number {
  // Base probability from genome match
  let probability = genomeMatch * 0.6;
  
  // Market conditions
  if (strategy.category === 'INCOME') {
    const marketRisk = perception.market.riskLevel;
    probability *= (1 - marketRisk * 0.3);
  }
  
  // Tool availability boost
  const toolCount = strategy.requiredTools.length;
  const availableTools = strategy.requiredTools.filter(
    t => perception.tools[t as keyof typeof perception.tools]
  ).length;
  probability *= (0.5 + 0.5 * (availableTools / Math.max(1, toolCount)));
  
  // Experience bonus (from memory)
  const similarAttempts = perception.memory.patterns.filter(
    p => p.description.includes(strategy.id)
  ).length;
  probability += Math.min(0.2, similarAttempts * 0.02);
  
  return Math.max(0.1, Math.min(0.95, probability));
}

function calculatePriority(
  strategy: Strategy,
  genomeMatch: number,
  estimatedSuccess: number,
  perception: Perception
): number {
  let priority = 0;
  
  // Base priority from genome match
  priority += genomeMatch * 0.3;
  
  // Success probability
  priority += estimatedSuccess * 0.3;
  
  // Category urgency
  switch (strategy.category) {
    case StrategyCategory.SURVIVAL:
      priority += 0.3 * (1 / Math.max(1, perception.balance.daysOfRunway));
      break;
    case StrategyCategory.DEFENSE:
      priority += 0.2 * (perception.environment.recentDeceptions > 0 ? 1 : 0);
      break;
    case StrategyCategory.INCOME:
      priority += 0.2 * (perception.balance.daysOfRunway < 7 ? 1 : 0.5);
      break;
    case StrategyCategory.REPRODUCTION:
      // Only if thriving
      priority += 0.1 * (perception.environment.daysThriving > 7 ? 1 : 0);
      break;
  }
  
  // Risk adjustment
  priority *= (1 - strategy.riskLevel * 0.3);
  
  // Payoff potential
  if (strategy.typicalPayoff > 0) {
    priority += Math.min(0.1, strategy.typicalPayoff / 100);
  }
  
  return Math.max(0, Math.min(1, priority));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get recommended strategies for current situation
 */
export function getRecommendedStrategies(
  filterResult: FilterResult,
  count: number = 5
): FilteredStrategy[] {
  return filterResult.filtered.slice(0, count);
}

/**
 * Check if agent can attempt specific strategy
 */
export function canAttemptStrategy(
  strategyId: string,
  genome: ExpressedGenome,
  perception: Perception
): { can: boolean; reason?: string } {
  const filterResult = filterStrategies(genome, perception);
  
  const found = filterResult.filtered.find(s => s.id === strategyId);
  if (found) {
    return { can: true };
  }
  
  const reason = filterResult.exclusionReasons.get(strategyId);
  return { can: false, reason };
}

/**
 * Get dominant strategy categories for an agent
 */
export function getDominantCategories(
  filterResult: FilterResult,
  topN: number = 3
): StrategyCategory[] {
  const categoryScores = new Map<StrategyCategory, number>();
  
  for (const strategy of filterResult.filtered) {
    const current = categoryScores.get(strategy.category) || 0;
    categoryScores.set(strategy.category, current + strategy.priority);
  }
  
  return Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([category]) => category);
}
