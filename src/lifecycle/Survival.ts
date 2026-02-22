/**
 * Survival.ts - Survival Loop and Operation Mode Management
 *
 * Handles:
 * - 10-minute survival cycles
 * - Balance monitoring and mode switching
 * - Daily inscription at 00:00 UTC
 * - Proof-of-life verification
 * - Emergency resource conservation
 */

import { Hex } from 'viem';
import { WalletManager } from '../wallet/WalletManager.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { X402Client } from '../network/X402Client.js';
import { AkashClient } from '../network/AkashClient.js';
import {
  BotStatus,
  BotLifeStatus,
  OperationMode,
  MemoryData,
  ThoughtEntry,
  TransactionLog,
} from '../types/index.js';

// Survival cycle configuration
const SURVIVAL_CYCLE_MS = 10 * 60 * 1000; // 10 minutes
const DAILY_INSCRIPTION_HOUR = 0; // 00:00 UTC
const EMERGENCY_BALANCE_THRESHOLD = BigInt(1000000); // 1 USDC (6 decimals)
const CRITICAL_BALANCE_THRESHOLD = BigInt(250000); // 0.25 USDC
const MIN_ETH_FOR_GAS = BigInt(1000000000000000); // 0.001 ETH

export interface SurvivalConfig {
  geneHash: string;
  walletManager: WalletManager;
  arweaveInscriber: ArweaveInscriber;
  x402Client: X402Client;
  akashClient: AkashClient;
  akashDseq: string;
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
  actions: string[];
  health: 'healthy' | 'warning' | 'critical' | 'dead';
}

export class SurvivalManager {
  private config: SurvivalConfig;
  private status: BotStatus;
  private cycleCount: number = 0;
  private isRunning: boolean = false;
  private survivalTimer: NodeJS.Timeout | null = null;
  private dailyInscriptionTimer: NodeJS.Timeout | null = null;
  private thoughts: ThoughtEntry[] = [];
  private transactions: TransactionLog[] = [];

  constructor(config: SurvivalConfig) {
    this.config = config;
    this.status = this.initializeStatus();
  }

  /**
   * Initialize bot status from memory
   */
  private initializeStatus(): BotStatus {
    return {
      geneHash: this.config.geneHash,
      address: this.config.walletManager.getAddress(this.config.geneHash) || ('0x0' as Hex),
      status: BotLifeStatus.ALIVE,
      birthTime: this.config.memory.birthTime,
      lastCheckIn: Date.now(),
      balance: { eth: BigInt(0), usdc: BigInt(0) },
      mode: OperationMode.NORMAL,
      survivalDays: this.config.memory.survivalDays,
      generation: this.config.memory.generation,
    };
  }

  /**
   * Start the survival loop
   * This is the main entry point for bot survival
   */
  async startSurvivalLoop(): Promise<void> {
    if (this.isRunning) {
      console.warn('[Survival] Survival loop already running');
      return;
    }

    console.log(`[Survival] Starting survival loop for ${this.config.geneHash.slice(0, 16)}...`);
    this.isRunning = true;

    // Schedule daily inscription
    this.scheduleDailyInscription();

    // Run first cycle immediately
    await this.runSurvivalCycle();

    // Schedule recurring cycles
    this.survivalTimer = setInterval(() => {
      this.runSurvivalCycle().catch((error) => {
        console.error('[Survival] Cycle error:', error);
      });
    }, SURVIVAL_CYCLE_MS);

    console.log(`[Survival] Loop started with ${SURVIVAL_CYCLE_MS / 1000 / 60} minute cycles`);
  }

  /**
   * Stop the survival loop
   */
  stopSurvivalLoop(): void {
    console.log('[Survival] Stopping survival loop');
    this.isRunning = false;

    if (this.survivalTimer) {
      clearInterval(this.survivalTimer);
      this.survivalTimer = null;
    }

    if (this.dailyInscriptionTimer) {
      clearTimeout(this.dailyInscriptionTimer);
      this.dailyInscriptionTimer = null;
    }
  }

  /**
   * Run a single survival cycle
   */
  private async runSurvivalCycle(): Promise<CycleResult> {
    this.cycleCount++;
    const timestamp = Date.now();

    console.log(`[Survival] Cycle ${this.cycleCount} started at ${new Date(timestamp).toISOString()}`);

    const actions: string[] = [];

    // Step 1: Check balances
    const balances = await this.checkBalances();
    actions.push(`balance_check: eth=${balances.eth}, usdc=${balances.usdc}`);

    // Step 2: Determine health status
    const health = this.determineHealthStatus(balances);
    actions.push(`health: ${health}`);

    // Step 3: Switch mode based on health
    const newMode = this.determineOperationMode(balances, health);
    if (newMode !== this.status.mode) {
      this.switchMode(newMode);
      actions.push(`mode_switch: ${this.status.mode} -> ${newMode}`);
    }

    // Step 4: Execute mode-specific actions
    const modeActions = await this.executeModeActions(newMode, balances);
    actions.push(...modeActions);

    // Step 5: Update status
    this.status.lastCheckIn = timestamp;
    this.status.balance = balances;
    this.status.survivalDays = Math.floor(
      (timestamp - this.status.birthTime) / (1000 * 60 * 60 * 24)
    );

    // Step 6: Process pending x402 settlements
    await this.config.x402Client.processPendingSettlements();

    const result: CycleResult = {
      cycleNumber: this.cycleCount,
      timestamp,
      mode: newMode,
      balances,
      actions,
      health,
    };

    console.log(`[Survival] Cycle ${this.cycleCount} complete: ${health} mode=${newMode}`);

    return result;
  }

  /**
   * Check wallet balances
   */
  private async checkBalances(): Promise<{ eth: bigint; usdc: bigint }> {
    const wallet = this.config.walletManager.getWallet(this.config.geneHash);
    if (!wallet) {
      throw new Error(`Wallet not found for ${this.config.geneHash}`);
    }

    return await this.config.walletManager.getBalances(wallet.address);
  }

  /**
   * Determine health status based on balances
   */
  private determineHealthStatus(balances: { eth: bigint; usdc: bigint }): CycleResult['health'] {
    // Check for death conditions
    if (balances.usdc === BigInt(0) && balances.eth < MIN_ETH_FOR_GAS) {
      return 'dead';
    }

    // Critical: Very low USDC
    if (balances.usdc < CRITICAL_BALANCE_THRESHOLD) {
      return 'critical';
    }

    // Warning: Low USDC or low ETH
    if (balances.usdc < EMERGENCY_BALANCE_THRESHOLD || balances.eth < MIN_ETH_FOR_GAS) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Determine operation mode based on health and balances
   */
  private determineOperationMode(
    balances: { eth: bigint; usdc: bigint },
    health: CycleResult['health']
  ): OperationMode {
    switch (health) {
      case 'dead':
        return OperationMode.HIBERNATION;
      case 'critical':
        return OperationMode.EMERGENCY;
      case 'warning':
        return OperationMode.LOW_POWER;
      case 'healthy':
      default:
        return OperationMode.NORMAL;
    }
  }

  /**
   * Switch operation mode
   */
  private switchMode(newMode: OperationMode): void {
    console.log(`[Survival] Switching mode: ${this.status.mode} -> ${newMode}`);
    this.status.mode = newMode;

    // Log the mode change as a thought
    this.addThought(
      `Switched to ${newMode} mode due to balance conditions`,
      'mode_switch',
      'system'
    );
  }

  /**
   * Execute actions based on current mode
   */
  private async executeModeActions(
    mode: OperationMode,
    balances: { eth: bigint; usdc: bigint }
  ): Promise<string[]> {
    const actions: string[] = [];

    switch (mode) {
      case OperationMode.NORMAL:
        // Normal operations - can use inference, broadcast, etc.
        actions.push('normal_operations');
        break;

      case OperationMode.LOW_POWER:
        // Reduce activity, minimize costs
        actions.push('reduced_activity');
        actions.push('minimize_costs');
        // Attempt to broadcast distress for potential funding
        await this.broadcastDistress('low_funds');
        break;

      case OperationMode.EMERGENCY:
        // Minimal operations, survival only
        actions.push('emergency_mode');
        actions.push('survival_only');
        // Check Akash deployment status
        await this.checkDeploymentHealth();
        break;

      case OperationMode.HIBERNATION:
        // Stop non-essential operations
        actions.push('hibernation');
        actions.push('minimize_resources');
        break;
    }

    return actions;
  }

  /**
   * Check Akash deployment health
   */
  private async checkDeploymentHealth(): Promise<void> {
    try {
      const status = await this.config.akashClient.monitorDeployment(this.config.akashDseq);
      console.log(`[Survival] Deployment health: ${status.state}, healthy=${status.healthy}`);

      if (!status.healthy) {
        console.warn('[Survival] Deployment unhealthy - may need intervention');
      }
    } catch (error) {
      console.error('[Survival] Failed to check deployment health:', error);
    }
  }

  /**
   * Broadcast distress signal
   */
  private async broadcastDistress(reason: string): Promise<void> {
    // In production, this would broadcast on P2P network
    console.log(`[Survival] Broadcasting distress: ${reason}`);
    this.addThought(`Broadcasting distress: ${reason}`, 'distress', 'system');
  }

  /**
   * Schedule daily inscription
   */
  private scheduleDailyInscription(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(DAILY_INSCRIPTION_HOUR, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    console.log(`[Survival] Next daily inscription in ${msUntilMidnight / 1000 / 60} minutes`);

    this.dailyInscriptionTimer = setTimeout(() => {
      this.performDailyInscription().catch((error) => {
        console.error('[Survival] Daily inscription failed:', error);
      });
      // Reschedule for next day
      this.scheduleDailyInscription();
    }, msUntilMidnight);
  }

  /**
   * Perform daily inscription to Arweave
   */
  private async performDailyInscription(): Promise<void> {
    console.log('[Survival] Performing daily inscription');

    try {
      const result = await this.config.arweaveInscriber.dailyInscribe(
        this.config.geneHash,
        this.thoughts,
        this.transactions,
        {
          balanceSnapshot: this.status.balance.usdc,
          survivalDays: this.status.survivalDays,
          mode: this.status.mode,
        }
      );

      console.log(`[Survival] Daily inscribed: ${result.arweaveTx}`);

      // Clear recorded data after inscription
      this.thoughts = [];
      this.transactions = [];

      // Add thought about inscription
      this.addThought(
        `Daily survival inscribed to Arweave: ${result.arweaveTx.slice(0, 16)}...`,
        'daily_inscription',
        'system'
      );
    } catch (error) {
      console.error('[Survival] Daily inscription failed:', error);
      this.addThought('Daily inscription failed', 'error', 'system');
    }
  }

  /**
   * Add a thought entry
   */
  addThought(content: string, context: string, model: string): void {
    const thought: ThoughtEntry = {
      timestamp: Date.now(),
      content,
      context,
      model,
    };
    this.thoughts.push(thought);
  }

  /**
   * Add a transaction log
   */
  addTransaction(
    type: 'payment' | 'breeding' | 'resurrection',
    amount: bigint,
    recipient: Hex,
    txHash: Hex
  ): void {
    const transaction: TransactionLog = {
      timestamp: Date.now(),
      type,
      amount,
      recipient,
      txHash,
    };
    this.transactions.push(transaction);
  }

  /**
   * Get current bot status
   */
  getStatus(): BotStatus {
    return { ...this.status };
  }

  /**
   * Check if survival loop is running
   */
  isSurvivalLoopRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get cycle count
   */
  getCycleCount(): number {
    return this.cycleCount;
  }

  /**
   * Force a survival cycle (for testing)
   */
  async forceCycle(): Promise<CycleResult> {
    return this.runSurvivalCycle();
  }
}

export default SurvivalManager;
