/**
 * Wallet Tool - On-chain operations
 */

import { WalletManager } from '../wallet/WalletManager.js';
import { Tool, ToolResult } from './index.js';

export interface WalletConfig {
  walletManager: WalletManager;
  agentId: string;
  dailyLimit: number;
  txLimit: number;
}

export class WalletTool implements Tool {
  name = 'wallet';
  description = 'On-chain wallet operations';
  
  private config: WalletConfig;
  private dailySpent: number = 0;
  private lastReset: number = Date.now();

  constructor(config: WalletConfig) {
    this.config = config;
  }

  async execute(params: unknown): Promise<ToolResult> {
    this.resetDailyIfNeeded();
    
    const { action, ...args } = params as { action: string };
    
    switch (action) {
      case 'getBalance':
        return this.getBalance();
      case 'transfer':
        return this.transfer(args);
      case 'approve':
        return this.approve(args);
      default:
        return { success: false, error: 'Unknown action', cost: 0 };
    }
  }

  estimateCost(params: unknown): number {
    const { action } = params as { action: string };
    switch (action) {
      case 'getBalance': return 0;
      case 'transfer': return 0.01;
      case 'approve': return 0.01;
      default: return 0.01;
    }
  }

  private async getBalance(): Promise<ToolResult> {
    try {
      const wallet = this.config.walletManager.getWallet(this.config.agentId);
      if (!wallet) {
        return { success: false, error: 'Wallet not found', cost: 0 };
      }
      const balances = await this.config.walletManager.getBalances(wallet.address);
      return {
        success: true,
        data: {
          eth: balances.eth.toString(),
          usdc: balances.usdc.toString(),
        },
        cost: 0,
      };
    } catch (error) {
      return { success: false, error: String(error), cost: 0 };
    }
  }

  private async transfer(args: unknown): Promise<ToolResult> {
    if (this.dailySpent >= this.config.dailyLimit) {
      return { success: false, error: 'Daily limit exceeded', cost: 0 };
    }

    const { to, amount } = args as { to: string; amount: string };
    const amountNum = parseFloat(amount);
    
    if (amountNum > this.config.txLimit) {
      return { success: false, error: 'Transaction limit exceeded', cost: 0 };
    }

    // In production: execute transfer
    this.dailySpent += amountNum;
    
    return {
      success: true,
      data: { to, amount, txHash: '0x...' },
      cost: 0.01,
    };
  }

  private async approve(args: unknown): Promise<ToolResult> {
    return { success: true, data: args, cost: 0.01 };
  }

  private resetDailyIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastReset > 24 * 60 * 60 * 1000) {
      this.dailySpent = 0;
      this.lastReset = now;
    }
  }
}
