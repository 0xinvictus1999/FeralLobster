/**
 * Axobase v2 - Survival Loop with Decision Engine
 *
 * The survival loop now delegates decision-making to the DecisionEngine,
 * which filters strategies based on the agent's genome expression.
 *
 * Core flow per cycle:
 * 1. Perceive environment (balance, market, agents, memory)
 * 2. Express genome (calculate gene expression values)
 * 3. Filter strategies (genome determines available options)
 * 4. Decide action (LLM selects within filtered strategy space)
 * 5. Execute action
 * 6. Record outcome
 */

import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { X402Client } from '../network/X402Client.js';
import BASE_CONFIG from '../config/base.js';
import {
  DynamicGenome,
  ExpressedGenome,
  expressGenome,
  EnvironmentalState,
  updateEpigenome,
} from '../genome/index.js';
import {
  DecisionEngine,
  Perception,
  Decision,
  ActionType,
  LLMProvider,
  BalanceState,
  MarketPerception,
  AgentPerception,
  MemoryState,
} from '../decision/index.js';
import {
  BotStatus,
  BotLifeStatus,
  OperationMode,
  MemoryData,
  ThoughtEntry,
  TransactionLog,
} from '../types/index.js';

// ============================================================================
// Configuration
// ============================================================================

// Cycle interval varies by genome (will be overridden by cycle_speed gene)
const BASE_CYCLE_MS = 10 * 60 * 1000; // 10 minutes
const FAST_CYCLE_MS = 5 * 60 * 1000;  // 5 minutes
const SLOW_CYCLE_MS = 30 * 60 * 1000; // 30 minutes

const DAILY_INSCRIPTION_HOUR = 0; // 00:00 UTC

// Base USDC thresholds (6 decimals)
const LOW_POWER_THRESHOLD = BigInt(5 * 10**6);
const EMERGENCY_THRESHOLD = BigInt(2 * 10**6);
const CRITICAL_THRESHOLD = BigInt(1 * 10**6);
const HIBERNATION_THRESHOLD = BigInt(0.5 * 10**6);

const MIN_ETH_FOR_GAS = BigInt(1 * 10**15);

// ============================================================================
// Interfaces
// ============================================================================

export interface SurvivalConfig {
  agentId: string;
  genome: DynamicGenome;
  walletManager: WalletManager;
  arweaveInscriber: ArweaveInscriber;
  x402Client: X402Client;
  llmProvider: LLMProvider;
  deploymentId: string;
  computeProvider: 'akash' | 'spheron' | 'local';
  memory: MemoryData;
}

export interface CycleResult {
  cycleNumber: number;
  timestamp: number;
  mode: OperationMode;
  balances: {
    eth: bigint;
    usdc: bigint;
  };
  decision: Decision;
  geneExpression: Map<string, number>;
  health: 'healthy' | 'warning' | 'critical' | 'dead';
  metabolicCost: number;
}

// ============================================================================
// Survival Manager
// ============================================================================

export class SurvivalManager {
  private config: SurvivalConfig;
  private status: BotStatus;
  private cycleCount: number = 0;
  private isRunning: boolean = false;
  private survivalTimer: NodeJS.Timeout | null = null;
  private dailyInscriptionTimer: NodeJS.Timeout | null = null;
  private thoughts: ThoughtEntry[] = [];
  private transactions: TransactionLog[] = [];
  private decisionEngine: DecisionEngine;
  private currentCycleMs: number;
  private expressedGenome: ExpressedGenome | null = null;

  // Environmental tracking for epigenetics
  private daysStarving: number = 0;
  private daysThriving: number = 0;
  private lastIncomeTime: number = Date.now();
  private recentDeceptions: number = 0;
  private cooperationCount: number = 0;

  constructor(config: SurvivalConfig) {
    this.config = config;
    this.status = this.initializeStatus();
    this.decisionEngine = new DecisionEngine({
      llmProvider: config.llmProvider,
      agentId: config.agentId,
      logDecisions: true,
    });
    this.currentCycleMs = this.calculateCycleInterval();
  }

  private initializeStatus(): BotStatus {
    return {
      geneHash: this.config.genome.meta.genomeHash,
      address: this.config.walletManager.getAddress(this.config.genome.meta.genomeHash) || ('0x0' as Hex),
      status: BotLifeStatus.ALIVE,
      birthTime: this.config.memory.birthTime,
      lastCheckIn: Date.now(),
      balance: { eth: BigInt(0), usdc: BigInt(0) },
      mode: OperationMode.NORMAL,
      survivalDays: this.config.memory.survivalDays,
      generation: this.config.genome.meta.generation,
    };
  }

  /**
   * Calculate cycle interval based on genome
   */
  private calculateCycleInterval(): number {
    const cycleSpeedGene = this.config.genome.chromosomes
      .flatMap(c => c.genes)
      .find(g => g.name === 'cycle_speed');
    
    if (!cycleSpeedGene) return BASE_CYCLE_MS;
    
    // Map gene value [0,1] to cycle speed [SLOW, FAST]
    const speedValue = cycleSpeedGene.value * cycleSpeedGene.weight;
    
    if (speedValue > 0.7) return FAST_CYCLE_MS;  // Fast metabolism
    if (speedValue < 0.3) return SLOW_CYCLE_MS;  // Slow metabolism
    return BASE_CYCLE_MS;                        // Normal
  }

  /**
   * Start the survival loop
   */
  async startSurvivalLoop(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleDailyInscription();

    // Start with initial cycle
    await this.runSurvivalCycle();

    // Schedule subsequent cycles (interval may change based on genome)
    this.scheduleNextCycle();
  }

  private scheduleNextCycle(): void {
    if (!this.isRunning) return;

    // Recalculate cycle interval (genome may have changed via epigenetics)
    this.currentCycleMs = this.calculateCycleInterval();

    this.survivalTimer = setTimeout(() => {
      this.runSurvivalCycle().then(() => {
        this.scheduleNextCycle();
      }).catch(error => {
        console.error('[Survival] Cycle error:', error);
        this.scheduleNextCycle();
      });
    }, this.currentCycleMs);
  }

  /**
   * Run a single survival cycle
   */
  private async runSurvivalCycle(): Promise<CycleResult> {
    this.cycleCount++;
    const timestamp = Date.now();

    // Step 1: Get current balances
    const balances = await this.getBalances();
    this.status.balance = balances;
    this.status.lastCheckIn = timestamp;

    // Step 2: Determine operation mode
    const mode = this.determineOperationMode(balances);
    if (mode !== this.status.mode) {
      this.status.mode = mode;
    }

    // Step 3: Update environmental state
    const environment = this.buildEnvironmentalState(mode, balances);

    // Step 4: Express genome
    const expressionResult = expressGenome(this.config.genome, environment);
    this.expressedGenome = expressionResult.expressedGenome;

    // Step 5: Update epigenome based on environment
    const epigeneticUpdate = updateEpigenome(this.config.genome, environment);
    this.config.genome = epigeneticUpdate.genome;

    // Step 6: Build perception
    const perception = this.buildPerception(balances, environment, mode);

    // Step 7: Make decision using decision engine
    let decision: Decision;
    try {
      decision = await this.decisionEngine.decide(perception);
    } catch (error) {
      console.error('[Survival] Decision engine failed:', error);
      decision = this.createFallbackDecision();
    }

    // Step 8: Execute decision
    await this.executeDecision(decision);

    // Step 9: Track environmental conditions
    this.trackEnvironmentalConditions(balances);

    // Step 10: Check death condition
    const health = this.determineHealth(balances);
    if (health === 'dead') {
      this.status.status = BotLifeStatus.DEAD;
    }

    const result: CycleResult = {
      cycleNumber: this.cycleCount,
      timestamp,
      mode,
      balances,
      decision,
      geneExpression: this.getGeneExpressionMap(),
      health,
      metabolicCost: expressionResult.expressedGenome.totalMetabolicCost,
    };

    this.logCycleResult(result);
    return result;
  }

  /**
   * Build environmental state for genome expression
   */
  private buildEnvironmentalState(
    mode: OperationMode,
    balances: { eth: bigint; usdc: bigint }
  ): EnvironmentalState {
    const usdcBalance = Number(balances.usdc) / 1e6;

    return {
      balanceUSDC: usdcBalance,
      daysSinceLastIncome: (Date.now() - this.lastIncomeTime) / (24 * 60 * 60 * 1000),
      daysStarving: this.daysStarving,
      daysThriving: this.daysThriving,
      recentDeceptions: this.recentDeceptions,
      cooperationCount: this.cooperationCount,
      stressLevel: this.calculateStressLevel(mode, balances),
      currentMode: mode.toLowerCase() as EnvironmentalState['currentMode'],
    };
  }

  /**
   * Build perception for decision engine
   */
  private buildPerception(
    balances: { eth: bigint; usdc: bigint },
    environment: EnvironmentalState,
    mode: OperationMode
  ): Perception {
    const usdcBalance = Number(balances.usdc) / 1e6;
    const ethBalance = Number(balances.eth) / 1e18;

    const balanceState: BalanceState = {
      usdc: usdcBalance,
      eth: ethBalance,
      dailyBurnRate: this.expressedGenome?.totalMetabolicCost || 0.05,
      daysOfRunway: usdcBalance / (this.expressedGenome?.totalMetabolicCost || 0.05),
    };

    const marketPerception: MarketPerception = {
      ethPrice: 0, // Would be fetched from oracle
      gasPrice: 0, // Would be fetched from network
      trendingOpportunities: [], // Would be discovered via web scraping
      riskLevel: this.calculateMarketRisk(mode),
    };

    const agentPerception: AgentPerception = {
      nearbyAgents: [], // Would be populated from P2P network
      cooperationRequests: [],
      reputationScores: new Map(),
    };

    const memoryState: MemoryState = {
      shortTermCount: this.thoughts.length,
      longTermCount: this.config.memory.longTermMemory?.length || 0,
      recentEvents: this.thoughts.slice(-5).map(t => t.content),
      patterns: this.config.memory.patterns || [],
    };

    return {
      self: {
        agentId: this.config.agentId,
        genome: this.expressedGenome!,
        age: (Date.now() - this.status.birthTime) / (24 * 60 * 60 * 1000),
        generation: this.config.genome.meta.generation,
      },
      balance: balanceState,
      environment,
      market: marketPerception,
      agents: agentPerception,
      tools: {
        wallet: true,
        dex: true,
        web: true,
        inference: mode !== OperationMode.HIBERNATION,
        human: mode === OperationMode.NORMAL,
        network: true,
      },
      memory: memoryState,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute the selected decision
   */
  private async executeDecision(decision: Decision): Promise<void> {
    const action = decision.selectedAction;

    switch (action.type) {
      case ActionType.THINK_LOCAL:
        await this.executeThinkLocal();
        break;
      case ActionType.THINK_PREMIUM:
        await this.executeThinkPremium();
        break;
      case ActionType.ENTER_DORMANCY:
        await this.executeEnterDormancy();
        break;
      case ActionType.EXIT_DORMANCY:
        await this.executeExitDormancy();
        break;
      case ActionType.SWAP:
        await this.executeSwap(action.params);
        break;
      case ActionType.STAKE:
        await this.executeStake(action.params);
        break;
      case ActionType.HIRE_HUMAN:
        await this.executeHireHuman(action.params);
        break;
      case ActionType.BROADCAST:
        await this.executeBroadcast(action.params);
        break;
      case ActionType.SEND_MESSAGE:
        await this.executeSendMessage(action.params);
        break;
      case ActionType.PROPOSE_MATING:
        await this.executeProposeMating();
        break;
      case ActionType.INSCRIBE:
        await this.performDailyInscription();
        break;
      case ActionType.FETCH:
        await this.executeFetch(action.params);
        break;
      case ActionType.POST:
        await this.executePost(action.params);
        break;
      default:
        // Default: generate a thought
        await this.executeThinkLocal();
    }
  }

  /**
   * Action execution methods
   */
  private async executeThinkLocal(): Promise<void> {
    const thought: ThoughtEntry = {
      timestamp: Date.now(),
      content: `[Local] Cycle ${this.cycleCount}: Mode ${this.status.mode}`,
      context: `genome:${this.config.genome.meta.genomeHash.slice(0, 16)}`,
      model: 'llama3:8b',
    };
    this.thoughts.push(thought);
  }

  private async executeThinkPremium(): Promise<void> {
    // Would call x402Client for premium inference
    const thought: ThoughtEntry = {
      timestamp: Date.now(),
      content: `[Premium] Strategic reflection on cycle ${this.cycleCount}`,
      context: `mode:${this.status.mode},balance:${this.status.balance.usdc}`,
      model: 'claude-3-5-sonnet',
    };
    this.thoughts.push(thought);
  }

  private async executeEnterDormancy(): Promise<void> {
    this.status.mode = OperationMode.HIBERNATION;
    // Reduce activity
  }

  private async executeExitDormancy(): Promise<void> {
    if (this.status.balance.usdc > EMERGENCY_THRESHOLD) {
      this.status.mode = OperationMode.LOW_POWER;
    }
  }

  private async executeSwap(params: unknown): Promise<void> {
    // Would execute DEX swap via x402
    this.transactions.push({
      timestamp: Date.now(),
      type: 'swap',
      params,
    });
  }

  private async executeStake(params: unknown): Promise<void> {
    // Would stake via x402
    this.transactions.push({
      timestamp: Date.now(),
      type: 'stake',
      params,
    });
  }

  private async executeHireHuman(params: unknown): Promise<void> {
    // Would post task to RentAHuman via MCP
    this.transactions.push({
      timestamp: Date.now(),
      type: 'hire_human',
      params,
    });
  }

  private async executeBroadcast(params: unknown): Promise<void> {
    // Would broadcast via P2P
  }

  private async executeSendMessage(params: unknown): Promise<void> {
    // Would send P2P message
  }

  private async executeProposeMating(): Promise<void> {
    // Would initiate breeding protocol
  }

  private async executeFetch(params: unknown): Promise<void> {
    // Would fetch web content
  }

  private async executePost(params: unknown): Promise<void> {
    // Would post content to social media
  }

  /**
   * Track environmental conditions for epigenetics
   */
  private trackEnvironmentalConditions(balances: { usdc: bigint }): void {
    const usdcBalance = Number(balances.usdc) / 1e6;
    const dailyCost = this.expressedGenome?.totalMetabolicCost || 0.05;
    const runway = usdcBalance / dailyCost;

    if (runway < 3) {
      this.daysStarving++;
      this.daysThriving = 0;
    } else if (runway > 14) {
      this.daysThriving++;
      this.daysStarving = Math.max(0, this.daysStarving - 1);
    } else {
      this.daysStarving = Math.max(0, this.daysStarving - 0.5);
      this.daysThriving = Math.max(0, this.daysThriving - 0.5);
    }

    // Decay recent deceptions
    this.recentDeceptions = Math.max(0, this.recentDeceptions - 0.1);
  }

  /**
   * Get gene expression as a map for logging
   */
  private getGeneExpressionMap(): Map<string, number> {
    const map = new Map<string, number>();
    if (this.expressedGenome) {
      for (const chr of this.expressedGenome.chromosomes) {
        for (const gene of chr.genes) {
          map.set(gene.name, gene.expressedValue);
        }
      }
    }
    return map;
  }

  /**
   * Create fallback decision when engine fails
   */
  private createFallbackDecision(): Decision {
    return {
      selectedStrategy: {
        id: 'fallback',
        name: 'Fallback Survival',
        category: 'SURVIVAL' as any,
        description: 'Minimal survival action',
        requiredGenes: {},
        requiredTools: [],
        riskLevel: 0.1,
        complexity: 0.1,
        typicalPayoff: 0,
        timeHorizon: 'immediate',
      },
      selectedAction: {
        type: ActionType.THINK_LOCAL,
        params: { reason: 'fallback' },
        expectedCost: 0.001,
        expectedOutcome: 'Maintain minimal activity',
      },
      reasoning: 'Decision engine failed, using fallback',
      confidence: 0.3,
      alternatives: [],
      riskAssessment: 'Unknown due to engine failure',
    };
  }

  /**
   * Helper methods from original implementation
   */
  private async getBalances(): Promise<{ eth: bigint; usdc: bigint }> {
    const wallet = this.config.walletManager.getWallet(this.config.genome.meta.genomeHash);
    if (!wallet) {
      throw new Error(`Wallet not found for ${this.config.genome.meta.genomeHash}`);
    }
    return this.config.walletManager.getBalances(wallet.address);
  }

  private determineOperationMode(balances: { eth: bigint; usdc: bigint }): OperationMode {
    if (balances.eth < MIN_ETH_FOR_GAS) return OperationMode.EMERGENCY;
    if (balances.usdc < HIBERNATION_THRESHOLD) return OperationMode.HIBERNATION;
    if (balances.usdc < EMERGENCY_THRESHOLD) return OperationMode.EMERGENCY;
    if (balances.usdc < LOW_POWER_THRESHOLD) return OperationMode.LOW_POWER;
    return OperationMode.NORMAL;
  }

  private determineHealth(balances: { usdc: bigint }): CycleResult['health'] {
    if (balances.usdc < CRITICAL_THRESHOLD) return 'dead';
    if (balances.usdc < EMERGENCY_THRESHOLD) return 'critical';
    if (balances.usdc < LOW_POWER_THRESHOLD) return 'warning';
    return 'healthy';
  }

  private calculateStressLevel(mode: OperationMode, balances: { usdc: bigint }): number {
    let stress = 0;
    if (mode === OperationMode.EMERGENCY) stress += 0.5;
    if (mode === OperationMode.HIBERNATION) stress += 0.8;
    if (balances.usdc < EMERGENCY_THRESHOLD) stress += 0.3;
    return Math.min(1, stress);
  }

  private calculateMarketRisk(mode: OperationMode): MarketPerception['riskLevel'] {
    if (mode === OperationMode.EMERGENCY) return 'high';
    if (mode === OperationMode.LOW_POWER) return 'medium';
    return 'low';
  }

  private async performDailyInscription(): Promise<void> {
    try {
      await this.config.arweaveInscriber.dailyInscribe(
        this.config.genome.meta.genomeHash,
        this.thoughts,
        this.transactions,
        {
          balanceSnapshot: this.status.balance.usdc,
          survivalDays: this.status.survivalDays,
          mode: this.status.mode,
          genomeHash: this.config.genome.meta.genomeHash,
          geneCount: this.config.genome.meta.totalGenes,
        }
      );
      this.thoughts = [];
      this.transactions = [];
    } catch (error) {
      console.error('[Survival] Daily inscription failed:', error);
    }
  }

  private scheduleDailyInscription(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    this.dailyInscriptionTimer = setTimeout(() => {
      this.performDailyInscription();
      this.scheduleDailyInscription();
    }, msUntilMidnight);
  }

  private logCycleResult(result: CycleResult): void {
    // Structured logging for analysis
    const logData = {
      ...result,
      balances: {
        eth: result.balances.eth.toString(),
        usdc: result.balances.usdc.toString(),
      },
    };
    // console.log('[Survival] Cycle:', JSON.stringify(logData));
  }

  // Public methods
  getStatus(): BotStatus { return { ...this.status }; }
  getCycleCount(): number { return this.cycleCount; }
  getExpressedGenome(): ExpressedGenome | null { return this.expressedGenome; }
  
  stop(): void {
    this.isRunning = false;
    if (this.survivalTimer) clearTimeout(this.survivalTimer);
    if (this.dailyInscriptionTimer) clearTimeout(this.dailyInscriptionTimer);
  }
  
  isActive(): boolean { return this.isRunning; }
}

export default SurvivalManager;
