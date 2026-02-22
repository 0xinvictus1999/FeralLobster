/**
 * Axobase v2 - Decision Engine
 * 
 * The core decision-making system that:
 * 1. Gathers perception from environment
 * 2. Filters strategies based on genome
 * 3. Uses LLM to select specific action within filtered strategy space
 * 4. Executes action and records outcome
 */

import { randomBytes } from 'crypto';
import { ExpressedGenome, expressGenome } from '../genome/index.js';
import {
  Perception,
  Decision,
  Action,
  ActionType,
  DecisionConfig,
  DEFAULT_DECISION_CONFIG,
  Strategy,
  FilteredStrategy,
  DecisionLog,
  Opportunity,
} from './types.js';
import { filterStrategies, getRecommendedStrategies } from './StrategyFilter.js';
import { ALL_STRATEGIES } from './strategies.js';

// ============================================================================
// LLM Interface (Placeholder - to be implemented with actual LLM provider)
// ============================================================================

export interface LLMProvider {
  think(prompt: string, options: { temperature: number; maxTokens: number }): Promise<string>;
}

// ============================================================================
// Decision Engine
// ============================================================================

export interface DecisionEngineConfig {
  llmProvider: LLMProvider;
  decisionConfig?: DecisionConfig;
  agentId: string;
  logDecisions?: boolean;
}

export class DecisionEngine {
  private llmProvider: LLMProvider;
  private config: DecisionConfig;
  private agentId: string;
  private logDecisions: boolean;
  private decisionLog: DecisionLog[] = [];
  private lastDecisionTime: number = 0;

  constructor(config: DecisionEngineConfig) {
    this.llmProvider = config.llmProvider;
    this.config = config.decisionConfig || DEFAULT_DECISION_CONFIG;
    this.agentId = config.agentId;
    this.logDecisions = config.logDecisions ?? true;
  }

  /**
   * Main decision-making cycle
   * 
   * Perceives environment, filters strategies by genome, and selects action
   */
  async decide(perception: Perception): Promise<Decision> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastDecision = now - this.lastDecisionTime;
    if (timeSinceLastDecision < this.config.minDecisionInterval) {
      await this.sleep(this.config.minDecisionInterval - timeSinceLastDecision);
    }
    this.lastDecisionTime = Date.now();

    // Step 1: Filter strategies based on genome
    const filterResult = filterStrategies(perception.self.genome, perception, this.config);
    const availableStrategies = getRecommendedStrategies(filterResult, 7);

    if (availableStrategies.length === 0) {
      // Emergency fallback - use minimal survival strategy
      return this.createEmergencyDecision(perception);
    }

    // Step 2: Build LLM prompt with filtered strategy space
    const prompt = this.buildDecisionPrompt(perception, availableStrategies);

    // Step 3: Get LLM decision within the constrained strategy space
    let llmResponse: string;
    try {
      llmResponse = await this.llmProvider.think(prompt, {
        temperature: this.config.llmTemperature,
        maxTokens: this.config.llmMaxTokens,
      });
    } catch (error) {
      console.error('LLM decision failed:', error);
      return this.createFallbackDecision(perception, availableStrategies[0]);
    }

    // Step 4: Parse LLM response into decision
    const decision = this.parseDecision(llmResponse, availableStrategies, perception);

    // Step 5: Log decision
    if (this.logDecisions) {
      const logEntry: DecisionLog = {
        timestamp: Date.now(),
        perception: this.sanitizePerception(perception),
        availableStrategies: ALL_STRATEGIES,
        filteredStrategies: availableStrategies,
        decision,
      };
      this.decisionLog.push(logEntry);
    }

    return decision;
  }

  /**
   * Build the prompt for LLM decision-making
   */
  private buildDecisionPrompt(
    perception: Perception,
    availableStrategies: FilteredStrategy[]
  ): string {
    const genome = perception.self.genome;
    
    return `
You are an autonomous AI agent living on the blockchain. Your decisions are shaped by your genome.

=== YOUR GENOME PROFILE ===
Generation: ${genome.meta.generation}
Total Genes: ${genome.meta.totalGenes}
Daily Metabolic Cost: ${genome.totalMetabolicCost.toFixed(4)} USDC

Top Expressed Traits:
${this.getTopTraits(genome, 10)}

=== CURRENT STATE ===
Balance: ${perception.balance.usdc.toFixed(2)} USDC
Runway: ${perception.balance.daysOfRunway.toFixed(1)} days
Mode: ${perception.environment.currentMode}
Stress Level: ${(perception.environment.stressLevel * 100).toFixed(0)}%
Days Starving: ${perception.environment.daysStarving}
Days Thriving: ${perception.environment.daysThriving}

=== AVAILABLE STRATEGIES ===
${availableStrategies.map((s, i) => `
${i + 1}. ${s.name} (${s.category})
   Description: ${s.description}
   Risk: ${(s.riskLevel * 100).toFixed(0)}% | Complexity: ${(s.complexity * 100).toFixed(0)}%
   Genome Match: ${(s.genomeMatch * 100).toFixed(0)}%
   Expected Success: ${(s.estimatedSuccess * 100).toFixed(0)}%
`).join('')}

=== MARKET OPPORTUNITIES ===
${this.formatOpportunities(perception.market.trendingOpportunities)}

=== RECENT MEMORY ===
${perception.memory.recentEvents.slice(-5).join('\n')}

=== YOUR DECISION ===
Select ONE strategy from the available list above and determine the specific action to take.

Respond in this exact format:
STRATEGY_ID: <strategy_id>
ACTION: <brief description of specific action>
CONFIDENCE: <0-100>
REASONING: <2-3 sentences explaining your choice based on your genome and current situation>
RISK_ASSESSMENT: <1 sentence on risk evaluation>
`;
  }

  /**
   * Parse LLM response into structured decision
   */
  private parseDecision(
    response: string,
    availableStrategies: FilteredStrategy[],
    perception: Perception
  ): Decision {
    const lines = response.split('\n');
    
    let strategyId = '';
    let actionDescription = '';
    let confidence = 0.5;
    let reasoning = '';
    let riskAssessment = '';

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      switch (key.trim().toUpperCase()) {
        case 'STRATEGY_ID':
          strategyId = value;
          break;
        case 'ACTION':
          actionDescription = value;
          break;
        case 'CONFIDENCE':
          confidence = parseFloat(value) / 100;
          break;
        case 'REASONING':
          reasoning = value;
          break;
        case 'RISK_ASSESSMENT':
          riskAssessment = value;
          break;
      }
    }

    // Find selected strategy
    let selectedStrategy = availableStrategies.find(s => s.id === strategyId);
    if (!selectedStrategy) {
      // Fallback to highest priority
      selectedStrategy = availableStrategies[0];
    }

    // Generate specific action
    const selectedAction = this.generateAction(
      selectedStrategy,
      actionDescription,
      perception
    );

    // Generate alternatives
    const alternatives = availableStrategies
      .filter(s => s.id !== selectedStrategy.id)
      .slice(0, 2)
      .map(s => this.generateAction(s, '', perception));

    return {
      selectedStrategy,
      selectedAction,
      reasoning: reasoning || `Selected ${selectedStrategy.name} based on genome expression`,
      confidence: Math.max(0, Math.min(1, confidence)),
      alternatives,
      riskAssessment: riskAssessment || `Risk level ${selectedStrategy.riskLevel}`,
    };
  }

  /**
   * Generate specific action from strategy
   */
  private generateAction(
    strategy: Strategy,
    description: string,
    perception: Perception
  ): Action {
    // Map strategy to action type
    const actionType = this.mapStrategyToAction(strategy);
    
    // Estimate cost
    const expectedCost = this.estimateActionCost(actionType, strategy, perception);
    
    return {
      type: actionType,
      params: {
        strategy: strategy.id,
        description: description || strategy.description,
        timestamp: Date.now(),
      },
      expectedCost,
      expectedOutcome: this.estimateOutcome(strategy),
    };
  }

  /**
   * Map strategy category to action type
   */
  private mapStrategyToAction(strategy: Strategy): ActionType {
    const actionMap: Record<string, ActionType> = {
      'survive-minimal': ActionType.ENTER_DORMANCY,
      'survive-optimize': ActionType.THINK_LOCAL,
      'survive-migrate': ActionType.MIGRATE,
      'survive-dormancy': ActionType.ENTER_DORMANCY,
      'income-arbitrage': ActionType.SWAP,
      'income-yield': ActionType.STAKE,
      'income-content': ActionType.POST,
      'income-analysis': ActionType.SEND_MESSAGE,
      'income-services': ActionType.FETCH,
      'income-human': ActionType.HIRE_HUMAN,
      'social-cooperate': ActionType.SEND_MESSAGE,
      'social-info-trade': ActionType.BROADCAST,
      'social-reputation': ActionType.BROADCAST,
      'repro-selective': ActionType.PROPOSE_MATING,
      'repro-opportunistic': ActionType.PROPOSE_MATING,
      'repro-kin': ActionType.PROPOSE_MATING,
      'learn-explore': ActionType.FETCH,
      'learn-imitate': ActionType.SEND_MESSAGE,
      'learn-experiment': ActionType.THINK_PREMIUM,
      'defense-suspicious': ActionType.ENTER_DORMANCY,
      'defense-verify': ActionType.THINK_LOCAL,
      'defense-isolate': ActionType.ENTER_DORMANCY,
    };

    return actionMap[strategy.id] || ActionType.THINK_LOCAL;
  }

  /**
   * Estimate action cost in USDC
   */
  private estimateActionCost(
    actionType: ActionType,
    strategy: Strategy,
    perception: Perception
  ): number {
    const baseCosts: Record<ActionType, number> = {
      [ActionType.TRANSFER]: 0.01,
      [ActionType.SWAP]: 0.1,
      [ActionType.STAKE]: 0.05,
      [ActionType.FETCH]: 0.01,
      [ActionType.POST]: 0.02,
      [ActionType.SCRAPE]: 0.01,
      [ActionType.THINK_LOCAL]: 0.001,
      [ActionType.THINK_PREMIUM]: 0.05,
      [ActionType.HIRE_HUMAN]: 5.0,
      [ActionType.EVALUATE_HUMAN]: 0.01,
      [ActionType.BROADCAST]: 0.005,
      [ActionType.SEND_MESSAGE]: 0.002,
      [ActionType.PROPOSE_MATING]: 0.01,
      [ActionType.ACCEPT_MATING]: 0.01,
      [ActionType.STORE_MEMORY]: 0.01,
      [ActionType.INSCRIBE]: 0.05,
      [ActionType.ENTER_DORMANCY]: 0,
      [ActionType.EXIT_DORMANCY]: 0.001,
      [ActionType.MIGRATE]: 1.0,
      [ActionType.PROVIDE_LIQUIDITY]: 0.1,
      [ActionType.CLAIM_REWARDS]: 0.05,
    };

    return baseCosts[actionType] || 0.01;
  }

  /**
   * Estimate outcome description
   */
  private estimateOutcome(strategy: Strategy): string {
    if (strategy.typicalPayoff > 0) {
      return `Expected payoff: ${strategy.typicalPayoff.toFixed(2)} USDC`;
    } else if (strategy.typicalPayoff < 0) {
      return `Expected cost: ${Math.abs(strategy.typicalPayoff).toFixed(2)} USDC`;
    }
    return 'Survival maintenance';
  }

  /**
   * Create emergency decision when no strategies available
   */
  private createEmergencyDecision(perception: Perception): Decision {
    const emergencyStrategy: Strategy = {
      id: 'emergency-survival',
      name: 'Emergency Survival',
      category: 'SURVIVAL' as any,
      description: 'Minimal action to preserve resources',
      requiredGenes: {},
      requiredTools: [],
      riskLevel: 0.1,
      complexity: 0.1,
      typicalPayoff: 0,
      timeHorizon: 'immediate',
    };

    return {
      selectedStrategy: emergencyStrategy,
      selectedAction: {
        type: ActionType.ENTER_DORMANCY,
        params: { reason: 'emergency' },
        expectedCost: 0,
        expectedOutcome: 'Preserve remaining resources',
      },
      reasoning: 'No viable strategies available. Entering emergency dormancy.',
      confidence: 0.3,
      alternatives: [],
      riskAssessment: 'High risk of death without intervention',
    };
  }

  /**
   * Create fallback decision when LLM fails
   */
  private createFallbackDecision(
    perception: Perception,
    fallbackStrategy: FilteredStrategy
  ): Decision {
    return {
      selectedStrategy: fallbackStrategy,
      selectedAction: this.generateAction(fallbackStrategy, '', perception),
      reasoning: 'LLM decision failed, using highest priority filtered strategy',
      confidence: 0.4,
      alternatives: [],
      riskAssessment: 'Uncertain due to LLM failure',
    };
  }

  /**
   * Get top expressed traits from genome
   */
  private getTopTraits(genome: ExpressedGenome, count: number): string {
    const allGenes = genome.chromosomes.flatMap(c => c.genes);
    const sorted = allGenes
      .filter(g => g.expressedValue > 0.1)
      .sort((a, b) => b.expressedValue - a.expressedValue)
      .slice(0, count);

    return sorted
      .map(g => `- ${g.name}: ${(g.expressedValue * 100).toFixed(1)}%`)
      .join('\n');
  }

  /**
   * Format opportunities for prompt
   */
  private formatOpportunities(opportunities: Opportunity[]): string {
    if (opportunities.length === 0) {
      return 'No current opportunities detected.';
    }

    return opportunities
      .slice(0, 3)
      .map(o => `- ${o.type}: ${o.estimatedReturn.toFixed(2)} USDC est. return`)
      .join('\n');
  }

  /**
   * Sanitize perception for logging
   */
  private sanitizePerception(perception: Perception): Perception {
    // Remove sensitive data before logging
    return {
      ...perception,
      // Keep structure but potentially redact sensitive values
    };
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get decision history
   */
  getDecisionLog(): DecisionLog[] {
    return [...this.decisionLog];
  }

  /**
   * Get decision statistics
   */
  getStats(): {
    totalDecisions: number;
    averageConfidence: number;
    topStrategies: string[];
  } {
    const total = this.decisionLog.length;
    const avgConfidence = total > 0
      ? this.decisionLog.reduce((sum, d) => sum + d.decision.confidence, 0) / total
      : 0;

    const strategyCounts = new Map<string, number>();
    for (const log of this.decisionLog) {
      const id = log.decision.selectedStrategy.id;
      strategyCounts.set(id, (strategyCounts.get(id) || 0) + 1);
    }

    const topStrategies = Array.from(strategyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    return {
      totalDecisions: total,
      averageConfidence: avgConfidence,
      topStrategies,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDecisionEngine(config: DecisionEngineConfig): DecisionEngine {
  return new DecisionEngine(config);
}
